-- Community Discovery Features Migration
-- Adds trending, recommendation, and discovery capabilities to communities

-- Add discovery-related fields to communities table
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS activity_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trending_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cuisines TEXT[] DEFAULT '{}';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_communities_trending ON communities(trending_score DESC, activity_score DESC);
CREATE INDEX IF NOT EXISTS idx_communities_featured ON communities(featured_until) WHERE featured_until > NOW();
CREATE INDEX IF NOT EXISTS idx_communities_category ON communities(category);
CREATE INDEX IF NOT EXISTS idx_communities_location ON communities(location);
CREATE INDEX IF NOT EXISTS idx_communities_tags ON communities USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_communities_cuisines ON communities USING GIN(cuisines);

-- Community activity tracking table
CREATE TABLE IF NOT EXISTS community_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  activity_type VARCHAR NOT NULL CHECK (activity_type IN ('join', 'post', 'comment', 'share', 'visit')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_activity_community ON community_activity(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_activity_user ON community_activity(user_id, created_at DESC);

-- Community interests (for personalization)
CREATE TABLE IF NOT EXISTS user_community_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest_type VARCHAR NOT NULL CHECK (interest_type IN ('cuisine', 'location', 'category', 'tag')),
  interest_value TEXT NOT NULL,
  score INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, interest_type, interest_value)
);

CREATE INDEX IF NOT EXISTS idx_user_community_interests_user ON user_community_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_community_interests_type_value ON user_community_interests(interest_type, interest_value);

-- Function to update community activity score
CREATE OR REPLACE FUNCTION update_community_activity_score(p_community_id UUID)
RETURNS VOID AS $$
DECLARE
  v_member_count INTEGER;
  v_post_count INTEGER;
  v_recent_activity_count INTEGER;
  v_activity_score INTEGER;
BEGIN
  -- Get member count
  SELECT COUNT(*) INTO v_member_count
  FROM community_members
  WHERE community_id = p_community_id AND status = 'active';
  
  -- Get post count
  SELECT COUNT(*) INTO v_post_count
  FROM community_posts
  WHERE community_id = p_community_id AND deleted_at IS NULL;
  
  -- Get recent activity (last 7 days)
  SELECT COUNT(*) INTO v_recent_activity_count
  FROM community_activity
  WHERE community_id = p_community_id
    AND created_at > NOW() - INTERVAL '7 days';
  
  -- Calculate activity score
  v_activity_score := (v_member_count * 10) + (v_post_count * 5) + (v_recent_activity_count * 2);
  
  -- Update community
  UPDATE communities
  SET 
    activity_score = v_activity_score,
    member_count = v_member_count,
    post_count = v_post_count,
    last_activity_at = NOW()
  WHERE id = p_community_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate trending score
CREATE OR REPLACE FUNCTION calculate_trending_score(p_community_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_recent_joins INTEGER;
  v_recent_posts INTEGER;
  v_recent_activity INTEGER;
  v_age_days INTEGER;
  v_trending_score INTEGER;
BEGIN
  -- Recent joins (last 3 days)
  SELECT COUNT(*) INTO v_recent_joins
  FROM community_members
  WHERE community_id = p_community_id
    AND joined_at > NOW() - INTERVAL '3 days'
    AND status = 'active';
  
  -- Recent posts (last 3 days)
  SELECT COUNT(*) INTO v_recent_posts
  FROM community_posts
  WHERE community_id = p_community_id
    AND created_at > NOW() - INTERVAL '3 days'
    AND deleted_at IS NULL;
  
  -- Recent activity (last 24 hours)
  SELECT COUNT(*) INTO v_recent_activity
  FROM community_activity
  WHERE community_id = p_community_id
    AND created_at > NOW() - INTERVAL '24 hours';
  
  -- Age of community in days
  SELECT EXTRACT(DAY FROM NOW() - created_at) INTO v_age_days
  FROM communities
  WHERE id = p_community_id;
  
  -- Calculate trending score (newer communities get a boost)
  v_trending_score := (v_recent_joins * 20) + 
                     (v_recent_posts * 15) + 
                     (v_recent_activity * 5) +
                     CASE 
                       WHEN v_age_days < 7 THEN 100
                       WHEN v_age_days < 30 THEN 50
                       ELSE 0
                     END;
  
  RETURN v_trending_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get featured communities
CREATE OR REPLACE FUNCTION get_featured_communities(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  location TEXT,
  category VARCHAR,
  cover_image_url TEXT,
  member_count INTEGER,
  post_count INTEGER,
  tags TEXT[],
  cuisines TEXT[],
  is_featured BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.location,
    c.category,
    c.cover_image_url,
    c.member_count,
    c.post_count,
    c.tags,
    c.cuisines,
    CASE 
      WHEN c.featured_until > NOW() THEN true 
      ELSE false 
    END as is_featured
  FROM communities c
  WHERE c.is_active = true
  ORDER BY 
    CASE WHEN c.featured_until > NOW() THEN 0 ELSE 1 END,
    c.trending_score DESC,
    c.activity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending communities
CREATE OR REPLACE FUNCTION get_trending_communities(
  p_location TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  location TEXT,
  category VARCHAR,
  cover_image_url TEXT,
  member_count INTEGER,
  post_count INTEGER,
  trending_score INTEGER,
  tags TEXT[],
  cuisines TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.location,
    c.category,
    c.cover_image_url,
    c.member_count,
    c.post_count,
    c.trending_score,
    c.tags,
    c.cuisines
  FROM communities c
  WHERE c.is_active = true
    AND (p_location IS NULL OR c.location ILIKE '%' || p_location || '%')
  ORDER BY c.trending_score DESC, c.activity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get personalized community recommendations
CREATE OR REPLACE FUNCTION get_recommended_communities(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  location TEXT,
  category VARCHAR,
  cover_image_url TEXT,
  member_count INTEGER,
  post_count INTEGER,
  relevance_score INTEGER,
  tags TEXT[],
  cuisines TEXT[],
  recommendation_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_interests AS (
    -- Get user's interests from their activity
    SELECT DISTINCT
      interest_type,
      interest_value,
      SUM(score) as total_score
    FROM user_community_interests
    WHERE user_id = p_user_id
    GROUP BY interest_type, interest_value
  ),
  user_communities AS (
    -- Communities user is already in
    SELECT community_id
    FROM community_members
    WHERE user_id = p_user_id AND status = 'active'
  ),
  scored_communities AS (
    SELECT 
      c.id,
      c.name,
      c.description,
      c.location,
      c.category,
      c.cover_image_url,
      c.member_count,
      c.post_count,
      c.tags,
      c.cuisines,
      -- Calculate relevance score based on user interests
      COALESCE(
        (SELECT SUM(ui.total_score) 
         FROM user_interests ui 
         WHERE (ui.interest_type = 'location' AND c.location ILIKE '%' || ui.interest_value || '%')
            OR (ui.interest_type = 'category' AND c.category = ui.interest_value)
            OR (ui.interest_type = 'tag' AND ui.interest_value = ANY(c.tags))
            OR (ui.interest_type = 'cuisine' AND ui.interest_value = ANY(c.cuisines))
        ), 0
      ) + c.activity_score / 100 as relevance_score,
      -- Generate recommendation reason
      CASE 
        WHEN EXISTS (SELECT 1 FROM user_interests ui WHERE ui.interest_type = 'cuisine' AND ui.interest_value = ANY(c.cuisines)) THEN
          'Based on your interest in ' || (SELECT ui.interest_value FROM user_interests ui WHERE ui.interest_type = 'cuisine' AND ui.interest_value = ANY(c.cuisines) LIMIT 1)
        WHEN EXISTS (SELECT 1 FROM user_interests ui WHERE ui.interest_type = 'location' AND c.location ILIKE '%' || ui.interest_value || '%') THEN
          'Popular in ' || c.location
        WHEN c.trending_score > 100 THEN
          'Trending community'
        ELSE
          'You might like this'
      END as recommendation_reason
    FROM communities c
    WHERE c.is_active = true
      AND c.id NOT IN (SELECT community_id FROM user_communities)
  )
  SELECT 
    sc.id,
    sc.name,
    sc.description,
    sc.location,
    sc.category,
    sc.cover_image_url,
    sc.member_count,
    sc.post_count,
    sc.relevance_score::INTEGER,
    sc.tags,
    sc.cuisines,
    sc.recommendation_reason
  FROM scored_communities sc
  WHERE sc.relevance_score > 0
  ORDER BY sc.relevance_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to track community activity
CREATE OR REPLACE FUNCTION track_community_activity(
  p_community_id UUID,
  p_user_id UUID,
  p_activity_type VARCHAR
)
RETURNS VOID AS $$
BEGIN
  -- Insert activity record
  INSERT INTO community_activity (community_id, user_id, activity_type)
  VALUES (p_community_id, p_user_id, p_activity_type);
  
  -- Update community activity score
  PERFORM update_community_activity_score(p_community_id);
  
  -- Update trending score
  UPDATE communities
  SET trending_score = calculate_trending_score(p_community_id)
  WHERE id = p_community_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update user interests based on activity
CREATE OR REPLACE FUNCTION update_user_community_interests(
  p_user_id UUID,
  p_community_id UUID,
  p_action VARCHAR -- 'join', 'post', 'visit'
)
RETURNS VOID AS $$
DECLARE
  v_community RECORD;
  v_score INTEGER;
BEGIN
  -- Get community details
  SELECT * INTO v_community
  FROM communities
  WHERE id = p_community_id;
  
  -- Set score based on action
  v_score := CASE p_action
    WHEN 'join' THEN 5
    WHEN 'post' THEN 3
    WHEN 'visit' THEN 1
    ELSE 1
  END;
  
  -- Update location interest
  IF v_community.location IS NOT NULL THEN
    INSERT INTO user_community_interests (user_id, interest_type, interest_value, score)
    VALUES (p_user_id, 'location', v_community.location, v_score)
    ON CONFLICT (user_id, interest_type, interest_value)
    DO UPDATE SET 
      score = user_community_interests.score + v_score,
      updated_at = NOW();
  END IF;
  
  -- Update category interest
  IF v_community.category IS NOT NULL THEN
    INSERT INTO user_community_interests (user_id, interest_type, interest_value, score)
    VALUES (p_user_id, 'category', v_community.category, v_score)
    ON CONFLICT (user_id, interest_type, interest_value)
    DO UPDATE SET 
      score = user_community_interests.score + v_score,
      updated_at = NOW();
  END IF;
  
  -- Update tag interests
  IF array_length(v_community.tags, 1) > 0 THEN
    FOR i IN 1..array_length(v_community.tags, 1) LOOP
      INSERT INTO user_community_interests (user_id, interest_type, interest_value, score)
      VALUES (p_user_id, 'tag', v_community.tags[i], v_score)
      ON CONFLICT (user_id, interest_type, interest_value)
      DO UPDATE SET 
        score = user_community_interests.score + v_score,
        updated_at = NOW();
    END LOOP;
  END IF;
  
  -- Update cuisine interests
  IF array_length(v_community.cuisines, 1) > 0 THEN
    FOR i IN 1..array_length(v_community.cuisines, 1) LOOP
      INSERT INTO user_community_interests (user_id, interest_type, interest_value, score)
      VALUES (p_user_id, 'cuisine', v_community.cuisines[i], v_score)
      ON CONFLICT (user_id, interest_type, interest_value)
      DO UPDATE SET 
        score = user_community_interests.score + v_score,
        updated_at = NOW();
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track join activity
CREATE OR REPLACE FUNCTION trigger_track_community_join()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
    PERFORM track_community_activity(NEW.community_id, NEW.user_id, 'join');
    PERFORM update_user_community_interests(NEW.user_id, NEW.community_id, 'join');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_community_join ON community_members;
CREATE TRIGGER track_community_join
  AFTER INSERT OR UPDATE ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_track_community_join();

-- Trigger to track post activity
CREATE OR REPLACE FUNCTION trigger_track_community_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NULL THEN
    PERFORM track_community_activity(NEW.community_id, NEW.user_id, 'post');
    PERFORM update_user_community_interests(NEW.user_id, NEW.community_id, 'post');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_community_post ON community_posts;
CREATE TRIGGER track_community_post
  AFTER INSERT ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_track_community_post();

-- Update trending scores periodically (can be called via cron job)
CREATE OR REPLACE FUNCTION update_all_trending_scores()
RETURNS VOID AS $$
DECLARE
  v_community RECORD;
BEGIN
  FOR v_community IN SELECT id FROM communities WHERE is_active = true
  LOOP
    UPDATE communities
    SET trending_score = calculate_trending_score(v_community.id)
    WHERE id = v_community.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_featured_communities TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_communities TO authenticated;
GRANT EXECUTE ON FUNCTION get_recommended_communities TO authenticated;
GRANT EXECUTE ON FUNCTION track_community_activity TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_community_interests TO authenticated;