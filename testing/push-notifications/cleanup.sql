-- Push Notifications Test Data Cleanup
-- TRO-18: Removes all test data created by verify-triggers.sql
-- Usage: node scripts/run-sql.js --dev cleanup.sql

DO $$
DECLARE
    v_creator_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
    v_creator2_id UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
    v_business_id UUID := 'aaaaaaaa-0000-0000-0000-000000000003';
    v_consumer_id UUID := 'aaaaaaaa-0000-0000-0000-000000000004';
    v_restaurant_id UUID := 'bbbbbbbb-0000-0000-0000-000000000001';
    v_campaign_id UUID := 'cccccccc-0000-0000-0000-000000000001';
    v_campaign2_id UUID := 'cccccccc-0000-0000-0000-000000000002';
    v_post_id UUID := 'dddddddd-0000-0000-0000-000000000001';
    v_creator_profile_id UUID := 'eeeeeeee-0000-0000-0000-000000000001';
    v_deleted INT;
BEGIN
    RAISE NOTICE '=== Cleaning up push notification test data ===';

    -- Delete notifications for test users
    DELETE FROM notifications
    WHERE user_id IN (v_creator_id, v_creator2_id, v_business_id, v_consumer_id);
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % notifications', v_deleted;

    -- Delete test campaign invitations
    DELETE FROM campaign_invitations WHERE campaign_id IN (v_campaign_id, v_campaign2_id);
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % campaign_invitations', v_deleted;

    -- Delete test creator earnings
    DELETE FROM creator_earnings WHERE campaign_id = v_campaign_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % creator_earnings', v_deleted;

    -- Delete test creator campaigns
    DELETE FROM creator_campaigns WHERE campaign_id = v_campaign_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % creator_campaigns', v_deleted;

    -- Delete test campaign applications
    DELETE FROM campaign_applications WHERE campaign_id = v_campaign_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % campaign_applications', v_deleted;

    -- Delete test posts
    DELETE FROM posts WHERE id = v_post_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % posts', v_deleted;

    -- Delete test campaigns
    DELETE FROM campaigns WHERE id IN (v_campaign_id, v_campaign2_id);
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % campaigns', v_deleted;

    -- Delete test follow relationships
    DELETE FROM user_relationships
    WHERE follower_id = v_consumer_id AND following_id = v_creator_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_relationships', v_deleted;

    -- Delete test creator profiles
    DELETE FROM creator_profiles WHERE id = v_creator_profile_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % creator_profiles', v_deleted;

    -- Delete test notification preferences
    DELETE FROM notification_preferences
    WHERE user_id IN (v_creator_id, v_creator2_id, v_business_id, v_consumer_id);
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % notification_preferences', v_deleted;

    -- Delete test restaurant
    DELETE FROM restaurants WHERE id = v_restaurant_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % restaurants', v_deleted;

    -- Delete test users
    DELETE FROM users WHERE id IN (v_creator_id, v_creator2_id, v_business_id, v_consumer_id);
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % users', v_deleted;

    RAISE NOTICE '';
    RAISE NOTICE '=== Cleanup complete ===';
END $$;
