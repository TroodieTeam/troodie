-- Remove Stale Comment Count Column
-- Industry-standard approach: Calculate counts from actual data, not denormalized columns
-- This migration creates a view that calculates counts on-the-fly

-- Step 1: Create a view that includes calculated comment counts
CREATE OR REPLACE VIEW posts_with_engagement AS
SELECT 
  p.*,
  COALESCE(comment_counts.comment_count, 0) as comments_count_calculated,
  COALESCE(like_counts.like_count, 0) as likes_count_calculated,
  COALESCE(save_counts.save_count, 0) as saves_count_calculated
FROM posts p
LEFT JOIN (
  SELECT post_id, COUNT(*) as comment_count
  FROM post_comments
  GROUP BY post_id
) comment_counts ON comment_counts.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as like_count
  FROM post_likes
  GROUP BY post_id
) like_counts ON like_counts.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as save_count
  FROM post_saves
  GROUP BY post_id
) save_counts ON save_counts.post_id = p.id;

-- Grant permissions
GRANT SELECT ON posts_with_engagement TO authenticated;
GRANT SELECT ON posts_with_engagement TO anon;

-- Step 2: Create a function to get post with calculated counts (for single post queries)
CREATE OR REPLACE FUNCTION get_post_with_counts(post_uuid UUID)
RETURNS TABLE (
  -- All posts columns
  id UUID,
  user_id UUID,
  restaurant_id UUID,
  caption TEXT,
  photos TEXT[],
  rating INTEGER,
  visit_date DATE,
  price_range VARCHAR,
  visit_type VARCHAR,
  tags TEXT[],
  privacy VARCHAR,
  location_lat NUMERIC,
  location_lng NUMERIC,
  is_trending BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  content_type VARCHAR,
  external_source VARCHAR,
  external_url TEXT,
  external_title TEXT,
  external_description TEXT,
  external_thumbnail TEXT,
  external_author TEXT,
  post_type TEXT,
  demo_session_id TEXT,
  videos TEXT[],
  -- Calculated counts
  comments_count INTEGER,
  likes_count INTEGER,
  saves_count INTEGER,
  share_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.*,
    COALESCE((SELECT COUNT(*) FROM post_comments WHERE post_id = p.id), 0)::INTEGER as comments_count,
    COALESCE((SELECT COUNT(*) FROM post_likes WHERE post_id = p.id), 0)::INTEGER as likes_count,
    COALESCE((SELECT COUNT(*) FROM post_saves WHERE post_id = p.id), 0)::INTEGER as saves_count,
    p.share_count
  FROM posts p
  WHERE p.id = post_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_post_with_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_post_with_counts TO anon;

-- Step 3: Note about removing triggers (optional - keep for now but they're not needed)
-- The triggers can stay for backward compatibility, but we'll calculate from actual data
-- If you want to remove them later:
-- DROP TRIGGER IF EXISTS update_post_comments_count_trigger ON post_comments;
-- DROP FUNCTION IF EXISTS update_post_comments_count();

-- Step 4: Create index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_post_id ON post_saves(post_id);

