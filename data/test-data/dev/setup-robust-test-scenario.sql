-- ================================================================
-- Robust Test Scenario Setup Script
-- ================================================================
-- Creates 20 test accounts with realistic, interconnected data
-- All accounts use OTP: 000000 for authentication
-- ================================================================
-- Account Distribution:
--   - 10 Consumers (test-consumer1 through test-consumer10)
--   - 7 Creators (test-creator1 through test-creator7)
--   - 3 Businesses (test-business1=New, test-business2=Medium, test-business3=High activity)
-- ================================================================

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- ================================================================
-- 1. CREATE 20 TEST USERS (Auth + Public)
-- ================================================================

-- Consumers (test-consumer1 through test-consumer10)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  ('a1b2c3d4-e5f6-4789-a012-345678901234'::uuid, 'test-consumer1@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 1", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('b2c3d4e5-f6a7-4890-b123-456789012345'::uuid, 'test-consumer2@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 2", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('c3d4e5f6-a7b8-4901-c234-567890123456'::uuid, 'test-consumer3@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 3", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('d4e5f6a7-b8c9-4012-d345-678901234567'::uuid, 'test-consumer4@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 4", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('e5f6a7b8-c9d0-4123-e456-789012345678'::uuid, 'test-consumer5@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 5", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('f6a7b8c9-d0e1-4234-f567-890123456789'::uuid, 'test-consumer6@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 6", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('a7b8c9d0-e1f2-4345-a678-901234567890'::uuid, 'test-consumer7@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 7", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('b8c9d0e1-f2a3-4456-b789-012345678901'::uuid, 'test-consumer8@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 8", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('c9d0e1f2-a3b4-4567-c890-123456789012'::uuid, 'test-consumer9@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 9", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('d0e1f2a3-b4c5-4678-d901-234567890123'::uuid, 'test-consumer10@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 10", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  -- Creators (test-creator1 through test-creator7)
  ('e1f2a3b4-c5d6-4789-e012-345678901234'::uuid, 'test-creator1@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 1", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('f2a3b4c5-d6e7-4890-f123-456789012345'::uuid, 'test-creator2@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 2", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('a3b4c5d6-e7f8-4901-a234-567890123456'::uuid, 'test-creator3@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 3", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('b4c5d6e7-f8a9-4012-b345-678901234567'::uuid, 'test-creator4@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 4", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('c5d6e7f8-a9b0-4123-c456-789012345678'::uuid, 'test-creator5@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 5", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('d6e7f8a9-b0c1-4234-d567-890123456789'::uuid, 'test-creator6@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 6", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('e7f8a9b0-c1d2-4345-e678-901234567890'::uuid, 'test-creator7@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 7", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  -- Businesses (test-business1=New, test-business2=Medium, test-business3=High)
  ('f8a9b0c1-d2e3-4456-f789-012345678901'::uuid, 'test-business1@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Business 1 (New)", "account_type": "business"}'::jsonb, 'authenticated', 'authenticated'),
  ('a9b0c1d2-e3f4-4567-a890-123456789012'::uuid, 'test-business2@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Business 2 (Medium)", "account_type": "business"}'::jsonb, 'authenticated', 'authenticated'),
  ('b0c1d2e3-f4a5-4678-b901-234567890123'::uuid, 'test-business3@troodieapp.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Business 3 (High)", "account_type": "business"}'::jsonb, 'authenticated', 'authenticated')
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

-- Create public.users records
INSERT INTO public.users (id, email, name, account_type, is_creator, created_at, updated_at)
VALUES
  ('a1b2c3d4-e5f6-4789-a012-345678901234'::uuid, 'test-consumer1@troodieapp.com', 'Test Consumer 1', 'consumer', false, NOW(), NOW()),
  ('b2c3d4e5-f6a7-4890-b123-456789012345'::uuid, 'test-consumer2@troodieapp.com', 'Test Consumer 2', 'consumer', false, NOW(), NOW()),
  ('c3d4e5f6-a7b8-4901-c234-567890123456'::uuid, 'test-consumer3@troodieapp.com', 'Test Consumer 3', 'consumer', false, NOW(), NOW()),
  ('d4e5f6a7-b8c9-4012-d345-678901234567'::uuid, 'test-consumer4@troodieapp.com', 'Test Consumer 4', 'consumer', false, NOW(), NOW()),
  ('e5f6a7b8-c9d0-4123-e456-789012345678'::uuid, 'test-consumer5@troodieapp.com', 'Test Consumer 5', 'consumer', false, NOW(), NOW()),
  ('f6a7b8c9-d0e1-4234-f567-890123456789'::uuid, 'test-consumer6@troodieapp.com', 'Test Consumer 6', 'consumer', false, NOW(), NOW()),
  ('a7b8c9d0-e1f2-4345-a678-901234567890'::uuid, 'test-consumer7@troodieapp.com', 'Test Consumer 7', 'consumer', false, NOW(), NOW()),
  ('b8c9d0e1-f2a3-4456-b789-012345678901'::uuid, 'test-consumer8@troodieapp.com', 'Test Consumer 8', 'consumer', false, NOW(), NOW()),
  ('c9d0e1f2-a3b4-4567-c890-123456789012'::uuid, 'test-consumer9@troodieapp.com', 'Test Consumer 9', 'consumer', false, NOW(), NOW()),
  ('d0e1f2a3-b4c5-4678-d901-234567890123'::uuid, 'test-consumer10@troodieapp.com', 'Test Consumer 10', 'consumer', false, NOW(), NOW()),
  ('e1f2a3b4-c5d6-4789-e012-345678901234'::uuid, 'test-creator1@troodieapp.com', 'Test Creator 1', 'creator', true, NOW(), NOW()),
  ('f2a3b4c5-d6e7-4890-f123-456789012345'::uuid, 'test-creator2@troodieapp.com', 'Test Creator 2', 'creator', true, NOW(), NOW()),
  ('a3b4c5d6-e7f8-4901-a234-567890123456'::uuid, 'test-creator3@troodieapp.com', 'Test Creator 3', 'creator', true, NOW(), NOW()),
  ('b4c5d6e7-f8a9-4012-b345-678901234567'::uuid, 'test-creator4@troodieapp.com', 'Test Creator 4', 'creator', true, NOW(), NOW()),
  ('c5d6e7f8-a9b0-4123-c456-789012345678'::uuid, 'test-creator5@troodieapp.com', 'Test Creator 5', 'creator', true, NOW(), NOW()),
  ('d6e7f8a9-b0c1-4234-d567-890123456789'::uuid, 'test-creator6@troodieapp.com', 'Test Creator 6', 'creator', true, NOW(), NOW()),
  ('e7f8a9b0-c1d2-4345-e678-901234567890'::uuid, 'test-creator7@troodieapp.com', 'Test Creator 7', 'creator', true, NOW(), NOW()),
  ('f8a9b0c1-d2e3-4456-f789-012345678901'::uuid, 'test-business1@troodieapp.com', 'Test Business 1 (New)', 'business', false, NOW(), NOW()),
  ('a9b0c1d2-e3f4-4567-a890-123456789012'::uuid, 'test-business2@troodieapp.com', 'Test Business 2 (Medium)', 'business', false, NOW(), NOW()),
  ('b0c1d2e3-f4a5-4678-b901-234567890123'::uuid, 'test-business3@troodieapp.com', 'Test Business 3 (High)', 'business', false, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  account_type = EXCLUDED.account_type,
  is_creator = EXCLUDED.is_creator,
  updated_at = NOW();

-- ================================================================
-- 2. CREATE DEFAULT BOARDS FOR ALL USERS
-- ================================================================

INSERT INTO public.boards (id, user_id, name, description, is_default, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  id,
  'Quick Saves',
  'Default board for quick saves',
  true,
  NOW(),
  NOW()
FROM public.users
WHERE email LIKE 'test-%@troodieapp.com'
ON CONFLICT DO NOTHING;

-- ================================================================
-- 3. CREATE CREATOR PROFILES WITH PORTFOLIOS
-- ================================================================

DO $$
DECLARE
  creator_profiles_data RECORD;
  profile_id UUID;
  portfolio_item_id UUID;
  specialties_list TEXT[];
  i INTEGER;
BEGIN
  -- Creator 1: Food Photographer
  INSERT INTO public.creator_profiles (id, user_id, display_name, bio, location, open_to_collabs, specialties, troodie_engagement_rate, troodie_posts_count, created_at, updated_at)
  VALUES (
    '0557acdd-e8e8-473b-badb-913a624fa199'::uuid,
    'e1f2a3b4-c5d6-4789-e012-345678901234'::uuid, -- test-creator1
    'Foodie Lens',
    'Professional food photographer specializing in restaurant and culinary content. 5+ years experience.',
    'Charlotte, NC',
    true,
    ARRAY['Food Photography', 'Restaurant Reviews'],
    6.2,
    45,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    specialties = EXCLUDED.specialties,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  -- Portfolio items for Creator 11 (5 images)
  FOR i IN 1..5 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, media_type, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 1000000) || '?w=800',
      'image',
      i,
      NOW() - (INTERVAL '1 day' * (6 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Creator 2: Travel Food Blogger
  INSERT INTO public.creator_profiles (id, user_id, display_name, bio, location, open_to_collabs, specialties, troodie_engagement_rate, troodie_posts_count, created_at, updated_at)
  VALUES (
    '1a2b3c4d-5e6f-4789-a012-345678901234'::uuid,
    'f2a3b4c5-d6e7-4890-f123-456789012345'::uuid, -- test-creator2
    'Wanderlust Eats',
    'Travel and food blogger exploring local restaurants across the Southeast. Always looking for hidden gems!',
    'Atlanta, GA',
    true,
    ARRAY['Travel', 'Restaurant Reviews', 'Food Blogging'],
    5.8,
    38,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    specialties = EXCLUDED.specialties,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  -- Portfolio items for Creator 12 (4 images, 1 video)
  FOR i IN 1..4 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, media_type, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 2000000) || '?w=800',
      'image',
      i,
      NOW() - (INTERVAL '1 day' * (5 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;
  INSERT INTO public.creator_portfolio_items (id, creator_profile_id, video_url, thumbnail_url, media_type, display_order, created_at)
  VALUES (
    gen_random_uuid(),
    profile_id,
    'https://example.com/video1.mp4',
    'https://images.unsplash.com/photo-1500000000000?w=800',
    'video',
    5,
    NOW() - INTERVAL '1 day'
  ) ON CONFLICT DO NOTHING;

  -- Creator 3: Lifestyle Influencer
  INSERT INTO public.creator_profiles (id, user_id, display_name, bio, location, open_to_collabs, specialties, troodie_engagement_rate, troodie_posts_count, created_at, updated_at)
  VALUES (
    '2b3c4d5e-6f7a-4890-b123-456789012345'::uuid,
    'a3b4c5d6-e7f8-4901-a234-567890123456'::uuid, -- test-creator3
    'Lifestyle & Bites',
    'Lifestyle content creator focusing on dining experiences and local food culture.',
    'Raleigh, NC',
    true,
    ARRAY['Lifestyle', 'Food Content'],
    7.1,
    52,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    specialties = EXCLUDED.specialties,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  FOR i IN 1..6 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, media_type, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 3000000) || '?w=800',
      'image',
      i,
      NOW() - (INTERVAL '1 day' * (7 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Creator 4: Restaurant Critic
  INSERT INTO public.creator_profiles (id, user_id, display_name, bio, location, open_to_collabs, specialties, troodie_engagement_rate, troodie_posts_count, created_at, updated_at)
  VALUES (
    '3c4d5e6f-7a8b-4901-c234-567890123456'::uuid,
    'b4c5d6e7-f8a9-4012-b345-678901234567'::uuid, -- test-creator4
    'The Critic',
    'Professional restaurant critic with 10+ years experience. Honest, detailed reviews.',
    'Charlotte, NC',
    false,
    ARRAY['Restaurant Reviews', 'Food Criticism'],
    4.5,
    28,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    specialties = EXCLUDED.specialties,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  FOR i IN 1..3 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, media_type, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 4000000) || '?w=800',
      'image',
      i,
      NOW() - (INTERVAL '1 day' * (4 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Creator 5: Video Content Creator
  INSERT INTO public.creator_profiles (id, user_id, display_name, bio, location, open_to_collabs, specialties, troodie_engagement_rate, troodie_posts_count, created_at, updated_at)
  VALUES (
    '4d5e6f7a-8b9c-4012-d345-678901234567'::uuid,
    'c5d6e7f8-a9b0-4123-c456-789012345678'::uuid, -- test-creator5
    'Food Reels Pro',
    'Creating engaging food video content for TikTok and Instagram. Specializing in quick recipe videos and restaurant tours.',
    'Asheville, NC',
    true,
    ARRAY['Video Content', 'Social Media'],
    8.3,
    67,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    specialties = EXCLUDED.specialties,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  FOR i IN 1..2 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, media_type, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 5000000) || '?w=800',
      'image',
      i,
      NOW() - (INTERVAL '1 day' * (3 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;
  FOR i IN 1..3 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, video_url, thumbnail_url, media_type, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://example.com/video' || i || '.mp4',
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 5000000) || '?w=800',
      'video',
      i + 2,
      NOW() - (INTERVAL '1 day' * (4 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Creator 6: Micro Influencer
  INSERT INTO public.creator_profiles (id, user_id, display_name, bio, location, open_to_collabs, specialties, troodie_engagement_rate, troodie_posts_count, created_at, updated_at)
  VALUES (
    '5e6f7a8b-9c0d-4123-e456-789012345678'::uuid,
    'd6e7f8a9-b0c1-4234-d567-890123456789'::uuid, -- test-creator6
    'Local Foodie',
    'Sharing my favorite local spots and hidden gems in the Charlotte area.',
    'Charlotte, NC',
    true,
    ARRAY['Local Food', 'Hidden Gems'],
    9.2,
    24,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    specialties = EXCLUDED.specialties,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  FOR i IN 1..4 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, media_type, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 6000000) || '?w=800',
      'image',
      i,
      NOW() - (INTERVAL '1 day' * (5 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Creator 7: Food Stylist
  INSERT INTO public.creator_profiles (id, user_id, display_name, bio, location, open_to_collabs, specialties, troodie_engagement_rate, troodie_posts_count, created_at, updated_at)
  VALUES (
    '6f7a8b9c-0d1e-4234-f567-890123456789'::uuid,
    'e7f8a9b0-c1d2-4345-e678-901234567890'::uuid, -- test-creator7
    'Styled Plates',
    'Professional food stylist creating beautiful, appetizing content for restaurants and brands.',
    'Greenville, SC',
    true,
    ARRAY['Food Styling', 'Photography'],
    5.9,
    41,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    specialties = EXCLUDED.specialties,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  FOR i IN 1..5 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, media_type, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 7000000) || '?w=800',
      'image',
      i,
      NOW() - (INTERVAL '1 day' * (6 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ================================================================
-- 4. CREATE RESTAURANTS (Some claimed, some unclaimed)
-- ================================================================

DO $$
DECLARE
  restaurant_id UUID := '9c0d1e2f-3a4b-4567-c890-123456789012'::uuid;
  restaurant_id_claimed_2 UUID := '7a8b9c0d-1e2f-4345-a678-901234567890'::uuid;
  restaurant_id_claimed_3 UUID := '8b9c0d1e-2f3a-4456-b789-012345678901'::uuid;
  restaurant_id_unclaimed UUID;
BEGIN
  -- Restaurant for Business 2 (Medium activity) - Claimed
  INSERT INTO public.restaurants (id, google_place_id, name, address, city, state, zip_code, location, cuisine_types, price_range, created_at, updated_at)
  VALUES (
    restaurant_id_claimed_2,
    'ChIJMediumActivityRestaurant1',
    'The Rustic Table',
    '123 Main Street',
    'Charlotte',
    'NC',
    '28202',
    ST_SetSRID(ST_MakePoint(-80.8431, 35.2271), 4326)::geography,
    ARRAY['American', 'Farm-to-Table'],
    '$$',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Restaurant for Business 3 (High activity) - Claimed
  INSERT INTO public.restaurants (id, google_place_id, name, address, city, state, zip_code, location, cuisine_types, price_range, created_at, updated_at)
  VALUES (
    restaurant_id_claimed_3,
    'ChIJHighActivityRestaurant1',
    'Sakura Sushi Bar',
    '456 Foodie Avenue',
    'Charlotte',
    'NC',
    '28203',
    ST_SetSRID(ST_MakePoint(-80.8431, 35.2271), 4326)::geography,
    ARRAY['Japanese', 'Sushi'],
    '$$$',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Restaurant for Business 1 (New) - Claimed
  INSERT INTO public.restaurants (id, google_place_id, name, address, city, state, zip_code, location, cuisine_types, price_range, created_at, updated_at)
  VALUES (
    restaurant_id,
    'ChIJNewUserRestaurant1',
    'Bella Vista Italian Kitchen',
    '789 Italian Way',
    'Charlotte',
    'NC',
    '28204',
    ST_SetSRID(ST_MakePoint(-80.8431, 35.2271), 4326)::geography,
    ARRAY['Italian', 'Fine Dining'],
    '$$$',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Create business profiles and claim restaurants
  INSERT INTO public.business_profiles (id, user_id, restaurant_id, verified, created_at, updated_at)
  VALUES
    ('0d1e2f3a-4b5c-4678-d901-234567890123'::uuid, 'f8a9b0c1-d2e3-4456-f789-012345678901'::uuid, restaurant_id, true, NOW(), NOW()), -- test-business1
    ('1e2f3a4b-5c6d-4789-e012-345678901234'::uuid, 'a9b0c1d2-e3f4-4567-a890-123456789012'::uuid, restaurant_id_claimed_2, true, NOW(), NOW()), -- test-business2
    ('2f3a4b5c-6d7e-4890-f123-456789012345'::uuid, 'b0c1d2e3-f4a5-4678-b901-234567890123'::uuid, restaurant_id_claimed_3, true, NOW(), NOW()) -- test-business3
  ON CONFLICT (user_id) DO UPDATE SET
    restaurant_id = EXCLUDED.restaurant_id,
    verified = EXCLUDED.verified,
    updated_at = NOW();

  -- Create 5 unclaimed restaurants for testing claim flow
  FOR i IN 1..5 LOOP
    INSERT INTO public.restaurants (id, google_place_id, name, address, city, state, zip_code, location, cuisine_types, price_range, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'ChIJUnclaimedRestaurant' || i,
      'Unclaimed Restaurant ' || i,
      (100 + i) || ' Test Street',
      'Charlotte',
      'NC',
      '2820' || (i + 4),
      ST_SetSRID(ST_MakePoint(-80.8431 + (i * 0.01), 35.2271 + (i * 0.01)), 4326)::geography,
      ARRAY['American', 'Casual'],
      CASE WHEN i % 2 = 0 THEN '$$' ELSE '$$$' END,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- ================================================================
-- 5. CREATE REALISTIC POSTS WITH ENGAGEMENT
-- ================================================================
-- Posts from creators and consumers, mentioning restaurants
-- Each post will have likes, comments, and some saves

DO $$
DECLARE
  post_id UUID;
  restaurant_id_2 UUID := '7a8b9c0d-1e2f-4345-a678-901234567890'::uuid; -- Business 2 (Medium)
  restaurant_id_3 UUID := '8b9c0d1e-2f3a-4456-b789-012345678901'::uuid; -- Business 3 (High)
  restaurant_id_1 UUID := '9c0d1e2f-3a4b-4567-c890-123456789012'::uuid; -- Business 1 (New)
  creator_user_ids UUID[] := ARRAY[
    'e1f2a3b4-c5d6-4789-e012-345678901234'::uuid, -- test-creator1
    'f2a3b4c5-d6e7-4890-f123-456789012345'::uuid, -- test-creator2
    'a3b4c5d6-e7f8-4901-a234-567890123456'::uuid, -- test-creator3
    'b4c5d6e7-f8a9-4012-b345-678901234567'::uuid, -- test-creator4
    'c5d6e7f8-a9b0-4123-c456-789012345678'::uuid, -- test-creator5
    'd6e7f8a9-b0c1-4234-d567-890123456789'::uuid, -- test-creator6
    'e7f8a9b0-c1d2-4345-e678-901234567890'::uuid  -- test-creator7
  ];
  consumer_user_ids UUID[] := ARRAY[
    'a1b2c3d4-e5f6-4789-a012-345678901234'::uuid, -- test-consumer1
    'b2c3d4e5-f6a7-4890-b123-456789012345'::uuid, -- User 2
    'c3d4e5f6-a7b8-4901-c234-567890123456'::uuid, -- User 3
    'd4e5f6a7-b8c9-4012-d345-678901234567'::uuid, -- User 4
    'e5f6a7b8-c9d0-4123-e456-789012345678'::uuid, -- User 5
    'f6a7b8c9-d0e1-4234-f567-890123456789'::uuid, -- User 6
    'a7b8c9d0-e1f2-4345-a678-901234567890'::uuid, -- User 7
    'b8c9d0e1-f2a3-4456-b789-012345678901'::uuid, -- User 8
    'c9d0e1f2-a3b4-4567-c890-123456789012'::uuid, -- User 9
    'd0e1f2a3-b4c5-4678-d901-234567890123'::uuid  -- User 10
  ];
  all_user_ids UUID[];
  i INTEGER;
  j INTEGER;
  k INTEGER;
  like_count INTEGER;
  comment_count INTEGER;
  save_count INTEGER;
  post_author UUID;
  commenter_ids UUID[];
  liker_ids UUID[];
  saver_ids UUID[];
  board_id UUID;
BEGIN
  all_user_ids := creator_user_ids || consumer_user_ids;

  -- Create posts from creators (3-8 posts each, mentioning restaurants)
  FOR i IN 1..7 LOOP
    post_author := creator_user_ids[i];
    
    -- Get creator's default board
    SELECT id INTO board_id FROM public.boards WHERE user_id = post_author AND is_default = true LIMIT 1;
    
    -- Create 3-8 posts per creator
    FOR j IN 1..(3 + (i % 6)) LOOP
      -- Determine restaurant (rotate through the 3 claimed restaurants)
      DECLARE
        target_restaurant_id UUID;
        restaurant_name TEXT;
      BEGIN
        CASE (j % 3)
          WHEN 0 THEN target_restaurant_id := restaurant_id_1; restaurant_name := 'Bella Vista Italian Kitchen';
          WHEN 1 THEN target_restaurant_id := restaurant_id_2; restaurant_name := 'The Rustic Table';
          WHEN 2 THEN target_restaurant_id := restaurant_id_3; restaurant_name := 'Sakura Sushi Bar';
        END CASE;

        -- Create post
        INSERT INTO public.posts (
          id, user_id, restaurant_id, caption, photos, rating, visit_date, price_range, visit_type, tags, privacy,
          likes_count, comments_count, saves_count, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(),
          post_author,
          target_restaurant_id::text, -- posts.restaurant_id is VARCHAR
          CASE (j % 5)
            WHEN 0 THEN 'Amazing experience at ' || restaurant_name || '! The food was incredible and the service was top-notch. Highly recommend! 🍽️✨'
            WHEN 1 THEN 'Just tried ' || restaurant_name || ' for the first time. The pasta was perfection! #foodie #charlotte'
            WHEN 2 THEN 'Date night at ' || restaurant_name || ' did not disappoint. The ambiance and food quality are unmatched. 💕'
            WHEN 3 THEN 'If you''re looking for authentic cuisine, ' || restaurant_name || ' is the place to be. Every dish tells a story!'
            WHEN 4 THEN 'Quick lunch at ' || restaurant_name || '. The flavors are bold and the presentation is beautiful. 📸'
          END,
          ARRAY['https://images.unsplash.com/photo-' || (1500000000000 + (i * 100) + j) || '?w=800'],
          4 + (j % 2),
          NOW() - (INTERVAL '1 day' * (j * 2)),
          CASE WHEN j % 2 = 0 THEN '$$' ELSE '$$$' END,
          CASE (j % 3) WHEN 0 THEN 'dine_in' WHEN 1 THEN 'takeout' ELSE 'delivery' END,
          ARRAY['foodie', 'restaurant', 'charlotte', 'food'],
          'public',
          0, -- Will be updated by likes
          0, -- Will be updated by comments
          0, -- Will be updated by saves
          NOW() - (INTERVAL '1 day' * (j * 2)),
          NOW() - (INTERVAL '1 day' * (j * 2))
        )
        RETURNING id INTO post_id;

        -- Add likes (5-50 per post, from random users)
        like_count := 5 + (j * 3) + (i * 2);
        IF like_count > 50 THEN like_count := 50; END IF;
        
        liker_ids := ARRAY(SELECT unnest(all_user_ids) ORDER BY random() LIMIT like_count);
        
        FOR k IN 1..array_length(liker_ids, 1) LOOP
          INSERT INTO public.post_likes (id, post_id, user_id, created_at)
          VALUES (gen_random_uuid(), post_id, liker_ids[k], NOW() - (INTERVAL '1 hour' * k))
          ON CONFLICT DO NOTHING;
        END LOOP;

        -- Add comments (2-10 per post, from random users)
        comment_count := 2 + (j % 8);
        commenter_ids := ARRAY(SELECT unnest(all_user_ids) ORDER BY random() LIMIT comment_count);
        
        FOR k IN 1..array_length(commenter_ids, 1) LOOP
          INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
          VALUES (
            gen_random_uuid(),
            post_id,
            commenter_ids[k],
            CASE (k % 4)
              WHEN 0 THEN 'This looks amazing! I need to try this place!'
              WHEN 1 THEN 'Great review! Adding this to my list. 👍'
              WHEN 2 THEN 'I''ve been there too! The food is incredible.'
              WHEN 3 THEN 'Thanks for sharing! Can''t wait to visit.'
            END,
            NOW() - (INTERVAL '1 hour' * k)
          ) ON CONFLICT DO NOTHING;
        END LOOP;

        -- Add saves (3-15 per post)
        save_count := 3 + (j % 12);
        saver_ids := ARRAY(SELECT unnest(all_user_ids) ORDER BY random() LIMIT save_count);
        
        FOR k IN 1..array_length(saver_ids, 1) LOOP
          DECLARE
            saver_board_id UUID;
          BEGIN
            SELECT id INTO saver_board_id FROM public.boards WHERE user_id = saver_ids[k] AND is_default = true LIMIT 1;
            INSERT INTO public.post_saves (id, post_id, user_id, board_id, created_at)
            VALUES (gen_random_uuid(), post_id, saver_ids[k], saver_board_id, NOW() - (INTERVAL '1 hour' * k))
            ON CONFLICT DO NOTHING;
          END;
        END LOOP;
      END;
    END LOOP;
  END LOOP;

  -- Create posts from consumers (1-3 posts each)
  FOR i IN 1..10 LOOP
    post_author := consumer_user_ids[i];
    
    FOR j IN 1..(1 + (i % 3)) LOOP
      DECLARE
        target_restaurant_id UUID;
        restaurant_name TEXT;
      BEGIN
        CASE (j % 3)
          WHEN 0 THEN target_restaurant_id := restaurant_id_1; restaurant_name := 'Bella Vista Italian Kitchen';
          WHEN 1 THEN target_restaurant_id := restaurant_id_2; restaurant_name := 'The Rustic Table';
          WHEN 2 THEN target_restaurant_id := restaurant_id_3; restaurant_name := 'Sakura Sushi Bar';
        END CASE;

        INSERT INTO public.posts (
          id, user_id, restaurant_id, caption, photos, rating, visit_date, price_range, visit_type, tags, privacy,
          likes_count, comments_count, saves_count, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(),
          post_author,
          target_restaurant_id::text, -- posts.restaurant_id is VARCHAR
          'Had a great meal at ' || restaurant_name || '!',
          ARRAY['https://images.unsplash.com/photo-' || (1600000000000 + (i * 100) + j) || '?w=800'],
          4,
          NOW() - (INTERVAL '1 day' * j),
          '$$',
          'dine_in',
          ARRAY['food'],
          'public',
          0, 0, 0,
          NOW() - (INTERVAL '1 day' * j),
          NOW() - (INTERVAL '1 day' * j)
        )
        RETURNING id INTO post_id;

        -- Add some engagement (fewer than creator posts)
        FOR k IN 1..(3 + (j * 2)) LOOP
          INSERT INTO public.post_likes (id, post_id, user_id, created_at)
          VALUES (gen_random_uuid(), post_id, all_user_ids[1 + (k % array_length(all_user_ids, 1))], NOW() - (INTERVAL '1 hour' * k))
          ON CONFLICT DO NOTHING;
        END LOOP;
      END;
    END LOOP;
  END LOOP;
END $$;

-- ================================================================
-- 6. CREATE RESTAURANT SAVES (for analytics)
-- ================================================================

DO $$
DECLARE
  restaurant_id_2 UUID := '7a8b9c0d-1e2f-4345-a678-901234567890'::uuid; -- Business 2 (Medium)
  restaurant_id_3 UUID := '8b9c0d1e-2f3a-4456-b789-012345678901'::uuid; -- Business 3 (High)
  restaurant_id_1 UUID := '9c0d1e2f-3a4b-4567-c890-123456789012'::uuid; -- Business 1 (New)
  all_user_ids UUID[];
  i INTEGER;
  user_id UUID;
  board_id UUID;
BEGIN
  all_user_ids := ARRAY(
    SELECT id FROM public.users WHERE email LIKE 'test-%@troodieapp.com'
  );

  -- Create saves for Restaurant 2 (Medium activity - 15 saves)
  FOR i IN 1..15 LOOP
    user_id := all_user_ids[1 + (i % array_length(all_user_ids, 1))];
    SELECT id INTO board_id FROM public.boards WHERE user_id = user_id AND is_default = true LIMIT 1;
    
    INSERT INTO public.restaurant_saves (id, user_id, restaurant_id, board_id, personal_rating, visit_date, would_recommend, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      user_id,
      restaurant_id_2,
      board_id,
      4 + (i % 2),
      NOW() - (INTERVAL '1 day' * (i % 30)),
      true,
      NOW() - (INTERVAL '1 day' * (i % 30)),
      NOW() - (INTERVAL '1 day' * (i % 30))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Create saves for Restaurant 3 (High activity - 25 saves)
  FOR i IN 1..25 LOOP
    user_id := all_user_ids[1 + (i % array_length(all_user_ids, 1))];
    SELECT id INTO board_id FROM public.boards WHERE user_id = user_id AND is_default = true LIMIT 1;
    
    INSERT INTO public.restaurant_saves (id, user_id, restaurant_id, board_id, personal_rating, visit_date, would_recommend, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      user_id,
      restaurant_id_3,
      board_id,
      4 + (i % 2),
      NOW() - (INTERVAL '1 day' * (i % 30)),
      true,
      NOW() - (INTERVAL '1 day' * (i % 30)),
      NOW() - (INTERVAL '1 day' * (i % 30))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Create saves for Restaurant 1 (New - 5 saves)
  FOR i IN 1..5 LOOP
    user_id := all_user_ids[1 + (i % array_length(all_user_ids, 1))];
    SELECT id INTO board_id FROM public.boards WHERE user_id = user_id AND is_default = true LIMIT 1;
    
    INSERT INTO public.restaurant_saves (id, user_id, restaurant_id, board_id, personal_rating, visit_date, would_recommend, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      user_id,
      restaurant_id_1,
      board_id,
      4,
      NOW() - (INTERVAL '1 day' * i),
      true,
      NOW() - (INTERVAL '1 day' * i),
      NOW() - (INTERVAL '1 day' * i)
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ================================================================
-- 7. CREATE USER FOLLOWS (Social Graph)
-- ================================================================

DO $$
DECLARE
  all_user_ids UUID[];
  i INTEGER;
  j INTEGER;
  follower_id UUID;
  following_id UUID;
BEGIN
  all_user_ids := ARRAY(
    SELECT id FROM public.users WHERE email LIKE 'test-user%@troodieapp.com'
  );

  -- Create follows: each user follows 3-8 other users
  FOR i IN 1..array_length(all_user_ids, 1) LOOP
    follower_id := all_user_ids[i];
    
    FOR j IN 1..(3 + (i % 6)) LOOP
      following_id := all_user_ids[1 + ((i + j) % array_length(all_user_ids, 1))];
      
      -- Don't follow yourself
      IF follower_id != following_id THEN
        INSERT INTO public.user_relationships (id, follower_id, following_id, created_at)
        VALUES (gen_random_uuid(), follower_id, following_id, NOW() - (INTERVAL '1 day' * j))
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ================================================================
-- 8. CREATE CAMPAIGNS (Business Activity Levels)
-- ================================================================

DO $$
DECLARE
  campaign_id UUID;
  restaurant_id_2 UUID := '88888888-8888-4888-8888-888888888888'::uuid; -- Business 2 (Medium)
  restaurant_id_3 UUID := '99999999-9999-4999-9999-999999999999'::uuid; -- Business 3 (High)
  business_user_2 UUID := 'a9b0c1d2-e3f4-4567-a890-123456789012'::uuid; -- test-business2
  business_user_3 UUID := 'b0c1d2e3-f4a5-4678-b901-234567890123'::uuid; -- test-business3
  i INTEGER;
BEGIN
  -- Business 2 (Medium): 3 campaigns
  FOR i IN 1..3 LOOP
    INSERT INTO public.campaigns (
      id, restaurant_id, title, description, budget_min, budget_max, status, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      restaurant_id_2,
      CASE i
        WHEN 1 THEN 'Spring Menu Launch Campaign'
        WHEN 2 THEN 'Weekend Brunch Promotion'
        WHEN 3 THEN 'Summer Patio Dining Feature'
      END,
      CASE i
        WHEN 1 THEN 'Looking for creators to showcase our new spring menu items. Focus on seasonal ingredients and fresh flavors.'
        WHEN 2 THEN 'Promoting our weekend brunch specials. Need engaging content for social media.'
        WHEN 3 THEN 'Highlight our beautiful outdoor patio space and summer dining experience.'
      END,
      500.00 + (i * 100),
      1000.00 + (i * 200),
      CASE i WHEN 1 THEN 'active' WHEN 2 THEN 'active' ELSE 'completed' END,
      NOW() - (INTERVAL '1 week' * i),
      NOW() - (INTERVAL '1 week' * i)
    )
    RETURNING id INTO campaign_id;
  END LOOP;

  -- Business 3 (High): 10 campaigns
  FOR i IN 1..10 LOOP
    INSERT INTO public.campaigns (
      id, restaurant_id, title, description, budget_min, budget_max, status, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      restaurant_id_3,
      'Campaign ' || i || ' - ' || CASE (i % 5)
        WHEN 0 THEN 'Sushi Special Feature'
        WHEN 1 THEN 'Date Night Promotion'
        WHEN 2 THEN 'Happy Hour Highlight'
        WHEN 3 THEN 'Chef''s Special Showcase'
        WHEN 4 THEN 'Holiday Menu Launch'
      END,
      'Detailed campaign description for campaign ' || i || '. Looking for talented creators to create engaging content.',
      300.00 + (i * 50),
      800.00 + (i * 100),
      CASE 
        WHEN i <= 3 THEN 'active'
        WHEN i <= 7 THEN 'completed'
        ELSE 'draft'
      END,
      NOW() - (INTERVAL '1 week' * i),
      NOW() - (INTERVAL '1 week' * i)
    )
    RETURNING id INTO campaign_id;
  END LOOP;
END $$;

-- ================================================================
-- 9. CREATE CAMPAIGN APPLICATIONS
-- ================================================================

DO $$
DECLARE
  campaign_id UUID;
  creator_profile_id UUID;
  application_id UUID;
  restaurant_id_2 UUID := '7a8b9c0d-1e2f-4345-a678-901234567890'::uuid; -- Business 2 (Medium)
  restaurant_id_3 UUID := '8b9c0d1e-2f3a-4456-b789-012345678901'::uuid; -- Business 3 (High)
  creator_profile_ids UUID[];
  i INTEGER;
  j INTEGER;
  k INTEGER;
BEGIN
  -- Get all creator profile IDs (test-creator1 through test-creator7)
  creator_profile_ids := ARRAY(
    SELECT id FROM public.creator_profiles
    WHERE user_id IN (
      SELECT id FROM public.users 
      WHERE email IN (
        'test-creator1@troodieapp.com',
        'test-creator2@troodieapp.com',
        'test-creator3@troodieapp.com',
        'test-creator4@troodieapp.com',
        'test-creator5@troodieapp.com',
        'test-creator6@troodieapp.com',
        'test-creator7@troodieapp.com'
      )
    )
  );

  -- Business 2 (Medium): 5-8 applications across 3 campaigns
  FOR campaign_id IN 
    SELECT id FROM public.campaigns 
    WHERE restaurant_id = restaurant_id_2 
    ORDER BY created_at DESC 
    LIMIT 3
  LOOP
    -- 2-3 applications per campaign
    FOR j IN 1..(2 + (random() * 2)::int) LOOP
      creator_profile_id := creator_profile_ids[1 + (j % array_length(creator_profile_ids, 1))];
      
      INSERT INTO public.campaign_applications (
        id, campaign_id, creator_id, proposed_rate_cents, cover_letter, status, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        campaign_id,
        creator_profile_id,
        (50000 + (j * 10000)), -- $500-$700
        'I would love to work on this campaign! I have experience creating engaging food content and believe I can deliver high-quality results.',
        CASE 
          WHEN j = 1 THEN 'accepted'
          WHEN j = 2 THEN 'pending'
          ELSE 'rejected'
        END,
        NOW() - (INTERVAL '1 day' * j),
        NOW() - (INTERVAL '1 day' * j)
      )
      RETURNING id INTO application_id;
    END LOOP;
  END LOOP;

  -- Business 3 (High): 20-30 applications across 10 campaigns
  FOR campaign_id IN 
    SELECT id FROM public.campaigns 
    WHERE restaurant_id = restaurant_id_3 
    ORDER BY created_at DESC 
    LIMIT 10
  LOOP
    -- 2-4 applications per campaign
    FOR j IN 1..(2 + (random() * 3)::int) LOOP
      creator_profile_id := creator_profile_ids[1 + ((j + k) % array_length(creator_profile_ids, 1))];
      k := k + 1;
      
      INSERT INTO public.campaign_applications (
        id, campaign_id, creator_id, proposed_rate_cents, cover_letter, status, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        campaign_id,
        creator_profile_id,
        (40000 + (j * 5000)), -- $400-$600
        'Excited about this opportunity! I specialize in ' || CASE (j % 3) WHEN 0 THEN 'food photography' WHEN 1 THEN 'video content' ELSE 'restaurant reviews' END || ' and would love to collaborate.',
        CASE 
          WHEN (j % 4) = 1 THEN 'accepted'
          WHEN (j % 4) = 2 THEN 'pending'
          WHEN (j % 4) = 3 THEN 'accepted'
          ELSE 'rejected'
        END,
        NOW() - (INTERVAL '1 day' * j),
        NOW() - (INTERVAL '1 day' * j)
      )
      RETURNING id INTO application_id;
    END LOOP;
  END LOOP;
END $$;

-- ================================================================
-- 10. CREATE DELIVERABLES
-- ================================================================

DO $$
DECLARE
  application_id UUID;
  creator_profile_id UUID;
  campaign_id UUID;
  restaurant_id UUID;
  deliverable_id UUID;
  i INTEGER := 0;
  j INTEGER;
BEGIN
  -- Business 2 (Medium): 3-5 deliverables
  FOR application_id IN 
    SELECT ca.id 
    FROM public.campaign_applications ca
    JOIN public.campaigns c ON ca.campaign_id = c.id
    WHERE c.restaurant_id = '7a8b9c0d-1e2f-4345-a678-901234567890'::uuid -- restaurant_id_2
      AND ca.status = 'accepted'
    LIMIT 3
  LOOP
    SELECT ca.creator_id, ca.campaign_id, c.restaurant_id
    INTO creator_profile_id, campaign_id, restaurant_id
    FROM public.campaign_applications ca
    JOIN public.campaigns c ON ca.campaign_id = c.id
    WHERE ca.id = application_id;

    -- 1-2 deliverables per application
    FOR j IN 1..(1 + (random() * 2)::int) LOOP
      INSERT INTO public.campaign_deliverables (
        id, campaign_application_id, creator_id, restaurant_id, campaign_id,
        content_type, content_url, thumbnail_url, caption, social_platform, platform_post_url,
        status, submitted_at, payment_status, payment_amount_cents
      )
      VALUES (
        gen_random_uuid(),
        application_id,
        creator_profile_id,
        restaurant_id,
        campaign_id,
        CASE (j % 3) WHEN 0 THEN 'photo' WHEN 1 THEN 'reel' ELSE 'post' END,
        'https://example.com/deliverable' || j || '.jpg',
        'https://images.unsplash.com/photo-' || (1700000000000 + j) || '?w=800',
        'Amazing experience! Check out this content for the campaign.',
        CASE (j % 2) WHEN 0 THEN 'instagram' ELSE 'tiktok' END,
        'https://instagram.com/p/ABC' || j,
        CASE 
          WHEN j = 1 THEN 'approved'
          WHEN j = 2 THEN 'pending_review'
          ELSE 'auto_approved'
        END,
        NOW() - (INTERVAL '1 day' * j),
        CASE 
          WHEN j = 1 THEN 'completed'
          WHEN j = 2 THEN 'pending'
          ELSE 'processing'
        END,
        CASE WHEN j = 1 THEN 50000 ELSE 60000 END
      )
      RETURNING id INTO deliverable_id;
    END LOOP;
  END LOOP;

  -- Business 3 (High): 15-20 deliverables
  FOR application_id IN 
    SELECT ca.id 
    FROM public.campaign_applications ca
    JOIN public.campaigns c ON ca.campaign_id = c.id
    WHERE c.restaurant_id = '8b9c0d1e-2f3a-4456-b789-012345678901'::uuid -- restaurant_id_3
      AND ca.status = 'accepted'
    LIMIT 10
  LOOP
    SELECT ca.creator_id, ca.campaign_id, c.restaurant_id
    INTO creator_profile_id, campaign_id, restaurant_id
    FROM public.campaign_applications ca
    JOIN public.campaigns c ON ca.campaign_id = c.id
    WHERE ca.id = application_id;

    -- 1-2 deliverables per application
    FOR j IN 1..(1 + (random() * 2)::int) LOOP
      INSERT INTO public.campaign_deliverables (
        id, campaign_application_id, creator_id, restaurant_id, campaign_id,
        content_type, content_url, thumbnail_url, caption, social_platform, platform_post_url,
        status, submitted_at, payment_status, payment_amount_cents
      )
      VALUES (
        gen_random_uuid(),
        application_id,
        creator_profile_id,
        restaurant_id,
        campaign_id,
        CASE (j % 4) WHEN 0 THEN 'photo' WHEN 1 THEN 'reel' WHEN 2 THEN 'video' ELSE 'post' END,
        'https://example.com/deliverable' || (i * 10 + j) || '.jpg',
        'https://images.unsplash.com/photo-' || (1700000000000 + i * 10 + j) || '?w=800',
        'Great collaboration! Here''s the content for this campaign.',
        CASE (j % 3) WHEN 0 THEN 'instagram' WHEN 1 THEN 'tiktok' ELSE 'youtube' END,
        'https://instagram.com/p/XYZ' || (i * 10 + j),
        CASE (j % 5)
          WHEN 0 THEN 'approved'
          WHEN 1 THEN 'pending_review'
          WHEN 2 THEN 'auto_approved'
          WHEN 3 THEN 'approved'
          ELSE 'pending_review'
        END,
        NOW() - (INTERVAL '1 day' * (i * 2 + j)),
        CASE (j % 4)
          WHEN 0 THEN 'completed'
          WHEN 1 THEN 'processing'
          WHEN 2 THEN 'completed'
          ELSE 'pending'
        END,
        (40000 + (j * 5000))
      )
      RETURNING id INTO deliverable_id;
      
      i := i + 1;
    END LOOP;
  END LOOP;
END $$;

-- ================================================================
-- SUMMARY
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Robust Test Scenario Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - 20 test users (10 consumers, 7 creators, 3 businesses)';
  RAISE NOTICE '  - 20 default boards';
  RAISE NOTICE '  - 7 creator profiles with portfolios';
  RAISE NOTICE '  - 8 restaurants (3 claimed, 5 unclaimed)';
  RAISE NOTICE '  - 3 business profiles';
  RAISE NOTICE '  - ~50+ posts with engagement (likes, comments, saves)';
  RAISE NOTICE '  - ~45 restaurant saves';
  RAISE NOTICE '  - User follows (social graph)';
  RAISE NOTICE '  - 13 campaigns (3 medium, 10 high activity)';
  RAISE NOTICE '  - ~25 campaign applications';
  RAISE NOTICE '  - ~20 deliverables (various statuses)';
  RAISE NOTICE '';
  RAISE NOTICE 'Business Activity Levels:';
  RAISE NOTICE '  - test-business1@troodieapp.com (NEW): 1 restaurant, 0 campaigns';
  RAISE NOTICE '  - test-business2@troodieapp.com (MEDIUM): 1 restaurant, 3 campaigns, ~8 applications, ~5 deliverables';
  RAISE NOTICE '  - test-business3@troodieapp.com (HIGH): 1 restaurant, 10 campaigns, ~25 applications, ~15 deliverables';
  RAISE NOTICE '';
  RAISE NOTICE 'All accounts use OTP: 000000 for authentication';
  RAISE NOTICE '========================================';
END $$;

