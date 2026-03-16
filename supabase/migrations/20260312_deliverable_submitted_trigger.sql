-- Deliverable Submitted Notification Trigger
-- Fires when creator_campaigns.deliverables_status changes (creator submits content)
-- Notifies the business owner
-- Part of TRO-18: Push Notifications

-- Drop existing trigger and function if they exist (idempotent)
DROP TRIGGER IF EXISTS trigger_deliverable_submitted_notification ON creator_campaigns;
DROP FUNCTION IF EXISTS notify_deliverable_submitted() CASCADE;

CREATE OR REPLACE FUNCTION notify_deliverable_submitted()
RETURNS TRIGGER AS $$
DECLARE
    campaign_record RECORD;
    creator_name TEXT;
    notification_id UUID;
BEGIN
    -- Only fire when deliverables_status actually changes
    IF OLD.deliverables_status IS NOT DISTINCT FROM NEW.deliverables_status THEN
        RETURN NEW;
    END IF;

    -- Get campaign info including business owner
    SELECT c.id, c.title, c.business_id, c.restaurant_id
    INTO campaign_record
    FROM campaigns c
    WHERE c.id = NEW.campaign_id;

    -- If no campaign found or no business owner, skip
    IF NOT FOUND OR campaign_record.business_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get creator name
    SELECT COALESCE(u.full_name, u.username, 'A creator')
    INTO creator_name
    FROM users u
    WHERE u.id = NEW.creator_id;

    -- Check notification preferences: campaigns must be enabled for business owner
    IF EXISTS (
        SELECT 1 FROM notification_preferences np
        WHERE np.user_id = campaign_record.business_id
          AND np.campaigns_in_app_enabled = false
    ) THEN
        RETURN NEW;
    END IF;

    -- Create notification for business owner
    notification_id := create_notification(
        p_user_id := campaign_record.business_id,
        p_type := 'deliverable_submitted',
        p_title := 'Content Submitted',
        p_message := creator_name || ' submitted content for: ' || COALESCE(campaign_record.title, 'Campaign'),
        p_data := jsonb_build_object(
            'campaignId', campaign_record.id,
            'campaignTitle', COALESCE(campaign_record.title, 'Campaign'),
            'creatorId', NEW.creator_id,
            'creatorName', creator_name
        ),
        p_related_id := NEW.campaign_id::text,
        p_related_type := 'campaign'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on UPDATE only
CREATE TRIGGER trigger_deliverable_submitted_notification
AFTER UPDATE ON creator_campaigns
FOR EACH ROW
EXECUTE FUNCTION notify_deliverable_submitted();
