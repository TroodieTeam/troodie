-- Fix post like count triggers for atomic updates
-- Date: 2025-10-09
-- Purpose: Ensure likes_count updates atomically to prevent race conditions

-- Drop old triggers first (must drop triggers before functions)
DROP TRIGGER IF EXISTS update_post_likes_count_trigger ON post_likes;
DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON post_likes;

-- Now safe to drop function
DROP FUNCTION IF EXISTS update_post_likes_count() CASCADE;

-- Create improved trigger function
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment likes count
    UPDATE posts
    SET likes_count = COALESCE(likes_count, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.post_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement likes count
    UPDATE posts
    SET likes_count = GREATEST(COALESCE(likes_count, 1) - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.post_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_post_likes_count_trigger
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW
EXECUTE FUNCTION update_post_likes_count();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at DESC);

-- Add unique constraint to prevent duplicate likes
ALTER TABLE post_likes
DROP CONSTRAINT IF EXISTS post_likes_user_post_unique;

ALTER TABLE post_likes
ADD CONSTRAINT post_likes_user_post_unique
UNIQUE (post_id, user_id);

COMMENT ON TRIGGER update_post_likes_count_trigger ON post_likes IS
  'Automatically updates posts.likes_count when likes are added/removed';
