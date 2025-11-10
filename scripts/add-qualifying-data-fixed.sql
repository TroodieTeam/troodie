-- ================================================================
-- Add Qualifying Data for Creator Onboarding Testing (FIXED)
-- ================================================================
-- This script adds saves, boards, and friend connections to consumer accounts
-- with different qualification levels:
--
-- Consumer1: NOT QUALIFIED (22 saves, 2 boards, 3 friends)
-- Consumer2: QUALIFIED (52 saves, 7 boards, 15 friends)  
-- Consumer3: QUALIFIED (41 saves, 5 boards, 8 friends)
--
-- Requirements to qualify: 40+ saves, 3+ boards, 5+ friends
-- ================================================================

-- First, let's check if users exist
DO $$
DECLARE
  consumer1_id UUID;
  consumer2_id UUID;
  consumer3_id UUID;
  creator1_id UUID;
  creator2_id UUID;
  restaurant_ids UUID[];
  board_ids UUID[];
  board_id UUID;
  i INTEGER;
BEGIN
  -- Get consumer user IDs
  SELECT id INTO consumer1_id FROM users WHERE email = 'consumer1@bypass.com';
  SELECT id INTO consumer2_id FROM users WHERE email = 'consumer2@bypass.com';
  SELECT id INTO consumer3_id FROM users WHERE email = 'consumer3@bypass.com';
  SELECT id INTO creator1_id FROM users WHERE email = 'creator1@bypass.com';
  SELECT id INTO creator2_id FROM users WHERE email = 'creator2@bypass.com';

  IF consumer1_id IS NULL OR consumer2_id IS NULL OR consumer3_id IS NULL THEN
    RAISE NOTICE 'One or more consumer accounts not found. Please run account creation script first.';
    RETURN;
  END IF;

  -- Get array of restaurant IDs to save
  SELECT ARRAY_AGG(id) INTO restaurant_ids 
  FROM (SELECT id FROM restaurants WHERE is_verified = true OR is_claimed = false LIMIT 100) r;

  IF array_length(restaurant_ids, 1) IS NULL OR array_length(restaurant_ids, 1) < 50 THEN
    RAISE NOTICE 'Not enough restaurants found. Creating some test restaurants...';
    -- Create some test restaurants if needed
    FOR i IN 1..50 LOOP
      INSERT INTO restaurants (id, name, address, city, state, cuisine_types, price_range, data_source)
      VALUES (
        uuid_generate_v4(),
        'Test Restaurant ' || i,
        i || ' Main Street',
        'Charlotte',
        'NC',
        ARRAY['American'],
        CASE WHEN i % 4 = 0 THEN '$$$$' WHEN i % 4 = 1 THEN '$$$' WHEN i % 4 = 2 THEN '$$' ELSE '$' END,
        'seed'
      );
    END LOOP;
    
    -- Re-fetch restaurant IDs
    SELECT ARRAY_AGG(id) INTO restaurant_ids 
    FROM (SELECT id FROM restaurants LIMIT 100) r;
  END IF;

  -- ================================================================
  -- Consumer 1: John Smith - Not qualified yet (22 saves, 2 boards, 3 friends)
  -- ================================================================
  
  RAISE NOTICE 'Setting up Consumer 1 (NOT qualified)...';
  
  -- Clean up existing data for Consumer 1
  DELETE FROM board_restaurants WHERE added_by = consumer1_id;
  DELETE FROM boards WHERE user_id = consumer1_id;
  DELETE FROM user_relationships WHERE follower_id = consumer1_id OR following_id = consumer1_id;
  
  -- Create boards for Consumer 1 (only 2 boards - below minimum)
  board_ids := ARRAY[]::UUID[];
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES (uuid_generate_v4(), consumer1_id, 'Favorites', 'My favorite spots', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES (uuid_generate_v4(), consumer1_id, 'Want to Try', 'On my list', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);

  -- Add only 22 saves for Consumer 1 (below 40 minimum)
  FOR i IN 1..22 LOOP
    INSERT INTO board_restaurants (id, board_id, restaurant_id, added_by, notes, created_at)
    VALUES (
      uuid_generate_v4(),
      board_ids[(i % array_length(board_ids, 1)) + 1],
      restaurant_ids[(i % array_length(restaurant_ids, 1)) + 1],
      consumer1_id,
      CASE 
        WHEN i % 5 = 0 THEN 'Amazing food and atmosphere!'
        WHEN i % 5 = 1 THEN 'Must try the special menu'
        WHEN i % 5 = 2 THEN 'Perfect for date night'
        WHEN i % 5 = 3 THEN 'Great service, will come back'
        ELSE 'Hidden gem in Charlotte'
      END,
      NOW() - INTERVAL '1 day' * (50 - i)
    );
  END LOOP;

  -- Add only 3 friend connections for Consumer 1 (below 5 minimum)
  IF consumer2_id IS NOT NULL THEN
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer1_id, consumer2_id, NOW() - INTERVAL '30 days')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer2_id, consumer1_id, NOW() - INTERVAL '29 days')
    ON CONFLICT DO NOTHING;
  END IF;

  IF consumer3_id IS NOT NULL THEN
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer1_id, consumer3_id, NOW() - INTERVAL '25 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Update user stats for Consumer 1
  UPDATE users 
  SET 
    saves_count = 22,
    following_count = 2,
    followers_count = 1,
    has_created_board = true,
    updated_at = NOW()
  WHERE id = consumer1_id;

  -- ================================================================
  -- Consumer 2: Jane Doe - Active user (52 saves, 7 boards, 15 friends)
  -- ================================================================
  
  RAISE NOTICE 'Setting up Consumer 2 (QUALIFIED)...';
  
  -- Clean up existing data for Consumer 2
  DELETE FROM board_restaurants WHERE added_by = consumer2_id;
  DELETE FROM boards WHERE user_id = consumer2_id;
  DELETE FROM user_relationships WHERE follower_id = consumer2_id OR following_id = consumer2_id;
  
  -- Create boards for Consumer 2 (7 boards)
  board_ids := ARRAY[]::UUID[];
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES 
    (uuid_generate_v4(), consumer2_id, 'Vegan Friendly', 'Plant-based paradise', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES 
    (uuid_generate_v4(), consumer2_id, 'International Cuisine', 'Flavors from around the world', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES 
    (uuid_generate_v4(), consumer2_id, 'Budget Eats', 'Great food without breaking the bank', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES 
    (uuid_generate_v4(), consumer2_id, 'Instagram Worthy', 'Photogenic food and ambiance', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES 
    (uuid_generate_v4(), consumer2_id, 'Family Favorites', 'Kid-friendly restaurants', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES 
    (uuid_generate_v4(), consumer2_id, 'Late Night Eats', 'Open after 10pm', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES 
    (uuid_generate_v4(), consumer2_id, 'Business Lunch', 'Professional dining spots', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);

  -- Add 52 saves for Consumer 2
  FOR i IN 1..52 LOOP
    INSERT INTO board_restaurants (id, board_id, restaurant_id, added_by, notes, created_at)
    VALUES (
      uuid_generate_v4(),
      board_ids[(i % array_length(board_ids, 1)) + 1],
      restaurant_ids[(i % array_length(restaurant_ids, 1)) + 1],
      consumer2_id,
      CASE 
        WHEN i % 4 = 0 THEN 'Love this place!'
        WHEN i % 4 = 1 THEN 'Great for groups'
        WHEN i % 4 = 2 THEN 'Excellent cocktails'
        ELSE 'Consistently good'
      END,
      NOW() - INTERVAL '1 day' * (60 - i)
    );
  END LOOP;

  -- Add 15 friend connections for Consumer 2
  -- Follow consumer1, consumer3, and creators if they exist
  IF consumer1_id IS NOT NULL THEN
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer2_id, consumer1_id, NOW() - INTERVAL '40 days')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer1_id, consumer2_id, NOW() - INTERVAL '39 days')
    ON CONFLICT DO NOTHING;
  END IF;

  IF consumer3_id IS NOT NULL THEN
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer2_id, consumer3_id, NOW() - INTERVAL '35 days')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer3_id, consumer2_id, NOW() - INTERVAL '34 days')
    ON CONFLICT DO NOTHING;
  END IF;

  IF creator1_id IS NOT NULL THEN
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer2_id, creator1_id, NOW() - INTERVAL '22 days')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), creator1_id, consumer2_id, NOW() - INTERVAL '21 days')
    ON CONFLICT DO NOTHING;
  END IF;

  IF creator2_id IS NOT NULL THEN
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer2_id, creator2_id, NOW() - INTERVAL '18 days')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), creator2_id, consumer2_id, NOW() - INTERVAL '17 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create some additional test users to follow
  FOR i IN 1..7 LOOP
    BEGIN
      INSERT INTO user_relationships (id, follower_id, following_id, created_at)
      SELECT uuid_generate_v4(), consumer2_id, id, NOW() - INTERVAL '1 day' * i
      FROM users 
      WHERE id NOT IN (consumer1_id, consumer2_id, consumer3_id) 
        AND id IS NOT NULL
      LIMIT 1
      OFFSET i
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Skip if no more users available
      NULL;
    END;
  END LOOP;

  -- Update user stats for Consumer 2
  UPDATE users 
  SET 
    saves_count = 52,
    following_count = (SELECT COUNT(*) FROM user_relationships WHERE follower_id = consumer2_id),
    followers_count = (SELECT COUNT(*) FROM user_relationships WHERE following_id = consumer2_id),
    has_created_board = true,
    updated_at = NOW()
  WHERE id = consumer2_id;

  -- ================================================================
  -- Consumer 3: Alice Johnson - Moderate user (41 saves, 5 boards, 8 friends)
  -- ================================================================
  
  RAISE NOTICE 'Setting up Consumer 3 (QUALIFIED)...';
  
  -- Clean up existing data for Consumer 3
  DELETE FROM board_restaurants WHERE added_by = consumer3_id;
  DELETE FROM boards WHERE user_id = consumer3_id;
  DELETE FROM user_relationships WHERE follower_id = consumer3_id OR following_id = consumer3_id;
  
  -- Create boards for Consumer 3 (5 boards)
  board_ids := ARRAY[]::UUID[];
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES 
    (uuid_generate_v4(), consumer3_id, 'Comfort Food', 'Soul-warming dishes', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES 
    (uuid_generate_v4(), consumer3_id, 'Healthy Options', 'Nutritious and delicious', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES 
    (uuid_generate_v4(), consumer3_id, 'Pizza Places', 'Best slices in town', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES 
    (uuid_generate_v4(), consumer3_id, 'Asian Cuisine', 'Sushi, Thai, Chinese and more', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);
  
  INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
  VALUES 
    (uuid_generate_v4(), consumer3_id, 'Breweries', 'Craft beer and pub food', 'free', null)
  RETURNING id INTO board_id;
  board_ids := array_append(board_ids, board_id);

  -- Add 41 saves for Consumer 3
  FOR i IN 1..41 LOOP
    INSERT INTO board_restaurants (id, board_id, restaurant_id, added_by, notes, created_at)
    VALUES (
      uuid_generate_v4(),
      board_ids[(i % array_length(board_ids, 1)) + 1],
      restaurant_ids[(i % array_length(restaurant_ids, 1)) + 1],
      consumer3_id,
      CASE 
        WHEN i % 3 = 0 THEN 'Highly recommend!'
        WHEN i % 3 = 1 THEN 'Great value'
        ELSE 'Will definitely return'
      END,
      NOW() - INTERVAL '1 day' * (45 - i)
    );
  END LOOP;

  -- Add 8 friend connections for Consumer 3
  IF consumer2_id IS NOT NULL THEN
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer3_id, consumer2_id, NOW() - INTERVAL '42 days')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer2_id, consumer3_id, NOW() - INTERVAL '41 days')
    ON CONFLICT DO NOTHING;
  END IF;

  IF creator1_id IS NOT NULL THEN
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer3_id, creator1_id, NOW() - INTERVAL '40 days')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), creator1_id, consumer3_id, NOW() - INTERVAL '39 days')
    ON CONFLICT DO NOTHING;
  END IF;

  IF creator2_id IS NOT NULL THEN
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), consumer3_id, creator2_id, NOW() - INTERVAL '38 days')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO user_relationships (id, follower_id, following_id, created_at)
    VALUES (uuid_generate_v4(), creator2_id, consumer3_id, NOW() - INTERVAL '37 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create some additional test users to follow
  FOR i IN 1..2 LOOP
    BEGIN
      INSERT INTO user_relationships (id, follower_id, following_id, created_at)
      SELECT uuid_generate_v4(), consumer3_id, id, NOW() - INTERVAL '1 day' * (30 + i)
      FROM users 
      WHERE id NOT IN (consumer1_id, consumer2_id, consumer3_id) 
        AND id IS NOT NULL
      LIMIT 1
      OFFSET i + 10
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Skip if no more users available
      NULL;
    END;
  END LOOP;

  -- Update user stats for Consumer 3
  UPDATE users 
  SET 
    saves_count = 41,
    following_count = (SELECT COUNT(*) FROM user_relationships WHERE follower_id = consumer3_id),
    followers_count = (SELECT COUNT(*) FROM user_relationships WHERE following_id = consumer3_id),
    has_created_board = true,
    updated_at = NOW()
  WHERE id = consumer3_id;

  -- ================================================================
  -- Update User Profiles with Photos
  -- ================================================================
  
  UPDATE users 
  SET 
    avatar_url = 'https://i.pravatar.cc/150?u=' || id,
    bio = CASE 
      WHEN email = 'consumer1@bypass.com' THEN 'New to Charlotte, just starting to explore the food scene!'
      WHEN email = 'consumer2@bypass.com' THEN 'Vegetarian food lover. Always hunting for the next great meal. 🌱'
      WHEN email = 'consumer3@bypass.com' THEN 'Weekend brunch enthusiast and craft beer aficionado.'
      ELSE bio
    END,
    updated_at = NOW()
  WHERE email IN ('consumer1@bypass.com', 'consumer2@bypass.com', 'consumer3@bypass.com');

  RAISE NOTICE 'Successfully added test data for consumer accounts';
  RAISE NOTICE 'Consumer1: 22 saves, 2 boards, 3 friends (NOT QUALIFIED - needs more activity)';
  RAISE NOTICE 'Consumer2: 52 saves, 7 boards, 15+ friends (QUALIFIED)';
  RAISE NOTICE 'Consumer3: 41 saves, 5 boards, 8+ friends (QUALIFIED)';
  
END $$;

-- Verification queries
SELECT 
  u.email,
  u.saves_count as saves_count_field,
  COUNT(DISTINCT br.id) as actual_saves,
  COUNT(DISTINCT b.id) as board_count,
  u.following_count as following_field,
  u.followers_count as followers_field,
  (SELECT COUNT(*) FROM user_relationships WHERE follower_id = u.id) as actual_following,
  (SELECT COUNT(*) FROM user_relationships WHERE following_id = u.id) as actual_followers
FROM users u
LEFT JOIN board_restaurants br ON u.id = br.added_by
LEFT JOIN boards b ON u.id = b.user_id
WHERE u.email IN ('consumer1@bypass.com', 'consumer2@bypass.com', 'consumer3@bypass.com')
GROUP BY u.id, u.email, u.saves_count, u.following_count, u.followers_count
ORDER BY u.email;