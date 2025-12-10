-- ============================================================================
-- Fix get_creators function type mismatch
-- ============================================================================
-- Fixes PostgreSQL type mismatch error where VARCHAR columns need to be
-- explicitly cast to TEXT to match the function return type.
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
BEGIN
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
    AND (p_city IS NULL OR LOWER(cp.location) LIKE LOWER('%' || p_city || '%'))
    AND (p_min_followers IS NULL OR cp.total_followers >= p_min_followers)
    AND (p_min_engagement IS NULL OR cp.troodie_engagement_rate >= p_min_engagement)
    AND (p_collab_types IS NULL OR cp.collab_types && p_collab_types)
  ORDER BY
    cp.featured_at DESC NULLS LAST,
    cp.troodie_engagement_rate DESC,
    cp.total_followers DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_creators IS
'Returns filtered list of creators open to collaborations with sample posts. Fixed type casting for VARCHAR to TEXT.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_creators TO authenticated;

