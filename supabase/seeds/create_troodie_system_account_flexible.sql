-- ================================================================
-- TROODIE SYSTEM ACCOUNT CREATION (FLEXIBLE VERSION)
-- ================================================================
-- Creates the official Troodie system account using existing auth.users
-- Run AFTER creating auth user for kouame@troodieapp.com
-- Date: 2025-10-13
-- Task: TMC-002
-- ================================================================

-- ================================================================
-- PREREQUISITE: Create auth.users first via Supabase Auth Dashboard
-- Email: kouame@troodieapp.com
-- Let Supabase generate the UUID automatically
-- ================================================================

DO $$
DECLARE
  troodie_user_id UUID;
  troodie_restaurant_id UUID := '00000000-0000-0000-0000-000000000002'; -- Fixed UUID for restaurant
BEGIN

  -- ================================================================
  -- STEP 1: GET EXISTING AUTH USER ID
  -- ================================================================
  SELECT id INTO troodie_user_id
  FROM auth.users
  WHERE email = 'kouame@troodieapp.com';

  IF troodie_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user with email kouame@troodieapp.com not found. Please create the auth user first via Supabase Auth Dashboard.';
  END IF;

  RAISE NOTICE 'Found auth user: %', troodie_user_id;

  -- ================================================================
  -- STEP 2: CREATE USER PROFILE
  -- ================================================================
  INSERT INTO users (
    id,
    email,
    username,
    name,
    account_type,
    role,
    is_verified,
    bio,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    troodie_user_id,
    'kouame@troodieapp.com',
    'troodie_official',
    'Troodie',
    'business',
    'admin',
    TRUE,
    'Official Troodie campaigns, challenges, and creator opportunities. Building the future of food content together!',
    'https://troodie.com/assets/troodie-logo-round.png',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    account_type = 'business',
    role = 'admin',
    is_verified = TRUE,
    updated_at = NOW();

  RAISE NOTICE 'Created/updated Troodie system user profile';

  -- ================================================================
  -- STEP 3: CREATE TROODIE OFFICIAL RESTAURANT
  -- ================================================================
  INSERT INTO restaurants (
    id,
    name,
    is_platform_managed,
    managed_by,
    data_source,
    created_at,
    updated_at
  ) VALUES (
    troodie_restaurant_id,
    'Troodie Community',
    TRUE,
    'troodie',
    'user',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    is_platform_managed = TRUE,
    managed_by = 'troodie',
    updated_at = NOW();

  RAISE NOTICE 'Created/updated Troodie official restaurant: %', troodie_restaurant_id;

  -- ================================================================
  -- STEP 4: CREATE BUSINESS PROFILE
  -- ================================================================
  INSERT INTO business_profiles (
    user_id,
    restaurant_id,
    verification_status,
    management_permissions,
    created_at,
    updated_at
  ) VALUES (
    troodie_user_id,
    troodie_restaurant_id,
    'verified',
    ARRAY['create_campaigns', 'manage_staff', 'view_analytics', 'manage_deliverables'],
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    verification_status = 'verified',
    management_permissions = ARRAY['create_campaigns', 'manage_staff', 'view_analytics', 'manage_deliverables'],
    updated_at = NOW();

  RAISE NOTICE 'Created/updated business profile linking user to restaurant';

  -- ================================================================
  -- UPDATE CONSTANTS FILE
  -- ================================================================
  RAISE NOTICE '';
  RAISE NOTICE '✅ TROODIE SYSTEM ACCOUNT CREATED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE 'System User ID: %', troodie_user_id;
  RAISE NOTICE 'Restaurant ID: %', troodie_restaurant_id;
  RAISE NOTICE 'Email: kouame@troodieapp.com';
  RAISE NOTICE 'Username: troodie_official';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Update constants/systemAccounts.ts';
  RAISE NOTICE '   Change USER_ID to: %', troodie_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update constants/systemAccounts.ts with the USER_ID shown above';
  RAISE NOTICE '2. Test login with kouame@troodieapp.com';
  RAISE NOTICE '3. Verify admin access works correctly';
  RAISE NOTICE '4. Proceed to TMC-003 (Admin Campaign Creation UI)';
  RAISE NOTICE '';

END $$;
