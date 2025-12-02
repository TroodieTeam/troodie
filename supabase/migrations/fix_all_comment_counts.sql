-- Fix all comment counts in the database
-- This recalculates comments_count for all posts based on actual comment rows
-- Only counts top-level comments (where parent_comment_id IS NULL)

UPDATE posts p
SET comments_count = (
  SELECT COUNT(*) 
  FROM post_comments pc 
  WHERE pc.post_id = p.id
    AND pc.parent_comment_id IS NULL
);

-- Log how many posts were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated comment counts for % posts', updated_count;
END $$;

