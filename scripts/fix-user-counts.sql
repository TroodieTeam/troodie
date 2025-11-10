-- ================================================================
-- Fix User Count Fields
-- ================================================================
-- This script updates the count fields in the users table to match
-- the actual data in related tables
-- ================================================================

DO $$
DECLARE
  consumer1_id UUID;
  consumer2_id UUID;
  consumer3_id UUID;
BEGIN
  -- Get user IDs
  SELECT id INTO consumer1_id FROM users WHERE email = 'consumer1@bypass.com';
  SELECT id INTO consumer2_id FROM users WHERE email = 'consumer2@bypass.com';
  SELECT id INTO consumer3_id FROM users WHERE email = 'consumer3@bypass.com';

  -- Update Consumer 1 counts
  IF consumer1_id IS NOT NULL THEN
    UPDATE users 
    SET 
      saves_count = (SELECT COUNT(*) FROM board_restaurants WHERE added_by = consumer1_id),
      following_count = (SELECT COUNT(*) FROM user_relationships WHERE follower_id = consumer1_id),
      followers_count = (SELECT COUNT(*) FROM user_relationships WHERE following_id = consumer1_id),
      updated_at = NOW()
    WHERE id = consumer1_id;
    
    RAISE NOTICE 'Updated consumer1 counts';
  END IF;

  -- Update Consumer 2 counts
  IF consumer2_id IS NOT NULL THEN
    UPDATE users 
    SET 
      saves_count = (SELECT COUNT(*) FROM board_restaurants WHERE added_by = consumer2_id),
      following_count = (SELECT COUNT(*) FROM user_relationships WHERE follower_id = consumer2_id),
      followers_count = (SELECT COUNT(*) FROM user_relationships WHERE following_id = consumer2_id),
      updated_at = NOW()
    WHERE id = consumer2_id;
    
    RAISE NOTICE 'Updated consumer2 counts';
  END IF;

  -- Update Consumer 3 counts
  IF consumer3_id IS NOT NULL THEN
    UPDATE users 
    SET 
      saves_count = (SELECT COUNT(*) FROM board_restaurants WHERE added_by = consumer3_id),
      following_count = (SELECT COUNT(*) FROM user_relationships WHERE follower_id = consumer3_id),
      followers_count = (SELECT COUNT(*) FROM user_relationships WHERE following_id = consumer3_id),
      updated_at = NOW()
    WHERE id = consumer3_id;
    
    RAISE NOTICE 'Updated consumer3 counts';
  END IF;

END $$;

-- Verify the updates
SELECT 
  email,
  saves_count,
  following_count,
  followers_count,
  (SELECT COUNT(*) FROM boards WHERE user_id = users.id) as board_count,
  (SELECT COUNT(*) FROM board_restaurants WHERE added_by = users.id) as actual_saves,
  (SELECT COUNT(*) FROM user_relationships WHERE follower_id = users.id) as actual_following,
  (SELECT COUNT(*) FROM user_relationships WHERE following_id = users.id) as actual_followers
FROM users
WHERE email IN ('consumer1@bypass.com', 'consumer2@bypass.com', 'consumer3@bypass.com')
ORDER BY email;