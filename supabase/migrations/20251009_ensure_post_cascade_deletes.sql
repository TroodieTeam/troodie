-- Ensure proper cascade deletes for posts and related data
-- Date: 2025-10-09
-- Purpose: When a post is deleted, all related data should be cleaned up automatically

-- Post likes cascade
ALTER TABLE post_likes
DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey;

ALTER TABLE post_likes
ADD CONSTRAINT post_likes_post_id_fkey
  FOREIGN KEY (post_id)
  REFERENCES posts(id)
  ON DELETE CASCADE;

-- Post comments cascade
ALTER TABLE post_comments
DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey;

ALTER TABLE post_comments
ADD CONSTRAINT post_comments_post_id_fkey
  FOREIGN KEY (post_id)
  REFERENCES posts(id)
  ON DELETE CASCADE;

-- Post shares cascade (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_shares') THEN
    ALTER TABLE post_shares
    DROP CONSTRAINT IF EXISTS post_shares_post_id_fkey;

    ALTER TABLE post_shares
    ADD CONSTRAINT post_shares_post_id_fkey
      FOREIGN KEY (post_id)
      REFERENCES posts(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Drop old triggers first (must drop triggers before functions)
DROP TRIGGER IF EXISTS update_community_post_count_trigger ON post_communities;
DROP TRIGGER IF EXISTS trigger_update_community_post_count ON post_communities;

-- Now safe to drop function
DROP FUNCTION IF EXISTS update_community_post_count() CASCADE;

-- Create trigger function for post_communities junction table
CREATE OR REPLACE FUNCTION update_community_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Decrement post count when post is removed from community
    UPDATE communities
    SET post_count = GREATEST(COALESCE(post_count, 1) - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.community_id;

  ELSIF TG_OP = 'INSERT' THEN
    -- Increment post count when post is added to community
    UPDATE communities
    SET post_count = COALESCE(post_count, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.community_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on post_communities junction table (not posts table)
-- Drop trigger if it exists to make migration idempotent
DROP TRIGGER IF EXISTS update_community_post_count_trigger ON post_communities;
CREATE TRIGGER update_community_post_count_trigger
AFTER INSERT OR DELETE ON post_communities
FOR EACH ROW
EXECUTE FUNCTION update_community_post_count();

COMMENT ON TRIGGER update_community_post_count_trigger ON post_communities IS
  'Automatically updates communities.post_count when posts are added/removed from communities';
