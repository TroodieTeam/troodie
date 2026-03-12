-- Campaign Invitation Notification Trigger
-- Fires when a campaign invitation is created (INSERT on campaign_invitations)
-- Notifies the invited creator
-- Part of TRO-18: Push Notifications

-- Drop existing trigger and function if they exist (idempotent)
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
    -- Look up the creator's user_id from creator_profiles
    -- (campaign_invitations.creator_id references creator_profiles.id, not auth.users)
    SELECT cp.user_id
    INTO creator_user_id
    FROM creator_profiles cp
    WHERE cp.id = NEW.creator_id;

    IF creator_user_id IS NULL THEN
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
    SELECT r.id, COALESCE(r.name, 'Restaurant')
    INTO restaurant_id_val, restaurant_name
    FROM restaurants r
    WHERE r.id = campaign_record.restaurant_id;

    restaurant_name := COALESCE(restaurant_name, 'Restaurant');

    -- Check notification preferences: campaigns must be enabled for creator
    IF EXISTS (
        SELECT 1 FROM notification_preferences np
        WHERE np.user_id = creator_user_id
          AND np.campaigns_in_app_enabled = false
    ) THEN
        RETURN NEW;
    END IF;

    -- Create notification for the invited creator
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

-- Create the trigger on INSERT only
CREATE TRIGGER trigger_campaign_invite_notification
AFTER INSERT ON campaign_invitations
FOR EACH ROW
EXECUTE FUNCTION notify_campaign_invite();
