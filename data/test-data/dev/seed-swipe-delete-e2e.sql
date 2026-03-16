-- Seed a system notification for swipe-to-delete E2E testing
-- Target user: test-consumer1@bypass.com
-- Run: node scripts/run-sql.js --dev data/test-data/dev/seed-swipe-delete-e2e.sql

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT u.id INTO v_user_id
  FROM public.users u
  JOIN auth.users au ON u.id = au.id
  WHERE au.email = 'test-consumer1@bypass.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-consumer1@bypass.com not found';
  END IF;

  -- Clean up previous swipe-delete E2E notifications
  DELETE FROM notifications
  WHERE user_id = v_user_id
    AND title LIKE '[E2E-SWIPE]%';

  -- Insert a system notification for swipe-to-delete test
  INSERT INTO notifications (user_id, type, title, message, data, related_id, related_type, is_read, created_at)
  VALUES
    (v_user_id, 'system', '[E2E-SWIPE] Test Notification',
     'This notification will be swiped to delete.',
     '{}'::jsonb, NULL, 'system', false, NOW());

  RAISE NOTICE 'Seeded 1 swipe-delete E2E notification for user %', v_user_id;
END $$;

-- Verify
SELECT n.id, n.type, n.title, n.is_read, n.created_at
FROM notifications n
JOIN auth.users au ON n.user_id = au.id
WHERE au.email = 'test-consumer1@bypass.com'
  AND n.title LIKE '[E2E-SWIPE]%'
ORDER BY n.created_at DESC;
