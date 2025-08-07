-- Fix Comment Count Triggers
-- This migration adds triggers to automatically update the comments_count in posts table

-- Function to update comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment comment count
    UPDATE posts 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement comment count  
    UPDATE posts 
    SET comments_count = GREATEST(comments_count - 1, 0) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for inserting comments
CREATE TRIGGER update_post_comment_count_insert_trigger
  AFTER INSERT ON post_comments
  FOR EACH ROW 
  EXECUTE FUNCTION update_post_comment_count();

-- Trigger for deleting comments
CREATE TRIGGER update_post_comment_count_delete_trigger
  AFTER DELETE ON post_comments
  FOR EACH ROW 
  EXECUTE FUNCTION update_post_comment_count();

-- Fix existing comment counts by recalculating them
UPDATE posts 
SET comments_count = (
  SELECT COUNT(*) 
  FROM post_comments 
  WHERE post_comments.post_id = posts.id
);

-- Update the handle_post_engagement function to calculate comment count dynamically
CREATE OR REPLACE FUNCTION handle_post_engagement(
  p_action VARCHAR,
  p_post_id UUID,
  p_user_id UUID,
  p_content TEXT DEFAULT NULL,
  p_board_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_is_liked BOOLEAN;
  v_is_saved BOOLEAN;
  v_likes_count INTEGER;
  v_saves_count INTEGER;
  v_comments_count INTEGER;
BEGIN
  -- Handle different engagement actions
  CASE p_action
    WHEN 'toggle_like' THEN
      -- Check if already liked
      SELECT EXISTS(
        SELECT 1 FROM post_likes 
        WHERE post_id = p_post_id AND user_id = p_user_id
      ) INTO v_is_liked;
      
      IF v_is_liked THEN
        -- Unlike
        DELETE FROM post_likes 
        WHERE post_id = p_post_id AND user_id = p_user_id;
      ELSE
        -- Like
        INSERT INTO post_likes (post_id, user_id) 
        VALUES (p_post_id, p_user_id)
        ON CONFLICT (post_id, user_id) DO NOTHING;
      END IF;
      
      -- Get updated counts
      SELECT likes_count INTO v_likes_count FROM posts WHERE id = p_post_id;
      
      v_result := json_build_object(
        'success', true,
        'is_liked', NOT v_is_liked,
        'likes_count', v_likes_count
      );
      
    WHEN 'toggle_save' THEN
      -- Check if already saved
      SELECT EXISTS(
        SELECT 1 FROM post_saves 
        WHERE post_id = p_post_id AND user_id = p_user_id 
        AND (board_id = p_board_id OR (board_id IS NULL AND p_board_id IS NULL))
      ) INTO v_is_saved;
      
      IF v_is_saved THEN
        -- Unsave
        DELETE FROM post_saves 
        WHERE post_id = p_post_id AND user_id = p_user_id 
        AND (board_id = p_board_id OR (board_id IS NULL AND p_board_id IS NULL));
      ELSE
        -- Save
        INSERT INTO post_saves (post_id, user_id, board_id) 
        VALUES (p_post_id, p_user_id, p_board_id)
        ON CONFLICT (post_id, user_id, board_id) DO NOTHING;
      END IF;
      
      -- Get updated counts
      SELECT saves_count INTO v_saves_count FROM posts WHERE id = p_post_id;
      
      v_result := json_build_object(
        'success', true,
        'is_saved', NOT v_is_saved,
        'saves_count', v_saves_count
      );
      
    WHEN 'add_comment' THEN
      -- Add comment
      INSERT INTO post_comments (post_id, user_id, content) 
      VALUES (p_post_id, p_user_id, p_content);
      
      -- Calculate comment count dynamically
      SELECT COUNT(*) INTO v_comments_count 
      FROM post_comments 
      WHERE post_id = p_post_id;
      
      -- Update the stored count for consistency
      UPDATE posts SET comments_count = v_comments_count WHERE id = p_post_id;
      
      v_result := json_build_object(
        'success', true,
        'comments_count', v_comments_count
      );
      
    ELSE
      v_result := json_build_object(
        'success', false,
        'error', 'Invalid action'
      );
  END CASE;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;