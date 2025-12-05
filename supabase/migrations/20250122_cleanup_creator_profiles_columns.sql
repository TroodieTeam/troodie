-- ============================================================================
-- Cleanup unused creator_profiles columns
-- ============================================================================
-- Removes columns that were added speculatively but provide no value
-- See: .tasks/creator-marketplace-audit-findings.md Section 5
-- Task: CM-10
-- Date: 2025-01-22
-- ============================================================================

-- Drop unused columns
ALTER TABLE creator_profiles
DROP COLUMN IF EXISTS persona,
DROP COLUMN IF EXISTS collab_types,
DROP COLUMN IF EXISTS preferred_compensation;

-- Drop all existing get_creators() function overloads to avoid ambiguity
-- PostgreSQL allows function overloading, so we need to drop all signatures first
DROP FUNCTION IF EXISTS get_creators(TEXT, INTEGER, DECIMAL, TEXT[], INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_creators(TEXT, INTEGER, DECIMAL, INTEGER, INTEGER);

-- Update get_creators() function to keep p_collab_types parameter for compatibility
-- but ignore it since the collab_types column no longer exists
CREATE OR REPLACE FUNCTION get_creators(
  p_city TEXT DEFAULT NULL,
  p_min_followers INTEGER DEFAULT NULL,
  p_min_engagement DECIMAL DEFAULT NULL,
  p_collab_types TEXT[] DEFAULT NULL,  -- Kept for compatibility, but ignored
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
    AND u.account_type = 'creator'
    AND (cp.availability_status = 'available' OR cp.availability_status = 'busy')  -- CM-11: Filter out 'not_accepting'
    AND (p_city IS NULL OR LOWER(cp.location) LIKE LOWER('%' || p_city || '%'))
    AND (p_min_followers IS NULL OR cp.total_followers >= p_min_followers)
    AND (p_min_engagement IS NULL OR cp.troodie_engagement_rate >= p_min_engagement)
    -- Note: p_collab_types parameter is ignored since collab_types column was removed
  ORDER BY
    cp.featured_at DESC NULLS LAST,
    cp.troodie_engagement_rate DESC,
    cp.total_followers DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_creators IS
'Returns filtered list of creators open to collaborations with sample posts, filtered by account_type = ''creator''. The p_collab_types parameter is kept for backward compatibility but is ignored since the collab_types column was removed.';

-- Add comment explaining remaining future columns
COMMENT ON COLUMN creator_profiles.featured_at IS
'Reserved for future "Creator Spotlight" feature - not currently used';

COMMENT ON COLUMN creator_profiles.search_rank IS
'Reserved for future admin curation tool - not currently used';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_creators TO authenticated;

