-- Create Test Save Activity
-- Run this to create a public save that will appear in the activity feed

-- First, find a user and restaurant to use
DO $$
DECLARE
  test_user_id UUID;
  test_restaurant_id UUID;
  test_board_id UUID;
BEGIN
  -- Get first user
  SELECT id INTO test_user_id FROM users LIMIT 1;

  -- Get first restaurant
  SELECT id INTO test_restaurant_id FROM restaurants LIMIT 1;

  -- Get first board from that user (or use NULL)
  SELECT id INTO test_board_id FROM boards WHERE user_id = test_user_id LIMIT 1;

  -- Create a public save
  INSERT INTO restaurant_saves (
    user_id,
    restaurant_id,
    board_id,
    personal_rating,
    notes,
    privacy,
    created_at
  ) VALUES (
    test_user_id,
    test_restaurant_id,
    test_board_id,
    5, -- Rating (1-5 or 1-3 depending on your system)
    'This is a test public save for activity feed',
    'public', -- MUST be 'public' to appear in feed
    NOW()
  );

  RAISE NOTICE 'Created public save for user % at restaurant %', test_user_id, test_restaurant_id;
END $$;

-- Verify the save was created
SELECT
  rs.id,
  u.name as user_name,
  r.name as restaurant_name,
  rs.privacy,
  rs.notes,
  rs.created_at
FROM restaurant_saves rs
JOIN users u ON rs.user_id = u.id
JOIN restaurants r ON rs.restaurant_id = r.id
WHERE rs.privacy = 'public'
ORDER BY rs.created_at DESC
LIMIT 1;

-- Check if it appears in activity feed
SELECT
  activity_type,
  actor_name,
  action,
  target_name,
  privacy,
  created_at
FROM activity_feed
WHERE activity_type = 'save'
ORDER BY created_at DESC
LIMIT 1;
