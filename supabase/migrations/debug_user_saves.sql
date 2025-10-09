-- Debug query for specific user's saves
-- User ID: a51d5b77-3bf1-4e28-accb-a6bf5be9b31f

-- 1. Check user info
SELECT
  'User info' as check_type,
  id,
  name,
  email
FROM users
WHERE id = 'a51d5b77-3bf1-4e28-accb-a6bf5be9b31f';

-- 2. Check user's boards
SELECT
  'User boards' as check_type,
  id as board_id,
  title,
  is_private,
  created_at
FROM boards
WHERE user_id = 'a51d5b77-3bf1-4e28-accb-a6bf5be9b31f'
ORDER BY created_at DESC;

-- 3. Check "Your Saves" board specifically
SELECT
  'Your Saves board' as check_type,
  id as board_id,
  title,
  is_private,
  user_id,
  created_at
FROM boards
WHERE id = 'c00f6cd6-c882-4614-b906-08e5d7b731b1';

-- 4. Check board_restaurants entries for this board
SELECT
  'Board restaurants (what app uses)' as check_type,
  br.id,
  br.board_id,
  br.restaurant_id,
  br.added_by,
  r.name as restaurant_name,
  br.notes,
  br.rating,
  br.created_at
FROM board_restaurants br
LEFT JOIN restaurants r ON br.restaurant_id = r.id
WHERE br.board_id = 'c00f6cd6-c882-4614-b906-08e5d7b731b1'
ORDER BY br.created_at DESC;

-- 5. Check if restaurant_saves table exists and has data for this user
SELECT
  'Restaurant saves (what activity feed uses)' as check_type,
  rs.id,
  rs.user_id,
  rs.restaurant_id,
  r.name as restaurant_name,
  rs.privacy,
  rs.notes,
  rs.created_at
FROM restaurant_saves rs
LEFT JOIN restaurants r ON rs.restaurant_id = r.id
WHERE rs.user_id = 'a51d5b77-3bf1-4e28-accb-a6bf5be9b31f'
ORDER BY rs.created_at DESC;

-- 6. Check if there's a relationship between the two tables
SELECT
  'Comparison: board_restaurants vs restaurant_saves' as check_type,
  COUNT(DISTINCT br.restaurant_id) as restaurants_in_boards,
  COUNT(DISTINCT rs.restaurant_id) as restaurants_in_saves,
  COUNT(DISTINCT CASE WHEN rs.privacy = 'public' THEN rs.restaurant_id END) as public_saves
FROM board_restaurants br
LEFT JOIN restaurant_saves rs ON br.restaurant_id = rs.restaurant_id AND br.added_by = rs.user_id
WHERE br.added_by = 'a51d5b77-3bf1-4e28-accb-a6bf5be9b31f';

-- 7. Show table schemas
SELECT
  'board_restaurants columns' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'board_restaurants'
ORDER BY ordinal_position;

SELECT
  'restaurant_saves columns' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'restaurant_saves'
ORDER BY ordinal_position;
