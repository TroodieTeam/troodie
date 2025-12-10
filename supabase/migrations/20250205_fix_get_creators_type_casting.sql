-- ============================================================================
-- Fix get_creators() function type casting
-- ============================================================================
-- Fixes PostgreSQL type mismatch error where VARCHAR columns need to be
-- explicitly cast to TEXT to match the function return type.
-- Error: "Returned type character varying does not match expected type text in column 3"
-- Date: 2025-02-05
-- ============================================================================

CREATE OR REPLACE FUNCTION get_creators(
  p_city TEXT DEFAULT NULL,
  p_min_followers INTEGER DEFAULT NULL,
  p_min_engagement DECIMAL DEFAULT NULL,
  p_collab_types TEXT[] DEFAULT NULL,
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
  specialties TEXT[],
  sample_posts JSON
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
    ) as sample_posts
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE cp.open_to_collabs = true
    AND u.account_type = 'creator'
    AND (cp.availability_status = 'available' OR cp.availability_status = 'busy')
    -- TEST USER ISOLATION: Only show test users to other test users
    AND (
      is_current_user_test = true  -- Test users can see all creators
      OR u.is_test_account IS NOT TRUE  -- Production users only see non-test creators
    )
    AND (p_city IS NULL OR LOWER(cp.location) LIKE LOWER('%' || p_city || '%'))
    AND (p_min_followers IS NULL OR cp.total_followers >= p_min_followers)
    AND (p_min_engagement IS NULL OR cp.troodie_engagement_rate >= p_min_engagement)
  ORDER BY
    cp.featured_at DESC NULLS LAST,
    cp.troodie_engagement_rate DESC,
    cp.total_followers DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_creators IS
'Returns filtered list of creators. CRITICAL: Only includes users with account_type = ''creator''. Business users with creator_profiles are excluded. Test users are hidden from production users but visible to other test users. Fixed type casting for VARCHAR to TEXT.';

GRANT EXECUTE ON FUNCTION get_creators TO authenticated;
