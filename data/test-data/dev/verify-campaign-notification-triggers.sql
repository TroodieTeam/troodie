-- Verify campaign notification triggers: application_rejected + revision_requested
-- Run: node scripts/run-sql.js --dev data/test-data/dev/verify-campaign-notification-triggers.sql

DO $$
DECLARE
    v_creator_user_id UUID;
    v_creator_profile_id UUID;
    v_business_id UUID;
    v_campaign_id UUID;
    v_application_id UUID;
    v_deliverable_id UUID;
    v_restaurant_id UUID;
    v_rejected_notif_count INTEGER;
    v_revision_notif_count INTEGER;
BEGIN
    -- Get test creator (needs creator_profile for FK)
    SELECT au.id INTO v_creator_user_id
    FROM auth.users au WHERE au.email = 'test-creator1@bypass.com';

    SELECT cp.id INTO v_creator_profile_id
    FROM creator_profiles cp WHERE cp.user_id = v_creator_user_id;

    -- Get test business
    SELECT au.id INTO v_business_id
    FROM auth.users au WHERE au.email = 'test-business1@bypass.com';

    IF v_creator_user_id IS NULL OR v_creator_profile_id IS NULL OR v_business_id IS NULL THEN
        RAISE EXCEPTION 'Test users not found. Need test-creator1 (with creator_profile) and test-business1';
    END IF;

    -- Get any restaurant
    SELECT r.id INTO v_restaurant_id FROM restaurants r LIMIT 1;

    -- Clean up previous test data
    DELETE FROM campaign_deliverables WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE title = '[TRIGGER-TEST] Pizza Review Campaign'
    );
    DELETE FROM campaign_applications WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE title = '[TRIGGER-TEST] Pizza Review Campaign'
    );
    DELETE FROM campaigns WHERE title = '[TRIGGER-TEST] Pizza Review Campaign';
    DELETE FROM notifications WHERE user_id = v_creator_user_id AND type IN ('application_rejected', 'revision_requested');

    -- Step 1: Create test campaign
    INSERT INTO campaigns (id, title, description, owner_id, restaurant_id, status, budget_cents, max_creators)
    VALUES (gen_random_uuid(), '[TRIGGER-TEST] Pizza Review Campaign', 'Test', v_business_id, v_restaurant_id, 'active', 50000, 5)
    RETURNING id INTO v_campaign_id;

    RAISE NOTICE 'Created campaign: %', v_campaign_id;

    -- Step 2: Create application (pending) — creator_id references creator_profiles.id
    INSERT INTO campaign_applications (id, campaign_id, creator_id, status, applied_at)
    VALUES (gen_random_uuid(), v_campaign_id, v_creator_profile_id, 'pending', NOW())
    RETURNING id INTO v_application_id;

    RAISE NOTICE 'Created application: %', v_application_id;

    -- Step 3: Reject the application → should trigger notification
    UPDATE campaign_applications SET status = 'rejected' WHERE id = v_application_id;

    -- Step 4: Verify rejection notification was created
    -- The trigger uses NEW.creator_id which is the creator_profile ID
    -- But notification should go to the user_id (auth.users), so check both
    SELECT COUNT(*) INTO v_rejected_notif_count
    FROM notifications
    WHERE type = 'application_rejected' AND created_at > NOW() - INTERVAL '1 minute';

    IF v_rejected_notif_count = 0 THEN
        RAISE NOTICE 'WARN: application_rejected notification NOT created - trigger may reference creator_profile_id instead of user_id';
        -- This is expected if the trigger uses NEW.creator_id (which is creator_profile.id, not user_id)
        -- The trigger needs to join creator_profiles to get user_id
    ELSE
        RAISE NOTICE 'PASS: application_rejected notification created (count: %)', v_rejected_notif_count;
    END IF;

    -- Step 5: Create deliverable (pending_review)
    -- campaign_deliverables.creator_id also likely references creator_profiles
    INSERT INTO campaign_deliverables (id, campaign_application_id, creator_id, restaurant_id, campaign_id, status, content_type, content_url, submitted_at)
    VALUES (gen_random_uuid(), v_application_id, v_creator_profile_id, v_restaurant_id, v_campaign_id, 'pending_review', 'video', 'https://example.com/v.mp4', NOW())
    RETURNING id INTO v_deliverable_id;

    RAISE NOTICE 'Created deliverable: %', v_deliverable_id;

    -- Step 6: Request revision → should trigger notification
    UPDATE campaign_deliverables
    SET status = 'revision_requested', revision_notes = 'Please add more details about the pizza toppings'
    WHERE id = v_deliverable_id;

    -- Step 7: Verify revision notification
    SELECT COUNT(*) INTO v_revision_notif_count
    FROM notifications
    WHERE type = 'revision_requested' AND created_at > NOW() - INTERVAL '1 minute';

    IF v_revision_notif_count = 0 THEN
        RAISE NOTICE 'WARN: revision_requested notification NOT created - trigger may reference creator_profile_id instead of user_id';
    ELSE
        RAISE NOTICE 'PASS: revision_requested notification created (count: %)', v_revision_notif_count;
    END IF;

    -- Show what notifications were created for debugging
    RAISE NOTICE '--- Recent notifications ---';

    -- Cleanup
    DELETE FROM notifications WHERE type IN ('application_rejected', 'revision_requested') AND created_at > NOW() - INTERVAL '1 minute';
    DELETE FROM campaign_deliverables WHERE id = v_deliverable_id;
    DELETE FROM campaign_applications WHERE id = v_application_id;
    DELETE FROM campaigns WHERE id = v_campaign_id;

    IF v_rejected_notif_count > 0 AND v_revision_notif_count > 0 THEN
        RAISE NOTICE '-------------------------------';
        RAISE NOTICE 'ALL TRIGGER TESTS PASSED';
        RAISE NOTICE '-------------------------------';
    ELSE
        RAISE NOTICE '-------------------------------';
        RAISE NOTICE 'TRIGGERS NEED FIX: creator_id is creator_profiles.id, not auth.users.id';
        RAISE NOTICE 'Triggers must JOIN creator_profiles to get user_id for notifications';
        RAISE NOTICE '-------------------------------';
    END IF;
END $$;
