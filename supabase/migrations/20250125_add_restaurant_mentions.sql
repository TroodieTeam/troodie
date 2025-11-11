-- Restaurant Mentions Migration
-- This migration adds support for @restaurant mentions in comments

-- Create restaurant_mentions table
CREATE TABLE IF NOT EXISTS restaurant_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL, -- Store the name used in the mention for display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, restaurant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_mentions_comment_id ON restaurant_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_mentions_restaurant_id ON restaurant_mentions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_mentions_created_at ON restaurant_mentions(created_at DESC);

-- Enable RLS
ALTER TABLE restaurant_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view restaurant mentions" ON restaurant_mentions
  FOR SELECT USING (true);

CREATE POLICY "Users can create mentions in their comments" ON restaurant_mentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM post_comments pc
      WHERE pc.id = comment_id AND pc.user_id = auth.uid()
    )
  );

-- Function to parse and create restaurant mentions from comment text
CREATE OR REPLACE FUNCTION process_restaurant_mentions(
  p_comment_id UUID,
  p_comment_text TEXT
)
RETURNS JSON AS $$
DECLARE
  v_mention_count INTEGER := 0;
  v_restaurant RECORD;
  v_restaurant_name TEXT;
  v_matched_text TEXT;
  v_mention_pattern TEXT := '@([A-Za-z0-9\s&''-]+)';
  v_matches TEXT[];
  v_match TEXT;
BEGIN
  -- Extract all @mentions using regex
  -- Pattern matches @ followed by alphanumeric, spaces, &, ', and - characters
  -- This will find patterns like @GoldenOx, @The Rustic Table, @Joe's Pizza, etc.
  
  -- Find all matches
  SELECT array_agg(match[1]) INTO v_matches
  FROM regexp_matches(p_comment_text, v_mention_pattern, 'gi') AS match;
  
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
      -- Prioritize exact matches, then partial matches
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
      
      -- If restaurant found, create mention
      IF v_restaurant.id IS NOT NULL THEN
        INSERT INTO restaurant_mentions (comment_id, restaurant_id, restaurant_name)
        VALUES (p_comment_id, v_restaurant.id, v_restaurant.name)
        ON CONFLICT (comment_id, restaurant_id) DO NOTHING;
        
        v_mention_count := v_mention_count + 1;
      END IF;
    END LOOP;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'mentions_created', v_mention_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_restaurant_mentions TO authenticated;

-- Update handle_post_engagement to process mentions after comment creation
-- Note: This assumes handle_post_engagement already exists from previous migration
-- We'll update it to include mention processing
DO $$
BEGIN
  -- Check if function exists and update it
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_post_engagement') THEN
    -- Function will be updated in a separate migration that modifies the existing one
    -- For now, we'll create a trigger to process mentions after comment insertion
    NULL;
  END IF;
END $$;

-- Create trigger to process mentions after comment is created
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
    PERFORM process_restaurant_mentions(NEW.id, NEW.content);
    
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

-- Create trigger
DROP TRIGGER IF EXISTS process_mentions_after_comment_insert ON post_comments;
CREATE TRIGGER process_mentions_after_comment_insert
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_restaurant_mentions();

