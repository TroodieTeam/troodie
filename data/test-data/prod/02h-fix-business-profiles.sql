-- ============================================================================
-- PART 8: Fix Business Profiles (Required for Business Dashboard)
-- ============================================================================
-- Run this part to create/update business_profiles with correct UUIDs and restaurant links
-- This fixes the Business Dashboard error (CM-8)
-- ============================================================================

DO $$
DECLARE
  business1_id UUID := 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid; -- prod-business1@bypass.com
  business2_id UUID := '0e281bb7-6867-40b4-afff-4e82608cc34d'::uuid; -- prod-business2@bypass.com
  restaurant1_id UUID;
  restaurant2_id UUID;
BEGIN
  -- Get restaurant IDs from restaurant_claims
  SELECT r.id INTO restaurant1_id
  FROM restaurants r
  JOIN restaurant_claims rc ON rc.restaurant_id = r.id
  WHERE rc.user_id = business1_id
    AND rc.status = 'verified'
  ORDER BY r.created_at DESC
  LIMIT 1;
  
  SELECT r.id INTO restaurant2_id
  FROM restaurants r
  JOIN restaurant_claims rc ON rc.restaurant_id = r.id
  WHERE rc.user_id = business2_id
    AND rc.status = 'verified'
  ORDER BY r.created_at DESC
  LIMIT 1;
  
  IF restaurant1_id IS NULL OR restaurant2_id IS NULL THEN
    RAISE EXCEPTION 'Restaurants not found. Please run 02c-claim-restaurants.sql first.';
  END IF;
  
  RAISE NOTICE 'Found restaurants: % and %', restaurant1_id, restaurant2_id;
  
  -- ============================================================================
  -- CREATE/UPDATE BUSINESS PROFILES
  -- ============================================================================
  
  -- Business Profile 1
  INSERT INTO business_profiles (
    user_id,
    restaurant_id,
    verification_status,
    claimed_at,
    created_at,
    updated_at
  )
  VALUES (
    business1_id,
    restaurant1_id,
    'verified',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    restaurant_id = EXCLUDED.restaurant_id,
    verification_status = 'verified',
    claimed_at = COALESCE(business_profiles.claimed_at, EXCLUDED.claimed_at),
    updated_at = NOW();
  
  RAISE NOTICE '✅ Created/updated business profile for prod-business1 (restaurant: %)', restaurant1_id;
  
  -- Business Profile 2
  INSERT INTO business_profiles (
    user_id,
    restaurant_id,
    verification_status,
    claimed_at,
    created_at,
    updated_at
  )
  VALUES (
    business2_id,
    restaurant2_id,
    'verified',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    restaurant_id = EXCLUDED.restaurant_id,
    verification_status = 'verified',
    claimed_at = COALESCE(business_profiles.claimed_at, EXCLUDED.claimed_at),
    updated_at = NOW();
  
  RAISE NOTICE '✅ Created/updated business profile for prod-business2 (restaurant: %)', restaurant2_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Business Profiles Fixed!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Log in as prod-business1@bypass.com (OTP: 000000)';
  RAISE NOTICE '  2. Navigate to More → Business Dashboard';
  RAISE NOTICE '  3. Dashboard should now load without errors';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  bp.id,
  u.email,
  u.name,
  r.name as restaurant_name,
  bp.restaurant_id,
  bp.verification_status,
  bp.claimed_at
FROM business_profiles bp
JOIN users u ON bp.user_id = u.id
LEFT JOIN restaurants r ON bp.restaurant_id = r.id
WHERE u.email LIKE 'prod-business%@bypass.com'
ORDER BY u.email;
