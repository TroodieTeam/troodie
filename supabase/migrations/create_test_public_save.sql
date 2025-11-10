-- Create a test PUBLIC save to appear in activity feed
-- This will help verify the activity feed is working correctly

DO $$
DECLARE
  test_user_id UUID;
  test_restaurant_id UUID;
  test_save_id UUID;
BEGIN
  -- Get the first user (or bypass user)
  SELECT id INTO test_user_id
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get the first restaurant
  SELECT id INTO test_restaurant_id
  FROM restaurants
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in database';
  END IF;

  IF test_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'No restaurants found in database';
  END IF;

  -- Create a PUBLIC save (this is what will appear in activity feed)
  INSERT INTO restaurant_saves (
    user_id,
    restaurant_id,
    board_id,
    personal_rating,
    notes,
    privacy,  -- MUST be 'public' to show in activity feed
    created_at
  ) VALUES (
    test_user_id,
    test_restaurant_id,
    NULL,
    3, -- Rating (1-3 scale)
    'This is a test PUBLIC save for the activity feed',
    'public', -- ← This is the key!
    NOW()
  )
  ON CONFLICT (user_id, restaurant_id)
  DO UPDATE SET
    privacy = 'public',
    notes = 'Updated to public for activity feed testing',
    updated_at = NOW()
  RETURNING id INTO test_save_id;

  RAISE NOTICE 'Created/updated public save: % for user % at restaurant %',
    test_save_id, test_user_id, test_restaurant_id;

  -- Verify it appears in activity_feed
  PERFORM 1 FROM activity_feed
  WHERE activity_type = 'save'
  AND activity_id = test_save_id;

  IF FOUND THEN
    RAISE NOTICE 'SUCCESS: Save appears in activity_feed view!';
  ELSE
    RAISE WARNING 'Save created but NOT appearing in activity_feed view. Check migration applied correctly.';
  END IF;

END $$;

-- Show the created save
SELECT
  'Created public save' as status,
  rs.id as save_id,
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

-- Verify it's in the activity feed
SELECT
  'In activity feed?' as status,
  af.activity_type,
  af.actor_name,
  af.target_name,
  af.created_at
FROM activity_feed af
WHERE af.activity_type = 'save'
ORDER BY af.created_at DESC
LIMIT 1;
