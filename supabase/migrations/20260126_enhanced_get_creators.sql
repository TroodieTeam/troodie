-- ============================================================================
-- TRO-145: Enhanced get_creators() function with advanced filtering and sorting
-- ============================================================================
-- Adds:
-- - Follower count range filtering (min/max for bucket support)
-- - Preferred compensation filtering
-- - Sort options: recently_active, followers_high, followers_low
-- - Returns new fields: preferred_compensation, instagram_handle, tiktok_handle, primary_city
-- Date: 2026-01-26
-- ============================================================================

-- Drop existing function first since we're changing parameters and return type
DROP FUNCTION IF EXISTS get_creators(text,integer,numeric,text[],integer,integer);

CREATE OR REPLACE FUNCTION get_creators(
  p_city TEXT DEFAULT NULL,
  p_min_followers INTEGER DEFAULT NULL,
  p_max_followers INTEGER DEFAULT NULL,           -- NEW: for bucket filtering
  p_min_engagement DECIMAL DEFAULT NULL,
  p_compensation_types TEXT[] DEFAULT NULL,        -- NEW: filter by compensation
  p_sort_by TEXT DEFAULT 'engagement',             -- NEW: sort option
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
  -- TRO-144: New fields
  primary_city TEXT,
  instagram_handle TEXT,
  instagram_followers INTEGER,
  tiktok_handle TEXT,
  tiktok_followers INTEGER,
  preferred_compensation TEXT[],
  last_active_at TIMESTAMPTZ  -- For recently active sorting
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
    -- TRO-144: New fields
    cp.primary_city::TEXT,
    cp.instagram_handle::TEXT,
    cp.instagram_followers,
    cp.tiktok_handle::TEXT,
    cp.tiktok_followers,
    cp.preferred_compensation,
    u.updated_at as last_active_at  -- Use updated_at as proxy for last active
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
    -- Default sorting (when not using specific sort)
    CASE WHEN p_sort_by NOT IN ('recentlyActive', 'followersHigh', 'followersLow') THEN cp.featured_at END DESC NULLS LAST,
    CASE WHEN p_sort_by NOT IN ('recentlyActive', 'followersHigh', 'followersLow') THEN cp.troodie_engagement_rate END DESC,
    CASE WHEN p_sort_by NOT IN ('recentlyActive', 'followersHigh', 'followersLow') THEN cp.total_followers END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_creators IS
'TRO-145: Enhanced creator discovery with advanced filtering and sorting.
Filters: city, follower range (for buckets), compensation types.
Sort options: recentlyActive, followersHigh, followersLow, or default engagement-based.
Returns extended creator info including social handles and compensation preferences.';

GRANT EXECUTE ON FUNCTION get_creators TO authenticated;
