-- 1. DROP THE DUPLICATE TRIGGERS (The Cause)
-- We removed the singular versions because your table uses the plural naming convention
DROP TRIGGER IF EXISTS update_post_comment_count_insert_trigger ON post_comments;
DROP TRIGGER IF EXISTS update_post_comment_count_delete_trigger ON post_comments;

-- 2. REPAIR THE BROKEN DATA (The Symptom)
-- We forced the posts table to look at the actual rows and update the count
UPDATE posts p
SET comments_count = (
  SELECT COUNT(*) 
  FROM post_comments pc 
  WHERE pc.post_id = p.id
);