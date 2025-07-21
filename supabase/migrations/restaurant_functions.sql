-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Function to find nearby restaurants
CREATE OR REPLACE FUNCTION nearby_restaurants(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    ST_Distance(
      r.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_meters
  FROM restaurants r
  WHERE ST_DWithin(
    r.location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Function to search restaurants with relevance scoring
CREATE OR REPLACE FUNCTION search_restaurants_ranked(
  search_query TEXT,
  user_location GEOGRAPHY DEFAULT NULL,
  max_distance_meters INTEGER DEFAULT 50000
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  relevance_score DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT 
      r.id,
      r.name,
      r.location,
      -- Text search relevance
      ts_rank(
        to_tsvector('english', r.name || ' ' || COALESCE(array_to_string(r.cuisine_types, ' '), '')),
        plainto_tsquery('english', search_query)
      ) as text_relevance,
      -- Popularity score
      COALESCE(rp.avg_rating, 0) * COALESCE(LOG(rp.total_saves + 1), 0) as popularity_score
    FROM restaurants r
    LEFT JOIN restaurant_popularity rp ON r.id = rp.id
    WHERE 
      to_tsvector('english', r.name || ' ' || COALESCE(array_to_string(r.cuisine_types, ' '), ''))
      @@ plainto_tsquery('english', search_query)
  )
  SELECT 
    sr.id,
    sr.name,
    -- Combined relevance score
    (sr.text_relevance * 100 + sr.popularity_score) as relevance_score,
    -- Distance if location provided
    CASE 
      WHEN user_location IS NOT NULL THEN
        ST_Distance(sr.location::geography, user_location)
      ELSE NULL
    END as distance_meters
  FROM search_results sr
  WHERE 
    user_location IS NULL OR
    ST_DWithin(sr.location::geography, user_location, max_distance_meters)
  ORDER BY relevance_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get restaurant recommendations based on persona
CREATE OR REPLACE FUNCTION get_persona_recommendations(
  user_persona VARCHAR,
  user_location GEOGRAPHY DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  score DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  WITH persona_preferences AS (
    SELECT 
      CASE user_persona
        WHEN 'trendsetter' THEN ARRAY['Contemporary', 'Trendy', 'New American']
        WHEN 'culinary_adventurer' THEN ARRAY['International', 'Fusion', 'Ethnic']
        WHEN 'luxe_planner' THEN ARRAY['Fine Dining', 'French', 'Steakhouse']
        WHEN 'hidden_gem_hunter' THEN ARRAY['Local', 'Family-owned', 'Hole-in-the-wall']
        WHEN 'comfort_seeker' THEN ARRAY['Comfort Food', 'American', 'Diner']
        WHEN 'budget_foodie' THEN ARRAY['Casual', 'Fast Casual', 'Street Food']
        WHEN 'social_explorer' THEN ARRAY['Trendy', 'Bar', 'Brewery']
        WHEN 'local_expert' THEN ARRAY['Local Favorite', 'Neighborhood', 'Classic']
        ELSE ARRAY['American', 'Contemporary']
      END as preferred_cuisines,
      CASE user_persona
        WHEN 'luxe_planner' THEN ARRAY['$$$$', '$$$']
        WHEN 'budget_foodie' THEN ARRAY['$', '$$']
        ELSE ARRAY['$$', '$$$']
      END as preferred_price_range
  )
  SELECT 
    r.id,
    r.name,
    -- Scoring based on persona preferences
    (
      -- Cuisine match score
      CASE 
        WHEN r.cuisine_types && pp.preferred_cuisines THEN 50
        ELSE 0
      END +
      -- Price range match score
      CASE 
        WHEN r.price_range = ANY(pp.preferred_price_range) THEN 30
        ELSE 0
      END +
      -- Rating score
      COALESCE(r.google_rating * 4, 0) +
      -- Distance penalty (if location provided)
      CASE 
        WHEN user_location IS NOT NULL THEN
          GREATEST(0, 20 - (ST_Distance(r.location::geography, user_location) / 1000))
        ELSE 0
      END
    ) as score
  FROM restaurants r, persona_preferences pp
  ORDER BY score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to track API usage for cost monitoring
CREATE OR REPLACE FUNCTION track_api_usage(
  p_api_name VARCHAR,
  p_endpoint VARCHAR,
  p_user_id UUID DEFAULT NULL,
  p_cost_estimate DECIMAL DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  usage_id UUID;
BEGIN
  INSERT INTO api_usage_tracking (api_name, endpoint, user_id, cost_estimate)
  VALUES (p_api_name, p_endpoint, p_user_id, p_cost_estimate)
  RETURNING id INTO usage_id;
  
  RETURN usage_id;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_restaurants_name_gin ON restaurants USING GIN(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine_gin ON restaurants USING GIN(cuisine_types);
CREATE INDEX IF NOT EXISTS idx_restaurants_price ON restaurants(price_range);
CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants(google_rating DESC);

-- Create the restaurant popularity materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS restaurant_popularity AS
SELECT 
    r.id,
    COUNT(DISTINCT rs.id) as total_saves,
    AVG(rs.personal_rating) as avg_rating,
    COUNT(DISTINCT rs.user_id) as unique_savers,
    MAX(rs.created_at) as last_saved
FROM restaurants r
LEFT JOIN restaurant_saves rs ON r.id = rs.restaurant_id
GROUP BY r.id;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_restaurant_popularity_id ON restaurant_popularity(id);

-- Function to refresh the materialized view (to be called periodically)
CREATE OR REPLACE FUNCTION refresh_restaurant_popularity()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY restaurant_popularity;
END;
$$ LANGUAGE plpgsql;