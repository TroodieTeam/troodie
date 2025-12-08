-- ============================================================================
-- PART 3: Claim Restaurants for Business Accounts
-- ============================================================================
-- Run this part to create restaurant claims linking businesses to restaurants
-- ============================================================================

DO $$
DECLARE
  business1_id UUID := 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid; -- prod-business1@bypass.com
  business2_id UUID := '0e281bb7-6867-40b4-afff-4e82608cc34d'::uuid; -- prod-business2@bypass.com
  restaurant1_id UUID;
  restaurant2_id UUID;
BEGIN
  -- Get restaurant IDs (use the most recent ones created)
  SELECT id INTO restaurant1_id
  FROM restaurants
  WHERE name = 'Prod Test Restaurant 1'
  ORDER BY created_at DESC
  LIMIT 1;
  
  SELECT id INTO restaurant2_id
  FROM restaurants
  WHERE name = 'Prod Test Restaurant 2'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Claim Restaurant 1 for business1
  IF restaurant1_id IS NOT NULL THEN
    INSERT INTO restaurant_claims (
      restaurant_id,
      user_id,
      email,
      status,
      verification_method,
      reviewed_by,
      verified_at,
      created_at,
      updated_at
    )
    VALUES (
      restaurant1_id,
      business1_id,
      'prod-business1@bypass.com',
      'verified',
      'manual_review',
      business1_id,  -- Set reviewed_by to business user (they're claiming their own restaurant)
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (restaurant_id, user_id) DO UPDATE SET
      status = 'verified',
      reviewed_by = COALESCE(restaurant_claims.reviewed_by, EXCLUDED.reviewed_by),
      verified_at = COALESCE(restaurant_claims.verified_at, NOW()),
      updated_at = NOW();
    
    -- Mark restaurant as test restaurant
    UPDATE restaurants
    SET is_test_restaurant = true
    WHERE id = restaurant1_id;
    
    RAISE NOTICE '✅ Claimed Restaurant 1 (ID: %) for prod-business1', restaurant1_id;
  END IF;
  
  -- Claim Restaurant 2 for business2
  IF restaurant2_id IS NOT NULL THEN
    INSERT INTO restaurant_claims (
      restaurant_id,
      user_id,
      email,
      status,
      verification_method,
      reviewed_by,
      verified_at,
      created_at,
      updated_at
    )
    VALUES (
      restaurant2_id,
      business2_id,
      'prod-business2@bypass.com',
      'verified',
      'manual_review',
      business2_id,  -- Set reviewed_by to business user (they're claiming their own restaurant)
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (restaurant_id, user_id) DO UPDATE SET
      status = 'verified',
      reviewed_by = COALESCE(restaurant_claims.reviewed_by, EXCLUDED.reviewed_by),
      verified_at = COALESCE(restaurant_claims.verified_at, NOW()),
      updated_at = NOW();
    
    -- Mark restaurant as test restaurant
    UPDATE restaurants
    SET is_test_restaurant = true
    WHERE id = restaurant2_id;
    
    RAISE NOTICE '✅ Claimed Restaurant 2 (ID: %) for prod-business2', restaurant2_id;
  END IF;
END $$;
