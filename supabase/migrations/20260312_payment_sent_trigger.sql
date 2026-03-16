-- Payment Sent Notification Trigger
-- Fires when creator_earnings status changes to 'available' or 'paid'
-- Notifies the creator
-- Priority: 3 (high — financial notification)
-- Part of TRO-18: Push Notifications

-- Drop existing trigger and function if they exist (idempotent)
DROP TRIGGER IF EXISTS trigger_payment_sent_notification ON creator_earnings;
DROP FUNCTION IF EXISTS notify_payment_sent() CASCADE;

CREATE OR REPLACE FUNCTION notify_payment_sent()
RETURNS TRIGGER AS $$
DECLARE
    campaign_title TEXT;
    notification_id UUID;
BEGIN
    -- Only fire on INSERT with status 'available'/'paid', or UPDATE where status changed to 'available'/'paid'
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Only notify for 'available' or 'paid' statuses
    IF NEW.status NOT IN ('available', 'paid') THEN
        RETURN NEW;
    END IF;

    -- Get campaign title if linked to a campaign
    IF NEW.campaign_id IS NOT NULL THEN
        SELECT c.title INTO campaign_title
        FROM campaigns c
        WHERE c.id = NEW.campaign_id;
    END IF;

    campaign_title := COALESCE(campaign_title, 'Campaign');

    -- Check notification preferences: campaigns must be enabled for creator
    IF EXISTS (
        SELECT 1 FROM notification_preferences np
        WHERE np.user_id = NEW.creator_id
          AND np.campaigns_in_app_enabled = false
    ) THEN
        RETURN NEW;
    END IF;

    -- Create notification for creator
    notification_id := create_notification(
        p_user_id := NEW.creator_id,
        p_type := 'payment_sent',
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

    -- Set high priority for financial notifications
    IF notification_id IS NOT NULL THEN
        UPDATE notifications SET priority = 3 WHERE id = notification_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on INSERT and UPDATE
CREATE TRIGGER trigger_payment_sent_notification
AFTER INSERT OR UPDATE ON creator_earnings
FOR EACH ROW
EXECUTE FUNCTION notify_payment_sent();
