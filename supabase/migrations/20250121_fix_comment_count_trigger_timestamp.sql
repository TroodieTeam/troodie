-- Fix Comment Count Trigger to Update Timestamp
-- This ensures realtime subscriptions fire when comment counts change
-- Date: 2025-01-21

-- Update the function to also update the updated_at timestamp
-- IMPORTANT: Only count top-level comments (parent_comment_id IS NULL)
-- This matches what the UI displays
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only increment if this is a top-level comment (not a reply)
    IF NEW.parent_comment_id IS NULL THEN
      UPDATE posts 
      SET comments_count = comments_count + 1,
          updated_at = NOW()
      WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Only decrement if this was a top-level comment (not a reply)
    IF OLD.parent_comment_id IS NULL THEN
      UPDATE posts 
      SET comments_count = GREATEST(comments_count - 1, 0),
          updated_at = NOW()
      WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists and handles both INSERT and DELETE
-- Drop existing trigger if it exists (in case it was modified)
DROP TRIGGER IF EXISTS update_post_comments_count_trigger ON post_comments;

-- Recreate the trigger to handle both INSERT and DELETE
CREATE TRIGGER update_post_comments_count_trigger
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW 
  EXECUTE FUNCTION update_post_comments_count();

-- Also ensure any separate triggers are dropped (from old migrations)
DROP TRIGGER IF EXISTS update_post_comment_count_insert_trigger ON post_comments;
DROP TRIGGER IF EXISTS update_post_comment_count_delete_trigger ON post_comments;

-- Fix all existing comment counts to only count top-level comments
-- This corrects any counts that include replies
UPDATE posts p
SET comments_count = (
  SELECT COUNT(*) 
  FROM post_comments pc 
  WHERE pc.post_id = p.id
    AND pc.parent_comment_id IS NULL
);

