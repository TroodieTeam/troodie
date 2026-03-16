-- Application Rejected Notification Trigger
-- Fires when a campaign application status changes to 'rejected', notifying the creator
-- Part of TRO-18: Push Notifications

-- Step 1: Add 'application_rejected' to notification type constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
    (type)::text = ANY ((ARRAY[
        'system'::character varying,
        'payment_received'::character varying,
        'new_follower'::character varying,
        'post_liked'::character varying,
        'post_commented'::character varying,
        'mentioned_in_post'::character varying,
        'mentioned_in_comment'::character varying,
        'campaign_opportunity'::character varying,
        'campaign_application_submitted'::character varying,
        'application_approved'::character varying,
        'application_rejected'::character varying,
        'campaign_deadline_approaching'::character varying,
        'deliverables_submitted'::character varying,
        'board_invite'::character varying,
        'follow'::character varying,
        'new_campaign_posted'::character varying,
        'restaurant_mention'::character varying,
        'campaign_invite'::character varying,
        'weekly_recap'::character varying,
        'friend_post_restaurant'::character varying,
        'revision_requested'::character varying
    ])::text[])
);

-- Step 2: Add preference columns for new notification types
ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS application_rejected_push_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS application_rejected_in_app_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS application_rejected_email_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS application_rejected_frequency VARCHAR(20) DEFAULT 'immediate',
    ADD COLUMN IF NOT EXISTS revision_requested_push_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS revision_requested_in_app_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS revision_requested_email_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS revision_requested_frequency VARCHAR(20) DEFAULT 'immediate';

-- Step 3: Create application rejected trigger
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
    -- Only fire when status changes to 'rejected'
    IF OLD.status = NEW.status OR NEW.status != 'rejected' THEN
        RETURN NEW;
    END IF;

    -- Resolve creator_profiles.id → auth.users.id
    -- campaign_applications.creator_id references creator_profiles.id, not auth.users.id
    SELECT cp.user_id INTO v_user_id
    FROM creator_profiles cp
    WHERE cp.id = NEW.creator_id;

    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get campaign info
    SELECT c.id, c.title, c.restaurant_id, c.owner_id
    INTO campaign_record
    FROM campaigns c
    WHERE c.id = NEW.campaign_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Get restaurant name
    SELECT COALESCE(r.name, 'Restaurant')
    INTO restaurant_name
    FROM restaurants r
    WHERE r.id = campaign_record.restaurant_id;

    -- Check notification preferences
    IF EXISTS (
        SELECT 1 FROM notification_preferences np
        WHERE np.user_id = v_user_id
          AND np.application_rejected_in_app_enabled = false
    ) THEN
        RETURN NEW;
    END IF;

    -- Create notification for the creator (using auth.users.id, not creator_profiles.id)
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
