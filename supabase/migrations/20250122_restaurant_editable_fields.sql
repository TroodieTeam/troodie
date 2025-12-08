-- ============================================================================
-- Restaurant Editable Details
-- ============================================================================
-- This migration adds editable fields to restaurants table and creates
-- functions for restaurant owners to update their restaurant details.
--
-- Task: CM-8
-- Reference: TRO-15 Product Requirement
-- ============================================================================

-- Add editable fields to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS custom_description TEXT,
ADD COLUMN IF NOT EXISTS about_us TEXT,
ADD COLUMN IF NOT EXISTS parking_type VARCHAR(50) CHECK (parking_type IN (
  'free_lot', 'paid_lot', 'valet', 'street', 'validation', 'none'
)),
ADD COLUMN IF NOT EXISTS parking_notes TEXT,
ADD COLUMN IF NOT EXISTS special_deals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_hours JSONB,
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
ADD COLUMN IF NOT EXISTS menu_images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id);

-- Index for claimed restaurants (if claimed_by column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'restaurants' AND column_name = 'claimed_by') THEN
    CREATE INDEX IF NOT EXISTS idx_restaurants_claimed_by
    ON restaurants(claimed_by) WHERE claimed_by IS NOT NULL;
  END IF;
END $$;

-- Function to update restaurant details
CREATE OR REPLACE FUNCTION update_restaurant_details(
  p_restaurant_id UUID,
  p_updates JSONB
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be authenticated';
  END IF;

  -- Verify user owns this restaurant
  IF NOT EXISTS (
    SELECT 1 FROM business_profiles
    WHERE user_id = v_user_id AND restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this restaurant';
  END IF;

  -- Update restaurant
  UPDATE restaurants
  SET
    custom_description = COALESCE(p_updates->>'description', custom_description),
    about_us = COALESCE(p_updates->>'about_us', about_us),
    parking_type = CASE 
      WHEN p_updates->>'parking_type' IS NOT NULL 
      THEN p_updates->>'parking_type'::VARCHAR(50)
      ELSE parking_type
    END,
    parking_notes = COALESCE(p_updates->>'parking_notes', parking_notes),
    special_deals = CASE
      WHEN p_updates->'special_deals' IS NOT NULL
      THEN (p_updates->'special_deals')::JSONB
      ELSE special_deals
    END,
    custom_hours = CASE
      WHEN p_updates->'custom_hours' IS NOT NULL
      THEN (p_updates->'custom_hours')::JSONB
      ELSE custom_hours
    END,
    cover_photo_url = COALESCE(p_updates->>'cover_photo_url', cover_photo_url),
    last_edited_at = NOW(),
    last_edited_by = v_user_id
  WHERE id = p_restaurant_id
  RETURNING json_build_object(
    'id', id,
    'name', name,
    'custom_description', custom_description,
    'about_us', about_us,
    'parking_type', parking_type,
    'parking_notes', parking_notes,
    'special_deals', special_deals,
    'last_edited_at', last_edited_at
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Restaurant not found';
  END IF;

  -- Create activity feed entry if table exists
  BEGIN
    INSERT INTO activity_feed (
      user_id,
      type,
      entity_type,
      entity_id,
      message
    ) VALUES (
      v_user_id,
      'restaurant_updated',
      'restaurant',
      p_restaurant_id,
      'updated restaurant details'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Activity feed table might not exist, ignore error
    NULL;
  END;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_restaurant_details IS
'Updates restaurant details. Only accessible by restaurant owners. Creates activity feed entry.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_restaurant_details TO authenticated;

