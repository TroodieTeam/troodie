-- ============================================================================
-- Production Test Users Setup
-- ============================================================================
-- This script creates test accounts in PRODUCTION for internal testing.
--
-- IMPORTANT: These accounts are ISOLATED from production users:
-- - All emails use @bypass.com domain
-- - The is_test_account flag is automatically set
-- - Test users CANNOT see production user data
-- - Production users CANNOT see test user data
--
-- Prerequisites:
-- - Run 20250205_production_test_user_isolation.sql migration FIRST
-- - Ensure environment has EXPO_PUBLIC_TEST_AUTH_PASSWORD set
--
-- Usage:
-- 1. Run this in Supabase SQL Editor (Production)
-- 2. Log in using email: test-xxx@bypass.com, OTP: 000000
-- ============================================================================

-- ============================================================================
-- CONFIGURATION
-- ============================================================================

-- Set the bypass password (should match EXPO_PUBLIC_TEST_AUTH_PASSWORD)
-- Default: BypassPassword123
\set BYPASS_PASSWORD 'BypassPassword123'

-- ============================================================================
-- STEP 1: Create Production Test Users in Auth
-- ============================================================================

-- Production test accounts (3 of each type for essential testing)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  -- Production Test Consumers (2)
  ('11111111-1111-4111-a111-111111111111'::uuid, 'prod-consumer1@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Consumer 1", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('22222222-2222-4222-a222-222222222222'::uuid, 'prod-consumer2@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Consumer 2", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),

  -- Production Test Creators (3)
  ('33333333-3333-4333-a333-333333333333'::uuid, 'prod-creator1@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Creator 1", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('44444444-4444-4444-a444-444444444444'::uuid, 'prod-creator2@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Creator 2", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('55555555-5555-4555-a555-555555555555'::uuid, 'prod-creator3@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Creator 3", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),

  -- Production Test Businesses (2)
  ('66666666-6666-4666-a666-666666666666'::uuid, 'prod-business1@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Business 1", "account_type": "business"}'::jsonb, 'authenticated', 'authenticated'),
  ('77777777-7777-4777-a777-777777777777'::uuid, 'prod-business2@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Business 2", "account_type": "business"}'::jsonb, 'authenticated', 'authenticated')
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

-- ============================================================================
-- STEP 2: Create Public User Records
-- ============================================================================

INSERT INTO public.users (id, email, name, account_type, is_creator, created_at, updated_at)
VALUES
  -- Consumers
  ('11111111-1111-4111-a111-111111111111'::uuid, 'prod-consumer1@bypass.com', 'Prod Consumer 1', 'consumer', false, NOW(), NOW()),
  ('22222222-2222-4222-a222-222222222222'::uuid, 'prod-consumer2@bypass.com', 'Prod Consumer 2', 'consumer', false, NOW(), NOW()),

  -- Creators
  ('33333333-3333-4333-a333-333333333333'::uuid, 'prod-creator1@bypass.com', 'Prod Creator 1', 'creator', true, NOW(), NOW()),
  ('44444444-4444-4444-a444-444444444444'::uuid, 'prod-creator2@bypass.com', 'Prod Creator 2', 'creator', true, NOW(), NOW()),
  ('55555555-5555-4555-a555-555555555555'::uuid, 'prod-creator3@bypass.com', 'Prod Creator 3', 'creator', true, NOW(), NOW()),

  -- Businesses
  ('66666666-6666-4666-a666-666666666666'::uuid, 'prod-business1@bypass.com', 'Prod Business 1', 'business', false, NOW(), NOW()),
  ('77777777-7777-4777-a777-777777777777'::uuid, 'prod-business2@bypass.com', 'Prod Business 2', 'business', false, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  account_type = EXCLUDED.account_type,
  is_creator = EXCLUDED.is_creator,
  updated_at = NOW();

-- ============================================================================
-- STEP 3: Create Creator Profiles
-- ============================================================================

INSERT INTO creator_profiles (id, user_id, display_name, bio, location, specialties, open_to_collabs, availability_status, instagram_followers, tiktok_followers, troodie_posts_count, troodie_likes_count)
VALUES
  (
    'ccccc333-3333-4333-a333-333333333333'::uuid,
    '33333333-3333-4333-a333-333333333333'::uuid,
    'Prod Food Creator',
    'Production test creator for internal testing. Focuses on food photography.',
    'Charlotte, NC',
    ARRAY['Food Photography', 'Fine Dining', 'Local Restaurants'],
    true,
    'available',
    5000,
    3000,
    10,
    150
  ),
  (
    'ccccc444-4444-4444-a444-444444444444'::uuid,
    '44444444-4444-4444-a444-444444444444'::uuid,
    'Prod Content Creator',
    'Production test creator for internal testing. Video content specialist.',
    'Atlanta, GA',
    ARRAY['Video Content', 'Restaurant Reviews', 'Street Food'],
    true,
    'available',
    8000,
    12000,
    25,
    500
  ),
  (
    'ccccc555-5555-4555-a555-555555555555'::uuid,
    '55555555-5555-4555-a555-555555555555'::uuid,
    'Prod Lifestyle Creator',
    'Production test creator - currently busy status for testing.',
    'Raleigh, NC',
    ARRAY['Lifestyle', 'Brunch', 'Coffee'],
    true,
    'busy',
    3000,
    2000,
    5,
    75
  )
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  specialties = EXCLUDED.specialties,
  open_to_collabs = EXCLUDED.open_to_collabs,
  availability_status = EXCLUDED.availability_status;

-- ============================================================================
-- STEP 4: Create Business Profiles
-- ============================================================================

INSERT INTO business_profiles (id, user_id, business_name, created_at)
VALUES
  (
    'bbbbb666-6666-4666-a666-666666666666'::uuid,
    '66666666-6666-4666-a666-666666666666'::uuid,
    'Prod Test Restaurant 1',
    NOW()
  ),
  (
    'bbbbb777-7777-4777-a777-777777777777'::uuid,
    '77777777-7777-4777-a777-777777777777'::uuid,
    'Prod Test Restaurant 2',
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name;

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

DO $$
DECLARE
  test_count INTEGER;
  creator_count INTEGER;
  business_count INTEGER;
BEGIN
  -- Count test users
  SELECT COUNT(*) INTO test_count
  FROM public.users
  WHERE email LIKE 'prod-%@bypass.com';

  SELECT COUNT(*) INTO creator_count
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email LIKE 'prod-%@bypass.com';

  SELECT COUNT(*) INTO business_count
  FROM business_profiles bp
  JOIN users u ON bp.user_id = u.id
  WHERE u.email LIKE 'prod-%@bypass.com';

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Production Test Users Setup Complete';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created Accounts:';
  RAISE NOTICE '  - Total Test Users: %', test_count;
  RAISE NOTICE '  - Creator Profiles: %', creator_count;
  RAISE NOTICE '  - Business Profiles: %', business_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Login Credentials:';
  RAISE NOTICE '  - Email: prod-xxx@bypass.com';
  RAISE NOTICE '  - OTP Code: 000000';
  RAISE NOTICE '';
  RAISE NOTICE 'Consumer Accounts:';
  RAISE NOTICE '  - prod-consumer1@bypass.com';
  RAISE NOTICE '  - prod-consumer2@bypass.com';
  RAISE NOTICE '';
  RAISE NOTICE 'Creator Accounts:';
  RAISE NOTICE '  - prod-creator1@bypass.com (Available)';
  RAISE NOTICE '  - prod-creator2@bypass.com (Available)';
  RAISE NOTICE '  - prod-creator3@bypass.com (Busy)';
  RAISE NOTICE '';
  RAISE NOTICE 'Business Accounts:';
  RAISE NOTICE '  - prod-business1@bypass.com';
  RAISE NOTICE '  - prod-business2@bypass.com';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: These accounts are ISOLATED from production users!';
  RAISE NOTICE '    Production users will NOT see these test accounts.';
END $$;
