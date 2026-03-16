-- ============================================================================
-- Comprehensive Notification Trigger Fix
-- ============================================================================
-- Fixes 3 critical issues across ALL notification triggers:
--   1. CHECK constraint: consolidate to the 21 correct type names
--   2. creator_id resolution: JOIN through creator_profiles where needed
--   3. Preference checking: standardize to category-row pattern
--
-- Safe to run idempotent on both dev and production.
-- Date: 2026-03-13
-- ============================================================================

-- ============================================================================
-- STEP 1a: Drop constraint so we can migrate old type names
-- ============================================================================
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- ============================================================================
-- STEP 1b: Migrate existing notifications with old type names BEFORE constraint
-- ============================================================================
UPDATE notifications SET type = 'campaign_application_submitted' WHERE type = 'campaign_application';
UPDATE notifications SET type = 'deliverables_submitted' WHERE type = 'deliverable_submitted';
UPDATE notifications SET type = 'campaign_deadline_approaching' WHERE type = 'campaign_deadline';
UPDATE notifications SET type = 'friend_post_restaurant' WHERE type = 'friend_post';
UPDATE notifications SET type = 'payment_received' WHERE type = 'payment_sent';
UPDATE notifications SET type = 'post_liked' WHERE type = 'like';
UPDATE notifications SET type = 'post_commented' WHERE type = 'comment';
UPDATE notifications SET type = 'restaurant_mention' WHERE type = 'restaurant_recommendation';
UPDATE notifications SET type = 'mentioned_in_post' WHERE type = 'post_mention';
-- Note: 'follow' remains valid, 'achievement' and 'milestone' have no equivalent — delete or keep as 'system'
UPDATE notifications SET type = 'system' WHERE type IN ('achievement', 'milestone');

-- ============================================================================
-- STEP 1c: Apply the CHECK constraint with the 21 correct type names
-- ============================================================================
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
    type::text = ANY (ARRAY[
        'system',
        'payment_received',
        'new_follower',
        'post_liked',
        'post_commented',
        'mentioned_in_post',
        'mentioned_in_comment',
        'campaign_opportunity',
        'campaign_application_submitted',
        'application_approved',
        'application_rejected',
        'campaign_deadline_approaching',
        'deliverables_submitted',
        'board_invite',
        'follow',
        'new_campaign_posted',
        'restaurant_mention',
        'campaign_invite',
        'weekly_recap',
        'friend_post_restaurant',
        'revision_requested'
    ]::text[])
);

-- ============================================================================
-- STEP 2: Clean up orphaned flat columns on notification_preferences
-- The correct pattern uses category rows (user_id, category, push_enabled, in_app_enabled)
-- These flat columns were added by earlier migrations but are not used by the app
-- ============================================================================
ALTER TABLE notification_preferences
    DROP COLUMN IF EXISTS campaigns_push_enabled,
    DROP COLUMN IF EXISTS campaigns_in_app_enabled,
    DROP COLUMN IF EXISTS engagement_push_enabled,
    DROP COLUMN IF EXISTS engagement_in_app_enabled,
    DROP COLUMN IF EXISTS application_rejected_push_enabled,
    DROP COLUMN IF EXISTS application_rejected_in_app_enabled,
    DROP COLUMN IF EXISTS application_rejected_email_enabled,
    DROP COLUMN IF EXISTS application_rejected_frequency,
    DROP COLUMN IF EXISTS revision_requested_push_enabled,
    DROP COLUMN IF EXISTS revision_requested_in_app_enabled,
    DROP COLUMN IF EXISTS revision_requested_email_enabled,
    DROP COLUMN IF EXISTS revision_requested_frequency;

-- ============================================================================
-- STEP 3: Fix application_approved trigger
-- Issues: creator_id not resolved, wrong preference check
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_application_approved_notification ON campaign_applications;
DROP FUNCTION IF EXISTS notify_application_approved() CASCADE;

CREATE OR REPLACE FUNCTION notify_application_approved()
RETURNS TRIGGER AS $$
DECLARE
    campaign_record RECORD;
    restaurant_name TEXT;
    notification_id UUID;
    v_user_id UUID;
BEGIN
    IF OLD.status = NEW.status OR NEW.status != 'accepted' THEN
        RETURN NEW;
    END IF;

    -- Resolve creator_profiles.id → auth.users.id
    SELECT cp.user_id INTO v_user_id
    FROM creator_profiles cp
    WHERE cp.id = NEW.creator_id;

    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT c.id, c.title, c.restaurant_id
    INTO campaign_record
    FROM campaigns c
    WHERE c.id = NEW.campaign_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(r.name, 'Restaurant')
    INTO restaurant_name
    FROM restaurants r
    WHERE r.id = campaign_record.restaurant_id;

    -- Category-based preference check
    IF EXISTS (
        SELECT 1 FROM notification_preferences np
        WHERE np.user_id = v_user_id
          AND np.category = 'campaigns'
          AND np.in_app_enabled = false
    ) THEN
        RETURN NEW;
    END IF;

    notification_id := create_notification(
        p_user_id := v_user_id,
        p_type := 'application_approved',
        p_title := 'Application Approved!',
        p_message := 'Your application for ' || COALESCE(campaign_record.title, 'a campaign') || ' at ' || COALESCE(restaurant_name, 'Restaurant') || ' was accepted',
        p_data := jsonb_build_object(
            'campaignId', campaign_record.id,
            'campaignTitle', COALESCE(campaign_record.title, 'Campaign'),
            'restaurantName', COALESCE(restaurant_name, 'Restaurant')
        ),
        p_related_id := NEW.campaign_id::text,
        p_related_type := 'campaign'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_application_approved_notification
AFTER UPDATE ON campaign_applications
FOR EACH ROW
EXECUTE FUNCTION notify_application_approved();

-- ============================================================================
-- STEP 4: Fix campaign_application trigger
-- Issues: wrong type name, wrong creator name lookup, wrong preference check
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_campaign_application_notification ON campaign_applications;
DROP FUNCTION IF EXISTS notify_campaign_application() CASCADE;

CREATE OR REPLACE FUNCTION notify_campaign_application()
RETURNS TRIGGER AS $$
DECLARE
    campaign_record RECORD;
    creator_name TEXT;
    creator_avatar TEXT;
    v_user_id UUID;
    notification_id UUID;
BEGIN
    SELECT c.id, c.title, c.business_id, c.restaurant_id
    INTO campaign_record
    FROM campaigns c
    WHERE c.id = NEW.campaign_id;

    IF campaign_record.business_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Resolve creator_profiles.id → auth.users.id for name lookup
    SELECT cp.user_id INTO v_user_id
    FROM creator_profiles cp
    WHERE cp.id = NEW.creator_id;

    IF v_user_id IS NOT NULL THEN
        SELECT COALESCE(u.full_name, u.username, 'A creator'), u.avatar_url
        INTO creator_name, creator_avatar
        FROM users u
        WHERE u.id = v_user_id;
    END IF;

    creator_name := COALESCE(creator_name, 'A creator');

    -- Category-based preference check for business owner
    IF EXISTS (
        SELECT 1 FROM notification_preferences np
        WHERE np.user_id = campaign_record.business_id
          AND np.category = 'campaigns'
          AND np.in_app_enabled = false
    ) THEN
        RETURN NEW;
    END IF;

    notification_id := create_notification(
        p_user_id := campaign_record.business_id,
        p_type := 'campaign_application_submitted',
        p_title := 'New Campaign Application',
        p_message := creator_name || ' applied to your campaign: ' || COALESCE(campaign_record.title, 'Campaign'),
        p_data := jsonb_build_object(
            'campaignId', campaign_record.id,
            'campaignTitle', COALESCE(campaign_record.title, 'Campaign'),
            'creatorId', COALESCE(v_user_id, NEW.creator_id),
            'creatorName', creator_name,
            'creatorAvatar', COALESCE(creator_avatar, '')
        ),
        p_related_id := NEW.campaign_id::text,
        p_related_type := 'campaign'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_campaign_application_notification
AFTER INSERT ON campaign_applications
FOR EACH ROW
EXECUTE FUNCTION notify_campaign_application();

-- ============================================================================
-- STEP 5: Fix application_rejected trigger
-- Issues: wrong preference check (per-type column)
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_application_rejected_notification ON campaign_applications;
DROP FUNCTION IF EXISTS notify_application_rejected() CASCADE;

CREATE OR REPLACE FUNCTION notify_application_rejected()
RETURNS TRIGGER AS $$
DECLARE
    campaign_record RECORD;
    restaurant_name TEXT;
    notification_id UUID;
    v_user_id UUID;
BEGIN
    IF OLD.status = NEW.status OR NEW.status != 'rejected' THEN
        RETURN NEW;
    END IF;

    SELECT cp.user_id INTO v_user_id
    FROM creator_profiles cp
    WHERE cp.id = NEW.creator_id;

    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT c.id, c.title, c.restaurant_id
    INTO campaign_record
    FROM campaigns c
    WHERE c.id = NEW.campaign_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(r.name, 'Restaurant')
    INTO restaurant_name
    FROM restaurants r
    WHERE r.id = campaign_record.restaurant_id;

    -- Category-based preference check
    IF EXISTS (
        SELECT 1 FROM notification_preferences np
        WHERE np.user_id = v_user_id
          AND np.category = 'campaigns'
          AND np.in_app_enabled = false
    ) THEN
        RETURN NEW;
    END IF;

    notification_id := create_notification(
        p_user_id := v_user_id,
        p_type := 'application_rejected',
        p_title := 'Application Update',
        p_message := 'Your application for ' || COALESCE(campaign_record.title, 'a campaign') || ' at ' || COALESCE(restaurant_name, 'Restaurant') || ' was not selected',
        p_data := jsonb_build_object(
            'campaignId', campaign_record.id,
            'campaignTitle', COALESCE(campaign_record.title, 'Campaign'),
            'restaurantName', COALESCE(restaurant_name, 'Restaurant')
        ),
        p_related_id := NEW.campaign_id::text,
        p_related_type := 'campaign'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_application_rejected_notification
AFTER UPDATE ON campaign_applications
FOR EACH ROW
EXECUTE FUNCTION notify_application_rejected();

-- ============================================================================
-- STEP 6: Fix revision_requested trigger
-- Issues: wrong preference check (per-type column)
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_revision_requested_notification ON campaign_deliverables;
DROP FUNCTION IF EXISTS notify_revision_requested() CASCADE;

CREATE OR REPLACE FUNCTION notify_revision_requested()
RETURNS TRIGGER AS $$
DECLARE
    campaign_record RECORD;
    restaurant_name TEXT;
    notification_id UUID;
    v_user_id UUID;
BEGIN
    IF OLD.status = NEW.status OR NEW.status != 'revision_requested' THEN
        RETURN NEW;
    END IF;

    SELECT cp.user_id INTO v_user_id
    FROM creator_profiles cp
    WHERE cp.id = NEW.creator_id;

    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT c.id, c.title, c.restaurant_id
    INTO campaign_record
    FROM campaigns c
    WHERE c.id = NEW.campaign_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(r.name, 'Restaurant')
    INTO restaurant_name
    FROM restaurants r
    WHERE r.id = campaign_record.restaurant_id;

    -- Category-based preference check
    IF EXISTS (
        SELECT 1 FROM notification_preferences np
        WHERE np.user_id = v_user_id
          AND np.category = 'campaigns'
          AND np.in_app_enabled = false
    ) THEN
        RETURN NEW;
    END IF;

    notification_id := create_notification(
        p_user_id := v_user_id,
        p_type := 'revision_requested',
        p_title := 'Revision Requested',
        p_message := 'Changes requested for your deliverable on ' || COALESCE(campaign_record.title, 'a campaign') || ' at ' || COALESCE(restaurant_name, 'Restaurant'),
        p_data := jsonb_build_object(
            'campaignId', campaign_record.id,
            'campaignTitle', COALESCE(campaign_record.title, 'Campaign'),
            'restaurantName', COALESCE(restaurant_name, 'Restaurant'),
            'deliverableId', NEW.id,
            'revisionNotes', COALESCE(NEW.revision_notes, '')
        ),
        p_related_id := NEW.campaign_id::text,
        p_related_type := 'campaign'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_revision_requested_notification
AFTER UPDATE ON campaign_deliverables
FOR EACH ROW
EXECUTE FUNCTION notify_revision_requested();

-- ============================================================================
-- STEP 7: Fix deliverable_submitted trigger
-- Only create if creator_campaigns table exists
-- Issues: wrong type name, wrong creator name lookup, wrong preference check
-- ============================================================================
DROP FUNCTION IF EXISTS notify_deliverable_submitted() CASCADE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'creator_campaigns') THEN
        EXECUTE $func$
            CREATE OR REPLACE FUNCTION notify_deliverable_submitted()
            RETURNS TRIGGER AS $t$
            DECLARE
                campaign_record RECORD;
                creator_name TEXT;
                v_user_id UUID;
                notification_id UUID;
            BEGIN
                IF OLD.deliverables_status IS NOT DISTINCT FROM NEW.deliverables_status THEN
                    RETURN NEW;
                END IF;

                SELECT c.id, c.title, c.business_id, c.restaurant_id
                INTO campaign_record
                FROM campaigns c
                WHERE c.id = NEW.campaign_id;

                IF NOT FOUND OR campaign_record.business_id IS NULL THEN
                    RETURN NEW;
                END IF;

                SELECT cp.user_id INTO v_user_id
                FROM creator_profiles cp
                WHERE cp.id = NEW.creator_id;

                IF v_user_id IS NOT NULL THEN
                    SELECT COALESCE(u.full_name, u.username, 'A creator')
                    INTO creator_name
                    FROM users u
                    WHERE u.id = v_user_id;
                END IF;

                creator_name := COALESCE(creator_name, 'A creator');

                IF EXISTS (
                    SELECT 1 FROM notification_preferences np
                    WHERE np.user_id = campaign_record.business_id
                      AND np.category = 'campaigns'
                      AND np.in_app_enabled = false
                ) THEN
                    RETURN NEW;
                END IF;

                notification_id := create_notification(
                    p_user_id := campaign_record.business_id,
                    p_type := 'deliverables_submitted',
                    p_title := 'Content Submitted',
                    p_message := creator_name || ' submitted content for: ' || COALESCE(campaign_record.title, 'Campaign'),
                    p_data := jsonb_build_object(
                        'campaignId', campaign_record.id,
                        'campaignTitle', COALESCE(campaign_record.title, 'Campaign'),
                        'creatorId', COALESCE(v_user_id, NEW.creator_id),
                        'creatorName', creator_name
                    ),
                    p_related_id := NEW.campaign_id::text,
                    p_related_type := 'campaign'
                );

                RETURN NEW;
            END;
            $t$ LANGUAGE plpgsql SECURITY DEFINER;
        $func$;

        EXECUTE 'DROP TRIGGER IF EXISTS trigger_deliverable_submitted_notification ON creator_campaigns';
        EXECUTE 'CREATE TRIGGER trigger_deliverable_submitted_notification AFTER UPDATE ON creator_campaigns FOR EACH ROW EXECUTE FUNCTION notify_deliverable_submitted()';
    ELSE
        RAISE NOTICE 'Skipping deliverable_submitted trigger: creator_campaigns table does not exist';
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Fix payment_sent trigger
-- Only create if creator_earnings table exists
-- Issues: wrong type name, creator_id not resolved, wrong preference check
-- ============================================================================
DROP FUNCTION IF EXISTS notify_payment_sent() CASCADE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'creator_earnings') THEN
        EXECUTE $func$
            CREATE OR REPLACE FUNCTION notify_payment_sent()
            RETURNS TRIGGER AS $t$
            DECLARE
                campaign_title TEXT;
                v_user_id UUID;
                notification_id UUID;
            BEGIN
                IF TG_OP = 'UPDATE' THEN
                    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
                        RETURN NEW;
                    END IF;
                END IF;

                IF NEW.status NOT IN ('available', 'paid') THEN
                    RETURN NEW;
                END IF;

                SELECT cp.user_id INTO v_user_id
                FROM creator_profiles cp
                WHERE cp.id = NEW.creator_id;

                IF v_user_id IS NULL THEN
                    RETURN NEW;
                END IF;

                IF NEW.campaign_id IS NOT NULL THEN
                    SELECT c.title INTO campaign_title
                    FROM campaigns c
                    WHERE c.id = NEW.campaign_id;
                END IF;

                campaign_title := COALESCE(campaign_title, 'Campaign');

                IF EXISTS (
                    SELECT 1 FROM notification_preferences np
                    WHERE np.user_id = v_user_id
                      AND np.category = 'campaigns'
                      AND np.in_app_enabled = false
                ) THEN
                    RETURN NEW;
                END IF;

                notification_id := create_notification(
                    p_user_id := v_user_id,
                    p_type := 'payment_received',
                    p_title := CASE NEW.status
                        WHEN 'paid' THEN 'Payment Sent'
                        ELSE 'Payment Available'
                    END,
                    p_message := '$' || ROUND(NEW.amount::numeric, 2)::text || ' for ' || campaign_title || CASE NEW.status
                        WHEN 'paid' THEN ' has been sent'
                        ELSE ' is now available'
                    END,
                    p_data := jsonb_build_object(
                        'campaignId', NEW.campaign_id,
                        'campaignTitle', campaign_title,
                        'amount', NEW.amount,
                        'currency', 'usd'
                    ),
                    p_related_id := COALESCE(NEW.campaign_id, NEW.id)::text,
                    p_related_type := 'campaign'
                );

                IF notification_id IS NOT NULL THEN
                    UPDATE notifications SET priority = 3 WHERE id = notification_id;
                END IF;

                RETURN NEW;
            END;
            $t$ LANGUAGE plpgsql SECURITY DEFINER;
        $func$;

        EXECUTE 'DROP TRIGGER IF EXISTS trigger_payment_sent_notification ON creator_earnings';
        EXECUTE 'CREATE TRIGGER trigger_payment_sent_notification AFTER INSERT OR UPDATE ON creator_earnings FOR EACH ROW EXECUTE FUNCTION notify_payment_sent()';
    ELSE
        RAISE NOTICE 'Skipping payment_sent trigger: creator_earnings table does not exist';
    END IF;
END $$;

-- ============================================================================
-- STEP 9: Fix campaign_deadline_cron
-- Issues: wrong type name, creator_id not resolved, wrong preference check
-- Uses only campaign_applications (always exists), skips creator_campaigns if missing
-- ============================================================================
DROP FUNCTION IF EXISTS notify_campaign_deadlines() CASCADE;

CREATE OR REPLACE FUNCTION notify_campaign_deadlines()
RETURNS void AS $$
DECLARE
    campaign_record RECORD;
    creator_record RECORD;
    notification_id UUID;
    campaign_restaurant_name TEXT;
    has_creator_campaigns BOOLEAN;
BEGIN
    -- Check if creator_campaigns table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'creator_campaigns'
    ) INTO has_creator_campaigns;

    FOR campaign_record IN
        SELECT c.id, c.title, c.end_date, c.restaurant_id, c.business_id
        FROM campaigns c
        WHERE c.status = 'active'
          AND c.end_date IS NOT NULL
          AND c.end_date::date = (CURRENT_DATE + INTERVAL '2 days')::date
    LOOP
        SELECT COALESCE(r.name, 'Restaurant')
        INTO campaign_restaurant_name
        FROM restaurants r
        WHERE r.id = campaign_record.restaurant_id;

        -- Find hired creators from campaign_applications, resolve through creator_profiles
        FOR creator_record IN
            SELECT DISTINCT cp.user_id
            FROM campaign_applications ca
            INNER JOIN creator_profiles cp ON cp.id = ca.creator_id
            WHERE ca.campaign_id = campaign_record.id
              AND ca.status = 'accepted'
              AND NOT EXISTS (
                  SELECT 1 FROM notifications n
                  WHERE n.user_id = cp.user_id
                    AND n.type = 'campaign_deadline_approaching'
                    AND (n.data->>'campaignId')::text = campaign_record.id::text
                    AND n.created_at::date = CURRENT_DATE
              )
              AND NOT EXISTS (
                  SELECT 1 FROM notification_preferences np
                  WHERE np.user_id = cp.user_id
                    AND np.category = 'campaigns'
                    AND np.in_app_enabled = false
              )
        LOOP
            notification_id := create_notification(
                p_user_id := creator_record.user_id,
                p_type := 'campaign_deadline_approaching',
                p_title := 'Campaign Deadline Approaching',
                p_message := COALESCE(campaign_record.title, 'Campaign') || ' ends in 2 days',
                p_data := jsonb_build_object(
                    'campaignId', campaign_record.id,
                    'campaignTitle', COALESCE(campaign_record.title, 'Campaign'),
                    'restaurantName', COALESCE(campaign_restaurant_name, 'Restaurant'),
                    'endDate', campaign_record.end_date,
                    'daysRemaining', 2
                ),
                p_related_id := campaign_record.id::text,
                p_related_type := 'campaign'
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-schedule the cron job (if pg_cron is available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('campaign-deadline-reminder')
        FROM cron.job WHERE jobname = 'campaign-deadline-reminder';

        PERFORM cron.schedule(
            'campaign-deadline-reminder',
            '0 9 * * *',
            'SELECT notify_campaign_deadlines()'
        );
    END IF;
END $$;

-- ============================================================================
-- STEP 10: Fix friend_post trigger
-- Issues: wrong type name, wrong preference check
-- (user_id from posts table is already auth.users.id — no creator_id issue)
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_friend_post_notification ON posts;
DROP FUNCTION IF EXISTS notify_friend_post() CASCADE;

CREATE OR REPLACE FUNCTION notify_friend_post()
RETURNS TRIGGER AS $$
DECLARE
    author_record RECORD;
    follower_record RECORD;
    restaurant_name TEXT;
    notification_id UUID;
BEGIN
    IF COALESCE(NEW.privacy, 'public') != 'public' THEN
        RETURN NEW;
    END IF;

    SELECT u.id, u.name, u.avatar_url
    INTO author_record
    FROM users u
    WHERE u.id = NEW.user_id;

    IF author_record.id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.restaurant_id IS NOT NULL THEN
        SELECT COALESCE(r.name, 'a restaurant')
        INTO restaurant_name
        FROM restaurants r
        WHERE r.id = NEW.restaurant_id;
    END IF;

    FOR follower_record IN
        SELECT ur.follower_id
        FROM user_relationships ur
        WHERE ur.following_id = NEW.user_id
          -- Category-based preference check
          AND NOT EXISTS (
              SELECT 1 FROM notification_preferences np
              WHERE np.user_id = ur.follower_id
                AND np.category = 'engagement'
                AND np.in_app_enabled = false
          )
          -- Rate limit: no friend_post_restaurant notification for this follower in the last hour
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.user_id = ur.follower_id
                AND n.type = 'friend_post_restaurant'
                AND n.data->>'authorId' = NEW.user_id::text
                AND n.created_at > NOW() - INTERVAL '1 hour'
          )
    LOOP
        notification_id := create_notification(
            p_user_id := follower_record.follower_id,
            p_type := 'friend_post_restaurant',
            p_title := COALESCE(author_record.name, 'Someone you follow') || ' shared a new post',
            p_message := CASE
                WHEN restaurant_name IS NOT NULL THEN
                    COALESCE(author_record.name, 'Someone') || ' posted about ' || restaurant_name
                ELSE
                    COALESCE(author_record.name, 'Someone') || ' shared a new post'
            END,
            p_data := jsonb_build_object(
                'postId', NEW.id,
                'postType', COALESCE(NEW.post_type, 'restaurant'),
                'authorId', NEW.user_id,
                'authorName', COALESCE(author_record.name, ''),
                'authorAvatar', COALESCE(author_record.avatar_url, ''),
                'restaurantName', COALESCE(restaurant_name, '')
            ),
            p_related_id := NEW.id::text,
            p_related_type := 'post'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_friend_post_notification
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION notify_friend_post();

-- ============================================================================
-- STEP 11: Fix campaign_opportunity trigger
-- Issues: duplicate preference check (both category-based and flat column)
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_campaign_opportunity_notification ON campaigns;
DROP FUNCTION IF EXISTS notify_campaign_opportunity() CASCADE;

CREATE OR REPLACE FUNCTION notify_campaign_opportunity()
RETURNS TRIGGER AS $$
DECLARE
    campaign_restaurant_city TEXT;
    campaign_restaurant_name TEXT;
    campaign_restaurant_id UUID;
    creator_record RECORD;
    notification_id UUID;
BEGIN
    IF NEW.status != 'active' OR OLD.status = 'active' THEN
        RETURN NEW;
    END IF;

    SELECT r.id, r.city, COALESCE(r.name, 'Restaurant')
    INTO campaign_restaurant_id, campaign_restaurant_city, campaign_restaurant_name
    FROM restaurants r
    WHERE r.id = NEW.restaurant_id;

    IF campaign_restaurant_id IS NULL THEN
        RETURN NEW;
    END IF;

    FOR creator_record IN
        SELECT DISTINCT u.id AS user_id
        FROM users u
        WHERE u.account_type = 'creator'
          AND u.id != COALESCE(NEW.business_id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND (
              (campaign_restaurant_city IS NOT NULL AND u.location ILIKE '%' || campaign_restaurant_city || '%')
              OR (NEW.location IS NOT NULL AND u.location ILIKE '%' || NEW.location || '%')
              OR (campaign_restaurant_city IS NULL AND NEW.location IS NULL)
          )
          -- Single category-based preference check
          AND NOT EXISTS (
              SELECT 1 FROM notification_preferences np
              WHERE np.user_id = u.id
                AND np.category = 'campaigns'
                AND np.in_app_enabled = false
          )
    LOOP
        notification_id := create_notification(
            p_user_id := creator_record.user_id,
            p_type := 'campaign_opportunity',
            p_title := 'New Campaign Opportunity',
            p_message := campaign_restaurant_name || ' is looking for creators: ' || COALESCE(NEW.title, 'New Campaign'),
            p_data := jsonb_build_object(
                'campaignId', NEW.id,
                'restaurantId', campaign_restaurant_id,
                'restaurantName', campaign_restaurant_name,
                'budget', COALESCE(NEW.budget_total, 0),
                'title', COALESCE(NEW.title, 'New Campaign')
            ),
            p_related_id := NEW.id::text,
            p_related_type := 'campaign'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_campaign_opportunity_notification
AFTER UPDATE ON campaigns
FOR EACH ROW
WHEN (NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active')
EXECUTE FUNCTION notify_campaign_opportunity();

-- ============================================================================
-- STEP 12: Fix campaign_invite trigger
-- Issues: wrong preference check (flat column)
-- (creator_id resolution already correct)
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_campaign_invite_notification ON campaign_invitations;
DROP FUNCTION IF EXISTS notify_campaign_invite() CASCADE;

CREATE OR REPLACE FUNCTION notify_campaign_invite()
RETURNS TRIGGER AS $$
DECLARE
    campaign_record RECORD;
    restaurant_name TEXT;
    restaurant_id_val UUID;
    creator_user_id UUID;
    notification_id UUID;
BEGIN
    SELECT cp.user_id
    INTO creator_user_id
    FROM creator_profiles cp
    WHERE cp.id = NEW.creator_id;

    IF creator_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT c.id, c.title, c.restaurant_id
    INTO campaign_record
    FROM campaigns c
    WHERE c.id = NEW.campaign_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    SELECT r.id, COALESCE(r.name, 'Restaurant')
    INTO restaurant_id_val, restaurant_name
    FROM restaurants r
    WHERE r.id = campaign_record.restaurant_id;

    restaurant_name := COALESCE(restaurant_name, 'Restaurant');

    -- Category-based preference check
    IF EXISTS (
        SELECT 1 FROM notification_preferences np
        WHERE np.user_id = creator_user_id
          AND np.category = 'campaigns'
          AND np.in_app_enabled = false
    ) THEN
        RETURN NEW;
    END IF;

    notification_id := create_notification(
        p_user_id := creator_user_id,
        p_type := 'campaign_invite',
        p_title := 'Campaign Invitation',
        p_message := 'You''ve been invited to join ' || COALESCE(campaign_record.title, 'a campaign') || ' at ' || restaurant_name,
        p_data := jsonb_build_object(
            'campaignId', campaign_record.id,
            'campaignTitle', COALESCE(campaign_record.title, 'Campaign'),
            'restaurantName', restaurant_name,
            'restaurantId', COALESCE(restaurant_id_val, campaign_record.restaurant_id)
        ),
        p_related_id := NEW.campaign_id::text,
        p_related_type := 'campaign'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_campaign_invite_notification
AFTER INSERT ON campaign_invitations
FOR EACH ROW
EXECUTE FUNCTION notify_campaign_invite();

-- ============================================================================
-- STEP 13: Fix weekly_recap cron
-- Issues: wrong preference check (flat column)
-- ============================================================================
DROP FUNCTION IF EXISTS notify_weekly_recap() CASCADE;

CREATE OR REPLACE FUNCTION notify_weekly_recap()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    notification_id UUID;
    week_start TEXT;
BEGIN
    week_start := to_char(date_trunc('week', CURRENT_DATE), 'YYYY-MM-DD');

    FOR user_record IN
        SELECT u.id, u.name
        FROM users u
        INNER JOIN auth.users au ON au.id = u.id
        WHERE au.last_sign_in_at IS NOT NULL
          AND au.last_sign_in_at >= (NOW() - INTERVAL '30 days')
          AND u.account_status = 'active'
          -- Category-based preference check
          AND NOT EXISTS (
              SELECT 1 FROM notification_preferences np
              WHERE np.user_id = u.id
                AND np.category = 'engagement'
                AND np.in_app_enabled = false
          )
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.user_id = u.id
                AND n.type = 'weekly_recap'
                AND (n.data->>'week')::text = week_start
          )
    LOOP
        notification_id := create_notification(
            p_user_id := user_record.id,
            p_type := 'weekly_recap',
            p_title := 'Your Weekly Recap',
            p_message := 'Check out what happened this week on Troodie!',
            p_data := jsonb_build_object(
                'week', week_start
            ),
            p_related_id := NULL,
            p_related_type := NULL
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('weekly-recap-notification')
        FROM cron.job WHERE jobname = 'weekly-recap-notification';

        PERFORM cron.schedule(
            'weekly-recap-notification',
            '0 18 * * 0',
            'SELECT notify_weekly_recap()'
        );
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION: Show trigger functions and their type usage
-- ============================================================================
SELECT 'CHECK CONSTRAINT' as item, conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'notifications_type_check';

SELECT 'TRIGGER FUNCTIONS' as item, proname
FROM pg_proc
WHERE proname IN (
    'notify_application_approved',
    'notify_campaign_application',
    'notify_application_rejected',
    'notify_revision_requested',
    'notify_deliverable_submitted',
    'notify_payment_sent',
    'notify_campaign_deadlines',
    'notify_friend_post',
    'notify_campaign_opportunity',
    'notify_campaign_invite',
    'notify_weekly_recap'
);
