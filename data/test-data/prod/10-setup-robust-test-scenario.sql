-- ================================================================
-- Robust Production Test Scenario Setup Script
-- ================================================================
-- Creates 20 test accounts with realistic, interconnected data
-- All accounts use @bypass.com domain, OTP: 000000
-- ================================================================
-- Account Distribution:
--   - 10 Consumers (prod-consumer1 through prod-consumer10)
--   - 7 Creators (prod-creator1 through prod-creator7)
--   - 3 Businesses (prod-business1=New, prod-business2=Medium, prod-business3=High)
-- ================================================================
-- v1.0.16.b1 Features:
--   - Content Submission Flow: workflow_stage, content_file_url columns
--   - Payment Duplication Fix: single payout per application
--   - Rate Creator Timing: deliverable counts for button visibility
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- 0. CLEAN UP PRIOR PARTIAL RUNS (test accounts only)
-- ================================================================
-- Remove old prod-*@bypass.com entries if they exist with different UUIDs
-- This ensures idempotent re-runs. Only touches test accounts.

-- Collect old user IDs that need cleanup (prod-*@bypass.com with wrong UUIDs)
DO $cleanup$
DECLARE
  old_ids UUID[];
  old_creator_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO old_ids
  FROM public.users WHERE email LIKE 'prod-%@bypass.com'
  AND id NOT IN (
    'aa111111-1111-4111-a111-111111111111','aa222222-2222-4222-a222-222222222222',
    'aa333333-3333-4333-a333-333333333333','aa444444-4444-4444-a444-444444444444',
    'aa555555-5555-4555-a555-555555555555','aa666666-6666-4666-a666-666666666666',
    'aa777777-7777-4777-a777-777777777777','aa888888-8888-4888-a888-888888888888',
    'aa999999-9999-4999-a999-999999999999','aa000000-0000-4000-a000-000000000000',
    'bb111111-1111-4111-b111-111111111111','bb222222-2222-4222-b222-222222222222',
    'bb333333-3333-4333-b333-333333333333','bb444444-4444-4444-b444-444444444444',
    'bb555555-5555-4555-b555-555555555555','bb666666-6666-4666-b666-666666666666',
    'bb777777-7777-4777-b777-777777777777',
    'cc111111-1111-4111-c111-111111111111','cc222222-2222-4222-c222-222222222222',
    'cc333333-3333-4333-c333-333333333333'
  );

  IF old_ids IS NULL OR array_length(old_ids, 1) IS NULL THEN
    RAISE NOTICE 'No old test users to clean up';
    RETURN;
  END IF;

  RAISE NOTICE 'Cleaning up % old test user(s)', array_length(old_ids, 1);

  -- Get old creator profile IDs
  SELECT ARRAY_AGG(id) INTO old_creator_ids FROM creator_profiles WHERE user_id = ANY(old_ids);

  -- Clean dependent tables (respecting FK order)
  IF old_creator_ids IS NOT NULL THEN
    DELETE FROM campaign_deliverables WHERE creator_id = ANY(old_creator_ids);
    DELETE FROM campaign_applications WHERE creator_id = ANY(old_creator_ids);
    DELETE FROM creator_portfolio_items WHERE creator_profile_id = ANY(old_creator_ids);
    DELETE FROM creator_profiles WHERE user_id = ANY(old_ids);
  END IF;

  DELETE FROM business_profiles WHERE user_id = ANY(old_ids);
  DELETE FROM post_likes WHERE user_id = ANY(old_ids);
  DELETE FROM post_comments WHERE user_id = ANY(old_ids);
  DELETE FROM post_saves WHERE user_id = ANY(old_ids);
  DELETE FROM posts WHERE user_id = ANY(old_ids);
  UPDATE public.users SET default_board_id = NULL WHERE id = ANY(old_ids);
  DELETE FROM board_restaurants WHERE board_id IN (SELECT id FROM boards WHERE user_id = ANY(old_ids));
  DELETE FROM boards WHERE user_id = ANY(old_ids);
  DELETE FROM user_relationships WHERE follower_id = ANY(old_ids) OR following_id = ANY(old_ids);
  DELETE FROM notifications WHERE user_id = ANY(old_ids);
  DELETE FROM restaurant_claims WHERE user_id = ANY(old_ids);
  DELETE FROM restaurant_saves WHERE user_id = ANY(old_ids);

  -- Disable FK triggers temporarily for clean deletion
  SET session_replication_role = replica;

  DELETE FROM public.users WHERE id = ANY(old_ids);
  DELETE FROM auth.users WHERE id = ANY(old_ids);

  -- Re-enable FK triggers
  SET session_replication_role = DEFAULT;

  RAISE NOTICE 'Old test user cleanup complete';
END $cleanup$;

-- ================================================================
-- 1. CREATE 20 TEST USERS (Auth + Public)
-- ================================================================

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  -- Consumers
  ('aa111111-1111-4111-a111-111111111111'::uuid, 'prod-consumer1@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Consumer 1", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('aa222222-2222-4222-a222-222222222222'::uuid, 'prod-consumer2@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Consumer 2", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('aa333333-3333-4333-a333-333333333333'::uuid, 'prod-consumer3@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Consumer 3", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('aa444444-4444-4444-a444-444444444444'::uuid, 'prod-consumer4@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Consumer 4", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('aa555555-5555-4555-a555-555555555555'::uuid, 'prod-consumer5@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Consumer 5", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('aa666666-6666-4666-a666-666666666666'::uuid, 'prod-consumer6@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Consumer 6", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('aa777777-7777-4777-a777-777777777777'::uuid, 'prod-consumer7@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Consumer 7", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('aa888888-8888-4888-a888-888888888888'::uuid, 'prod-consumer8@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Consumer 8", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('aa999999-9999-4999-a999-999999999999'::uuid, 'prod-consumer9@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Consumer 9", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('aa000000-0000-4000-a000-000000000000'::uuid, 'prod-consumer10@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Prod Consumer 10", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  -- Creators
  ('bb111111-1111-4111-b111-111111111111'::uuid, 'prod-creator1@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Foodie Lens", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('bb222222-2222-4222-b222-222222222222'::uuid, 'prod-creator2@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Wanderlust Eats", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('bb333333-3333-4333-b333-333333333333'::uuid, 'prod-creator3@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Lifestyle & Bites", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('bb444444-4444-4444-b444-444444444444'::uuid, 'prod-creator4@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "The Critic", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('bb555555-5555-4555-b555-555555555555'::uuid, 'prod-creator5@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Food Reels Pro", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('bb666666-6666-4666-b666-666666666666'::uuid, 'prod-creator6@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Local Foodie", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('bb777777-7777-4777-b777-777777777777'::uuid, 'prod-creator7@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Styled Plates", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  -- Businesses
  ('cc111111-1111-4111-c111-111111111111'::uuid, 'prod-business1@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Business 1 (New)", "account_type": "business"}'::jsonb, 'authenticated', 'authenticated'),
  ('cc222222-2222-4222-c222-222222222222'::uuid, 'prod-business2@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Business 2 (Medium)", "account_type": "business"}'::jsonb, 'authenticated', 'authenticated'),
  ('cc333333-3333-4333-c333-333333333333'::uuid, 'prod-business3@bypass.com', crypt('000000', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Business 3 (High)", "account_type": "business"}'::jsonb, 'authenticated', 'authenticated')
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

-- Create auth.identities (required for signInWithPassword to work)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT
  au.id,
  au.id,
  jsonb_build_object('sub', au.id::text, 'email', au.email, 'email_verified', true),
  'email',
  au.id::text,
  NOW(),
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email LIKE 'prod-%@bypass.com'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = au.id AND i.provider = 'email'
  )
ON CONFLICT DO NOTHING;

-- Create public.users records
INSERT INTO public.users (id, email, name, account_type, is_creator, created_at, updated_at)
VALUES
  ('aa111111-1111-4111-a111-111111111111'::uuid, 'prod-consumer1@bypass.com', 'Prod Consumer 1', 'consumer', false, NOW(), NOW()),
  ('aa222222-2222-4222-a222-222222222222'::uuid, 'prod-consumer2@bypass.com', 'Prod Consumer 2', 'consumer', false, NOW(), NOW()),
  ('aa333333-3333-4333-a333-333333333333'::uuid, 'prod-consumer3@bypass.com', 'Prod Consumer 3', 'consumer', false, NOW(), NOW()),
  ('aa444444-4444-4444-a444-444444444444'::uuid, 'prod-consumer4@bypass.com', 'Prod Consumer 4', 'consumer', false, NOW(), NOW()),
  ('aa555555-5555-4555-a555-555555555555'::uuid, 'prod-consumer5@bypass.com', 'Prod Consumer 5', 'consumer', false, NOW(), NOW()),
  ('aa666666-6666-4666-a666-666666666666'::uuid, 'prod-consumer6@bypass.com', 'Prod Consumer 6', 'consumer', false, NOW(), NOW()),
  ('aa777777-7777-4777-a777-777777777777'::uuid, 'prod-consumer7@bypass.com', 'Prod Consumer 7', 'consumer', false, NOW(), NOW()),
  ('aa888888-8888-4888-a888-888888888888'::uuid, 'prod-consumer8@bypass.com', 'Prod Consumer 8', 'consumer', false, NOW(), NOW()),
  ('aa999999-9999-4999-a999-999999999999'::uuid, 'prod-consumer9@bypass.com', 'Prod Consumer 9', 'consumer', false, NOW(), NOW()),
  ('aa000000-0000-4000-a000-000000000000'::uuid, 'prod-consumer10@bypass.com', 'Prod Consumer 10', 'consumer', false, NOW(), NOW()),
  ('bb111111-1111-4111-b111-111111111111'::uuid, 'prod-creator1@bypass.com', 'Foodie Lens', 'creator', true, NOW(), NOW()),
  ('bb222222-2222-4222-b222-222222222222'::uuid, 'prod-creator2@bypass.com', 'Wanderlust Eats', 'creator', true, NOW(), NOW()),
  ('bb333333-3333-4333-b333-333333333333'::uuid, 'prod-creator3@bypass.com', 'Lifestyle & Bites', 'creator', true, NOW(), NOW()),
  ('bb444444-4444-4444-b444-444444444444'::uuid, 'prod-creator4@bypass.com', 'The Critic', 'creator', true, NOW(), NOW()),
  ('bb555555-5555-4555-b555-555555555555'::uuid, 'prod-creator5@bypass.com', 'Food Reels Pro', 'creator', true, NOW(), NOW()),
  ('bb666666-6666-4666-b666-666666666666'::uuid, 'prod-creator6@bypass.com', 'Local Foodie', 'creator', true, NOW(), NOW()),
  ('bb777777-7777-4777-b777-777777777777'::uuid, 'prod-creator7@bypass.com', 'Styled Plates', 'creator', true, NOW(), NOW()),
  ('cc111111-1111-4111-c111-111111111111'::uuid, 'prod-business1@bypass.com', 'Test Business 1 (New)', 'business', false, NOW(), NOW()),
  ('cc222222-2222-4222-c222-222222222222'::uuid, 'prod-business2@bypass.com', 'Test Business 2 (Medium)', 'business', false, NOW(), NOW()),
  ('cc333333-3333-4333-c333-333333333333'::uuid, 'prod-business3@bypass.com', 'Test Business 3 (High)', 'business', false, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  account_type = EXCLUDED.account_type,
  is_creator = EXCLUDED.is_creator,
  updated_at = NOW();

-- ================================================================
-- 2. CREATE DEFAULT BOARDS FOR ALL USERS
-- ================================================================

-- Use the ensure_quick_saves_board function (from 20250125_quick_saves_board.sql)
-- This creates "Quick Saves" boards and links them via default_board_id on users
DO $$
DECLARE
  user_rec RECORD;
BEGIN
  FOR user_rec IN
    SELECT id FROM public.users
    WHERE email LIKE 'prod-%@bypass.com'
      AND id IN (
        'aa111111-1111-4111-a111-111111111111','aa222222-2222-4222-a222-222222222222',
        'aa333333-3333-4333-a333-333333333333','aa444444-4444-4444-a444-444444444444',
        'aa555555-5555-4555-a555-555555555555','aa666666-6666-4666-a666-666666666666',
        'aa777777-7777-4777-a777-777777777777','aa888888-8888-4888-a888-888888888888',
        'aa999999-9999-4999-a999-999999999999','aa000000-0000-4000-a000-000000000000',
        'bb111111-1111-4111-b111-111111111111','bb222222-2222-4222-b222-222222222222',
        'bb333333-3333-4333-b333-333333333333','bb444444-4444-4444-b444-444444444444',
        'bb555555-5555-4555-b555-555555555555','bb666666-6666-4666-b666-666666666666',
        'bb777777-7777-4777-b777-777777777777','cc111111-1111-4111-c111-111111111111',
        'cc222222-2222-4222-c222-222222222222','cc333333-3333-4333-c333-333333333333'
      )
  LOOP
    PERFORM ensure_quick_saves_board(user_rec.id);
  END LOOP;
END $$;

-- ================================================================
-- 3. CREATE CREATOR PROFILES WITH PORTFOLIOS
-- ================================================================

INSERT INTO public.creator_profiles (id, user_id, display_name, bio, location, open_to_collabs, specialties, troodie_posts_count, created_at, updated_at)
VALUES
  ('ee111111-1111-4111-e111-111111111111'::uuid, 'bb111111-1111-4111-b111-111111111111'::uuid, 'Foodie Lens', 'Professional food photographer specializing in restaurant and culinary content. 5+ years experience.', 'Charlotte, NC', true, ARRAY['Food Photography', 'Restaurant Reviews'], 45, NOW(), NOW()),
  ('ee222222-2222-4222-e222-222222222222'::uuid, 'bb222222-2222-4222-b222-222222222222'::uuid, 'Wanderlust Eats', 'Travel and food blogger exploring local restaurants across the Southeast.', 'Atlanta, GA', true, ARRAY['Travel', 'Restaurant Reviews', 'Food Blogging'], 38, NOW(), NOW()),
  ('ee333333-3333-4333-e333-333333333333'::uuid, 'bb333333-3333-4333-b333-333333333333'::uuid, 'Lifestyle & Bites', 'Lifestyle content creator focusing on dining experiences and local food culture.', 'Raleigh, NC', true, ARRAY['Lifestyle', 'Food Content'], 52, NOW(), NOW()),
  ('ee444444-4444-4444-e444-444444444444'::uuid, 'bb444444-4444-4444-b444-444444444444'::uuid, 'The Critic', 'Professional restaurant critic with 10+ years experience. Honest, detailed reviews.', 'Charlotte, NC', false, ARRAY['Restaurant Reviews', 'Food Criticism'], 28, NOW(), NOW()),
  ('ee555555-5555-4555-e555-555555555555'::uuid, 'bb555555-5555-4555-b555-555555555555'::uuid, 'Food Reels Pro', 'Creating engaging food video content for TikTok and Instagram.', 'Asheville, NC', true, ARRAY['Video Content', 'Social Media'], 67, NOW(), NOW()),
  ('ee666666-6666-4666-e666-666666666666'::uuid, 'bb666666-6666-4666-b666-666666666666'::uuid, 'Local Foodie', 'Sharing my favorite local spots and hidden gems in the Charlotte area.', 'Charlotte, NC', true, ARRAY['Local Food', 'Hidden Gems'], 24, NOW(), NOW()),
  ('ee777777-7777-4777-e777-777777777777'::uuid, 'bb777777-7777-4777-b777-777777777777'::uuid, 'Styled Plates', 'Professional food stylist creating beautiful, appetizing content.', 'Greenville, SC', true, ARRAY['Food Styling', 'Photography'], 41, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  specialties = EXCLUDED.specialties,
  updated_at = NOW();

-- Portfolio items for creators
DO $$
DECLARE
  profile_ids UUID[] := ARRAY[
    'ee111111-1111-4111-e111-111111111111','ee222222-2222-4222-e222-222222222222',
    'ee333333-3333-4333-e333-333333333333','ee444444-4444-4444-e444-444444444444',
    'ee555555-5555-4555-e555-555555555555','ee666666-6666-4666-e666-666666666666',
    'ee777777-7777-4777-e777-777777777777'
  ];
  i INTEGER;
  j INTEGER;
BEGIN
  FOR i IN 1..7 LOOP
    FOR j IN 1..(3 + (i % 4)) LOOP
      INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, media_type, display_order, created_at)
      VALUES (
        gen_random_uuid(),
        profile_ids[i],
        'https://images.unsplash.com/photo-' || (1500000000000 + i * 1000000 + j * 100000) || '?w=800',
        'image',
        j,
        NOW() - (INTERVAL '1 day' * (8 - j))
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ================================================================
-- 4. CREATE RESTAURANTS (3 claimed, 5 unclaimed)
-- ================================================================

INSERT INTO public.restaurants (id, google_place_id, name, address, city, state, zip_code, cuisine_types, price_range, is_test_restaurant, created_at, updated_at)
VALUES
  ('dd111111-1111-4111-d111-111111111111'::uuid, 'ChIJProdBusiness1Rest', 'Bella Vista Italian Kitchen', '789 Italian Way', 'Charlotte', 'NC', '28204', ARRAY['Italian', 'Fine Dining'], '$$$', true, NOW(), NOW()),
  ('dd222222-2222-4222-d222-222222222222'::uuid, 'ChIJProdBusiness2Rest', 'The Rustic Table', '123 Main Street', 'Charlotte', 'NC', '28202', ARRAY['American', 'Farm-to-Table'], '$$', true, NOW(), NOW()),
  ('dd333333-3333-4333-d333-333333333333'::uuid, 'ChIJProdBusiness3Rest', 'Sakura Sushi Bar', '456 Foodie Avenue', 'Charlotte', 'NC', '28203', ARRAY['Japanese', 'Sushi'], '$$$', true, NOW(), NOW()),
  ('dd444444-4444-4444-d444-444444444444'::uuid, 'ChIJProdUnclaimed1', 'Unclaimed Restaurant 1', '101 Test Street', 'Charlotte', 'NC', '28205', ARRAY['American', 'Casual'], '$$', true, NOW(), NOW()),
  ('dd555555-5555-4555-d555-555555555555'::uuid, 'ChIJProdUnclaimed2', 'Unclaimed Restaurant 2', '102 Test Street', 'Charlotte', 'NC', '28206', ARRAY['Mexican', 'Casual'], '$$', true, NOW(), NOW()),
  ('dd666666-6666-4666-d666-666666666666'::uuid, 'ChIJProdUnclaimed3', 'Unclaimed Restaurant 3', '103 Test Street', 'Charlotte', 'NC', '28207', ARRAY['Thai', 'Asian'], '$$', true, NOW(), NOW()),
  ('dd777777-7777-4777-d777-777777777777'::uuid, 'ChIJProdUnclaimed4', 'Unclaimed Restaurant 4', '104 Test Street', 'Charlotte', 'NC', '28208', ARRAY['Indian', 'Curry'], '$$$', true, NOW(), NOW()),
  ('dd888888-8888-4888-d888-888888888888'::uuid, 'ChIJProdUnclaimed5', 'Unclaimed Restaurant 5', '105 Test Street', 'Charlotte', 'NC', '28209', ARRAY['French', 'Fine Dining'], '$$$$', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Business profiles and claims
INSERT INTO public.business_profiles (id, user_id, restaurant_id, created_at, updated_at)
VALUES
  ('ff111111-1111-4111-f111-111111111111'::uuid, 'cc111111-1111-4111-c111-111111111111'::uuid, 'dd111111-1111-4111-d111-111111111111'::uuid, NOW(), NOW()),
  ('ff222222-2222-4222-f222-222222222222'::uuid, 'cc222222-2222-4222-c222-222222222222'::uuid, 'dd222222-2222-4222-d222-222222222222'::uuid, NOW(), NOW()),
  ('ff333333-3333-4333-f333-333333333333'::uuid, 'cc333333-3333-4333-c333-333333333333'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  restaurant_id = EXCLUDED.restaurant_id,
  updated_at = NOW();

-- ================================================================
-- 5. CREATE POSTS WITH ENGAGEMENT
-- ================================================================

DO $posts$
DECLARE
  post_id UUID;
  restaurant_ids UUID[] := ARRAY[
    'dd111111-1111-4111-d111-111111111111',
    'dd222222-2222-4222-d222-222222222222',
    'dd333333-3333-4333-d333-333333333333'
  ];
  restaurant_names TEXT[] := ARRAY['Bella Vista Italian Kitchen', 'The Rustic Table', 'Sakura Sushi Bar'];
  creator_user_ids UUID[] := ARRAY[
    'bb111111-1111-4111-b111-111111111111','bb222222-2222-4222-b222-222222222222',
    'bb333333-3333-4333-b333-333333333333','bb444444-4444-4444-b444-444444444444',
    'bb555555-5555-4555-b555-555555555555','bb666666-6666-4666-b666-666666666666',
    'bb777777-7777-4777-b777-777777777777'
  ];
  consumer_user_ids UUID[] := ARRAY[
    'aa111111-1111-4111-a111-111111111111','aa222222-2222-4222-a222-222222222222',
    'aa333333-3333-4333-a333-333333333333','aa444444-4444-4444-a444-444444444444',
    'aa555555-5555-4555-a555-555555555555','aa666666-6666-4666-a666-666666666666',
    'aa777777-7777-4777-a777-777777777777','aa888888-8888-4888-a888-888888888888',
    'aa999999-9999-4999-a999-999999999999','aa000000-0000-4000-a000-000000000000'
  ];
  all_user_ids UUID[];
  i INTEGER; j INTEGER; k INTEGER;
  r_idx INTEGER;
  post_author UUID;
  captions TEXT[] := ARRAY[
    'Amazing experience at %s! The food was incredible and the service was top-notch.',
    'Just tried %s for the first time. Absolute perfection!',
    'Date night at %s did not disappoint. The ambiance and food quality are unmatched.',
    'If you''re looking for authentic cuisine, %s is the place to be.',
    'Quick lunch at %s. The flavors are bold and the presentation is beautiful.'
  ];
BEGIN
  all_user_ids := creator_user_ids || consumer_user_ids;

  -- Creator posts (3-5 per creator)
  FOR i IN 1..7 LOOP
    post_author := creator_user_ids[i];
    FOR j IN 1..(3 + (i % 3)) LOOP
      r_idx := 1 + ((j - 1) % 3);
      INSERT INTO public.posts (id, user_id, restaurant_id, caption, photos, rating, visit_date, price_range, visit_type, tags, privacy, likes_count, comments_count, saves_count, created_at, updated_at)
      VALUES (
        gen_random_uuid(), post_author, restaurant_ids[r_idx],
        format(captions[1 + ((i + j) % 5)], restaurant_names[r_idx]),
        ARRAY['https://images.unsplash.com/photo-' || (1500000000000 + (i * 100) + j) || '?w=800'],
        4 + (j % 2), NOW() - (INTERVAL '1 day' * (j * 2)),
        CASE WHEN j % 2 = 0 THEN '$$' ELSE '$$$' END,
        CASE (j % 3) WHEN 0 THEN 'dine_in' WHEN 1 THEN 'takeout' ELSE 'delivery' END,
        ARRAY['foodie', 'restaurant', 'charlotte'], 'public',
        0, 0, 0, NOW() - (INTERVAL '1 day' * (j * 2)), NOW() - (INTERVAL '1 day' * (j * 2))
      ) RETURNING id INTO post_id;

      -- Likes (5-15 per post)
      FOR k IN 1..LEAST(5 + j * 2, array_length(all_user_ids, 1)) LOOP
        INSERT INTO public.post_likes (id, post_id, user_id, created_at)
        VALUES (gen_random_uuid(), post_id, all_user_ids[k], NOW() - (INTERVAL '1 hour' * k))
        ON CONFLICT DO NOTHING;
      END LOOP;

      -- Comments (2-5 per post)
      FOR k IN 1..LEAST(2 + (j % 4), array_length(all_user_ids, 1)) LOOP
        INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
        VALUES (gen_random_uuid(), post_id, all_user_ids[1 + ((k + i) % array_length(all_user_ids, 1))],
          CASE (k % 4)
            WHEN 0 THEN 'This looks amazing! I need to try this place!'
            WHEN 1 THEN 'Great review! Adding this to my list.'
            WHEN 2 THEN 'I''ve been there too! The food is incredible.'
            WHEN 3 THEN 'Thanks for sharing! Can''t wait to visit.'
          END,
          NOW() - (INTERVAL '1 hour' * k))
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Consumer posts (1-2 per consumer)
  FOR i IN 1..10 LOOP
    post_author := consumer_user_ids[i];
    FOR j IN 1..(1 + (i % 2)) LOOP
      r_idx := 1 + ((j - 1) % 3);
      INSERT INTO public.posts (id, user_id, restaurant_id, caption, photos, rating, visit_date, price_range, visit_type, tags, privacy, likes_count, comments_count, saves_count, created_at, updated_at)
      VALUES (
        gen_random_uuid(), post_author, restaurant_ids[r_idx],
        'Had a great meal at ' || restaurant_names[r_idx] || '!',
        ARRAY['https://images.unsplash.com/photo-' || (1600000000000 + (i * 100) + j) || '?w=800'],
        4, NOW() - (INTERVAL '1 day' * j), '$$', 'dine_in', ARRAY['food'], 'public',
        0, 0, 0, NOW() - (INTERVAL '1 day' * j), NOW() - (INTERVAL '1 day' * j)
      ) RETURNING id INTO post_id;

      FOR k IN 1..(3 + (j * 2)) LOOP
        INSERT INTO public.post_likes (id, post_id, user_id, created_at)
        VALUES (gen_random_uuid(), post_id, all_user_ids[1 + (k % array_length(all_user_ids, 1))], NOW() - (INTERVAL '1 hour' * k))
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $posts$;

-- ================================================================
-- 6. CREATE RESTAURANT SAVES
-- ================================================================

-- Disable triggers to avoid buggy rating summary trigger
SET session_replication_role = replica;

DO $$
DECLARE
  all_user_ids UUID[];
  i INTEGER;
  v_user_id UUID;
  v_board_id UUID;
BEGIN
  all_user_ids := ARRAY(
    SELECT id FROM public.users WHERE id IN (
      'aa111111-1111-4111-a111-111111111111','aa222222-2222-4222-a222-222222222222',
      'aa333333-3333-4333-a333-333333333333','aa444444-4444-4444-a444-444444444444',
      'aa555555-5555-4555-a555-555555555555','bb111111-1111-4111-b111-111111111111',
      'bb222222-2222-4222-b222-222222222222','bb333333-3333-4333-b333-333333333333',
      'bb444444-4444-4444-b444-444444444444','bb555555-5555-4555-b555-555555555555'
    )
  );

  -- Saves for Restaurant 2 (Medium - 15 saves)
  FOR i IN 1..LEAST(15, array_length(all_user_ids, 1)) LOOP
    v_user_id := all_user_ids[1 + ((i - 1) % array_length(all_user_ids, 1))];
    SELECT default_board_id INTO v_board_id FROM public.users WHERE id = v_user_id;
    IF v_board_id IS NULL THEN
      SELECT id INTO v_board_id FROM public.boards WHERE user_id = v_user_id AND title = 'Quick Saves' LIMIT 1;
    END IF;
    INSERT INTO public.restaurant_saves (id, user_id, restaurant_id, board_id, personal_rating, visit_date, would_recommend, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, 'dd222222-2222-4222-d222-222222222222'::uuid, v_board_id, 4 + (i % 2), NOW() - (INTERVAL '1 day' * (i % 30)), true, NOW() - (INTERVAL '1 day' * (i % 30)), NOW())
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Saves for Restaurant 3 (High - 10 saves from subset)
  FOR i IN 1..LEAST(10, array_length(all_user_ids, 1)) LOOP
    v_user_id := all_user_ids[1 + ((i - 1) % array_length(all_user_ids, 1))];
    SELECT default_board_id INTO v_board_id FROM public.users WHERE id = v_user_id;
    IF v_board_id IS NULL THEN
      SELECT id INTO v_board_id FROM public.boards WHERE user_id = v_user_id AND title = 'Quick Saves' LIMIT 1;
    END IF;
    INSERT INTO public.restaurant_saves (id, user_id, restaurant_id, board_id, personal_rating, visit_date, would_recommend, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, 'dd333333-3333-4333-d333-333333333333'::uuid, v_board_id, 5, NOW() - (INTERVAL '1 day' * i), true, NOW() - (INTERVAL '1 day' * i), NOW())
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Saves for Restaurant 1 (New - 5 saves)
  FOR i IN 1..LEAST(5, array_length(all_user_ids, 1)) LOOP
    v_user_id := all_user_ids[i];
    SELECT default_board_id INTO v_board_id FROM public.users WHERE id = v_user_id;
    IF v_board_id IS NULL THEN
      SELECT id INTO v_board_id FROM public.boards WHERE user_id = v_user_id AND title = 'Quick Saves' LIMIT 1;
    END IF;
    INSERT INTO public.restaurant_saves (id, user_id, restaurant_id, board_id, personal_rating, visit_date, would_recommend, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, 'dd111111-1111-4111-d111-111111111111'::uuid, v_board_id, 4, NOW() - (INTERVAL '1 day' * i), true, NOW() - (INTERVAL '1 day' * i), NOW())
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ================================================================
-- 7. CREATE USER FOLLOWS (Social Graph)
-- ================================================================

DO $$
DECLARE
  all_user_ids UUID[];
  i INTEGER; j INTEGER;
  follower_id UUID;
  following_id UUID;
BEGIN
  all_user_ids := ARRAY[
    'aa111111-1111-4111-a111-111111111111','aa222222-2222-4222-a222-222222222222',
    'aa333333-3333-4333-a333-333333333333','aa444444-4444-4444-a444-444444444444',
    'aa555555-5555-4555-a555-555555555555','bb111111-1111-4111-b111-111111111111',
    'bb222222-2222-4222-b222-222222222222','bb333333-3333-4333-b333-333333333333',
    'bb444444-4444-4444-b444-444444444444','bb555555-5555-4555-b555-555555555555',
    'bb666666-6666-4666-b666-666666666666','bb777777-7777-4777-b777-777777777777',
    'cc111111-1111-4111-c111-111111111111','cc222222-2222-4222-c222-222222222222',
    'cc333333-3333-4333-c333-333333333333'
  ];

  FOR i IN 1..array_length(all_user_ids, 1) LOOP
    follower_id := all_user_ids[i];
    FOR j IN 1..(3 + (i % 5)) LOOP
      following_id := all_user_ids[1 + ((i + j) % array_length(all_user_ids, 1))];
      IF follower_id != following_id THEN
        INSERT INTO public.user_relationships (id, follower_id, following_id, created_at)
        VALUES (gen_random_uuid(), follower_id, following_id, NOW() - (INTERVAL '1 day' * j))
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ================================================================
-- 8. CREATE CAMPAIGNS
-- ================================================================

-- Business 2 (Medium): 3 campaigns
INSERT INTO public.campaigns (id, restaurant_id, owner_id, title, description, campaign_type, status, budget_cents, max_creators, start_date, end_date, is_test_campaign, created_at, updated_at)
VALUES
  ('c2aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'dd222222-2222-4222-d222-222222222222'::uuid, 'cc222222-2222-4222-c222-222222222222'::uuid, 'Spring Menu Launch', 'Looking for creators to showcase our new spring menu items.', 'general', 'active', 50000, 3, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '30 days', true, NOW() - INTERVAL '1 week', NOW()),
  ('c2bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid, 'dd222222-2222-4222-d222-222222222222'::uuid, 'cc222222-2222-4222-c222-222222222222'::uuid, 'Weekend Brunch Promotion', 'Promoting our weekend brunch specials.', 'general', 'active', 30000, 2, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '21 days', true, NOW() - INTERVAL '2 weeks', NOW()),
  ('c2cccccc-cccc-4ccc-cccc-cccccccccccc'::uuid, 'dd222222-2222-4222-d222-222222222222'::uuid, 'cc222222-2222-4222-c222-222222222222'::uuid, 'Summer Patio Feature', 'Highlight our outdoor patio dining experience.', 'general', 'completed', 40000, 2, CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days', true, NOW() - INTERVAL '8 weeks', NOW())
ON CONFLICT (id) DO NOTHING;

-- Business 3 (High): 10 campaigns
INSERT INTO public.campaigns (id, restaurant_id, owner_id, title, description, campaign_type, status, budget_cents, max_creators, start_date, end_date, is_test_campaign, created_at, updated_at)
VALUES
  ('c3aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'cc333333-3333-4333-c333-333333333333'::uuid, 'Sushi Special Feature', 'Feature our sushi specials.', 'general', 'active', 60000, 3, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true, NOW() - INTERVAL '1 week', NOW()),
  ('c3bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'cc333333-3333-4333-c333-333333333333'::uuid, 'Date Night Promotion', 'Promote date night specials.', 'general', 'active', 45000, 2, CURRENT_DATE, CURRENT_DATE + INTERVAL '21 days', true, NOW() - INTERVAL '2 weeks', NOW()),
  ('c3cccccc-cccc-4ccc-cccc-cccccccccccc'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'cc333333-3333-4333-c333-333333333333'::uuid, 'Happy Hour Highlight', 'Happy hour deals and drinks.', 'general', 'active', 35000, 2, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', true, NOW() - INTERVAL '3 weeks', NOW()),
  ('c3dddddd-dddd-4ddd-dddd-dddddddddddd'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'cc333333-3333-4333-c333-333333333333'::uuid, 'Chef Special Showcase', 'Showcase the chef''s special menu.', 'general', 'completed', 50000, 3, CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days', true, NOW() - INTERVAL '8 weeks', NOW()),
  ('c3eeeeee-eeee-4eee-eeee-eeeeeeeeeeee'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'cc333333-3333-4333-c333-333333333333'::uuid, 'Holiday Menu Launch', 'Launch holiday themed menu.', 'general', 'completed', 55000, 2, CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE - INTERVAL '60 days', true, NOW() - INTERVAL '12 weeks', NOW()),
  ('c3ffffff-ffff-4fff-ffff-ffffffffffff'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'cc333333-3333-4333-c333-333333333333'::uuid, 'Weekend Tasting Event', 'Tasting event promo.', 'general', 'completed', 40000, 3, CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '15 days', true, NOW() - INTERVAL '6 weeks', NOW()),
  ('c3111111-1111-4111-1111-111111111111'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'cc333333-3333-4333-c333-333333333333'::uuid, 'Ramen Week Special', 'Promote ramen week.', 'general', 'completed', 30000, 2, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '7 days', true, NOW() - INTERVAL '4 weeks', NOW()),
  ('c3222222-2222-4222-2222-222222222222'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'cc333333-3333-4333-c333-333333333333'::uuid, 'Sake Pairing Night', 'Sake and food pairing.', 'general', 'draft', 35000, 2, CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '30 days', true, NOW() - INTERVAL '1 week', NOW()),
  ('c3333333-3333-4333-3333-333333333333'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'cc333333-3333-4333-c333-333333333333'::uuid, 'Lunch Special Campaign', 'Promote lunch specials.', 'general', 'draft', 25000, 1, CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '45 days', true, NOW(), NOW()),
  ('c3444444-4444-4444-4444-444444444444'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'cc333333-3333-4333-c333-333333333333'::uuid, 'Omakase Experience', 'Luxury omakase experience promo.', 'general', 'draft', 80000, 1, CURRENT_DATE + INTERVAL '21 days', CURRENT_DATE + INTERVAL '60 days', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 9. CREATE CAMPAIGN APPLICATIONS
-- ================================================================

-- Business 2 campaigns: applications from creators 1-4
INSERT INTO public.campaign_applications (id, campaign_id, creator_id, proposed_rate_cents, cover_letter, status, applied_at, reviewed_at)
VALUES
  -- Spring Menu Launch (3 apps: 1 accepted, 1 pending, 1 rejected)
  ('a2111111-1111-4111-a111-111111111111'::uuid, 'c2aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'ee111111-1111-4111-e111-111111111111'::uuid, 50000, 'I would love to showcase the spring menu! My food photography skills are perfect for this.', 'accepted', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'),
  ('a2222222-2222-4222-a222-222222222222'::uuid, 'c2aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'ee222222-2222-4222-e222-222222222222'::uuid, 45000, 'I specialize in restaurant content and would love to collaborate.', 'pending', NOW() - INTERVAL '3 days', NULL),
  ('a2333333-3333-4333-a333-333333333333'::uuid, 'c2aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'ee333333-3333-4333-e333-333333333333'::uuid, 55000, 'Excited about this opportunity!', 'rejected', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'),
  -- Weekend Brunch (2 apps: 1 accepted, 1 accepted)
  ('a2444444-4444-4444-a444-444444444444'::uuid, 'c2bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid, 'ee444444-4444-4444-e444-444444444444'::uuid, 30000, 'I can create honest, detailed brunch reviews.', 'accepted', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'),
  ('a2555555-5555-4555-a555-555555555555'::uuid, 'c2bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid, 'ee555555-5555-4555-e555-555555555555'::uuid, 35000, 'Brunch content is my specialty!', 'accepted', NOW() - INTERVAL '9 days', NOW() - INTERVAL '7 days'),
  -- Summer Patio (2 apps: both accepted - completed campaign)
  ('a2666666-6666-4666-a666-666666666666'::uuid, 'c2cccccc-cccc-4ccc-cccc-cccccccccccc'::uuid, 'ee666666-6666-4666-e666-666666666666'::uuid, 40000, 'I love outdoor dining content!', 'accepted', NOW() - INTERVAL '50 days', NOW() - INTERVAL '48 days'),
  ('a2777777-7777-4777-a777-777777777777'::uuid, 'c2cccccc-cccc-4ccc-cccc-cccccccccccc'::uuid, 'ee777777-7777-4777-e777-777777777777'::uuid, 40000, 'Food styling on a patio - perfect!', 'accepted', NOW() - INTERVAL '49 days', NOW() - INTERVAL '47 days')
ON CONFLICT (id) DO NOTHING;

-- Business 3 campaigns: applications from various creators
INSERT INTO public.campaign_applications (id, campaign_id, creator_id, proposed_rate_cents, cover_letter, status, applied_at, reviewed_at)
VALUES
  -- Sushi Special (4 apps)
  ('a3111111-1111-4111-a111-111111111111'::uuid, 'c3aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'ee111111-1111-4111-e111-111111111111'::uuid, 60000, 'Sushi photography is my forte!', 'accepted', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'),
  ('a3222222-2222-4222-a222-222222222222'::uuid, 'c3aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'ee222222-2222-4222-e222-222222222222'::uuid, 55000, 'I create engaging sushi content.', 'accepted', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'),
  ('a3333333-3333-4333-a333-333333333333'::uuid, 'c3aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'ee333333-3333-4333-e333-333333333333'::uuid, 50000, 'Would love to feature sushi!', 'pending', NOW() - INTERVAL '2 days', NULL),
  ('a3444444-4444-4444-a444-444444444444'::uuid, 'c3aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'ee444444-4444-4444-e444-444444444444'::uuid, 65000, 'Professional sushi critic here.', 'rejected', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
  -- Date Night (3 apps)
  ('a3555555-5555-4555-a555-555555555555'::uuid, 'c3bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid, 'ee555555-5555-4555-e555-555555555555'::uuid, 45000, 'Date night video content creator!', 'accepted', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'),
  ('a3666666-6666-4666-a666-666666666666'::uuid, 'c3bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid, 'ee666666-6666-4666-e666-666666666666'::uuid, 40000, 'Local date night expert.', 'accepted', NOW() - INTERVAL '9 days', NOW() - INTERVAL '7 days'),
  ('a3777777-7777-4777-a777-777777777777'::uuid, 'c3bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid, 'ee777777-7777-4777-e777-777777777777'::uuid, 42000, 'Romantic dining is my niche.', 'pending', NOW() - INTERVAL '5 days', NULL),
  -- Happy Hour (2 apps)
  ('a3888888-8888-4888-a888-888888888888'::uuid, 'c3cccccc-cccc-4ccc-cccc-cccccccccccc'::uuid, 'ee111111-1111-4111-e111-111111111111'::uuid, 35000, 'Happy hour shots are my thing!', 'accepted', NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days'),
  ('a3999999-9999-4999-a999-999999999999'::uuid, 'c3cccccc-cccc-4ccc-cccc-cccccccccccc'::uuid, 'ee333333-3333-4333-e333-333333333333'::uuid, 30000, 'Cocktail and food pairing content.', 'accepted', NOW() - INTERVAL '14 days', NOW() - INTERVAL '12 days'),
  -- Chef Special (3 apps - completed campaign)
  ('a3aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'c3dddddd-dddd-4ddd-dddd-dddddddddddd'::uuid, 'ee222222-2222-4222-e222-222222222222'::uuid, 50000, 'Chef content is what I do best.', 'accepted', NOW() - INTERVAL '55 days', NOW() - INTERVAL '53 days'),
  ('a3bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid, 'c3dddddd-dddd-4ddd-dddd-dddddddddddd'::uuid, 'ee444444-4444-4444-e444-444444444444'::uuid, 48000, 'Professional culinary reviewer.', 'accepted', NOW() - INTERVAL '54 days', NOW() - INTERVAL '52 days'),
  ('a3cccccc-cccc-4ccc-cccc-cccccccccccc'::uuid, 'c3dddddd-dddd-4ddd-dddd-dddddddddddd'::uuid, 'ee555555-5555-4555-e555-555555555555'::uuid, 52000, 'Video content for chef specials!', 'accepted', NOW() - INTERVAL '53 days', NOW() - INTERVAL '51 days'),
  -- Holiday Menu (2 apps - completed)
  ('a3dddddd-dddd-4ddd-dddd-dddddddddddd'::uuid, 'c3eeeeee-eeee-4eee-eeee-eeeeeeeeeeee'::uuid, 'ee666666-6666-4666-e666-666666666666'::uuid, 55000, 'Holiday content creator!', 'accepted', NOW() - INTERVAL '85 days', NOW() - INTERVAL '83 days'),
  ('a3eeeeee-eeee-4eee-eeee-eeeeeeeeeeee'::uuid, 'c3eeeeee-eeee-4eee-eeee-eeeeeeeeeeee'::uuid, 'ee777777-7777-4777-e777-777777777777'::uuid, 53000, 'Festive food styling expert.', 'accepted', NOW() - INTERVAL '84 days', NOW() - INTERVAL '82 days')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 10. CREATE DELIVERABLES
-- ================================================================
-- First, insert base deliverable rows (without CSF columns that may not exist yet).
-- Then conditionally update CSF columns if the 20260218 migration has been applied.

-- Business 2: Deliverables for accepted applications
-- Spring Menu - Creator 1: 3 deliverables (for PDF testing: all-approved = single payout)
INSERT INTO public.campaign_deliverables (id, campaign_application_id, creator_id, restaurant_id, campaign_id, content_type, content_url, thumbnail_url, caption, social_platform, platform_post_url, status, submitted_at, payment_status, payment_amount_cents, created_at, updated_at)
VALUES
  -- Deliverable 1: Fully complete (approved + proof submitted)
  ('d1111111-1111-4111-d111-111111111111'::uuid, 'a2111111-1111-4111-a111-111111111111'::uuid, 'ee111111-1111-4111-e111-111111111111'::uuid, 'dd222222-2222-4222-d222-222222222222'::uuid, 'c2aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid,
   'photo', 'https://example.com/spring-menu-1.jpg', 'https://images.unsplash.com/photo-1700000000001?w=800',
   'Beautiful spring menu showcase!', 'instagram', 'https://instagram.com/p/spring1',
   'approved', NOW() - INTERVAL '3 days', 'pending', 50000,
   NOW() - INTERVAL '3 days', NOW()),
  -- Deliverable 2: Content approved, awaiting proof (for CSF testing)
  ('d2222222-2222-4222-d222-222222222222'::uuid, 'a2111111-1111-4111-a111-111111111111'::uuid, 'ee111111-1111-4111-e111-111111111111'::uuid, 'dd222222-2222-4222-d222-222222222222'::uuid, 'c2aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid,
   'reel', 'https://example.com/spring-menu-reel.mp4', 'https://images.unsplash.com/photo-1700000000002?w=800',
   'Spring menu reel!', 'instagram', NULL,
   'approved', NOW() - INTERVAL '2 days', 'pending', 50000,
   NOW() - INTERVAL '2 days', NOW()),
  -- Deliverable 3: Content uploaded, awaiting review (for CSF testing)
  ('d3333333-3333-4333-d333-333333333333'::uuid, 'a2111111-1111-4111-a111-111111111111'::uuid, 'ee111111-1111-4111-e111-111111111111'::uuid, 'dd222222-2222-4222-d222-222222222222'::uuid, 'c2aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid,
   'post', 'https://example.com/spring-menu-post.jpg', 'https://images.unsplash.com/photo-1700000000003?w=800',
   'Spring menu feature post', 'tiktok', NULL,
   'pending_review', NOW() - INTERVAL '1 day', 'pending', 50000,
   NOW() - INTERVAL '1 day', NOW())
ON CONFLICT (id) DO NOTHING;

-- Weekend Brunch - Creator 4: 1 deliverable (single deliverable = immediate payout for PDF testing)
INSERT INTO public.campaign_deliverables (id, campaign_application_id, creator_id, restaurant_id, campaign_id, content_type, content_url, thumbnail_url, caption, social_platform, status, submitted_at, payment_status, payment_amount_cents, created_at, updated_at)
VALUES
  ('d4444444-4444-4444-d444-444444444444'::uuid, 'a2444444-4444-4444-a444-444444444444'::uuid, 'ee444444-4444-4444-e444-444444444444'::uuid, 'dd222222-2222-4222-d222-222222222222'::uuid, 'c2bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid,
   'post', 'https://example.com/brunch-review.jpg', 'https://images.unsplash.com/photo-1700000000004?w=800',
   'Honest brunch review', 'instagram',
   'pending_review', NOW() - INTERVAL '5 days', 'pending', 30000,
   NOW() - INTERVAL '5 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Weekend Brunch - Creator 5: 2 deliverables (partial approval for RCT testing)
INSERT INTO public.campaign_deliverables (id, campaign_application_id, creator_id, restaurant_id, campaign_id, content_type, content_url, thumbnail_url, caption, social_platform, status, submitted_at, payment_status, payment_amount_cents, created_at, updated_at)
VALUES
  -- Approved deliverable
  ('d5555555-5555-4555-d555-555555555555'::uuid, 'a2555555-5555-4555-a555-555555555555'::uuid, 'ee555555-5555-4555-e555-555555555555'::uuid, 'dd222222-2222-4222-d222-222222222222'::uuid, 'c2bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid,
   'reel', 'https://example.com/brunch-reel.mp4', 'https://images.unsplash.com/photo-1700000000005?w=800',
   'Brunch vibes reel', 'tiktok',
   'approved', NOW() - INTERVAL '4 days', 'pending', 35000,
   NOW() - INTERVAL '4 days', NOW()),
  -- Pending review deliverable (1/2 approved - RCT button should be hidden)
  ('d6666666-6666-4666-d666-666666666666'::uuid, 'a2555555-5555-4555-a555-555555555555'::uuid, 'ee555555-5555-4555-e555-555555555555'::uuid, 'dd222222-2222-4222-d222-222222222222'::uuid, 'c2bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid,
   'photo', 'https://example.com/brunch-photo.jpg', 'https://images.unsplash.com/photo-1700000000006?w=800',
   'Brunch plate photo', 'instagram',
   'pending_review', NOW() - INTERVAL '2 days', 'pending', 35000,
   NOW() - INTERVAL '2 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Summer Patio (completed) - Creator 6: 2 deliverables (all approved - RCT button should show)
INSERT INTO public.campaign_deliverables (id, campaign_application_id, creator_id, restaurant_id, campaign_id, content_type, content_url, thumbnail_url, caption, social_platform, platform_post_url, status, submitted_at, reviewed_at, payment_status, payment_amount_cents, created_at, updated_at)
VALUES
  ('d7777777-7777-4777-d777-777777777777'::uuid, 'a2666666-6666-4666-a666-666666666666'::uuid, 'ee666666-6666-4666-e666-666666666666'::uuid, 'dd222222-2222-4222-d222-222222222222'::uuid, 'c2cccccc-cccc-4ccc-cccc-cccccccccccc'::uuid,
   'photo', 'https://example.com/patio1.jpg', 'https://images.unsplash.com/photo-1700000000007?w=800',
   'Patio dining perfection', 'instagram', 'https://instagram.com/p/patio1',
   'approved', NOW() - INTERVAL '40 days', NOW() - INTERVAL '38 days', 'completed', 40000,
   NOW() - INTERVAL '40 days', NOW()),
  ('d8888888-8888-4888-d888-888888888888'::uuid, 'a2666666-6666-4666-a666-666666666666'::uuid, 'ee666666-6666-4666-e666-666666666666'::uuid, 'dd222222-2222-4222-d222-222222222222'::uuid, 'c2cccccc-cccc-4ccc-cccc-cccccccccccc'::uuid,
   'reel', 'https://example.com/patio-reel.mp4', 'https://images.unsplash.com/photo-1700000000008?w=800',
   'Sunset patio vibes', 'tiktok', 'https://tiktok.com/@user/patio1',
   'approved', NOW() - INTERVAL '39 days', NOW() - INTERVAL '37 days', 'completed', 40000,
   NOW() - INTERVAL '39 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Business 3: Deliverables for various campaigns
-- Sushi Special - Creator 1: 3 deliverables (for PDF-1 testing: approve 1->no pay, 2->no pay, 3->pay)
INSERT INTO public.campaign_deliverables (id, campaign_application_id, creator_id, restaurant_id, campaign_id, content_type, content_url, thumbnail_url, caption, social_platform, status, submitted_at, payment_status, payment_amount_cents, created_at, updated_at)
VALUES
  ('d9111111-1111-4111-d111-111111111111'::uuid, 'a3111111-1111-4111-a111-111111111111'::uuid, 'ee111111-1111-4111-e111-111111111111'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'c3aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid,
   'photo', 'https://example.com/sushi1.jpg', 'https://images.unsplash.com/photo-1700000000009?w=800',
   'Sushi perfection!', 'instagram',
   'pending_review', NOW() - INTERVAL '3 days', 'pending', 60000,
   NOW() - INTERVAL '3 days', NOW()),
  ('d9222222-2222-4222-d222-222222222222'::uuid, 'a3111111-1111-4111-a111-111111111111'::uuid, 'ee111111-1111-4111-e111-111111111111'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'c3aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid,
   'reel', 'https://example.com/sushi-reel.mp4', 'https://images.unsplash.com/photo-1700000000010?w=800',
   'Sushi making reel', 'tiktok',
   'pending_review', NOW() - INTERVAL '2 days', 'pending', 60000,
   NOW() - INTERVAL '2 days', NOW()),
  ('d9333333-3333-4333-d333-333333333333'::uuid, 'a3111111-1111-4111-a111-111111111111'::uuid, 'ee111111-1111-4111-e111-111111111111'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'c3aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid,
   'post', 'https://example.com/sushi-post.jpg', 'https://images.unsplash.com/photo-1700000000011?w=800',
   'Sushi review post', 'instagram',
   'pending_review', NOW() - INTERVAL '1 day', 'pending', 60000,
   NOW() - INTERVAL '1 day', NOW())
ON CONFLICT (id) DO NOTHING;

-- Date Night - Creator 5: 2 deliverables (draft stage)
INSERT INTO public.campaign_deliverables (id, campaign_application_id, creator_id, restaurant_id, campaign_id, content_type, content_url, caption, status, submitted_at, payment_status, payment_amount_cents, created_at, updated_at)
VALUES
  ('d9444444-4444-4444-d444-444444444444'::uuid, 'a3555555-5555-4555-a555-555555555555'::uuid, 'ee555555-5555-4555-e555-555555555555'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'c3bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid,
   'reel', 'https://example.com/placeholder', 'Date night reel - pending upload', 'draft', NOW() - INTERVAL '3 days', 'pending', 45000, NOW() - INTERVAL '3 days', NOW()),
  ('d9555555-5555-4555-d555-555555555555'::uuid, 'a3555555-5555-4555-a555-555555555555'::uuid, 'ee555555-5555-4555-e555-555555555555'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'c3bbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid,
   'photo', 'https://example.com/placeholder', 'Date night photo - pending upload', 'draft', NOW() - INTERVAL '3 days', 'pending', 45000, NOW() - INTERVAL '3 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Chef Special (completed) - Creator 2: 3 deliverables (all approved + paid - for RCT-3 testing)
INSERT INTO public.campaign_deliverables (id, campaign_application_id, creator_id, restaurant_id, campaign_id, content_type, content_url, thumbnail_url, caption, social_platform, platform_post_url, status, submitted_at, reviewed_at, payment_status, payment_amount_cents, created_at, updated_at)
VALUES
  ('d9666666-6666-4666-d666-666666666666'::uuid, 'a3aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'ee222222-2222-4222-e222-222222222222'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'c3dddddd-dddd-4ddd-dddd-dddddddddddd'::uuid,
   'photo', 'https://example.com/chef1.jpg', 'https://images.unsplash.com/photo-1700000000012?w=800',
   'Chef special photo', 'instagram', 'https://instagram.com/p/chef1',
   'approved', NOW() - INTERVAL '50 days', NOW() - INTERVAL '48 days', 'completed', 50000,
   NOW() - INTERVAL '50 days', NOW()),
  ('d9777777-7777-4777-d777-777777777777'::uuid, 'a3aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'ee222222-2222-4222-e222-222222222222'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'c3dddddd-dddd-4ddd-dddd-dddddddddddd'::uuid,
   'reel', 'https://example.com/chef-reel.mp4', 'https://images.unsplash.com/photo-1700000000013?w=800',
   'Chef special reel', 'tiktok', 'https://tiktok.com/@user/chef1',
   'approved', NOW() - INTERVAL '49 days', NOW() - INTERVAL '47 days', 'completed', 50000,
   NOW() - INTERVAL '49 days', NOW()),
  ('d9888888-8888-4888-d888-888888888888'::uuid, 'a3aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid, 'ee222222-2222-4222-e222-222222222222'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'c3dddddd-dddd-4ddd-dddd-dddddddddddd'::uuid,
   'video', 'https://example.com/chef-video.mp4', 'https://images.unsplash.com/photo-1700000000014?w=800',
   'Chef interview video', 'youtube', 'https://youtube.com/watch?v=chef1',
   'approved', NOW() - INTERVAL '48 days', NOW() - INTERVAL '46 days', 'completed', 50000,
   NOW() - INTERVAL '48 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Happy Hour - Creator 1: 1 deliverable (auto-approved for RCT-8 testing)
INSERT INTO public.campaign_deliverables (id, campaign_application_id, creator_id, restaurant_id, campaign_id, content_type, content_url, thumbnail_url, caption, social_platform, platform_post_url, status, submitted_at, auto_approved_at, payment_status, payment_amount_cents, created_at, updated_at)
VALUES
  ('d9999999-9999-4999-d999-999999999999'::uuid, 'a3888888-8888-4888-a888-888888888888'::uuid, 'ee111111-1111-4111-e111-111111111111'::uuid, 'dd333333-3333-4333-d333-333333333333'::uuid, 'c3cccccc-cccc-4ccc-cccc-cccccccccccc'::uuid,
   'photo', 'https://example.com/happyhour.jpg', 'https://images.unsplash.com/photo-1700000000015?w=800',
   'Happy hour cocktails', 'instagram', 'https://instagram.com/p/happyhour1',
   'auto_approved', NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days', 'completed', 35000,
   NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 10b. SET CSF COLUMNS (if 20260218 migration has been applied)
-- ================================================================
-- These columns (workflow_stage, content_file_url, content_file_type, proof_submitted_at)
-- are added by the content-submission-flow migration. If it hasn't been applied yet,
-- this block is safely skipped.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='campaign_deliverables' AND column_name='workflow_stage') THEN

    -- Spring Menu deliverables
    UPDATE campaign_deliverables SET workflow_stage = 'proof', content_file_url = 'campaign-content/spring-menu-photo1.jpg', content_file_type = 'image/jpeg', proof_submitted_at = NOW() - INTERVAL '1 day'
    WHERE id = 'd1111111-1111-4111-d111-111111111111';

    UPDATE campaign_deliverables SET workflow_stage = 'approved', content_file_url = 'campaign-content/spring-menu-reel.mp4', content_file_type = 'video/mp4'
    WHERE id = 'd2222222-2222-4222-d222-222222222222';

    UPDATE campaign_deliverables SET workflow_stage = 'review', content_file_url = 'campaign-content/spring-menu-post.jpg', content_file_type = 'image/jpeg'
    WHERE id = 'd3333333-3333-4333-d333-333333333333';

    -- Weekend Brunch deliverables
    UPDATE campaign_deliverables SET workflow_stage = 'review'
    WHERE id = 'd4444444-4444-4444-d444-444444444444';

    UPDATE campaign_deliverables SET workflow_stage = 'approved', content_file_url = 'campaign-content/brunch-reel.mp4', content_file_type = 'video/mp4'
    WHERE id = 'd5555555-5555-4555-d555-555555555555';

    UPDATE campaign_deliverables SET workflow_stage = 'review', content_file_url = 'campaign-content/brunch-photo.jpg', content_file_type = 'image/jpeg'
    WHERE id = 'd6666666-6666-4666-d666-666666666666';

    -- Summer Patio deliverables
    UPDATE campaign_deliverables SET workflow_stage = 'proof', proof_submitted_at = NOW() - INTERVAL '37 days'
    WHERE id = 'd7777777-7777-4777-d777-777777777777';

    UPDATE campaign_deliverables SET workflow_stage = 'proof', proof_submitted_at = NOW() - INTERVAL '36 days'
    WHERE id = 'd8888888-8888-4888-d888-888888888888';

    -- Sushi Special deliverables
    UPDATE campaign_deliverables SET workflow_stage = 'review', content_file_url = 'campaign-content/sushi-photo1.jpg', content_file_type = 'image/jpeg'
    WHERE id = 'd9111111-1111-4111-d111-111111111111';

    UPDATE campaign_deliverables SET workflow_stage = 'review', content_file_url = 'campaign-content/sushi-reel.mp4', content_file_type = 'video/mp4'
    WHERE id = 'd9222222-2222-4222-d222-222222222222';

    UPDATE campaign_deliverables SET workflow_stage = 'review', content_file_url = 'campaign-content/sushi-post.jpg', content_file_type = 'image/jpeg'
    WHERE id = 'd9333333-3333-4333-d333-333333333333';

    -- Date Night deliverables
    UPDATE campaign_deliverables SET workflow_stage = 'upload'
    WHERE id IN ('d9444444-4444-4444-d444-444444444444', 'd9555555-5555-4555-d555-555555555555');

    -- Chef Special deliverables
    UPDATE campaign_deliverables SET workflow_stage = 'proof', proof_submitted_at = NOW() - INTERVAL '47 days'
    WHERE id = 'd9666666-6666-4666-d666-666666666666';

    UPDATE campaign_deliverables SET workflow_stage = 'proof', proof_submitted_at = NOW() - INTERVAL '46 days'
    WHERE id = 'd9777777-7777-4777-d777-777777777777';

    UPDATE campaign_deliverables SET workflow_stage = 'proof', proof_submitted_at = NOW() - INTERVAL '45 days'
    WHERE id = 'd9888888-8888-4888-d888-888888888888';

    -- Happy Hour deliverable
    UPDATE campaign_deliverables SET workflow_stage = 'proof', proof_submitted_at = NOW() - INTERVAL '6 days'
    WHERE id = 'd9999999-9999-4999-d999-999999999999';

    RAISE NOTICE 'CSF columns populated (workflow_stage, content_file_url, etc.)';
  ELSE
    RAISE NOTICE 'CSF columns not found - run 20260218_content_submission_flow.sql migration first, then re-run this script';
  END IF;
END $$;

-- ================================================================
-- SUMMARY & VERIFICATION
-- ================================================================

DO $$
DECLARE
  user_count INTEGER;
  board_count INTEGER;
  creator_count INTEGER;
  restaurant_count INTEGER;
  post_count INTEGER;
  campaign_count INTEGER;
  application_count INTEGER;
  deliverable_count INTEGER;
  follow_count INTEGER;
  save_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users WHERE email LIKE 'prod-consumer%@bypass.com' OR email LIKE 'prod-creator%@bypass.com' OR email LIKE 'prod-business%@bypass.com';
  SELECT COUNT(*) INTO board_count FROM boards WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'prod-%@bypass.com' AND id IN ('aa111111-1111-4111-a111-111111111111','aa222222-2222-4222-a222-222222222222','aa333333-3333-4333-a333-333333333333','aa444444-4444-4444-a444-444444444444','aa555555-5555-4555-a555-555555555555','aa666666-6666-4666-a666-666666666666','aa777777-7777-4777-a777-777777777777','aa888888-8888-4888-a888-888888888888','aa999999-9999-4999-a999-999999999999','aa000000-0000-4000-a000-000000000000','bb111111-1111-4111-b111-111111111111','bb222222-2222-4222-b222-222222222222','bb333333-3333-4333-b333-333333333333','bb444444-4444-4444-b444-444444444444','bb555555-5555-4555-b555-555555555555','bb666666-6666-4666-b666-666666666666','bb777777-7777-4777-b777-777777777777','cc111111-1111-4111-c111-111111111111','cc222222-2222-4222-c222-222222222222','cc333333-3333-4333-c333-333333333333'));
  SELECT COUNT(*) INTO creator_count FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'prod-creator%@bypass.com');
  SELECT COUNT(*) INTO restaurant_count FROM restaurants WHERE id IN ('dd111111-1111-4111-d111-111111111111','dd222222-2222-4222-d222-222222222222','dd333333-3333-4333-d333-333333333333','dd444444-4444-4444-d444-444444444444','dd555555-5555-4555-d555-555555555555','dd666666-6666-4666-d666-666666666666','dd777777-7777-4777-d777-777777777777','dd888888-8888-4888-d888-888888888888');
  SELECT COUNT(*) INTO post_count FROM posts WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'prod-%@bypass.com');
  SELECT COUNT(*) INTO campaign_count FROM campaigns WHERE owner_id IN (SELECT id FROM users WHERE email LIKE 'prod-business%@bypass.com');
  SELECT COUNT(*) INTO application_count FROM campaign_applications WHERE campaign_id IN (SELECT id FROM campaigns WHERE owner_id IN (SELECT id FROM users WHERE email LIKE 'prod-business%@bypass.com'));
  SELECT COUNT(*) INTO deliverable_count FROM campaign_deliverables WHERE campaign_id IN (SELECT id FROM campaigns WHERE owner_id IN (SELECT id FROM users WHERE email LIKE 'prod-business%@bypass.com'));
  SELECT COUNT(*) INTO follow_count FROM user_relationships WHERE follower_id IN (SELECT id FROM users WHERE email LIKE 'prod-%@bypass.com');
  SELECT COUNT(*) INTO save_count FROM restaurant_saves WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'prod-%@bypass.com');

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Robust Production Test Scenario Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - % test users', user_count;
  RAISE NOTICE '  - % default boards', board_count;
  RAISE NOTICE '  - % creator profiles', creator_count;
  RAISE NOTICE '  - % restaurants (3 claimed, 5 unclaimed)', restaurant_count;
  RAISE NOTICE '  - % posts with engagement', post_count;
  RAISE NOTICE '  - % restaurant saves', save_count;
  RAISE NOTICE '  - % user follows', follow_count;
  RAISE NOTICE '  - % campaigns', campaign_count;
  RAISE NOTICE '  - % applications', application_count;
  RAISE NOTICE '  - % deliverables', deliverable_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Business Activity Levels:';
  RAISE NOTICE '  - prod-business1@bypass.com (NEW): 0 campaigns';
  RAISE NOTICE '  - prod-business2@bypass.com (MEDIUM): 3 campaigns';
  RAISE NOTICE '  - prod-business3@bypass.com (HIGH): 10 campaigns';
  RAISE NOTICE '';
  RAISE NOTICE 'v1.0.16.b1 Test Data:';
  RAISE NOTICE '  - Content Submission: deliverables at upload/review/approved/proof stages';
  RAISE NOTICE '  - Payment Duplication: 3-deliverable apps (approve all = 1 payout)';
  RAISE NOTICE '  - Rate Creator: partial and full approval scenarios';
  RAISE NOTICE '';
  RAISE NOTICE 'All accounts use OTP: 000000 for authentication';
  RAISE NOTICE '========================================';
END $$;
