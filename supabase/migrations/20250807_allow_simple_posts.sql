-- Allow simple posts without restaurant association
-- This migration makes restaurant_id optional for posts

-- Make restaurant_id nullable in posts table
ALTER TABLE posts 
ALTER COLUMN restaurant_id DROP NOT NULL;

-- Add a post_type column to distinguish between different post types
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'restaurant' 
CHECK (post_type IN ('restaurant', 'simple', 'thought', 'question', 'announcement'));

-- Update existing posts to have the correct type
UPDATE posts 
SET post_type = 'restaurant' 
WHERE restaurant_id IS NOT NULL AND post_type IS NULL;

-- Create an index on post_type for performance
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);

-- Update the posts insert function to handle simple posts
CREATE OR REPLACE FUNCTION validate_post_requirements()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple posts only need caption
  IF NEW.post_type = 'simple' OR NEW.post_type = 'thought' OR NEW.post_type = 'question' OR NEW.post_type = 'announcement' THEN
    IF NEW.caption IS NULL OR NEW.caption = '' THEN
      RAISE EXCEPTION 'Simple posts require a caption';
    END IF;
  -- Restaurant posts need restaurant_id
  ELSIF NEW.post_type = 'restaurant' THEN
    IF NEW.restaurant_id IS NULL THEN
      RAISE EXCEPTION 'Restaurant posts require a restaurant_id';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for post validation
DROP TRIGGER IF EXISTS trigger_validate_post_requirements ON posts;
CREATE TRIGGER trigger_validate_post_requirements
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_post_requirements();

-- Update RLS policies to handle posts without restaurants
DROP POLICY IF EXISTS "Users can view public posts" ON posts;
CREATE POLICY "Users can view public posts"
  ON posts FOR SELECT
  USING (
    privacy = 'public' 
    OR user_id = auth.uid()
    OR (
      privacy = 'friends' 
      AND EXISTS (
        SELECT 1 FROM user_relationships 
        WHERE follower_id = auth.uid() 
        AND following_id = posts.user_id
      )
    )
  );

-- Function to get user feed including simple posts
CREATE OR REPLACE FUNCTION get_user_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  post_type TEXT,
  restaurant_id UUID,
  caption TEXT,
  photos TEXT[],
  rating NUMERIC,
  visit_date TIMESTAMPTZ,
  likes_count INTEGER,
  comments_count INTEGER,
  saves_count INTEGER,
  created_at TIMESTAMPTZ,
  username TEXT,
  user_avatar TEXT,
  restaurant_name TEXT,
  is_liked_by_user BOOLEAN,
  is_saved_by_user BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS post_id,
    p.user_id,
    p.post_type,
    p.restaurant_id::UUID,
    p.caption,
    p.photos,
    p.rating,
    p.visit_date,
    p.likes_count,
    p.comments_count,
    p.saves_count,
    p.created_at,
    u.username,
    u.avatar_url AS user_avatar,
    r.name AS restaurant_name,
    EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = p_user_id) AS is_liked_by_user,
    EXISTS(SELECT 1 FROM post_saves ps WHERE ps.post_id = p.id AND ps.user_id = p_user_id) AS is_saved_by_user
  FROM posts p
  INNER JOIN users u ON p.user_id = u.id
  LEFT JOIN restaurants r ON p.restaurant_id::TEXT = r.id::TEXT
  WHERE 
    -- User's own posts
    p.user_id = p_user_id
    OR
    -- Posts from people they follow
    EXISTS (
      SELECT 1 FROM user_relationships ur
      WHERE ur.follower_id = p_user_id
      AND ur.following_id = p.user_id
    )
    OR
    -- Public posts (for discovery)
    p.privacy = 'public'
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update the community feed function to handle simple posts
CREATE OR REPLACE FUNCTION get_community_feed_v2(
  p_community_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  post_type TEXT,
  restaurant_id UUID,
  caption TEXT,
  photos TEXT[],
  rating NUMERIC,
  visit_date TIMESTAMPTZ,
  likes_count INTEGER,
  comments_count INTEGER,
  saves_count INTEGER,
  created_at TIMESTAMPTZ,
  is_cross_posted BOOLEAN,
  cross_posted_at TIMESTAMPTZ,
  username TEXT,
  user_avatar TEXT,
  restaurant_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id AS post_id,
    p.user_id,
    p.post_type,
    p.restaurant_id::UUID,
    p.caption,
    p.photos,
    p.rating,
    p.visit_date,
    p.likes_count,
    p.comments_count,
    p.saves_count,
    p.created_at,
    pc.id IS NOT NULL AS is_cross_posted,
    pc.added_at AS cross_posted_at,
    u.username,
    u.avatar_url AS user_avatar,
    r.name AS restaurant_name
  FROM posts p
  INNER JOIN users u ON p.user_id = u.id
  LEFT JOIN restaurants r ON p.restaurant_id::TEXT = r.id::TEXT
  LEFT JOIN post_communities pc ON p.id = pc.post_id AND pc.community_id = p_community_id
  WHERE 
    -- Include cross-posted content
    pc.community_id = p_community_id
  ORDER BY COALESCE(pc.added_at, p.created_at) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Add comments
COMMENT ON COLUMN posts.post_type IS 'Type of post: restaurant (review), simple (text only), thought, question, announcement';
COMMENT ON COLUMN posts.restaurant_id IS 'Optional reference to restaurant for restaurant-type posts';