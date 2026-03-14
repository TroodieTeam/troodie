-- Cleanup campaign notification E2E test data
-- Run: node scripts/run-sql.js --dev data/test-data/dev/cleanup-campaign-notification-e2e.sql

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT u.id INTO v_user_id
  FROM public.users u
  JOIN auth.users au ON u.id = au.id
  WHERE au.email = 'test-consumer1@bypass.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found, nothing to clean';
    RETURN;
  END IF;

  DELETE FROM notifications
  WHERE user_id = v_user_id
    AND title LIKE '[E2E-CAMP]%';

  RAISE NOTICE 'Cleaned campaign E2E notifications for user %', v_user_id;
END $$;
