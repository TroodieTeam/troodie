-- Seed campaign notification E2E test data (application_rejected + revision_requested)
-- Target user: test-consumer1@bypass.com (dev DB)
-- Run: node scripts/run-sql.js --dev data/test-data/dev/seed-campaign-notification-e2e.sql

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

  -- Clean up previous campaign E2E test notifications
  DELETE FROM notifications
  WHERE user_id = v_user_id
    AND title LIKE '[E2E-CAMP]%';

  -- Insert campaign notification types
  INSERT INTO notifications (user_id, type, title, message, data, related_id, related_type, is_read, created_at)
  VALUES
    (v_user_id, 'application_rejected', '[E2E-CAMP] Application Update',
     'Your application for Pizza Review Campaign at Pizza Palace was not selected',
     '{"campaignId": "00000000-0000-0000-0000-000000000010", "campaignTitle": "Pizza Review Campaign", "restaurantName": "Pizza Palace"}'::jsonb,
     '00000000-0000-0000-0000-000000000010', 'campaign', false, NOW() - INTERVAL '10 seconds'),

    (v_user_id, 'revision_requested', '[E2E-CAMP] Revision Requested',
     'Changes requested for your deliverable on Taco Tuesday Campaign at Taco Town',
     '{"campaignId": "00000000-0000-0000-0000-000000000011", "campaignTitle": "Taco Tuesday Campaign", "restaurantName": "Taco Town", "deliverableId": "00000000-0000-0000-0000-000000000099", "revisionNotes": "Please add more details about the tacos"}'::jsonb,
     '00000000-0000-0000-0000-000000000011', 'campaign', false, NOW() - INTERVAL '20 seconds');

  RAISE NOTICE 'Seeded 2 campaign E2E notifications for user %', v_user_id;
END $$;

-- Verify
SELECT n.id, n.type, n.title, n.is_read, n.created_at
FROM notifications n
JOIN auth.users au ON n.user_id = au.id
WHERE au.email = 'test-consumer1@bypass.com'
  AND n.title LIKE '[E2E-CAMP]%'
ORDER BY n.created_at DESC;
