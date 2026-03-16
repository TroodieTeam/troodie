-- Seed test notifications for E2E testing
-- Target user: test-consumer1@bypass.com (dev DB, has proper auth.identities)
-- Run: node scripts/run-sql.js --dev data/test-data/dev/seed-notification-e2e.sql

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

  -- Clean up previous E2E test notifications
  DELETE FROM notifications
  WHERE user_id = v_user_id
    AND title LIKE '[E2E]%';

  -- Insert test notifications using actual DB constraint type values
  INSERT INTO notifications (user_id, type, title, message, data, related_id, related_type, is_read, created_at)
  VALUES
    (v_user_id, 'follow', '[E2E] New Follower',
     'Test Creator started following you',
     '{"followerId": "00000000-0000-0000-0000-000000000099", "followerName": "Test Creator"}'::jsonb,
     '00000000-0000-0000-0000-000000000099', 'user', false, NOW() - INTERVAL '5 minutes'),

    (v_user_id, 'campaign_opportunity', '[E2E] New Campaign',
     'Pizza Palace is looking for food reviewers!',
     '{"campaignId": "00000000-0000-0000-0000-000000000010", "restaurantName": "Pizza Palace", "budget": 500}'::jsonb,
     '00000000-0000-0000-0000-000000000010', 'campaign', false, NOW() - INTERVAL '15 minutes'),

    (v_user_id, 'board_invite', '[E2E] Board Invitation',
     'Test Creator invited you to join "Best Pizza Spots"',
     '{"boardId": "00000000-0000-0000-0000-000000000002", "inviterName": "Test Creator"}'::jsonb,
     '00000000-0000-0000-0000-000000000002', 'board', false, NOW() - INTERVAL '30 minutes'),

    (v_user_id, 'system', '[E2E] Welcome to Troodie',
     'Thanks for joining! Start by discovering restaurants near you.',
     '{}'::jsonb, NULL, 'system', true, NOW() - INTERVAL '2 hours'),

    (v_user_id, 'application_approved', '[E2E] Application Approved',
     'Your creator application has been approved!',
     '{"campaignId": "00000000-0000-0000-0000-000000000010", "campaignTitle": "Pizza Review", "restaurantName": "Pizza Palace"}'::jsonb,
     '00000000-0000-0000-0000-000000000010', 'campaign', true, NOW() - INTERVAL '1 day');

  RAISE NOTICE 'Seeded 5 E2E notifications for user %', v_user_id;
END $$;

-- Verify
SELECT n.id, n.type, n.title, n.is_read, n.created_at
FROM notifications n
JOIN auth.users au ON n.user_id = au.id
WHERE au.email = 'test-consumer1@bypass.com'
  AND n.title LIKE '[E2E]%'
ORDER BY n.created_at DESC;
