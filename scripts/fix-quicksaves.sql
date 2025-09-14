-- ================================================================
-- Fix Quick Saves for Test Users
-- ================================================================
-- This script creates "Your Saves" boards and moves some saves there
-- so they appear in the Saves tab on the profile
-- ================================================================

DO $$
DECLARE
  consumer1_id UUID;
  consumer2_id UUID;
  consumer3_id UUID;
  quicksaves1_id UUID;
  quicksaves2_id UUID;
  quicksaves3_id UUID;
  restaurant_ids UUID[];
BEGIN
  -- Get user IDs
  SELECT id INTO consumer1_id FROM users WHERE email = 'consumer1@bypass.com';
  SELECT id INTO consumer2_id FROM users WHERE email = 'consumer2@bypass.com';
  SELECT id INTO consumer3_id FROM users WHERE email = 'consumer3@bypass.com';

  -- Get some restaurant IDs for saves
  SELECT ARRAY_AGG(id) INTO restaurant_ids 
  FROM (SELECT id FROM restaurants LIMIT 20) r;

  -- ================================================================
  -- Consumer 1: Create "Your Saves" board with some saves
  -- ================================================================
  IF consumer1_id IS NOT NULL THEN
    -- Check if "Your Saves" board already exists
    SELECT id INTO quicksaves1_id 
    FROM boards 
    WHERE user_id = consumer1_id 
    AND title IN ('Your Saves', 'Quick Saves')
    LIMIT 1;

    -- Create if doesn't exist
    IF quicksaves1_id IS NULL THEN
      INSERT INTO boards (id, user_id, title, description, type, is_private, cover_image_url)
      VALUES (
        uuid_generate_v4(), 
        consumer1_id, 
        'Your Saves', 
        'Your default collection of saved restaurants',
        'free',
        true,
        null
      )
      RETURNING id INTO quicksaves1_id;
      
      RAISE NOTICE 'Created Your Saves board for consumer1';
    END IF;

    -- Add some saves to Your Saves board (move 10 from other boards)
    -- First, delete any existing saves in Your Saves to avoid duplicates
    DELETE FROM board_restaurants WHERE board_id = quicksaves1_id;
    
    -- Add 10 saves
    FOR i IN 1..10 LOOP
      INSERT INTO board_restaurants (id, board_id, restaurant_id, added_by, notes, created_at)
      VALUES (
        uuid_generate_v4(),
        quicksaves1_id,
        restaurant_ids[(i % array_length(restaurant_ids, 1)) + 1],
        consumer1_id,
        'Quick saved!',
        NOW() - INTERVAL '1 day' * i
      );
    END LOOP;
    
    RAISE NOTICE 'Added 10 saves to Your Saves for consumer1';
  END IF;

  -- ================================================================
  -- Consumer 2: Create "Your Saves" board with more saves
  -- ================================================================
  IF consumer2_id IS NOT NULL THEN
    -- Check if "Your Saves" board already exists
    SELECT id INTO quicksaves2_id 
    FROM boards 
    WHERE user_id = consumer2_id 
    AND title IN ('Your Saves', 'Quick Saves')
    LIMIT 1;

    -- Create if doesn't exist
    IF quicksaves2_id IS NULL THEN
      INSERT INTO boards (id, user_id, title, description, type, is_private, cover_image_url)
      VALUES (
        uuid_generate_v4(), 
        consumer2_id, 
        'Your Saves', 
        'Your default collection of saved restaurants',
        'free',
        true,
        null
      )
      RETURNING id INTO quicksaves2_id;
      
      RAISE NOTICE 'Created Your Saves board for consumer2';
    END IF;

    -- Add saves to Your Saves board
    DELETE FROM board_restaurants WHERE board_id = quicksaves2_id;
    
    -- Add 25 saves (so consumer2 has saves in both Your Saves and other boards)
    FOR i IN 1..25 LOOP
      INSERT INTO board_restaurants (id, board_id, restaurant_id, added_by, notes, created_at)
      VALUES (
        uuid_generate_v4(),
        quicksaves2_id,
        restaurant_ids[(i % array_length(restaurant_ids, 1)) + 1],
        consumer2_id,
        CASE 
          WHEN i % 3 = 0 THEN 'Must try again!'
          WHEN i % 3 = 1 THEN 'Quick save - looks amazing'
          ELSE 'Saved for later'
        END,
        NOW() - INTERVAL '1 hour' * i
      );
    END LOOP;
    
    RAISE NOTICE 'Added 25 saves to Your Saves for consumer2';
  END IF;

  -- ================================================================
  -- Consumer 3: Create "Your Saves" board
  -- ================================================================
  IF consumer3_id IS NOT NULL THEN
    -- Check if "Your Saves" board already exists
    SELECT id INTO quicksaves3_id 
    FROM boards 
    WHERE user_id = consumer3_id 
    AND title IN ('Your Saves', 'Quick Saves')
    LIMIT 1;

    -- Create if doesn't exist
    IF quicksaves3_id IS NULL THEN
      INSERT INTO boards (id, user_id, title, description, type, is_private, cover_image_url)
      VALUES (
        uuid_generate_v4(), 
        consumer3_id, 
        'Your Saves', 
        'Your default collection of saved restaurants',
        'free',
        true,
        null
      )
      RETURNING id INTO quicksaves3_id;
      
      RAISE NOTICE 'Created Your Saves board for consumer3';
    END IF;

    -- Add saves to Your Saves board
    DELETE FROM board_restaurants WHERE board_id = quicksaves3_id;
    
    -- Add 15 saves
    FOR i IN 1..15 LOOP
      INSERT INTO board_restaurants (id, board_id, restaurant_id, added_by, notes, created_at)
      VALUES (
        uuid_generate_v4(),
        quicksaves3_id,
        restaurant_ids[(i % array_length(restaurant_ids, 1)) + 1],
        consumer3_id,
        'Bookmarked!',
        NOW() - INTERVAL '2 hours' * i
      );
    END LOOP;
    
    RAISE NOTICE 'Added 15 saves to Your Saves for consumer3';
  END IF;

  -- Update saves counts to include the new saves
  UPDATE users 
  SET 
    saves_count = (SELECT COUNT(*) FROM board_restaurants WHERE added_by = consumer1_id),
    updated_at = NOW()
  WHERE id = consumer1_id;

  UPDATE users 
  SET 
    saves_count = (SELECT COUNT(*) FROM board_restaurants WHERE added_by = consumer2_id),
    updated_at = NOW()
  WHERE id = consumer2_id;

  UPDATE users 
  SET 
    saves_count = (SELECT COUNT(*) FROM board_restaurants WHERE added_by = consumer3_id),
    updated_at = NOW()
  WHERE id = consumer3_id;

  RAISE NOTICE 'Quick Saves setup complete!';
  
END $$;

-- Verify the Your Saves boards and their contents
SELECT 
  u.email,
  b.title as board_title,
  b.type,
  b.is_private,
  COUNT(br.id) as saves_in_board
FROM users u
JOIN boards b ON b.user_id = u.id
LEFT JOIN board_restaurants br ON br.board_id = b.id
WHERE u.email IN ('consumer1@bypass.com', 'consumer2@bypass.com', 'consumer3@bypass.com')
  AND b.title = 'Your Saves'
GROUP BY u.email, b.title, b.type, b.is_private
ORDER BY u.email;

-- Show total saves per user
SELECT 
  u.email,
  u.saves_count as saves_count_field,
  COUNT(DISTINCT br.id) as total_saves,
  COUNT(DISTINCT b.id) as total_boards,
  COUNT(DISTINCT CASE WHEN b.title = 'Your Saves' THEN br.id END) as quicksaves_count
FROM users u
LEFT JOIN board_restaurants br ON u.id = br.added_by
LEFT JOIN boards b ON u.id = b.user_id
WHERE u.email IN ('consumer1@bypass.com', 'consumer2@bypass.com', 'consumer3@bypass.com')
GROUP BY u.email, u.saves_count
ORDER BY u.email;