-- ================================================================
-- TROODIE SYSTEM ACCOUNT CREATION
-- ================================================================
-- Creates the official Troodie system account for platform-managed campaigns
-- Run after TMC-001 migration
-- Date: 2025-10-13
-- Task: TMC-002
-- ================================================================

-- ================================================================
-- STEP 1: CREATE SYSTEM USER
-- ================================================================
-- Note: In production, also create auth.users record via Supabase dashboard
-- For development/testing, we insert the user profile directly

-- Generate UUIDs for the Troodie system user and restaurant
DO $$
DECLARE
  troodie_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Fixed UUID for consistency
  troodie_restaurant_id UUID := '00000000-0000-0000-0000-000000000002'; -- Fixed UUID for consistency
BEGIN

  -- Insert into users table
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
    'https://troodie.com/assets/troodie-logo-round.png', -- Update with actual CDN URL
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    account_type = 'business',
    role = 'admin',
    is_verified = TRUE,
    updated_at = NOW();

  RAISE NOTICE 'Created/updated Troodie system user: %', troodie_user_id;

  -- ================================================================
  -- STEP 2: CREATE TROODIE OFFICIAL RESTAURANT
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
  -- STEP 3: CREATE BUSINESS PROFILE
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
  -- SUCCESS MESSAGE
  -- ================================================================
  RAISE NOTICE '';
  RAISE NOTICE '✅ TROODIE SYSTEM ACCOUNT CREATED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE 'System User ID: %', troodie_user_id;
  RAISE NOTICE 'Restaurant ID: %', troodie_restaurant_id;
  RAISE NOTICE 'Email: kouame@troodieapp.com';
  RAISE NOTICE 'Username: troodie_official';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Manual steps required:';
  RAISE NOTICE '1. Create auth user in Supabase Auth dashboard with email kouame@troodieapp.com';
  RAISE NOTICE '2. Use the UUID: % as the auth user ID', troodie_user_id;
  RAISE NOTICE '3. Set a secure password for the account';
  RAISE NOTICE '4. Verify admin access works correctly';
  RAISE NOTICE '5. Proceed to TMC-003 (Admin Campaign Creation UI)';
  RAISE NOTICE '';

END $$;
