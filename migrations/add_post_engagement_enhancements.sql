-- Post Engagement Enhancements Migration
-- This migration adds missing fields and enhances the engagement system

-- Add missing columns to posts table to match type definitions
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS post_type VARCHAR(50) DEFAULT 'restaurant' 
  CHECK (post_type IN ('restaurant', 'simple', 'thought', 'question', 'announcement')),
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) DEFAULT 'original' 
  CHECK (content_type IN ('original', 'external')),
ADD COLUMN IF NOT EXISTS external_source VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_url TEXT,
ADD COLUMN IF NOT EXISTS external_title TEXT,
ADD COLUMN IF NOT EXISTS external_description TEXT,
ADD COLUMN IF NOT EXISTS external_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS external_author VARCHAR(255);

-- Create share_analytics table for tracking shares
CREATE TABLE IF NOT EXISTS share_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type VARCHAR(20) CHECK (content_type IN ('board', 'post', 'profile')),
  content_id UUID NOT NULL,
  platform VARCHAR(50), -- 'copy_link', 'whatsapp', 'instagram', 'twitter', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for share_analytics
CREATE INDEX IF NOT EXISTS idx_share_analytics_user_id ON share_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_share_analytics_content_type ON share_analytics(content_type);
CREATE INDEX IF NOT EXISTS idx_share_analytics_content_id ON share_analytics(content_id);
CREATE INDEX IF NOT EXISTS idx_share_analytics_created_at ON share_analytics(created_at DESC);

-- Enable RLS for share_analytics
ALTER TABLE share_analytics ENABLE ROW LEVEL SECURITY;

-- Share analytics policies
CREATE POLICY "Users can view share analytics" ON share_analytics
  FOR SELECT USING (true);

CREATE POLICY "Users can track shares" ON share_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Function to update share count
CREATE OR REPLACE FUNCTION update_post_share_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.content_type = 'post' THEN
    UPDATE posts SET share_count = share_count + 1 WHERE id = NEW.content_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating share count
CREATE TRIGGER update_post_share_count_trigger
  AFTER INSERT ON share_analytics
  FOR EACH ROW 
  WHEN (NEW.content_type = 'post')
  EXECUTE FUNCTION update_post_share_count();

-- Create function to handle post engagement with optimistic updates
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
      
      -- Get updated count
      SELECT comments_count INTO v_comments_count FROM posts WHERE id = p_post_id;
      
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION handle_post_engagement TO authenticated;

-- Create real-time subscription helper view
CREATE OR REPLACE VIEW post_engagement_stats AS
SELECT 
  p.id as post_id,
  p.user_id,
  p.likes_count,
  p.comments_count,
  p.saves_count,
  p.share_count,
  EXISTS(
    SELECT 1 FROM post_likes pl 
    WHERE pl.post_id = p.id AND pl.user_id = auth.uid()
  ) as is_liked_by_user,
  EXISTS(
    SELECT 1 FROM post_saves ps 
    WHERE ps.post_id = p.id AND ps.user_id = auth.uid()
  ) as is_saved_by_user
FROM posts p;

-- Grant permissions
GRANT SELECT ON post_engagement_stats TO authenticated;
GRANT SELECT ON post_engagement_stats TO anon;