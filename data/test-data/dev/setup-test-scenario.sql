-- ================================================================
-- Test Scenario Setup Script
-- ================================================================
-- This script creates a complete test scenario based on test-data/dev JSON files
-- Run this in Supabase SQL Editor to set up all test data
-- ================================================================

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- 1. CREATE TEST USERS (Auth + Public)
-- ================================================================

-- Consumer Account
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at, 
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '30e818f9-a28d-4ab2-824f-725a1d5b8956'::uuid,
  'consumer1@troodieapp.com',
  crypt('BypassPassword123', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Test Consumer", "account_type": "consumer"}'::jsonb,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

INSERT INTO public.users (
  id, email, name, account_type, is_creator, created_at, updated_at
) VALUES (
  '30e818f9-a28d-4ab2-824f-725a1d5b8956'::uuid,
  'consumer1@troodieapp.com',
  'Test Consumer',
  'consumer',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  account_type = EXCLUDED.account_type,
  updated_at = NOW();

-- Creator Account
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '90ace8c5-b26d-434a-bbe9-a9babbec5bad'::uuid,
  'creator1@troodieapp.com',
  crypt('BypassPassword123', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Test Creator", "account_type": "creator"}'::jsonb,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

INSERT INTO public.users (
  id, email, name, account_type, is_creator, created_at, updated_at
) VALUES (
  '90ace8c5-b26d-434a-bbe9-a9babbec5bad'::uuid,
  'creator1@troodieapp.com',
  'Test Creator',
  'creator',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  account_type = EXCLUDED.account_type,
  is_creator = EXCLUDED.is_creator,
  updated_at = NOW();

-- Business Account
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '5b9d6a94-de0d-4bbb-a666-b1797fdd7b4b'::uuid,
  'business1@troodieapp.com',
  crypt('BypassPassword123', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Test Business", "account_type": "business"}'::jsonb,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

INSERT INTO public.users (
  id, email, name, account_type, is_creator, created_at, updated_at
) VALUES (
  '5b9d6a94-de0d-4bbb-a666-b1797fdd7b4b'::uuid,
  'business1@troodieapp.com',
  'Test Business',
  'business',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  account_type = EXCLUDED.account_type,
  updated_at = NOW();

-- ================================================================
-- 2. CREATE DEFAULT BOARDS FOR USERS
-- ================================================================

INSERT INTO public.boards (id, user_id, name, description, is_default, created_at, updated_at)
SELECT gen_random_uuid(), id, 'Quick Saves', 'Default board for quick saves', true, NOW(), NOW()
FROM public.users
WHERE email IN ('consumer1@troodieapp.com', 'creator1@troodieapp.com', 'business1@troodieapp.com')
ON CONFLICT DO NOTHING;

-- ================================================================
-- 3. CREATE CREATOR PROFILE (if creator account exists)
-- ================================================================

INSERT INTO public.creator_profiles (
  id, user_id, display_name, bio, location, open_to_collabs,
  troodie_engagement_rate, troodie_posts_count, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  '90ace8c5-b26d-434a-bbe9-a9babbec5bad'::uuid,
  'Test Creator',
  'Food blogger and content creator passionate about local restaurants',
  'Charlotte, NC',
  true,
  5.5,
  10,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM public.users WHERE id = '90ace8c5-b26d-434a-bbe9-a9babbec5bad'::uuid)
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  open_to_collabs = EXCLUDED.open_to_collabs,
  updated_at = NOW();

-- ================================================================
-- 4. CREATE TEST RESTAURANTS
-- ================================================================

-- Restaurant 1 (Unclaimed - for testing claim flow)
INSERT INTO public.restaurants (
  id, google_place_id, name, address, city, state, zip_code,
  latitude, longitude, cuisine_types, price_range, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'test_place_id_1',
  'Test Restaurant 1 (Unclaimed)',
  '123 Test St',
  'Charlotte',
  'NC',
  '28202',
  35.2271,
  -80.8431,
  ARRAY['American', 'Casual Dining'],
  '$$',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.restaurants WHERE google_place_id = 'test_place_id_1'
);

-- Restaurant 2 (Claimed - for testing restaurant features)
DO $$
DECLARE
  restaurant_id UUID;
  business_user_id UUID := '5b9d6a94-de0d-4bbb-a666-b1797fdd7b4b'::uuid;
BEGIN
  -- Create restaurant
  INSERT INTO public.restaurants (
    id, google_place_id, name, address, city, state, zip_code,
    latitude, longitude, cuisine_types, price_range, created_at, updated_at
  )
  SELECT 
    gen_random_uuid(),
    'test_place_id_2',
    'Test Restaurant 2 (Claimed)',
    '456 Test Ave',
    'Charlotte',
    'NC',
    '28203',
    35.2271,
    -80.8431,
    ARRAY['Italian', 'Fine Dining'],
    '$$$',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.restaurants WHERE google_place_id = 'test_place_id_2'
  )
  RETURNING id INTO restaurant_id;

  -- Create business profile and claim restaurant
  IF restaurant_id IS NOT NULL THEN
    INSERT INTO public.business_profiles (
      id, user_id, restaurant_id, verified, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      business_user_id,
      restaurant_id,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      restaurant_id = EXCLUDED.restaurant_id,
      verified = EXCLUDED.verified,
      updated_at = NOW();
  END IF;
END $$;

-- ================================================================
-- 5. CREATE TEST POSTS (for analytics and discovery)
-- ================================================================

-- Create posts from creator1 mentioning Restaurant 2
DO $$
DECLARE
  creator_user_id UUID := '90ace8c5-b26d-434a-bbe9-a9babbec5bad'::uuid;
  restaurant_id UUID;
  post_id UUID;
BEGIN
  -- Get Restaurant 2 ID
  SELECT id INTO restaurant_id
  FROM public.restaurants
  WHERE google_place_id = 'test_place_id_2'
  LIMIT 1;

  IF restaurant_id IS NOT NULL THEN
    -- Create 3 sample posts with images
    FOR i IN 1..3 LOOP
      INSERT INTO public.posts (
        id, author_id, content, images, restaurant_id,
        likes_count, comments_count, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        creator_user_id,
        'Amazing food at Test Restaurant 2! The pasta was incredible. #foodie #charlotte',
        ARRAY['https://example.com/image' || i || '.jpg'],
        restaurant_id,
        (10 + i * 5), -- Varying likes: 15, 20, 25
        (2 + i),      -- Varying comments: 3, 4, 5
        NOW() - (INTERVAL '1 day' * i),
        NOW() - (INTERVAL '1 day' * i)
      )
      RETURNING id INTO post_id;

      -- Create some saves for analytics
      INSERT INTO public.saves (id, user_id, restaurant_id, board_id, created_at)
      SELECT 
        gen_random_uuid(),
        u.id,
        restaurant_id,
        (SELECT id FROM boards WHERE user_id = u.id AND is_default = true LIMIT 1),
        NOW() - (INTERVAL '1 day' * i)
      FROM public.users u
      WHERE u.id != creator_user_id
      LIMIT (5 + i); -- 6, 7, 8 saves per post
    END LOOP;
  END IF;
END $$;

-- ================================================================
-- 6. CREATE TEST CAMPAIGN (for application testing)
-- ================================================================

DO $$
DECLARE
  business_user_id UUID := '5b9d6a94-de0d-4bbb-a666-b1797fdd7b4b'::uuid;
  restaurant_id UUID;
  campaign_id UUID;
BEGIN
  -- Get Restaurant 2 ID
  SELECT r.id INTO restaurant_id
  FROM public.restaurants r
  JOIN public.business_profiles bp ON bp.restaurant_id = r.id
  WHERE bp.user_id = business_user_id
  LIMIT 1;

  IF restaurant_id IS NOT NULL THEN
    INSERT INTO public.campaigns (
      id, restaurant_id, title, description, budget_min, budget_max,
      status, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      restaurant_id,
      'Test Campaign - Food Photography',
      'Looking for creators to showcase our new menu items',
      500.00,
      1000.00,
      'active',
      NOW(),
      NOW()
    )
    RETURNING id INTO campaign_id;
  END IF;
END $$;

-- ================================================================
-- SUMMARY
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE 'Test scenario setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - 3 test users (consumer, creator, business)';
  RAISE NOTICE '  - 3 default boards';
  RAISE NOTICE '  - 1 creator profile';
  RAISE NOTICE '  - 2 restaurants (1 unclaimed, 1 claimed)';
  RAISE NOTICE '  - 1 business profile (claiming Restaurant 2)';
  RAISE NOTICE '  - 3 posts with saves';
  RAISE NOTICE '  - 1 active campaign';
  RAISE NOTICE '';
  RAISE NOTICE 'Test accounts:';
  RAISE NOTICE '  - consumer1@troodieapp.com (OTP: 000000)';
  RAISE NOTICE '  - creator1@troodieapp.com (OTP: 000000)';
  RAISE NOTICE '  - business1@troodieapp.com (OTP: 000000)';
END $$;

