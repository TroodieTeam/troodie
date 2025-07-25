-- Migration: Traffic Light Rating System
-- Description: Implements traffic light rating system for restaurants
-- Author: Claude
-- Date: 2025-01-25

-- 1. Add traffic light rating to board_restaurants table (using board-based saves)
ALTER TABLE board_restaurants 
ADD COLUMN IF NOT EXISTS traffic_light_rating character varying 
CHECK (
  traffic_light_rating IS NULL OR
  traffic_light_rating IN ('red', 'yellow', 'green')
);

-- 2. Add rating summary fields to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS red_ratings_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS yellow_ratings_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS green_ratings_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_rating character varying DEFAULT 'neutral' 
CHECK (
  overall_rating IN ('red', 'yellow', 'green', 'neutral')
);

-- 3. Create function to update restaurant rating summary
CREATE OR REPLACE FUNCTION update_restaurant_rating_summary(p_restaurant_id character varying)
RETURNS void AS $$
DECLARE
  v_red_count integer;
  v_yellow_count integer;
  v_green_count integer;
  v_total_count integer;
  v_overall_rating character varying;
BEGIN
  -- Count ratings by type from board_restaurants
  SELECT 
    COUNT(*) FILTER (WHERE traffic_light_rating = 'red'),
    COUNT(*) FILTER (WHERE traffic_light_rating = 'yellow'),
    COUNT(*) FILTER (WHERE traffic_light_rating = 'green'),
    COUNT(*) FILTER (WHERE traffic_light_rating IS NOT NULL)
  INTO v_red_count, v_yellow_count, v_green_count, v_total_count
  FROM board_restaurants
  WHERE restaurant_id = p_restaurant_id;
  
  -- Calculate overall rating
  IF v_total_count = 0 THEN
    v_overall_rating := 'neutral';
  ELSIF v_green_count > (v_red_count + v_yellow_count) THEN
    v_overall_rating := 'green';
  ELSIF v_red_count > (v_green_count + v_yellow_count) THEN
    v_overall_rating := 'red';
  ELSE
    v_overall_rating := 'yellow';
  END IF;
  
  -- Update restaurant rating summary
  UPDATE restaurants 
  SET 
    red_ratings_count = v_red_count,
    yellow_ratings_count = v_yellow_count,
    green_ratings_count = v_green_count,
    total_ratings_count = v_total_count,
    overall_rating = v_overall_rating,
    updated_at = NOW()
  WHERE id = p_restaurant_id::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to update rating summary when board_restaurants changes
CREATE OR REPLACE FUNCTION trigger_update_rating_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Only update if traffic_light_rating is involved
    IF NEW.traffic_light_rating IS NOT NULL OR 
       (TG_OP = 'UPDATE' AND OLD.traffic_light_rating IS DISTINCT FROM NEW.traffic_light_rating) THEN
      PERFORM update_restaurant_rating_summary(NEW.restaurant_id);
    END IF;
    RETURN NEW;
  -- Handle DELETE
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.traffic_light_rating IS NOT NULL THEN
      PERFORM update_restaurant_rating_summary(OLD.restaurant_id);
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rating_summary_trigger ON board_restaurants;
CREATE TRIGGER update_rating_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON board_restaurants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_rating_summary();

-- 5. Create function to get user's rating for a restaurant
CREATE OR REPLACE FUNCTION get_user_restaurant_rating(p_user_id uuid, p_restaurant_id character varying)
RETURNS character varying AS $$
DECLARE
  v_rating character varying;
BEGIN
  -- Get the most recent rating from any board the user owns
  SELECT traffic_light_rating INTO v_rating
  FROM board_restaurants br
  JOIN boards b ON br.board_id = b.id
  WHERE b.user_id = p_user_id 
    AND br.restaurant_id = p_restaurant_id
    AND br.traffic_light_rating IS NOT NULL
  ORDER BY br.added_at DESC
  LIMIT 1;
  
  RETURN v_rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to rate restaurant (updates or creates entry in user's Quick Saves board)
CREATE OR REPLACE FUNCTION rate_restaurant(
  p_user_id uuid, 
  p_restaurant_id character varying, 
  p_rating character varying
)
RETURNS json AS $$
DECLARE
  v_board_id uuid;
  v_existing_id uuid;
  v_result json;
BEGIN
  -- Get user's Quick Saves board
  SELECT id INTO v_board_id
  FROM boards
  WHERE user_id = p_user_id AND title = 'Quick Saves' AND type = 'free'
  LIMIT 1;
  
  -- If no Quick Saves board, create it
  IF v_board_id IS NULL THEN
    v_board_id := ensure_quick_saves_board(p_user_id);
  END IF;
  
  -- Check if restaurant already exists in Quick Saves
  SELECT id INTO v_existing_id
  FROM board_restaurants
  WHERE board_id = v_board_id AND restaurant_id = p_restaurant_id;
  
  -- Update or insert
  IF v_existing_id IS NOT NULL THEN
    UPDATE board_restaurants
    SET traffic_light_rating = p_rating,
        added_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO board_restaurants (board_id, restaurant_id, added_by, traffic_light_rating)
    VALUES (v_board_id, p_restaurant_id, p_user_id, p_rating);
  END IF;
  
  -- Return success with the rating
  v_result := json_build_object(
    'success', true,
    'rating', p_rating,
    'board_id', v_board_id
  );
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create view for restaurant rating summaries
CREATE OR REPLACE VIEW restaurant_ratings_view AS
SELECT 
  r.id,
  r.name,
  r.red_ratings_count,
  r.yellow_ratings_count,
  r.green_ratings_count,
  r.total_ratings_count,
  r.overall_rating,
  CASE 
    WHEN r.total_ratings_count > 0 THEN 
      ROUND((r.green_ratings_count::numeric / r.total_ratings_count) * 100, 1)
    ELSE 0 
  END as green_percentage,
  CASE 
    WHEN r.total_ratings_count > 0 THEN 
      ROUND((r.yellow_ratings_count::numeric / r.total_ratings_count) * 100, 1)
    ELSE 0 
  END as yellow_percentage,
  CASE 
    WHEN r.total_ratings_count > 0 THEN 
      ROUND((r.red_ratings_count::numeric / r.total_ratings_count) * 100, 1)
    ELSE 0 
  END as red_percentage
FROM restaurants r;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION update_restaurant_rating_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_restaurant_rating TO authenticated;
GRANT EXECUTE ON FUNCTION rate_restaurant TO authenticated;
GRANT SELECT ON restaurant_ratings_view TO authenticated;

-- 9. Update existing restaurants to calculate initial rating summaries
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT restaurant_id FROM board_restaurants WHERE traffic_light_rating IS NOT NULL
  LOOP
    PERFORM update_restaurant_rating_summary(r.restaurant_id);
  END LOOP;
END $$;