-- Add Mention Count Tracking
-- This migration adds mention count tracking to restaurants table with automatic updates

-- Add mentions_count column to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS mentions_count INTEGER DEFAULT 0;

-- Create index for mentions_count for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_restaurants_mentions_count 
  ON restaurants(mentions_count DESC);

-- Function to compute mention count for a restaurant
-- Counts mentions from comments, post captions, and posts about restaurant
CREATE OR REPLACE FUNCTION compute_restaurant_mention_count(p_restaurant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM (
    -- Mentions in comments
    SELECT 1 FROM restaurant_mentions rm
    JOIN post_comments pc ON rm.comment_id = pc.id
    WHERE rm.restaurant_id = p_restaurant_id
    
    UNION
    
    -- Mentions in post captions
    SELECT 1 FROM restaurant_mentions rm
    JOIN posts p ON rm.post_id = p.id
    WHERE rm.restaurant_id = p_restaurant_id
    
    UNION
    
    -- Posts about restaurant (restaurant_id set)
    SELECT 1 FROM posts p
    WHERE p.restaurant_id = p_restaurant_id
  ) combined_mentions;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update mention count for a restaurant
CREATE OR REPLACE FUNCTION update_restaurant_mention_count()
RETURNS TRIGGER AS $$
DECLARE
  v_restaurant_id UUID;
BEGIN
  -- Determine restaurant_id based on trigger context
  IF TG_TABLE_NAME = 'restaurant_mentions' THEN
    -- For restaurant_mentions table
    IF TG_OP = 'INSERT' THEN
      v_restaurant_id := NEW.restaurant_id;
    ELSIF TG_OP = 'DELETE' THEN
      v_restaurant_id := OLD.restaurant_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'posts' THEN
    -- For posts table
    IF TG_OP = 'INSERT' AND NEW.restaurant_id IS NOT NULL THEN
      v_restaurant_id := NEW.restaurant_id;
    ELSIF TG_OP = 'DELETE' AND OLD.restaurant_id IS NOT NULL THEN
      v_restaurant_id := OLD.restaurant_id;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Handle restaurant_id changes
      IF OLD.restaurant_id IS DISTINCT FROM NEW.restaurant_id THEN
        -- Update old restaurant count if restaurant_id was removed
        IF OLD.restaurant_id IS NOT NULL THEN
          UPDATE restaurants
          SET mentions_count = compute_restaurant_mention_count(OLD.restaurant_id)
          WHERE id = OLD.restaurant_id;
        END IF;
        -- Update new restaurant count if restaurant_id was added
        IF NEW.restaurant_id IS NOT NULL THEN
          v_restaurant_id := NEW.restaurant_id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- Update count using computed function if we have a restaurant_id
  IF v_restaurant_id IS NOT NULL THEN
    UPDATE restaurants
    SET mentions_count = compute_restaurant_mention_count(v_restaurant_id)
    WHERE id = v_restaurant_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for restaurant_mentions table
DROP TRIGGER IF EXISTS update_mention_count_on_insert ON restaurant_mentions;
CREATE TRIGGER update_mention_count_on_insert
  AFTER INSERT ON restaurant_mentions
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_mention_count();

DROP TRIGGER IF EXISTS update_mention_count_on_delete ON restaurant_mentions;
CREATE TRIGGER update_mention_count_on_delete
  AFTER DELETE ON restaurant_mentions
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_mention_count();

-- Triggers for posts table
DROP TRIGGER IF EXISTS update_mention_count_on_post_insert ON posts;
CREATE TRIGGER update_mention_count_on_post_insert
  AFTER INSERT ON posts
  FOR EACH ROW
  WHEN (NEW.restaurant_id IS NOT NULL)
  EXECUTE FUNCTION update_restaurant_mention_count();

DROP TRIGGER IF EXISTS update_mention_count_on_post_delete ON posts;
CREATE TRIGGER update_mention_count_on_post_delete
  AFTER DELETE ON posts
  FOR EACH ROW
  WHEN (OLD.restaurant_id IS NOT NULL)
  EXECUTE FUNCTION update_restaurant_mention_count();

DROP TRIGGER IF EXISTS update_mention_count_on_post_update ON posts;
CREATE TRIGGER update_mention_count_on_post_update
  AFTER UPDATE ON posts
  FOR EACH ROW
  WHEN (OLD.restaurant_id IS DISTINCT FROM NEW.restaurant_id)
  EXECUTE FUNCTION update_restaurant_mention_count();

-- Backfill existing mention counts for all restaurants
UPDATE restaurants r
SET mentions_count = compute_restaurant_mention_count(r.id);

-- Update get_restaurant_analytics function to use mentions_count column and add breakdown
CREATE OR REPLACE FUNCTION get_restaurant_analytics(
  p_restaurant_id UUID,
  p_start_date DATE DEFAULT (NOW() - INTERVAL '30 days')::DATE,
  p_end_date DATE DEFAULT NOW()::DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_restaurant_id_text TEXT := p_restaurant_id::TEXT;
BEGIN
  SELECT json_build_object(
    'total_saves', (
      SELECT COUNT(DISTINCT br.id) FROM board_restaurants br
      WHERE br.restaurant_id = v_restaurant_id_text
    ),
    'saves_this_month', (
      SELECT COUNT(DISTINCT br.id) FROM board_restaurants br
      WHERE br.restaurant_id = v_restaurant_id_text
        AND br.added_at >= DATE_TRUNC('month', NOW())
    ),
    'saves_last_24h', (
      SELECT COUNT(DISTINCT br.id) FROM board_restaurants br
      WHERE br.restaurant_id = v_restaurant_id_text
        AND br.added_at >= NOW() - INTERVAL '24 hours'
    ),
    'is_trending', (
      SELECT COUNT(DISTINCT br.id) > 10 FROM board_restaurants br
      WHERE br.restaurant_id = v_restaurant_id_text
        AND br.added_at >= NOW() - INTERVAL '24 hours'
    ),
    'unique_savers', (
      SELECT COUNT(DISTINCT br.added_by) FROM board_restaurants br
      WHERE br.restaurant_id = v_restaurant_id_text
    ),
    'mentions_count', (
      -- Use column for performance
      SELECT COALESCE(mentions_count, 0) FROM restaurants
      WHERE id = p_restaurant_id
    ),
    'mentions_breakdown', (
      -- Detailed breakdown for analytics
      SELECT json_build_object(
        'comment_mentions', (
          SELECT COUNT(*) FROM restaurant_mentions rm
          JOIN post_comments pc ON rm.comment_id = pc.id
          WHERE rm.restaurant_id = p_restaurant_id
            AND pc.created_at >= p_start_date
            AND pc.created_at <= p_end_date
        ),
        'post_caption_mentions', (
          SELECT COUNT(*) FROM restaurant_mentions rm
          JOIN posts p ON rm.post_id = p.id
          WHERE rm.restaurant_id = p_restaurant_id
            AND p.created_at >= p_start_date
            AND p.created_at <= p_end_date
        ),
        'posts_about_restaurant', (
          SELECT COUNT(*) FROM posts p
          WHERE p.restaurant_id = p_restaurant_id
            AND p.created_at >= p_start_date
            AND p.created_at <= p_end_date
        )
      )
    ),
    'creator_posts_count', (
      SELECT COUNT(*) FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.restaurant_id = v_restaurant_id_text
        AND u.is_creator = true
        AND p.created_at >= p_start_date
        AND p.created_at <= p_end_date
    ),
    'total_post_likes', (
      SELECT COALESCE(SUM(likes_count), 0) FROM posts
      WHERE restaurant_id = v_restaurant_id_text
        AND created_at >= p_start_date
        AND created_at <= p_end_date
    ),
    'daily_saves', (
      SELECT COALESCE(json_agg(daily_data ORDER BY date DESC), '[]'::json)
      FROM (
        SELECT
          DATE_TRUNC('day', br.added_at)::DATE as date,
          COUNT(DISTINCT br.id) as count
        FROM board_restaurants br
        WHERE br.restaurant_id = v_restaurant_id_text
          AND br.added_at >= p_start_date
          AND br.added_at <= p_end_date
        GROUP BY DATE_TRUNC('day', br.added_at)
      ) daily_data
    ),
    'top_savers', (
      SELECT COALESCE(json_agg(saver_data), '[]'::json)
      FROM (
        SELECT
          u.id,
          u.username,
          u.avatar_url,
          COALESCE(u.is_creator, false) as is_creator,
          COUNT(DISTINCT br.id) as save_count
        FROM board_restaurants br
        JOIN users u ON br.added_by = u.id
        WHERE br.restaurant_id = v_restaurant_id_text
        GROUP BY u.id, u.username, u.avatar_url, u.is_creator
        ORDER BY save_count DESC
        LIMIT 10
      ) saver_data
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_restaurant_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION compute_restaurant_mention_count TO authenticated;
