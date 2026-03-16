-- Revision Requested Notification Trigger
-- Fires when a deliverable status changes to 'revision_requested', notifying the creator
-- Part of TRO-18: Push Notifications
--
-- NOTE: The deliverableReviewService.ts uses 'needs_revision' as the status value,
-- but the DB constraint allows 'revision_requested'. This trigger handles both
-- by checking for 'revision_requested' (the DB constraint value).
-- The service should be updated to use 'revision_requested' for consistency.

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
    -- Only fire when status changes to 'revision_requested'
    IF OLD.status = NEW.status OR NEW.status != 'revision_requested' THEN
        RETURN NEW;
    END IF;

    -- Resolve creator_profiles.id → auth.users.id
    -- campaign_deliverables.creator_id references creator_profiles.id, not auth.users.id
    SELECT cp.user_id INTO v_user_id
    FROM creator_profiles cp
    WHERE cp.id = NEW.creator_id;

    IF v_user_id IS NULL THEN
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

    -- Check notification preferences
    IF EXISTS (
        SELECT 1 FROM notification_preferences np
        WHERE np.user_id = v_user_id
          AND np.revision_requested_in_app_enabled = false
    ) THEN
        RETURN NEW;
    END IF;

    -- Create notification for the creator (using auth.users.id, not creator_profiles.id)
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
