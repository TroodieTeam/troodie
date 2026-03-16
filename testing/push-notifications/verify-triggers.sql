-- Push Notifications Trigger Verification Script
-- TRO-18: Manual test to verify all notification triggers fire correctly
-- Usage: node scripts/run-sql.js --dev verify-triggers.sql
--
-- Prerequisites:
--   1. Run the consolidated migration and all trigger migrations first
--   2. Ensure create_notification() function exists
--
-- This script:
--   1. Creates temporary test data (users, restaurants, campaigns, etc.)
--   2. Exercises each trigger via INSERT/UPDATE
--   3. Queries notifications table to verify results
--   4. Does NOT clean up — run cleanup.sql after reviewing results

-- ============================================================
-- 1. SET UP TEST DATA
-- ============================================================

-- Test UUIDs (deterministic for easy cleanup)
DO $$
DECLARE
    -- Users
    v_creator_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
    v_creator2_id UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
    v_business_id UUID := 'aaaaaaaa-0000-0000-0000-000000000003';
    v_consumer_id UUID := 'aaaaaaaa-0000-0000-0000-000000000004';

    -- Entities
    v_restaurant_id UUID := 'bbbbbbbb-0000-0000-0000-000000000001';
    v_campaign_id UUID := 'cccccccc-0000-0000-0000-000000000001';
    v_campaign2_id UUID := 'cccccccc-0000-0000-0000-000000000002';
    v_post_id UUID := 'dddddddd-0000-0000-0000-000000000001';
    v_creator_profile_id UUID := 'eeeeeeee-0000-0000-0000-000000000001';

    v_notif_count INT;
BEGIN
    RAISE NOTICE '=== Setting up test data ===';

    -- Create test users (if not exists)
    INSERT INTO users (id, full_name, username, account_type, location)
    VALUES
        (v_creator_id, 'Test Creator', 'testcreator', 'creator', 'New York, NY'),
        (v_creator2_id, 'Test Creator 2', 'testcreator2', 'creator', 'Los Angeles, CA'),
        (v_business_id, 'Test Business', 'testbusiness', 'business', 'New York, NY'),
        (v_consumer_id, 'Test Consumer', 'testconsumer', 'consumer', 'New York, NY')
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        account_type = EXCLUDED.account_type,
        location = EXCLUDED.location;

    -- Ensure default notification preferences exist (all enabled)
    INSERT INTO notification_preferences (user_id, category, push_enabled, in_app_enabled, campaigns_push_enabled, campaigns_in_app_enabled, engagement_push_enabled, engagement_in_app_enabled)
    VALUES
        (v_creator_id, 'general', true, true, true, true, true, true),
        (v_creator2_id, 'general', true, true, true, true, true, true),
        (v_business_id, 'general', true, true, true, true, true, true),
        (v_consumer_id, 'general', true, true, true, true, true, true)
    ON CONFLICT (user_id, category) DO UPDATE SET
        campaigns_in_app_enabled = true,
        engagement_in_app_enabled = true;

    -- Create test restaurant
    INSERT INTO restaurants (id, name, city)
    VALUES (v_restaurant_id, 'Test Restaurant NYC', 'New York')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city;

    -- Create follow relationship: consumer follows creator
    INSERT INTO user_relationships (follower_id, following_id)
    VALUES (v_consumer_id, v_creator_id)
    ON CONFLICT DO NOTHING;

    -- Create creator_profiles entry for campaign_invite trigger
    INSERT INTO creator_profiles (id, user_id)
    VALUES (v_creator_profile_id, v_creator_id)
    ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id;

    -- ============================================================
    -- 2. TEST TRIGGERS
    -- ============================================================

    RAISE NOTICE '';
    RAISE NOTICE '=== Testing Triggers ===';

    -- ---- Trigger 1: Campaign Opportunity ----
    RAISE NOTICE 'Testing: campaign_opportunity trigger...';

    -- Create campaign in draft status first
    INSERT INTO campaigns (id, restaurant_id, business_id, title, status, budget_total, location)
    VALUES (v_campaign_id, v_restaurant_id, v_business_id, 'Test Campaign NYC', 'draft', 500, 'New York')
    ON CONFLICT (id) DO UPDATE SET status = 'draft';

    -- Activate campaign → should fire trigger for creators in NYC
    UPDATE campaigns SET status = 'active' WHERE id = v_campaign_id;

    SELECT COUNT(*) INTO v_notif_count
    FROM notifications
    WHERE type = 'campaign_opportunity' AND (data->>'campaignId')::text = v_campaign_id::text;
    RAISE NOTICE '  campaign_opportunity notifications created: %', v_notif_count;

    -- ---- Trigger 2: Campaign Application ----
    RAISE NOTICE 'Testing: campaign_application trigger...';

    INSERT INTO campaign_applications (campaign_id, creator_id, status)
    VALUES (v_campaign_id, v_creator_id, 'pending');

    SELECT COUNT(*) INTO v_notif_count
    FROM notifications
    WHERE type = 'campaign_application' AND user_id = v_business_id;
    RAISE NOTICE '  campaign_application notifications created: %', v_notif_count;

    -- ---- Trigger 3: Application Approved ----
    RAISE NOTICE 'Testing: application_approved trigger...';

    UPDATE campaign_applications
    SET status = 'accepted'
    WHERE campaign_id = v_campaign_id AND creator_id = v_creator_id;

    SELECT COUNT(*) INTO v_notif_count
    FROM notifications
    WHERE type = 'application_approved' AND user_id = v_creator_id;
    RAISE NOTICE '  application_approved notifications created: %', v_notif_count;

    -- ---- Trigger 4: Deliverable Submitted ----
    RAISE NOTICE 'Testing: deliverable_submitted trigger...';

    INSERT INTO creator_campaigns (campaign_id, creator_id, status, deliverables_status)
    VALUES (v_campaign_id, v_creator_id, 'active', '{"draft": true}'::jsonb)
    ON CONFLICT DO NOTHING;

    UPDATE creator_campaigns
    SET deliverables_status = '{"submitted": true}'::jsonb
    WHERE campaign_id = v_campaign_id AND creator_id = v_creator_id;

    SELECT COUNT(*) INTO v_notif_count
    FROM notifications
    WHERE type = 'deliverable_submitted' AND user_id = v_business_id;
    RAISE NOTICE '  deliverable_submitted notifications created: %', v_notif_count;

    -- ---- Trigger 5: Payment Sent ----
    RAISE NOTICE 'Testing: payment_sent trigger...';

    INSERT INTO creator_earnings (creator_id, campaign_id, amount, status)
    VALUES (v_creator_id, v_campaign_id, 150.00, 'available');

    SELECT COUNT(*) INTO v_notif_count
    FROM notifications
    WHERE type = 'payment_sent' AND user_id = v_creator_id;
    RAISE NOTICE '  payment_sent notifications created: %', v_notif_count;

    -- ---- Trigger 6: Campaign Invitation ----
    RAISE NOTICE 'Testing: campaign_invite trigger...';

    -- Create second campaign for invite test
    INSERT INTO campaigns (id, restaurant_id, business_id, title, status)
    VALUES (v_campaign2_id, v_restaurant_id, v_business_id, 'Invite Campaign', 'active')
    ON CONFLICT (id) DO UPDATE SET title = 'Invite Campaign';

    INSERT INTO campaign_invitations (campaign_id, creator_id, status)
    VALUES (v_campaign2_id, v_creator_profile_id, 'pending');

    SELECT COUNT(*) INTO v_notif_count
    FROM notifications
    WHERE type = 'campaign_invite' AND user_id = v_creator_id;
    RAISE NOTICE '  campaign_invite notifications created: %', v_notif_count;

    -- ---- Trigger 7: Friend Post ----
    RAISE NOTICE 'Testing: friend_post trigger...';

    INSERT INTO posts (id, user_id, restaurant_id, post_type)
    VALUES (v_post_id, v_creator_id, v_restaurant_id, 'restaurant');

    SELECT COUNT(*) INTO v_notif_count
    FROM notifications
    WHERE type = 'friend_post' AND user_id = v_consumer_id;
    RAISE NOTICE '  friend_post notifications created: %', v_notif_count;

    -- ============================================================
    -- 3. SUMMARY
    -- ============================================================

    RAISE NOTICE '';
    RAISE NOTICE '=== Verification Summary ===';

    SELECT COUNT(*) INTO v_notif_count
    FROM notifications
    WHERE user_id IN (v_creator_id, v_creator2_id, v_business_id, v_consumer_id)
      AND created_at > NOW() - INTERVAL '5 minutes';
    RAISE NOTICE 'Total test notifications created: %', v_notif_count;

    RAISE NOTICE '';
    RAISE NOTICE 'Run the following query to inspect results:';
    RAISE NOTICE '  SELECT type, user_id, title, message, data, created_at';
    RAISE NOTICE '  FROM notifications';
    RAISE NOTICE '  WHERE user_id IN (''aaaaaaaa-...-0001'', ''...-0002'', ''...-0003'', ''...-0004'')';
    RAISE NOTICE '  ORDER BY created_at DESC;';
    RAISE NOTICE '';
    RAISE NOTICE 'Run cleanup.sql to remove test data when done.';
END $$;

-- Query results for inspection
SELECT type, user_id, title, message, priority, created_at
FROM notifications
WHERE user_id IN (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000004'
)
ORDER BY created_at DESC;
