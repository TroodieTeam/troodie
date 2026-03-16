-- ============================================================================
-- Notification Production Blockers Hotfix
-- ============================================================================
-- Fixes:
-- 1) Ensure trigger preference checks use category-row model:
--      notification_preferences(category='campaigns', in_app_enabled)
-- 2) Ensure revision-requested notification trigger fires for both statuses:
--      'revision_requested' and legacy 'needs_revision'
--
-- Safe to run multiple times (idempotent trigger recreation).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fix 1: application_rejected trigger preference check
-- ----------------------------------------------------------------------------
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

    -- campaign_applications.creator_id references creator_profiles.id
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

    -- Category-row preference model (single source of truth)
    IF EXISTS (
        SELECT 1
        FROM notification_preferences np
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

-- ----------------------------------------------------------------------------
-- Fix 2: revision_requested trigger preference + status compatibility
-- ----------------------------------------------------------------------------
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
    -- Support both current and legacy workflow statuses
    IF OLD.status = NEW.status OR NEW.status NOT IN ('revision_requested', 'needs_revision') THEN
        RETURN NEW;
    END IF;

    -- campaign_deliverables.creator_id references creator_profiles.id
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

    -- Category-row preference model (single source of truth)
    IF EXISTS (
        SELECT 1
        FROM notification_preferences np
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
            'revisionNotes', COALESCE(NEW.revision_notes, ''),
            'deliverableStatus', NEW.status
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
