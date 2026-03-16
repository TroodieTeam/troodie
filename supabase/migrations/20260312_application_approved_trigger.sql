-- Application Approved Notification Trigger
-- Fires when a campaign application status changes to 'accepted', notifying the creator
-- Part of TRO-18: Push Notifications

-- Drop existing trigger and function if they exist (idempotent)
DROP TRIGGER IF EXISTS trigger_application_approved_notification ON campaign_applications;
DROP FUNCTION IF EXISTS notify_application_approved() CASCADE;

CREATE OR REPLACE FUNCTION notify_application_approved()
RETURNS TRIGGER AS $$
DECLARE
    campaign_record RECORD;
    restaurant_name TEXT;
    notification_id UUID;
BEGIN
    -- Only fire when status changes to 'accepted'
    IF OLD.status = NEW.status OR NEW.status != 'accepted' THEN
        RETURN NEW;
    END IF;

    -- Get campaign info
    SELECT c.id, c.title, c.restaurant_id
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

    -- Check notification preferences: campaigns must be enabled for creator
    IF EXISTS (
        SELECT 1 FROM notification_preferences np
        WHERE np.user_id = NEW.creator_id
          AND np.campaigns_in_app_enabled = false
    ) THEN
        RETURN NEW;
    END IF;

    -- Create notification for the creator
    notification_id := create_notification(
        p_user_id := NEW.creator_id,
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

-- Create the trigger on UPDATE only
CREATE TRIGGER trigger_application_approved_notification
AFTER UPDATE ON campaign_applications
FOR EACH ROW
EXECUTE FUNCTION notify_application_approved();
