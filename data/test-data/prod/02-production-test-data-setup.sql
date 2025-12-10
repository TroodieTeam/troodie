-- ============================================================================
-- Production Test Data Setup
-- ============================================================================
-- This script sets up test data for production test accounts:
-- - Creates creator profiles for creator accounts
-- - Creates/claims restaurants for business accounts
-- - Sets up basic test data for testing workflows
--
-- Prerequisites:
-- - Users must already exist in public.users (run sync-auth-to-public-users.sql first)
-- - Use actual UIDs from production (not hardcoded)
--
-- Usage:
-- Run this in Supabase SQL Editor after users are synced
-- ============================================================================

-- ============================================================================
-- STEP 1: Get Production Test User UIDs
-- ============================================================================
-- These are the actual UIDs from production (update if needed)

DO $$
DECLARE
  -- Consumer UIDs
  consumer1_id UUID := 'b22f710c-c15a-4ee1-bce4-061902b954cc'::uuid; -- prod-consumer1@bypass.com
  consumer2_id UUID := '2621c5c4-a6de-42e5-8f1d-b73039646403'::uuid; -- prod-consumer2@bypass.com
  
  -- Creator UIDs
  creator1_id UUID := '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid; -- prod-creator1@bypass.com
  creator2_id UUID := '6740e5be-c1ca-444c-b100-6122c3dd8273'::uuid; -- prod-creator2@bypass.com
  creator3_id UUID := '08f478e2-45b9-4ab2-a068-8276beb851c3'::uuid; -- prod-creator3@bypass.com
  
  -- Business UIDs
  business1_id UUID := 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid; -- prod-business1@bypass.com
  business2_id UUID := '0e281bb7-6867-40b4-afff-4e82608cc34d'::uuid; -- prod-business2@bypass.com
  
  -- Restaurant IDs (will be created or found)
  restaurant1_id UUID;
  restaurant2_id UUID;
  
  -- Creator Profile IDs
  creator1_profile_id UUID;
  creator2_profile_id UUID;
  creator3_profile_id UUID;
BEGIN
  -- ============================================================================
  -- STEP 2: Create Creator Profiles
  -- ============================================================================
  
  -- Creator 1: Available, ready for campaigns
  INSERT INTO creator_profiles (
    user_id,
    display_name,
    bio,
    location,
    specialties,
    open_to_collabs,
    availability_status,
    instagram_followers,
    tiktok_followers,
    troodie_posts_count,
    troodie_likes_count,
    created_at,
    updated_at
  )
  SELECT
    creator1_id,
    'Prod Food Creator',
    'Production test creator for internal testing. Focuses on food photography and restaurant reviews.',
    'Charlotte, NC',
    ARRAY['Food Photography', 'Fine Dining', 'Local Restaurants'],
    true,
    'available',
    5000,
    3000,
    10,
    150,
    NOW(),
    NOW()
  WHERE EXISTS (SELECT 1 FROM users WHERE id = creator1_id)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    specialties = EXCLUDED.specialties,
    open_to_collabs = EXCLUDED.open_to_collabs,
    availability_status = EXCLUDED.availability_status,
    updated_at = NOW();
  
  SELECT id INTO creator1_profile_id FROM creator_profiles WHERE user_id = creator1_id;
  
  -- Creator 2: Available, video content specialist
  INSERT INTO creator_profiles (
    user_id,
    display_name,
    bio,
    location,
    specialties,
    open_to_collabs,
    availability_status,
    instagram_followers,
    tiktok_followers,
    troodie_posts_count,
    troodie_likes_count,
    created_at,
    updated_at
  )
  SELECT
    creator2_id,
    'Prod Content Creator',
    'Production test creator for internal testing. Video content specialist focusing on restaurant reviews.',
    'Atlanta, GA',
    ARRAY['Video Content', 'Restaurant Reviews', 'Street Food'],
    true,
    'available',
    8000,
    12000,
    25,
    500,
    NOW(),
    NOW()
  WHERE EXISTS (SELECT 1 FROM users WHERE id = creator2_id)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    specialties = EXCLUDED.specialties,
    open_to_collabs = EXCLUDED.open_to_collabs,
    availability_status = EXCLUDED.availability_status,
    updated_at = NOW();
  
  SELECT id INTO creator2_profile_id FROM creator_profiles WHERE user_id = creator2_id;
  
  -- Creator 3: Busy status (for testing availability filtering)
  INSERT INTO creator_profiles (
    user_id,
    display_name,
    bio,
    location,
    specialties,
    open_to_collabs,
    availability_status,
    instagram_followers,
    tiktok_followers,
    troodie_posts_count,
    troodie_likes_count,
    created_at,
    updated_at
  )
  SELECT
    creator3_id,
    'Prod Lifestyle Creator',
    'Production test creator - currently busy status for testing availability filtering.',
    'Raleigh, NC',
    ARRAY['Lifestyle', 'Brunch', 'Coffee'],
    true,
    'busy',
    3000,
    2000,
    5,
    75,
    NOW(),
    NOW()
  WHERE EXISTS (SELECT 1 FROM users WHERE id = creator3_id)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    specialties = EXCLUDED.specialties,
    open_to_collabs = EXCLUDED.open_to_collabs,
    availability_status = EXCLUDED.availability_status,
    updated_at = NOW();
  
  SELECT id INTO creator3_profile_id FROM creator_profiles WHERE user_id = creator3_id;
  
  -- ============================================================================
  -- STEP 3: Create Test Restaurants
  -- ============================================================================
  
  -- Restaurant 1: For prod-business1 (NEW - no campaigns yet)
  INSERT INTO restaurants (
    id,
    name,
    address,
    city,
    state,
    zip_code,
    cuisine_types,
    price_range,
    description,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    'Prod Test Restaurant 1',
    '123 Test Street',
    'Charlotte',
    'NC',
    '28202',
    ARRAY['American', 'Casual Dining'],
    '$$',
    'Production test restaurant for prod-business1. New user experience - no campaigns yet.',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM restaurants r
    JOIN restaurant_claims rc ON rc.restaurant_id = r.id
    WHERE rc.user_id = business1_id AND rc.status = 'verified'
  )
  RETURNING id INTO restaurant1_id;
  
  -- If restaurant already exists, get its ID
  IF restaurant1_id IS NULL THEN
    SELECT r.id INTO restaurant1_id
    FROM restaurants r
    JOIN restaurant_claims rc ON rc.restaurant_id = r.id
    WHERE rc.user_id = business1_id AND rc.status = 'verified'
    LIMIT 1;
  END IF;
  
  -- Restaurant 2: For prod-business2 (MEDIUM activity)
  INSERT INTO restaurants (
    id,
    name,
    address,
    city,
    state,
    zip_code,
    cuisine_types,
    price_range,
    description,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    'Prod Test Restaurant 2',
    '456 Test Avenue',
    'Charlotte',
    'NC',
    '28203',
    ARRAY['Italian', 'Fine Dining'],
    '$$$',
    'Production test restaurant for prod-business2. Medium activity level for testing.',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM restaurants r
    JOIN restaurant_claims rc ON rc.restaurant_id = r.id
    WHERE rc.user_id = business2_id AND rc.status = 'verified'
  )
  RETURNING id INTO restaurant2_id;
  
  -- If restaurant already exists, get its ID
  IF restaurant2_id IS NULL THEN
    SELECT r.id INTO restaurant2_id
    FROM restaurants r
    JOIN restaurant_claims rc ON rc.restaurant_id = r.id
    WHERE rc.user_id = business2_id AND rc.status = 'verified'
    LIMIT 1;
  END IF;
  
  -- ============================================================================
  -- STEP 4: Create Restaurant Claims
  -- ============================================================================
  
  -- Claim Restaurant 1 for business1
  IF restaurant1_id IS NOT NULL THEN
    INSERT INTO restaurant_claims (
      restaurant_id,
      user_id,
      email,
      status,
      verification_method,
      verified_at,
      created_at,
      updated_at
    )
    SELECT
      restaurant1_id,
      business1_id,
      'prod-business1@bypass.com',
      'verified',
      'manual_review',
      NOW(),
      NOW(),
      NOW()
    WHERE EXISTS (SELECT 1 FROM users WHERE id = business1_id)
    ON CONFLICT (restaurant_id, user_id) DO UPDATE SET
      status = 'verified',
      verified_at = COALESCE(restaurant_claims.verified_at, NOW()),
      updated_at = NOW();
    
    -- Mark restaurant as test restaurant
    UPDATE restaurants
    SET is_test_restaurant = true
    WHERE id = restaurant1_id;
  END IF;
  
  -- Claim Restaurant 2 for business2
  IF restaurant2_id IS NOT NULL THEN
    INSERT INTO restaurant_claims (
      restaurant_id,
      user_id,
      email,
      status,
      verification_method,
      verified_at,
      created_at,
      updated_at
    )
    SELECT
      restaurant2_id,
      business2_id,
      'prod-business2@bypass.com',
      'verified',
      'manual_review',
      NOW(),
      NOW(),
      NOW()
    WHERE EXISTS (SELECT 1 FROM users WHERE id = business2_id)
    ON CONFLICT (restaurant_id, user_id) DO UPDATE SET
      status = 'verified',
      verified_at = COALESCE(restaurant_claims.verified_at, NOW()),
      updated_at = NOW();
    
    -- Mark restaurant as test restaurant
    UPDATE restaurants
    SET is_test_restaurant = true
    WHERE id = restaurant2_id;
  END IF;
  
  -- ============================================================================
  -- STEP 5: Create Default Boards for All Users
  -- ============================================================================
  
  INSERT INTO boards (user_id, name, description, is_default, created_at, updated_at)
  SELECT id, 'Quick Saves', 'Default board for quick saves', true, NOW(), NOW()
  FROM users
  WHERE id IN (consumer1_id, consumer2_id, creator1_id, creator2_id, creator3_id, business1_id, business2_id)
    AND NOT EXISTS (
      SELECT 1 FROM boards WHERE user_id = users.id AND is_default = true
    );
  
  -- ============================================================================
  -- STEP 6: Verification and Summary
  -- ============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Production Test Data Setup Complete';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Creator Profiles Created:';
  RAISE NOTICE '  - prod-creator1@bypass.com: % (Available)', creator1_profile_id;
  RAISE NOTICE '  - prod-creator2@bypass.com: % (Available)', creator2_profile_id;
  RAISE NOTICE '  - prod-creator3@bypass.com: % (Busy)', creator3_profile_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Restaurants Created/Claimed:';
  IF restaurant1_id IS NOT NULL THEN
    RAISE NOTICE '  - Restaurant 1: % (claimed by prod-business1)', restaurant1_id;
  END IF;
  IF restaurant2_id IS NOT NULL THEN
    RAISE NOTICE '  - Restaurant 2: % (claimed by prod-business2)', restaurant2_id;
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Log in as prod-business1@bypass.com (OTP: 000000)';
  RAISE NOTICE '  2. Navigate to restaurant profile';
  RAISE NOTICE '  3. Create test campaigns';
  RAISE NOTICE '  4. Log in as prod-creator1@bypass.com to apply';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify creator profiles
SELECT 
  u.email,
  cp.display_name,
  cp.availability_status,
  cp.open_to_collabs,
  cp.location
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email LIKE 'prod-creator%@bypass.com'
ORDER BY u.email;

-- Verify restaurant claims
SELECT 
  u.email as business_email,
  r.name as restaurant_name,
  rc.status as claim_status,
  r.is_test_restaurant
FROM restaurant_claims rc
JOIN users u ON rc.user_id = u.id
JOIN restaurants r ON rc.restaurant_id = r.id
WHERE u.email LIKE 'prod-business%@bypass.com'
ORDER BY u.email;
