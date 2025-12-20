-- Fix Stale Comment Counts
-- This migration recalculates all comment counts to match actual comment data
-- Run this if you see stale comment counts in the UI

-- Step 1: Recalculate all comment counts from actual data
UPDATE posts 
SET 
  comments_count = (
    SELECT COUNT(*) 
    FROM post_comments 
    WHERE post_comments.post_id = posts.id
  ),
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT post_id 
  FROM post_comments
);

-- Step 2: Set count to 0 for posts with no comments (if they show a count > 0)
UPDATE posts 
SET 
  comments_count = 0,
  updated_at = NOW()
WHERE comments_count > 0 
  AND id NOT IN (
    SELECT DISTINCT post_id 
    FROM post_comments
  );

-- Step 3: Verify the fix - show posts with mismatched counts
SELECT 
  p.id,
  p.caption,
  p.comments_count as db_stored_count,
  COUNT(pc.id) as actual_comment_count,
  CASE 
    WHEN p.comments_count != COUNT(pc.id) THEN 'MISMATCH'
    ELSE 'OK'
  END as status
FROM posts p
LEFT JOIN post_comments pc ON pc.post_id = p.id
GROUP BY p.id, p.caption, p.comments_count
HAVING p.comments_count != COUNT(pc.id)
ORDER BY p.created_at DESC
LIMIT 20;


