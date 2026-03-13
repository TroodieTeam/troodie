-- Seed all 18 notification types for E2E testing
-- Target user: test-consumer1@bypass.com (dev DB)
-- Run: node scripts/run-sql.js --dev data/test-data/dev/seed-all-notification-types-e2e.sql

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

  -- Clean up previous seed data
  DELETE FROM notifications
  WHERE user_id = v_user_id
    AND title LIKE '[E2E-ALL]%';

  -- Insert one notification per DB-valid type (18 types)
  -- Staggered created_at so they appear in predictable order
  INSERT INTO notifications (user_id, type, title, message, data, related_id, related_type, is_read, created_at)
  VALUES
    -- Social types
    (v_user_id, 'like', '[E2E-ALL] Post Liked',
     'Test User liked your post about Pizza Palace',
     '{"postId": "00000000-0000-0000-0000-000000000001", "likerId": "00000000-0000-0000-0000-000000000099", "likerName": "Test User", "restaurantName": "Pizza Palace"}'::jsonb,
     '00000000-0000-0000-0000-000000000001', 'post', false, NOW() - INTERVAL '1 minute'),

    (v_user_id, 'comment', '[E2E-ALL] New Comment',
     'Test User commented: "Great review!"',
     '{"postId": "00000000-0000-0000-0000-000000000001", "commentId": "00000000-0000-0000-0000-000000000050", "commenterId": "00000000-0000-0000-0000-000000000099", "commenterName": "Test User", "commentPreview": "Great review!"}'::jsonb,
     '00000000-0000-0000-0000-000000000001', 'post', false, NOW() - INTERVAL '2 minutes'),

    (v_user_id, 'follow', '[E2E-ALL] New Follower',
     'Test Creator started following you',
     '{"followerId": "00000000-0000-0000-0000-000000000099", "followerName": "Test Creator"}'::jsonb,
     '00000000-0000-0000-0000-000000000099', 'user', false, NOW() - INTERVAL '3 minutes'),

    (v_user_id, 'post_mention', '[E2E-ALL] Mentioned in Post',
     'Test User mentioned you in a post',
     '{"postId": "00000000-0000-0000-0000-000000000001", "mentionerId": "00000000-0000-0000-0000-000000000099", "mentionerName": "Test User"}'::jsonb,
     '00000000-0000-0000-0000-000000000001', 'post', false, NOW() - INTERVAL '4 minutes'),

    -- Achievement types
    (v_user_id, 'achievement', '[E2E-ALL] Achievement Unlocked',
     'You earned the "Foodie Explorer" badge!',
     '{"achievementId": "00000000-0000-0000-0000-000000000060", "achievementName": "Foodie Explorer", "achievementDescription": "Visit 10 restaurants", "points": 100}'::jsonb,
     '00000000-0000-0000-0000-000000000060', 'achievement', false, NOW() - INTERVAL '5 minutes'),

    (v_user_id, 'milestone', '[E2E-ALL] Milestone Reached',
     'You reached 50 restaurant saves!',
     '{"milestoneType": "saves", "milestoneValue": 50, "milestoneTitle": "Save Master", "milestoneDescription": "Saved 50 restaurants"}'::jsonb,
     NULL, 'milestone', false, NOW() - INTERVAL '6 minutes'),

    -- Restaurant types
    (v_user_id, 'restaurant_recommendation', '[E2E-ALL] Restaurant Recommendation',
     'You might enjoy Sushi Bar based on your preferences',
     '{"restaurantId": "00000000-0000-0000-0000-000000000070", "restaurantName": "Sushi Bar", "distance": 1.5, "cuisine": "Japanese", "rating": 4.5}'::jsonb,
     '00000000-0000-0000-0000-000000000070', 'restaurant', false, NOW() - INTERVAL '7 minutes'),

    -- Board types
    (v_user_id, 'board_invite', '[E2E-ALL] Board Invitation',
     'Test Creator invited you to "Best Pizza Spots"',
     '{"boardId": "00000000-0000-0000-0000-000000000002", "boardName": "Best Pizza Spots", "inviterId": "00000000-0000-0000-0000-000000000099", "inviterName": "Test Creator"}'::jsonb,
     '00000000-0000-0000-0000-000000000002', 'board', false, NOW() - INTERVAL '8 minutes'),

    -- System types
    (v_user_id, 'system', '[E2E-ALL] System Notification',
     'Troodie has been updated with new features!',
     '{"action": "app_update", "metadata": {"version": "1.0.18"}}'::jsonb,
     NULL, 'system', true, NOW() - INTERVAL '9 minutes'),

    -- Campaign types
    (v_user_id, 'campaign_opportunity', '[E2E-ALL] New Campaign Opportunity',
     'Pizza Palace is looking for food reviewers!',
     '{"campaignId": "00000000-0000-0000-0000-000000000010", "restaurantId": "00000000-0000-0000-0000-000000000070", "restaurantName": "Pizza Palace", "budget": 500, "title": "Pizza Review"}'::jsonb,
     '00000000-0000-0000-0000-000000000010', 'campaign', false, NOW() - INTERVAL '10 minutes'),

    (v_user_id, 'campaign_application', '[E2E-ALL] Campaign Application',
     'New Creator applied to your Pizza Review campaign',
     '{"campaignId": "00000000-0000-0000-0000-000000000010", "campaignTitle": "Pizza Review", "creatorId": "00000000-0000-0000-0000-000000000099", "creatorName": "New Creator"}'::jsonb,
     '00000000-0000-0000-0000-000000000010', 'campaign', false, NOW() - INTERVAL '11 minutes'),

    (v_user_id, 'application_approved', '[E2E-ALL] Application Approved',
     'Your application for Pizza Review was approved!',
     '{"campaignId": "00000000-0000-0000-0000-000000000010", "campaignTitle": "Pizza Review", "restaurantName": "Pizza Palace"}'::jsonb,
     '00000000-0000-0000-0000-000000000010', 'campaign', false, NOW() - INTERVAL '12 minutes'),

    (v_user_id, 'campaign_deadline', '[E2E-ALL] Campaign Deadline',
     'Pizza Review campaign ends in 3 days',
     '{"campaignId": "00000000-0000-0000-0000-000000000010", "campaignTitle": "Pizza Review", "endDate": "2026-03-16", "daysRemaining": 3}'::jsonb,
     '00000000-0000-0000-0000-000000000010', 'campaign', false, NOW() - INTERVAL '13 minutes'),

    (v_user_id, 'deliverable_submitted', '[E2E-ALL] Deliverable Submitted',
     'New Creator submitted deliverables for Pizza Review',
     '{"campaignId": "00000000-0000-0000-0000-000000000010", "campaignTitle": "Pizza Review", "creatorId": "00000000-0000-0000-0000-000000000099", "creatorName": "New Creator"}'::jsonb,
     '00000000-0000-0000-0000-000000000010', 'campaign', false, NOW() - INTERVAL '14 minutes'),

    (v_user_id, 'payment_sent', '[E2E-ALL] Payment Sent',
     'You received $250.00 for Pizza Review',
     '{"campaignId": "00000000-0000-0000-0000-000000000010", "campaignTitle": "Pizza Review", "amount": 250, "currency": "USD"}'::jsonb,
     '00000000-0000-0000-0000-000000000010', 'campaign', false, NOW() - INTERVAL '15 minutes'),

    (v_user_id, 'campaign_invite', '[E2E-ALL] Campaign Invite',
     'Pizza Palace invited you to their Burger Review campaign',
     '{"campaignId": "00000000-0000-0000-0000-000000000011", "campaignTitle": "Burger Review", "restaurantName": "Pizza Palace", "restaurantId": "00000000-0000-0000-0000-000000000070"}'::jsonb,
     '00000000-0000-0000-0000-000000000011', 'campaign', false, NOW() - INTERVAL '16 minutes'),

    -- Engagement types
    (v_user_id, 'friend_post', '[E2E-ALL] Friend Posted',
     'Test Creator shared a new restaurant review',
     '{"postId": "00000000-0000-0000-0000-000000000001", "postType": "restaurant", "authorId": "00000000-0000-0000-0000-000000000099", "authorName": "Test Creator", "restaurantName": "Taco Town"}'::jsonb,
     '00000000-0000-0000-0000-000000000001', 'post', false, NOW() - INTERVAL '17 minutes'),

    (v_user_id, 'weekly_recap', '[E2E-ALL] Weekly Recap',
     'Your week in review: 5 saves, 3 new followers',
     '{"week": "2026-W11"}'::jsonb,
     NULL, 'system', true, NOW() - INTERVAL '18 minutes');

  RAISE NOTICE 'Seeded 18 E2E-ALL notifications for user %', v_user_id;
END $$;

-- Verify
SELECT n.id, n.type, n.title, n.is_read, n.created_at
FROM notifications n
JOIN auth.users au ON n.user_id = au.id
WHERE au.email = 'test-consumer1@bypass.com'
  AND n.title LIKE '[E2E-ALL]%'
ORDER BY n.created_at DESC;
