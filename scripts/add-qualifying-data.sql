-- ================================================================
-- Add Qualifying Data for Creator Onboarding Testing
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

-- Get user IDs for our test accounts
DO $$
DECLARE
  consumer1_id UUID;
  consumer2_id UUID;
  consumer3_id UUID;
  creator1_id UUID;
  creator2_id UUID;
  restaurant_ids UUID[];
  board_ids UUID[];
BEGIN
  -- Get consumer user IDs
  SELECT id INTO consumer1_id FROM users WHERE email = 'consumer1@bypass.com';
  SELECT id INTO consumer2_id FROM users WHERE email = 'consumer2@bypass.com';
  SELECT id INTO consumer3_id FROM users WHERE email = 'consumer3@bypass.com';
  SELECT id INTO creator1_id FROM users WHERE email = 'creator1@bypass.com';
  SELECT id INTO creator2_id FROM users WHERE email = 'creator2@bypass.com';

  -- Get array of restaurant IDs to save
  SELECT ARRAY_AGG(id) INTO restaurant_ids 
  FROM (SELECT id FROM restaurants LIMIT 50) r;

  -- ================================================================
  -- Consumer 1: John Smith - Not qualified yet (22 saves)
  -- ================================================================
  
  -- Create boards for Consumer 1 (only 2 boards - below minimum)
  WITH inserted_boards AS (
    INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
    VALUES 
      (uuid_generate_v4(), consumer1_id, 'Favorites', 'My favorite spots', 'free', null),
      (uuid_generate_v4(), consumer1_id, 'Want to Try', 'On my list', 'free', null)
    RETURNING id
  )
  SELECT ARRAY_AGG(id) INTO board_ids FROM inserted_boards;

  -- Add only 22 saves for Consumer 1 (below 40 minimum)
  FOR i IN 1..22 LOOP
    INSERT INTO board_restaurants (id, board_id, restaurant_id, added_by, notes, created_at)
    VALUES (
      uuid_generate_v4(),
      board_ids[i % array_length(board_ids, 1) + 1],
      restaurant_ids[i % array_length(restaurant_ids, 1) + 1],
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

  -- ================================================================
  -- Consumer 2: Jane Doe - Active user (52 saves)
  -- ================================================================
  
  -- Create boards for Consumer 2
  DELETE FROM boards WHERE user_id = consumer2_id; -- Clean up first
  WITH inserted_boards AS (
    INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
    VALUES 
      (uuid_generate_v4(), consumer2_id, 'Vegan Friendly', 'Plant-based paradise', 'free', null),
      (uuid_generate_v4(), consumer2_id, 'International Cuisine', 'Flavors from around the world', 'free', null),
      (uuid_generate_v4(), consumer2_id, 'Budget Eats', 'Great food without breaking the bank', 'free', null),
      (uuid_generate_v4(), consumer2_id, 'Instagram Worthy', 'Photogenic food and ambiance', 'free', null),
      (uuid_generate_v4(), consumer2_id, 'Family Favorites', 'Kid-friendly restaurants', 'free', null),
      (uuid_generate_v4(), consumer2_id, 'Late Night Eats', 'Open after 10pm', 'free', null),
      (uuid_generate_v4(), consumer2_id, 'Business Lunch', 'Professional dining spots', 'free', null)
    RETURNING id
  )
  SELECT ARRAY_AGG(id) INTO board_ids FROM inserted_boards;

  -- Add 52 saves for Consumer 2
  FOR i IN 1..52 LOOP
    INSERT INTO board_restaurants (id, board_id, restaurant_id, added_by, notes, created_at)
    VALUES (
      uuid_generate_v4(),
      board_ids[i % array_length(board_ids, 1) + 1],
      restaurant_ids[(i + 10) % array_length(restaurant_ids, 1) + 1],
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

  -- ================================================================
  -- Consumer 3: Alice Johnson - Moderate user (41 saves)
  -- ================================================================
  
  -- Create boards for Consumer 3
  DELETE FROM boards WHERE user_id = consumer3_id; -- Clean up first
  WITH inserted_boards AS (
    INSERT INTO boards (id, user_id, title, description, type, cover_image_url)
    VALUES 
      (uuid_generate_v4(), consumer3_id, 'Comfort Food', 'Soul-warming dishes', 'free', null),
      (uuid_generate_v4(), consumer3_id, 'Healthy Options', 'Nutritious and delicious', 'free', null),
      (uuid_generate_v4(), consumer3_id, 'Pizza Places', 'Best slices in town', 'free', null),
      (uuid_generate_v4(), consumer3_id, 'Asian Cuisine', 'Sushi, Thai, Chinese and more', 'free', null),
      (uuid_generate_v4(), consumer3_id, 'Breweries', 'Craft beer and pub food', 'free', null)
    RETURNING id
  )
  SELECT ARRAY_AGG(id) INTO board_ids FROM inserted_boards;

  -- Add 41 saves for Consumer 3
  FOR i IN 1..41 LOOP
    INSERT INTO board_restaurants (id, board_id, restaurant_id, added_by, notes, created_at)
    VALUES (
      uuid_generate_v4(),
      board_ids[i % array_length(board_ids, 1) + 1],
      restaurant_ids[(i + 5) % array_length(restaurant_ids, 1) + 1],
      consumer3_id,
      CASE 
        WHEN i % 3 = 0 THEN 'Highly recommend!'
        WHEN i % 3 = 1 THEN 'Great value'
        ELSE 'Will definitely return'
      END,
      NOW() - INTERVAL '1 day' * (45 - i)
    );
  END LOOP;

  -- ================================================================
  -- Add Friend Connections
  -- ================================================================
  
  -- Consumer 1 friends (only 3 connections - below minimum of 5)
  INSERT INTO user_relationships (id, follower_id, following_id, created_at)
  VALUES 
    (uuid_generate_v4(), consumer1_id, consumer2_id, NOW() - INTERVAL '30 days')
  ON CONFLICT DO NOTHING;

  -- Add reciprocal follows to simulate friends
  INSERT INTO user_relationships (id, follower_id, following_id, created_at)
  VALUES 
    (uuid_generate_v4(), consumer2_id, consumer1_id, NOW() - INTERVAL '29 days')
  ON CONFLICT DO NOTHING;

  -- Consumer 2 friends (15 connections)
  INSERT INTO user_relationships (id, follower_id, following_id, created_at)
  VALUES 
    (uuid_generate_v4(), consumer2_id, consumer3_id, NOW() - INTERVAL '35 days'),
    (uuid_generate_v4(), consumer2_id, creator1_id, NOW() - INTERVAL '22 days'),
    (uuid_generate_v4(), consumer2_id, creator2_id, NOW() - INTERVAL '18 days')
  ON CONFLICT DO NOTHING;

  -- Add reciprocal follows
  INSERT INTO user_relationships (id, follower_id, following_id, created_at)
  VALUES 
    (uuid_generate_v4(), consumer3_id, consumer2_id, NOW() - INTERVAL '34 days'),
    (uuid_generate_v4(), creator1_id, consumer2_id, NOW() - INTERVAL '21 days'),
    (uuid_generate_v4(), creator2_id, consumer2_id, NOW() - INTERVAL '17 days')
  ON CONFLICT DO NOTHING;

  -- Consumer 3 friends (8 connections)
  INSERT INTO user_relationships (id, follower_id, following_id, created_at)
  VALUES 
    (uuid_generate_v4(), consumer3_id, creator1_id, NOW() - INTERVAL '40 days'),
    (uuid_generate_v4(), consumer3_id, creator2_id, NOW() - INTERVAL '38 days')
  ON CONFLICT DO NOTHING;

  -- Add reciprocal follows
  INSERT INTO user_relationships (id, follower_id, following_id, created_at)
  VALUES 
    (uuid_generate_v4(), creator1_id, consumer3_id, NOW() - INTERVAL '39 days'),
    (uuid_generate_v4(), creator2_id, consumer3_id, NOW() - INTERVAL '37 days')
  ON CONFLICT DO NOTHING;

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
  RAISE NOTICE 'Consumer2: 52 saves, 7 boards, 15 friends (QUALIFIED)';
  RAISE NOTICE 'Consumer3: 41 saves, 5 boards, 8 friends (QUALIFIED)';
  
END $$;

-- Verification queries
SELECT 
  u.email,
  COUNT(DISTINCT br.id) as save_count,
  COUNT(DISTINCT b.id) as board_count,
  COUNT(DISTINCT ur.following_id) + COUNT(DISTINCT ur2.follower_id) as friend_count
FROM users u
LEFT JOIN board_restaurants br ON u.id = br.added_by
LEFT JOIN boards b ON u.id = b.user_id
LEFT JOIN user_relationships ur ON u.id = ur.follower_id
LEFT JOIN user_relationships ur2 ON u.id = ur2.following_id
WHERE u.email IN ('consumer1@bypass.com', 'consumer2@bypass.com', 'consumer3@bypass.com')
GROUP BY u.email
ORDER BY u.email;