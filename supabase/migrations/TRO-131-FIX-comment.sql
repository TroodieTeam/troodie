-- 1. Create a robust function that ALWAYS counts accurately
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
BEGIN
  -- If a comment is ADDED
  IF (TG_OP = 'INSERT') THEN
    UPDATE posts
    SET comments_count = (
      SELECT count(*) 
      FROM post_comments 
      WHERE post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;
    RETURN NEW;
    
  -- If a comment is DELETED
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE posts
    SET comments_count = (
      SELECT count(*) 
      FROM post_comments 
      WHERE post_id = OLD.post_id
    )
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Ensure the trigger is connected properly
DROP TRIGGER IF EXISTS update_post_comments_count_trigger ON post_comments;

CREATE TRIGGER update_post_comments_count_trigger
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();



-- verification sql to check the actual count in db and in the UI

SELECT 
  id, 
  created_at,
  comments_count AS "UI_Stored_Count",
  (SELECT count(*) FROM post_comments WHERE post_id = posts.id) AS "Real_DB_Count",
  CASE 
    WHEN comments_count = (SELECT count(*) FROM post_comments WHERE post_id = posts.id) 
    THEN '✅ MATCH' 
    ELSE '❌ MISMATCH' 
  END AS status
FROM posts 
ORDER BY created_at DESC 
LIMIT 5;