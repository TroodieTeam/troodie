-- Extend Restaurant Mentions to Post Captions
-- This migration extends the restaurant_mentions table to support mentions in post captions
-- in addition to comment mentions

-- Add post_id column to restaurant_mentions table
ALTER TABLE restaurant_mentions 
ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS mention_type VARCHAR(20) DEFAULT 'comment' 
  CHECK (mention_type IN ('comment', 'post_caption'));

-- Create index for post_id
CREATE INDEX IF NOT EXISTS idx_restaurant_mentions_post_id ON restaurant_mentions(post_id);

-- Update unique constraint to allow either comment_id OR post_id
-- First, drop the existing unique constraint if it exists
ALTER TABLE restaurant_mentions
DROP CONSTRAINT IF EXISTS restaurant_mentions_comment_id_restaurant_id_key;

-- Create partial unique indexes for comment mentions and post mentions
-- This ensures one mention per restaurant per comment/post
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_mentions_comment_unique_idx
  ON restaurant_mentions (comment_id, restaurant_id)
  WHERE comment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS restaurant_mentions_post_unique_idx
  ON restaurant_mentions (post_id, restaurant_id)
  WHERE post_id IS NOT NULL;

-- Add check constraint to ensure either comment_id OR post_id is set (not both, not neither)
ALTER TABLE restaurant_mentions
DROP CONSTRAINT IF EXISTS restaurant_mentions_source_check;

ALTER TABLE restaurant_mentions
ADD CONSTRAINT restaurant_mentions_source_check 
  CHECK (
    (comment_id IS NOT NULL AND post_id IS NULL) OR 
    (comment_id IS NULL AND post_id IS NOT NULL)
  );

-- Update RLS policy to allow mentions in posts
DROP POLICY IF EXISTS "Users can create mentions in their comments" ON restaurant_mentions;
CREATE POLICY "Users can create mentions in their comments" ON restaurant_mentions
  FOR INSERT WITH CHECK (
    -- Allow if user owns the comment
    EXISTS (
      SELECT 1 FROM post_comments pc
      WHERE pc.id = comment_id AND pc.user_id = auth.uid()
    ) OR
    -- Allow if user owns the post
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

-- Extend process_restaurant_mentions function to handle post mentions
CREATE OR REPLACE FUNCTION process_restaurant_mentions(
  p_text TEXT,
  p_comment_id UUID DEFAULT NULL,
  p_post_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_mention_count INTEGER := 0;
  v_restaurant RECORD;
  v_restaurant_name TEXT;
  v_mention_pattern TEXT := '@([A-Za-z0-9\s&''-]+)';
  v_matches TEXT[];
  v_match TEXT;
  v_mention_type TEXT;
BEGIN
  -- Determine mention type
  IF p_comment_id IS NOT NULL THEN
    v_mention_type := 'comment';
  ELSIF p_post_id IS NOT NULL THEN
    v_mention_type := 'post_caption';
  ELSE
    RETURN json_build_object('success', false, 'error', 'Either comment_id or post_id must be provided');
  END IF;

  -- Extract all @mentions using regex
  SELECT array_agg(match[1]) INTO v_matches
  FROM regexp_matches(p_text, v_mention_pattern, 'gi') AS match;
  
  -- Process each unique mention
  IF v_matches IS NOT NULL THEN
    FOREACH v_match IN ARRAY v_matches
    LOOP
      v_restaurant_name := trim(v_match);
      
      -- Skip if empty
      IF v_restaurant_name = '' THEN
        CONTINUE;
      END IF;
      
      -- Search for restaurant by name (case-insensitive, partial match)
      SELECT r.id, r.name INTO v_restaurant
      FROM restaurants r
      WHERE 
        -- Exact match (case-insensitive)
        LOWER(r.name) = LOWER(v_restaurant_name)
        OR
        -- Partial match (starts with or contains)
        LOWER(r.name) LIKE LOWER(v_restaurant_name || '%')
        OR
        LOWER(r.name) LIKE LOWER('%' || v_restaurant_name || '%')
      ORDER BY 
        -- Prioritize exact matches
        CASE WHEN LOWER(r.name) = LOWER(v_restaurant_name) THEN 1 
             WHEN LOWER(r.name) LIKE LOWER(v_restaurant_name || '%') THEN 2
             ELSE 3 END,
        -- Then by rating/popularity
        r.google_rating DESC NULLS LAST,
        -- Then by review count
        r.google_reviews_count DESC NULLS LAST
      LIMIT 1;
      
      -- If restaurant found, create mention (only if it doesn't already exist)
      IF v_restaurant.id IS NOT NULL THEN
        IF v_mention_type = 'comment' THEN
          INSERT INTO restaurant_mentions (comment_id, restaurant_id, restaurant_name, mention_type)
          SELECT p_comment_id, v_restaurant.id, v_restaurant.name, v_mention_type
          WHERE NOT EXISTS (
            SELECT 1 FROM restaurant_mentions rm
            WHERE rm.comment_id = p_comment_id AND rm.restaurant_id = v_restaurant.id
          );
          -- Check if insert was successful
          IF FOUND THEN
            v_mention_count := v_mention_count + 1;
          END IF;
        ELSE
          INSERT INTO restaurant_mentions (post_id, restaurant_id, restaurant_name, mention_type)
          SELECT p_post_id, v_restaurant.id, v_restaurant.name, v_mention_type
          WHERE NOT EXISTS (
            SELECT 1 FROM restaurant_mentions rm
            WHERE rm.post_id = p_post_id AND rm.restaurant_id = v_restaurant.id
          );
          -- Check if insert was successful
          IF FOUND THEN
            v_mention_count := v_mention_count + 1;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'mentions_created', v_mention_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger function to use the new signature
CREATE OR REPLACE FUNCTION trigger_process_restaurant_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_mention RECORD;
  v_restaurant RECORD;
  v_commenter RECORD;
  v_post RECORD;
BEGIN
  -- Process mentions if comment contains @
  IF NEW.content LIKE '%@%' THEN
    PERFORM process_restaurant_mentions(p_text => NEW.content, p_comment_id => NEW.id);
    
    -- Get commenter info for notifications
    SELECT id, name, username, avatar_url INTO v_commenter
    FROM users
    WHERE id = NEW.user_id;
    
    -- Get post info
    SELECT id, user_id INTO v_post
    FROM posts
    WHERE id = NEW.post_id;
    
    -- Send notifications for each mention created
    FOR v_mention IN 
      SELECT rm.restaurant_id, rm.restaurant_name
      FROM restaurant_mentions rm
      WHERE rm.comment_id = NEW.id
    LOOP
      -- Get restaurant owner
      SELECT owner_id INTO v_restaurant
      FROM restaurants
      WHERE id = v_mention.restaurant_id AND owner_id IS NOT NULL;
      
      -- Send notification if restaurant is claimed
      IF v_restaurant.owner_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          data,
          related_id,
          related_type,
          priority
        ) VALUES (
          v_restaurant.owner_id,
          'restaurant_mention',
          'Restaurant Mentioned',
          COALESCE(v_commenter.name, v_commenter.username, 'Someone') || ' mentioned @' || v_mention.restaurant_name || ' in a comment',
          jsonb_build_object(
            'post_id', v_post.id,
            'comment_id', NEW.id,
            'commenter_id', NEW.user_id,
            'commenter_name', COALESCE(v_commenter.name, v_commenter.username, 'Someone'),
            'restaurant_name', v_mention.restaurant_name,
            'comment_preview', LEFT(NEW.content, 100),
            'commenter_avatar', v_commenter.avatar_url
          ),
          NEW.id,
          'comment',
          2
        )
        ON CONFLICT DO NOTHING; -- Prevent duplicate notifications
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for post mentions
CREATE OR REPLACE FUNCTION trigger_process_post_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_mention RECORD;
  v_restaurant RECORD;
  v_poster RECORD;
BEGIN
  -- Process mentions if post caption contains @
  IF NEW.caption LIKE '%@%' THEN
    PERFORM process_restaurant_mentions(p_text => NEW.caption, p_post_id => NEW.id);
    
    -- Get poster info for notifications
    SELECT id, name, username, avatar_url INTO v_poster
    FROM users
    WHERE id = NEW.user_id;
    
    -- Send notifications for each mention created
    FOR v_mention IN 
      SELECT rm.restaurant_id, rm.restaurant_name
      FROM restaurant_mentions rm
      WHERE rm.post_id = NEW.id
    LOOP
      -- Get restaurant owner
      SELECT owner_id INTO v_restaurant
      FROM restaurants
      WHERE id = v_mention.restaurant_id AND owner_id IS NOT NULL;
      
      -- Send notification if restaurant is claimed
      IF v_restaurant.owner_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          data,
          related_id,
          related_type,
          priority
        ) VALUES (
          v_restaurant.owner_id,
          'restaurant_mention',
          'Restaurant Mentioned',
          COALESCE(v_poster.name, v_poster.username, 'Someone') || ' mentioned @' || v_mention.restaurant_name || ' in a post',
          jsonb_build_object(
            'post_id', NEW.id,
            'poster_id', NEW.user_id,
            'poster_name', COALESCE(v_poster.name, v_poster.username, 'Someone'),
            'restaurant_name', v_mention.restaurant_name,
            'post_preview', LEFT(NEW.caption, 100),
            'poster_avatar', v_poster.avatar_url
          ),
          NEW.id,
          'post',
          2
        )
        ON CONFLICT DO NOTHING; -- Prevent duplicate notifications
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for post mentions
DROP TRIGGER IF EXISTS process_mentions_after_post_insert ON posts;
CREATE TRIGGER process_mentions_after_post_insert
  AFTER INSERT ON posts
  FOR EACH ROW
  WHEN (NEW.caption IS NOT NULL AND NEW.caption LIKE '%@%')
  EXECUTE FUNCTION trigger_process_post_mentions();

-- Update trigger for post updates (in case caption is edited)
DROP TRIGGER IF EXISTS process_mentions_after_post_update ON posts;
CREATE TRIGGER process_mentions_after_post_update
  AFTER UPDATE ON posts
  FOR EACH ROW
  WHEN (NEW.caption IS NOT NULL AND NEW.caption LIKE '%@%' AND (OLD.caption IS DISTINCT FROM NEW.caption))
  EXECUTE FUNCTION trigger_process_post_mentions();
