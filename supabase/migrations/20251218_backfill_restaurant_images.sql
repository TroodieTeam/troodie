-- Migration: Backfill restaurant images from Google Places API
-- This migration creates a function to update restaurants with missing images
-- The function should be called manually via a script or edge function

CREATE OR REPLACE FUNCTION backfill_restaurant_images(
  p_batch_size INTEGER DEFAULT 50,
  p_max_restaurants INTEGER DEFAULT NULL
)
RETURNS TABLE(
  restaurant_id UUID,
  restaurant_name TEXT,
  google_place_id TEXT,
  status TEXT,
  cover_photo_url TEXT,
  photos_count INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_restaurant RECORD;
  v_count INTEGER := 0;
  v_processed INTEGER := 0;
BEGIN
  -- Find restaurants that need image backfill:
  -- 1. Have a google_place_id
  -- 2. Missing cover_photo_url OR cover_photo_url is null/empty
  -- 3. Not already processed (optional: add a flag column)
  
  FOR v_restaurant IN
    SELECT 
      id,
      name,
      google_place_id,
      cover_photo_url,
      photos
    FROM restaurants
    WHERE google_place_id IS NOT NULL
      AND google_place_id != ''
      AND (
        cover_photo_url IS NULL 
        OR cover_photo_url = ''
        OR cover_photo_url LIKE '%placeholder%'
        OR cover_photo_url LIKE '%default%'
      )
    ORDER BY created_at DESC
    LIMIT COALESCE(p_max_restaurants, 10000)
  LOOP
    -- Return the restaurant info for external processing
    -- The actual Google Places API call should be done in an edge function
    -- or application code, not in SQL
    
    RETURN QUERY SELECT
      v_restaurant.id,
      v_restaurant.name,
      v_restaurant.google_place_id,
      'pending'::TEXT,
      v_restaurant.cover_photo_url,
      COALESCE(array_length(v_restaurant.photos, 1), 0);
    
    v_processed := v_processed + 1;
    
    IF v_processed >= p_batch_size THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Create a helper function to update restaurant images after fetching from Google Places
CREATE OR REPLACE FUNCTION update_restaurant_images(
  p_restaurant_id UUID,
  p_cover_photo_url TEXT,
  p_photos TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE restaurants
  SET 
    cover_photo_url = p_cover_photo_url,
    photos = p_photos,
    updated_at = NOW(),
    last_google_sync = NOW()
  WHERE id = p_restaurant_id;
  
  RETURN FOUND;
END;
$$;

-- Add index to speed up queries for restaurants needing backfill
CREATE INDEX IF NOT EXISTS idx_restaurants_needs_image_backfill 
ON restaurants(google_place_id, cover_photo_url) 
WHERE google_place_id IS NOT NULL 
  AND (cover_photo_url IS NULL OR cover_photo_url = '' OR cover_photo_url LIKE '%placeholder%' OR cover_photo_url LIKE '%default%');

COMMENT ON FUNCTION backfill_restaurant_images IS 'Returns list of restaurants that need image backfill from Google Places API';
COMMENT ON FUNCTION update_restaurant_images IS 'Updates restaurant images after fetching from Google Places API';
