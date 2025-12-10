-- ============================================================================
-- Creator Profiles & Discovery
-- ============================================================================
-- This migration enhances creator_profiles table with discovery features
-- including metrics, availability status, and filtering capabilities.
--
-- Task: CM-9
-- Reference: TRO-16 Product Requirement
-- ============================================================================

-- Enhance creator_profiles table
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS persona VARCHAR(100),
ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'available'
  CHECK (availability_status IN ('available', 'busy', 'not_accepting')),
ADD COLUMN IF NOT EXISTS open_to_collabs BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS collab_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_compensation TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS instagram_followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tiktok_followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS youtube_followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS twitter_followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_followers INTEGER GENERATED ALWAYS AS (
  COALESCE(instagram_followers, 0) +
  COALESCE(tiktok_followers, 0) +
  COALESCE(youtube_followers, 0) +
  COALESCE(twitter_followers, 0)
) STORED,
ADD COLUMN IF NOT EXISTS troodie_posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS troodie_likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS troodie_comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS troodie_engagement_rate DECIMAL(5,2) GENERATED ALWAYS AS (
  CASE
    WHEN troodie_posts_count > 0 THEN
      ((COALESCE(troodie_likes_count, 0) + COALESCE(troodie_comments_count, 0))::DECIMAL /
       troodie_posts_count::DECIMAL) * 100
    ELSE 0
  END
) STORED,
ADD COLUMN IF NOT EXISTS featured_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_rank INTEGER DEFAULT 0;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_creator_profiles_location
ON creator_profiles(location) WHERE open_to_collabs = true;

CREATE INDEX IF NOT EXISTS idx_creator_profiles_followers
ON creator_profiles(total_followers DESC) WHERE open_to_collabs = true;

CREATE INDEX IF NOT EXISTS idx_creator_profiles_engagement
ON creator_profiles(troodie_engagement_rate DESC) WHERE open_to_collabs = true;

-- Sample posts view
CREATE OR REPLACE VIEW creator_sample_posts AS
SELECT
  cp.id as creator_profile_id,
  p.id as post_id,
  p.caption,
  p.photos[1] as image_url, -- Get first photo from array
  p.likes_count,
  p.comments_count,
  p.created_at,
  r.name as restaurant_name,
  ROW_NUMBER() OVER (PARTITION BY cp.id ORDER BY p.likes_count DESC) as rank
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
JOIN posts p ON p.user_id = u.id
LEFT JOIN restaurants r ON p.restaurant_id::UUID = r.id
WHERE p.photos IS NOT NULL AND array_length(p.photos, 1) > 0;

COMMENT ON VIEW creator_sample_posts IS
'View showing top posts for each creator, ranked by likes.';

-- Function to get creators with filters
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
    COALESCE(cp.display_name, u.name, u.username) as display_name,
    cp.bio,
    cp.location,
    u.avatar_url,
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
'Returns filtered list of creators open to collaborations with sample posts.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_creators TO authenticated;

-- Function to update creator metrics (run periodically)
CREATE OR REPLACE FUNCTION update_creator_metrics()
RETURNS void AS $$
BEGIN
  UPDATE creator_profiles cp
  SET
    troodie_posts_count = sub.posts_count,
    troodie_likes_count = sub.likes_count,
    troodie_comments_count = sub.comments_count
  FROM (
    SELECT
      u.id as user_id,
      COUNT(p.id) as posts_count,
      COALESCE(SUM(p.likes_count), 0) as likes_count,
      COALESCE(SUM(p.comments_count), 0) as comments_count
    FROM users u
    LEFT JOIN posts p ON p.user_id = u.id
    WHERE u.is_creator = true
    GROUP BY u.id
  ) sub
  WHERE cp.user_id = sub.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_creator_metrics IS
'Updates creator metrics from posts. Should be run periodically (every 6 hours).';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_creator_metrics TO authenticated;

-- Initial metrics update for existing creators
SELECT update_creator_metrics();

