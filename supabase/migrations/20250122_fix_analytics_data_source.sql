-- ============================================================================
-- Fix Restaurant Analytics Data Source
-- ============================================================================
-- This migration fixes the analytics function to query board_restaurants
-- instead of the legacy restaurant_saves table.
--
-- Issue: Analytics were querying restaurant_saves but app saves to board_restaurants
-- Reference: RESTAURANT_SAVES_ANALYTICS_AUDIT_FINDINGS.md
-- ============================================================================

-- Update analytics function to use board_restaurants
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
      SELECT COUNT(DISTINCT br.id) FROM board_restaurants br
      WHERE br.restaurant_id = p_restaurant_id
    ),
    'saves_this_month', (
      SELECT COUNT(DISTINCT br.id) FROM board_restaurants br
      WHERE br.restaurant_id = p_restaurant_id
        AND br.added_at >= DATE_TRUNC('month', NOW())
    ),
    'saves_last_24h', (
      SELECT COUNT(DISTINCT br.id) FROM board_restaurants br
      WHERE br.restaurant_id = p_restaurant_id
        AND br.added_at >= NOW() - INTERVAL '24 hours'
    ),
    'is_trending', (
      SELECT COUNT(DISTINCT br.id) > 10 FROM board_restaurants br
      WHERE br.restaurant_id = p_restaurant_id
        AND br.added_at >= NOW() - INTERVAL '24 hours'
    ),
    'unique_savers', (
      SELECT COUNT(DISTINCT br.added_by) FROM board_restaurants br
      WHERE br.restaurant_id = p_restaurant_id
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
          DATE_TRUNC('day', br.added_at)::DATE as date,
          COUNT(DISTINCT br.id) as count
        FROM board_restaurants br
        WHERE br.restaurant_id = p_restaurant_id
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
          u.is_creator,
          COUNT(DISTINCT br.id) as save_count
        FROM board_restaurants br
        JOIN users u ON br.added_by = u.id
        WHERE br.restaurant_id = p_restaurant_id
        GROUP BY u.id, u.username, u.avatar_url, u.is_creator
        ORDER BY COUNT(DISTINCT br.id) DESC
        LIMIT 10
      ) saver_data
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_restaurant_analytics IS
'Returns comprehensive analytics for a restaurant including saves (from board_restaurants), mentions, creator posts, and trending status. Updated to use board_restaurants instead of legacy restaurant_saves table.';

-- Update analytics summary view to use board_restaurants
CREATE OR REPLACE VIEW restaurant_analytics_summary AS
SELECT
  r.id as restaurant_id,
  r.name as restaurant_name,
  COUNT(DISTINCT br.id) as total_saves,
  COUNT(DISTINCT br.id) FILTER (WHERE br.added_at >= NOW() - INTERVAL '24 hours') as saves_24h,
  COUNT(DISTINCT p.id) as total_posts,
  COUNT(DISTINCT p.id) FILTER (WHERE u.is_creator = true) as creator_posts,
  COALESCE(SUM(p.likes_count), 0) as total_likes
FROM restaurants r
LEFT JOIN board_restaurants br ON br.restaurant_id = r.id::uuid
LEFT JOIN posts p ON p.restaurant_id = r.id
LEFT JOIN users u ON p.user_id = u.id
GROUP BY r.id, r.name;

COMMENT ON VIEW restaurant_analytics_summary IS
'Summary view of restaurant analytics for quick lookups. Updated to use board_restaurants instead of legacy restaurant_saves table.';

