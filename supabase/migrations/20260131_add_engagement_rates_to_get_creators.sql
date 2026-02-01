-- ============================================================================
-- Add Instagram/TikTok engagement rates to get_creators() function
-- ============================================================================
-- The troodie_engagement_rate is based on Troodie platform activity, which
-- is often 0 for creators who haven't posted on Troodie yet. This update
-- adds instagram_engagement_rate and tiktok_engagement_rate so the UI can
-- use these as fallbacks.
-- Date: 2026-01-31
-- ============================================================================

-- Drop existing function to update return type
DROP FUNCTION IF EXISTS get_creators(text,integer,integer,numeric,text[],text,integer,integer);

CREATE OR REPLACE FUNCTION get_creators(
  p_city TEXT DEFAULT NULL,
  p_min_followers INTEGER DEFAULT NULL,
  p_max_followers INTEGER DEFAULT NULL,
  p_min_engagement DECIMAL DEFAULT NULL,
  p_compensation_types TEXT[] DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'engagement',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  bio TEXT,
  location TEXT,
  avatar_url TEXT,
  total_followers INTEGER,
  troodie_engagement_rate DECIMAL,
  open_to_collabs BOOLEAN,
  availability_status TEXT,
  specialties TEXT[],
  sample_posts JSON,
  primary_city TEXT,
  instagram_handle TEXT,
  instagram_followers INTEGER,
  instagram_engagement_rate DECIMAL,  -- NEW
  tiktok_handle TEXT,
  tiktok_followers INTEGER,
  tiktok_engagement_rate DECIMAL,     -- NEW
  preferred_compensation TEXT[],
  last_active_at TIMESTAMPTZ
) AS $$
DECLARE
  is_current_user_test BOOLEAN;
BEGIN
  -- Check if current user is a test user
  is_current_user_test := current_user_is_test();

  RETURN QUERY
  SELECT
    cp.id,
    cp.user_id,
    COALESCE(cp.display_name, u.name, u.username)::TEXT as display_name,
    cp.bio::TEXT,
    cp.location::TEXT,
    u.avatar_url::TEXT,
    cp.total_followers,
    cp.troodie_engagement_rate,
    cp.open_to_collabs,
    cp.availability_status::TEXT,
    cp.specialties,
    (
      SELECT COALESCE(json_agg(sample ORDER BY sample.rank), '[]'::json)
      FROM (
        SELECT
          post_id,
          caption,
          image_url,
          likes_count,
          restaurant_name,
          rank
        FROM creator_sample_posts
        WHERE creator_profile_id = cp.id AND rank <= 3
      ) sample
    ) as sample_posts,
    cp.primary_city::TEXT,
    cp.instagram_handle::TEXT,
    cp.instagram_followers,
    cp.instagram_engagement_rate,  -- NEW
    cp.tiktok_handle::TEXT,
    cp.tiktok_followers,
    cp.tiktok_engagement_rate,     -- NEW
    cp.preferred_compensation,
    u.updated_at as last_active_at
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE cp.open_to_collabs = true
    AND u.account_type = 'creator'
    AND (cp.availability_status = 'available' OR cp.availability_status = 'busy')
    -- TEST USER ISOLATION
    AND (
      is_current_user_test = true
      OR u.is_test_account IS NOT TRUE
    )
    -- City filter (check both location and primary_city)
    AND (p_city IS NULL
         OR LOWER(cp.location) LIKE LOWER('%' || p_city || '%')
         OR LOWER(cp.primary_city) LIKE LOWER('%' || p_city || '%'))
    -- Follower range filter
    AND (p_min_followers IS NULL OR cp.total_followers >= p_min_followers)
    AND (p_max_followers IS NULL OR cp.total_followers <= p_max_followers)
    -- Engagement filter
    AND (p_min_engagement IS NULL OR cp.troodie_engagement_rate >= p_min_engagement)
    -- Compensation filter (match any of the provided types)
    AND (p_compensation_types IS NULL
         OR p_compensation_types = '{}'::TEXT[]
         OR cp.preferred_compensation && p_compensation_types)
  ORDER BY
    CASE p_sort_by
      WHEN 'recentlyActive' THEN 1
      WHEN 'followersHigh' THEN 2
      WHEN 'followersLow' THEN 3
      ELSE 4  -- Default: engagement-based
    END,
    CASE WHEN p_sort_by = 'recentlyActive' THEN u.updated_at END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'followersHigh' THEN cp.total_followers END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'followersLow' THEN cp.total_followers END ASC NULLS LAST,
    -- Default sorting: prioritize social engagement over troodie engagement
    CASE WHEN p_sort_by NOT IN ('recentlyActive', 'followersHigh', 'followersLow') THEN cp.featured_at END DESC NULLS LAST,
    CASE WHEN p_sort_by NOT IN ('recentlyActive', 'followersHigh', 'followersLow') THEN
      COALESCE(cp.instagram_engagement_rate, cp.tiktok_engagement_rate, cp.troodie_engagement_rate, 0)
    END DESC,
    CASE WHEN p_sort_by NOT IN ('recentlyActive', 'followersHigh', 'followersLow') THEN cp.total_followers END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_creators IS
'Enhanced creator discovery with advanced filtering and sorting.
Now includes instagram_engagement_rate and tiktok_engagement_rate for better engagement display.
Filters: city, follower range (for buckets), compensation types.
Sort options: recentlyActive, followersHigh, followersLow, or default engagement-based.';

GRANT EXECUTE ON FUNCTION get_creators TO authenticated;
