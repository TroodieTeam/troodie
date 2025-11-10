-- Test Accounts Creation Script
-- These accounts bypass OTP authentication for testing purposes
-- WARNING: Only use in development/testing environments

-- Create Admin Test Accounts
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES
  (
    'admin-test-001'::uuid,
    'admin@troodie.test',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Test Admin", "account_type": "admin", "is_admin": true}'::jsonb,
    'authenticated',
    'authenticated'
  ),
  (
    'admin-test-002'::uuid,
    'reviewer@troodie.test',
    crypt('Reviewer123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Test Reviewer", "account_type": "admin", "is_admin": true}'::jsonb,
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Create corresponding admin profiles
INSERT INTO public.users (
  id,
  email,
  name,
  account_type,
  is_verified,
  created_at,
  updated_at
) VALUES
  ('admin-test-001'::uuid, 'admin@troodie.test', 'Test Admin', 'admin', true, NOW(), NOW()),
  ('admin-test-002'::uuid, 'reviewer@troodie.test', 'Test Reviewer', 'admin', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  account_type = EXCLUDED.account_type,
  is_verified = EXCLUDED.is_verified,
  updated_at = NOW();

-- Create Regular Test User Accounts
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES
  (
    'user-test-001'::uuid,
    'owner@restaurant.test',
    crypt('Owner123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Restaurant Owner", "account_type": "consumer"}'::jsonb,
    'authenticated',
    'authenticated'
  ),
  (
    'user-test-002'::uuid,
    'creator@social.test',
    crypt('Creator123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Content Creator", "account_type": "consumer"}'::jsonb,
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Create corresponding user profiles
INSERT INTO public.users (
  id,
  email,
  name,
  account_type,
  created_at,
  updated_at
) VALUES
  ('user-test-001'::uuid, 'owner@restaurant.test', 'Restaurant Owner', 'consumer', NOW(), NOW()),
  ('user-test-002'::uuid, 'creator@social.test', 'Content Creator', 'consumer', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Create default boards for test users
INSERT INTO public.boards (
  id,
  user_id,
  name,
  description,
  is_default,
  created_at,
  updated_at
) VALUES
  (gen_random_uuid(), 'admin-test-001'::uuid, 'Quick Saves', 'Default board for quick saves', true, NOW(), NOW()),
  (gen_random_uuid(), 'admin-test-002'::uuid, 'Quick Saves', 'Default board for quick saves', true, NOW(), NOW()),
  (gen_random_uuid(), 'user-test-001'::uuid, 'Quick Saves', 'Default board for quick saves', true, NOW(), NOW()),
  (gen_random_uuid(), 'user-test-002'::uuid, 'Quick Saves', 'Default board for quick saves', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Create sample test restaurants for testing claims
INSERT INTO public.restaurants (
  id,
  google_place_id,
  name,
  address,
  city,
  state,
  postal_code,
  country,
  latitude,
  longitude,
  cuisine_type,
  price_level,
  rating,
  total_ratings,
  phone,
  website,
  google_maps_url,
  created_at,
  updated_at
) VALUES
  (
    'test-restaurant-001'::uuid,
    'test_place_001',
    'Test Italian Restaurant',
    '123 Test Street',
    'San Francisco',
    'CA',
    '94102',
    'US',
    37.7749,
    -122.4194,
    ARRAY['Italian', 'Pizza'],
    2,
    4.5,
    150,
    '+1-415-555-0001',
    'https://testitalian.com',
    'https://maps.google.com/test1',
    NOW(),
    NOW()
  ),
  (
    'test-restaurant-002'::uuid,
    'test_place_002',
    'Test Sushi Bar',
    '456 Demo Avenue',
    'San Francisco',
    'CA',
    '94103',
    'US',
    37.7751,
    -122.4180,
    ARRAY['Japanese', 'Sushi'],
    3,
    4.7,
    200,
    '+1-415-555-0002',
    'https://testsushi.com',
    'https://maps.google.com/test2',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Create sample pending claims for testing
INSERT INTO public.restaurant_claims (
  id,
  user_id,
  restaurant_id,
  ownership_proof_type,
  business_email,
  business_phone,
  business_license,
  additional_notes,
  status,
  can_resubmit,
  submitted_at,
  created_at,
  updated_at
) VALUES
  (
    'test-claim-001'::uuid,
    'user-test-001'::uuid,
    'test-restaurant-001'::uuid,
    'business_email',
    'owner@testitalian.com',
    '+1-415-555-0001',
    'BL-123456',
    'I am the owner of this restaurant and would like to claim it.',
    'pending',
    false,
    NOW(),
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Create sample pending creator applications for testing
INSERT INTO public.creator_applications (
  id,
  user_id,
  instagram_handle,
  tiktok_handle,
  youtube_channel,
  follower_count,
  content_categories,
  sample_content_urls,
  bio,
  location,
  status,
  can_resubmit,
  submitted_at,
  created_at,
  updated_at
) VALUES
  (
    'test-app-001'::uuid,
    'user-test-002'::uuid,
    '@testfoodie',
    '@testfoodie',
    'https://youtube.com/@testfoodie',
    15000,
    ARRAY['food', 'restaurant_reviews', 'cooking'],
    ARRAY['https://instagram.com/p/test1', 'https://instagram.com/p/test2'],
    'Food enthusiast and content creator specializing in local restaurant reviews.',
    'San Francisco, CA',
    'pending',
    false,
    NOW(),
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Create sample notifications for test users
INSERT INTO public.notifications (
  id,
  user_id,
  title,
  message,
  type,
  related_entity_type,
  related_entity_id,
  is_read,
  expires_at,
  created_at
) VALUES
  (
    gen_random_uuid(),
    'user-test-001'::uuid,
    'Claim Submitted',
    'Your restaurant claim has been submitted and is under review.',
    'status_change',
    'restaurant_claim',
    'test-claim-001'::uuid,
    false,
    NOW() + INTERVAL '30 days',
    NOW()
  ),
  (
    gen_random_uuid(),
    'user-test-002'::uuid,
    'Application Received',
    'Your creator application has been received and is being reviewed.',
    'status_change',
    'creator_application',
    'test-app-001'::uuid,
    false,
    NOW() + INTERVAL '30 days',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Output test account summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test Accounts Created Successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin Accounts (with Admin Tools access):';
  RAISE NOTICE '  Email: admin@troodie.test';
  RAISE NOTICE '  Password: Admin123!';
  RAISE NOTICE '';
  RAISE NOTICE '  Email: reviewer@troodie.test';
  RAISE NOTICE '  Password: Reviewer123!';
  RAISE NOTICE '';
  RAISE NOTICE 'Test User Accounts:';
  RAISE NOTICE '  Email: owner@restaurant.test';
  RAISE NOTICE '  Password: Owner123!';
  RAISE NOTICE '  Purpose: Test restaurant claims';
  RAISE NOTICE '';
  RAISE NOTICE '  Email: creator@social.test';
  RAISE NOTICE '  Password: Creator123!';
  RAISE NOTICE '  Purpose: Test creator applications';
  RAISE NOTICE '';
  RAISE NOTICE 'Sample Data Created:';
  RAISE NOTICE '  - 2 test restaurants';
  RAISE NOTICE '  - 1 pending restaurant claim';
  RAISE NOTICE '  - 1 pending creator application';
  RAISE NOTICE '  - 2 notifications';
  RAISE NOTICE '========================================';
END $$;