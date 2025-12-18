-- ============================================================================
-- Restaurant Analytics Dashboard
-- ============================================================================
-- This migration creates analytics functions and views for restaurant owners
-- to view their performance metrics including saves, mentions, creator posts,
-- and trending status.
--
-- Task: CM-6
-- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.8
-- ============================================================================

-- Function to get restaurant analytics
CREATE OR REPLACE FUNCTION get_restaurant_analytics(
  p_restaurant_id UUID,
  p_start_date DATE DEFAULT (NOW() - INTERVAL '30 days')::DATE,
  p_end_date DATE DEFAULT NOW()::DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_saves', (
      SELECT COUNT(*) FROM restaurant_saves
      WHERE restaurant_id = p_restaurant_id
    ),
    'saves_this_month', (
      SELECT COUNT(*) FROM restaurant_saves
      WHERE restaurant_id = p_restaurant_id
        AND created_at >= DATE_TRUNC('month', NOW())
    ),
    'saves_last_24h', (
      SELECT COUNT(*) FROM restaurant_saves
      WHERE restaurant_id = p_restaurant_id
        AND created_at >= NOW() - INTERVAL '24 hours'
    ),
    'is_trending', (
      SELECT COUNT(*) > 10 FROM restaurant_saves
      WHERE restaurant_id = p_restaurant_id
        AND created_at >= NOW() - INTERVAL '24 hours'
    ),
    'mentions_count', (
      SELECT COUNT(*) FROM posts
      WHERE restaurant_id = p_restaurant_id
        AND created_at >= p_start_date
        AND created_at <= p_end_date
    ),
    'creator_posts_count', (
      SELECT COUNT(*) FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.restaurant_id = p_restaurant_id
        AND u.is_creator = true
        AND p.created_at >= p_start_date
        AND p.created_at <= p_end_date
    ),
    'total_post_likes', (
      SELECT COALESCE(SUM(likes_count), 0) FROM posts
      WHERE restaurant_id = p_restaurant_id
        AND created_at >= p_start_date
        AND created_at <= p_end_date
    ),
    'daily_saves', (
      SELECT COALESCE(json_agg(daily_data ORDER BY date DESC), '[]'::json)
      FROM (
        SELECT
          DATE_TRUNC('day', created_at)::DATE as date,
          COUNT(*) as count
        FROM restaurant_saves
        WHERE restaurant_id = p_restaurant_id
          AND created_at >= p_start_date
          AND created_at <= p_end_date
        GROUP BY DATE_TRUNC('day', created_at)
      ) daily_data
    ),
    'top_savers', (
      SELECT COALESCE(json_agg(saver_data), '[]'::json)
      FROM (
        SELECT
          u.id,
          u.username,
          u.avatar_url,
          u.is_creator,
          COUNT(*) as save_count
        FROM restaurant_saves rs
        JOIN users u ON rs.user_id = u.id
        WHERE rs.restaurant_id = p_restaurant_id
        GROUP BY u.id, u.username, u.avatar_url, u.is_creator
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) saver_data
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_restaurant_analytics IS
'Returns comprehensive analytics for a restaurant including saves, mentions, creator posts, and trending status. Only accessible by restaurant owners.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_restaurant_analytics TO authenticated;

-- Create view for monitoring auto-approval status (if not exists from CM-5)
CREATE OR REPLACE VIEW restaurant_analytics_summary AS
SELECT
  r.id as restaurant_id,
  r.name as restaurant_name,
  COUNT(DISTINCT rs.id) as total_saves,
  COUNT(DISTINCT rs.id) FILTER (WHERE rs.created_at >= NOW() - INTERVAL '24 hours') as saves_24h,
  COUNT(DISTINCT p.id) as total_posts,
  COUNT(DISTINCT p.id) FILTER (WHERE u.is_creator = true) as creator_posts,
  COALESCE(SUM(p.likes_count), 0) as total_likes
FROM restaurants r
LEFT JOIN restaurant_saves rs ON rs.restaurant_id = r.id
LEFT JOIN posts p ON p.restaurant_id = r.id
LEFT JOIN users u ON p.user_id = u.id
GROUP BY r.id, r.name;

COMMENT ON VIEW restaurant_analytics_summary IS
'Summary view of restaurant analytics for quick lookups.';

