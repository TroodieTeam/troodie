-- ================================================================
-- Step 4: Create Creator Profiles with Portfolios
-- ================================================================
-- Creates creator profiles with portfolio items (images/videos)
-- Currently creates profiles for 3 creators (creators 4-7 commented out)
-- ================================================================

DO $$
DECLARE
  profile_id UUID;
  i INTEGER;
BEGIN
  -- Creator 1: Food Photographer
  INSERT INTO public.creator_profiles (user_id, display_name, bio, location, open_to_collabs, food_specialties, troodie_posts_count, troodie_likes_count, troodie_comments_count, created_at, updated_at)
  VALUES (
    '4a797077-116e-4a3a-bc43-a71ae18963d8'::uuid, -- test-creator1
    'Foodie Lens',
    'Professional food photographer specializing in restaurant and culinary content. 5+ years experience.',
    'Charlotte, NC',
    true,
    ARRAY['Food Photography', 'Restaurant Reviews'],
    45,
    225, -- likes (for ~5% engagement rate)
    54,  -- comments (for ~5% engagement rate)
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    food_specialties = EXCLUDED.food_specialties,
    troodie_posts_count = EXCLUDED.troodie_posts_count,
    troodie_likes_count = EXCLUDED.troodie_likes_count,
    troodie_comments_count = EXCLUDED.troodie_comments_count,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  FOR i IN 1..5 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 1000000) || '?w=800',
      i,
      NOW() - (INTERVAL '1 day' * (6 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Creator 2: Travel Food Blogger
  INSERT INTO public.creator_profiles (user_id, display_name, bio, location, open_to_collabs, food_specialties, troodie_posts_count, troodie_likes_count, troodie_comments_count, created_at, updated_at)
  VALUES (
    '381d705b-d5d1-4e44-85fc-b772d68921ba'::uuid, -- test-creator2
    'Wanderlust Eats',
    'Travel and food blogger exploring local restaurants across the Southeast. Always looking for hidden gems!',
    'Atlanta, GA',
    true,
    ARRAY['Travel', 'Restaurant Reviews', 'Food Blogging'],
    38,
    190, -- likes
    30,  -- comments
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    food_specialties = EXCLUDED.food_specialties,
    troodie_posts_count = EXCLUDED.troodie_posts_count,
    troodie_likes_count = EXCLUDED.troodie_likes_count,
    troodie_comments_count = EXCLUDED.troodie_comments_count,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  FOR i IN 1..5 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 2000000) || '?w=800',
      i,
      NOW() - (INTERVAL '1 day' * (6 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Creator 3: Lifestyle Influencer
  INSERT INTO public.creator_profiles (user_id, display_name, bio, location, open_to_collabs, food_specialties, troodie_posts_count, troodie_likes_count, troodie_comments_count, created_at, updated_at)
  VALUES (
    'e50f6c6f-9487-4ff2-acd0-3542fdd46dd1'::uuid, -- test-creator3
    'Lifestyle & Bites',
    'Lifestyle content creator focusing on dining experiences and local food culture.',
    'Raleigh, NC',
    true,
    ARRAY['Lifestyle', 'Food Content'],
    52,
    312, -- likes
    58,  -- comments
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    food_specialties = EXCLUDED.food_specialties,
    troodie_posts_count = EXCLUDED.troodie_posts_count,
    troodie_likes_count = EXCLUDED.troodie_likes_count,
    troodie_comments_count = EXCLUDED.troodie_comments_count,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  FOR i IN 1..6 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 3000000) || '?w=800',
      i,
      NOW() - (INTERVAL '1 day' * (7 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE '✅ Step 4 Complete: Created 3 creator profiles with portfolios';
  RAISE NOTICE '   - test-creator1: Foodie Lens';
  RAISE NOTICE '   - test-creator2: Wanderlust Eats';
  RAISE NOTICE '   - test-creator3: Lifestyle & Bites';
  RAISE NOTICE '   - Creators 4-7 will be added when those users are created';
END $$;

-- ================================================================
-- NOTE: Creators 4-7 are commented out below
-- Uncomment and remove hardcoded IDs when those users are created
-- ================================================================

/*
  -- Creator 4: Restaurant Critic
  INSERT INTO public.creator_profiles (user_id, display_name, bio, location, open_to_collabs, food_specialties, troodie_posts_count, troodie_likes_count, troodie_comments_count, created_at, updated_at)
  VALUES (
    'b4c5d6e7-f8a9-4012-b345-678901234567'::uuid, -- test-creator4
    'The Critic',
    'Professional restaurant critic with 10+ years experience. Honest, detailed reviews.',
    'Charlotte, NC',
    false,
    ARRAY['Restaurant Reviews', 'Food Criticism'],
    28,
    98,  -- likes
    28,  -- comments
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    food_specialties = EXCLUDED.food_specialties,
    troodie_posts_count = EXCLUDED.troodie_posts_count,
    troodie_likes_count = EXCLUDED.troodie_likes_count,
    troodie_comments_count = EXCLUDED.troodie_comments_count,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  FOR i IN 1..3 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 4000000) || '?w=800',
      i,
      NOW() - (INTERVAL '1 day' * (4 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Creator 5: Video Content Creator
  INSERT INTO public.creator_profiles (user_id, display_name, bio, location, open_to_collabs, food_specialties, troodie_posts_count, troodie_likes_count, troodie_comments_count, created_at, updated_at)
  VALUES (
    'c5d6e7f8-a9b0-4123-c456-789012345678'::uuid, -- test-creator5
    'Food Reels Pro',
    'Creating engaging food video content for TikTok and Instagram. Specializing in quick recipe videos and restaurant tours.',
    'Asheville, NC',
    true,
    ARRAY['Video Content', 'Social Media'],
    67,
    469, -- likes
    87,  -- comments
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    food_specialties = EXCLUDED.food_specialties,
    troodie_posts_count = EXCLUDED.troodie_posts_count,
    troodie_likes_count = EXCLUDED.troodie_likes_count,
    troodie_comments_count = EXCLUDED.troodie_comments_count,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  FOR i IN 1..5 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 5000000) || '?w=800',
      i,
      NOW() - (INTERVAL '1 day' * (6 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Creator 6: Micro Influencer
  INSERT INTO public.creator_profiles (user_id, display_name, bio, location, open_to_collabs, food_specialties, troodie_posts_count, troodie_likes_count, troodie_comments_count, created_at, updated_at)
  VALUES (
    'd6e7f8a9-b0c1-4234-d567-890123456789'::uuid, -- test-creator6
    'Local Foodie',
    'Sharing my favorite local spots and hidden gems in the Charlotte area.',
    'Charlotte, NC',
    true,
    ARRAY['Local Food', 'Hidden Gems'],
    24,
    192, -- likes
    29,  -- comments
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    food_specialties = EXCLUDED.food_specialties,
    troodie_posts_count = EXCLUDED.troodie_posts_count,
    troodie_likes_count = EXCLUDED.troodie_likes_count,
    troodie_comments_count = EXCLUDED.troodie_comments_count,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  FOR i IN 1..4 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 6000000) || '?w=800',
      i,
      NOW() - (INTERVAL '1 day' * (5 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Creator 7: Food Stylist
  INSERT INTO public.creator_profiles (user_id, display_name, bio, location, open_to_collabs, food_specialties, troodie_posts_count, troodie_likes_count, troodie_comments_count, created_at, updated_at)
  VALUES (
    'e7f8a9b0-c1d2-4345-e678-901234567890'::uuid, -- test-creator7
    'Styled Plates',
    'Professional food stylist creating beautiful, appetizing content for restaurants and brands.',
    'Greenville, SC',
    true,
    ARRAY['Food Styling', 'Photography'],
    41,
    205, -- likes
    37,  -- comments
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    open_to_collabs = EXCLUDED.open_to_collabs,
    food_specialties = EXCLUDED.food_specialties,
    troodie_posts_count = EXCLUDED.troodie_posts_count,
    troodie_likes_count = EXCLUDED.troodie_likes_count,
    troodie_comments_count = EXCLUDED.troodie_comments_count,
    updated_at = NOW()
  RETURNING id INTO profile_id;

  FOR i IN 1..5 LOOP
    INSERT INTO public.creator_portfolio_items (id, creator_profile_id, image_url, display_order, created_at)
    VALUES (
      gen_random_uuid(),
      profile_id,
      'https://images.unsplash.com/photo-' || (1500000000000 + i * 7000000) || '?w=800',
      i,
      NOW() - (INTERVAL '1 day' * (6 - i))
    ) ON CONFLICT DO NOTHING;
  END LOOP;
*/
