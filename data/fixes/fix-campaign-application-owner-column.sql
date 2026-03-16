-- ============================================================================
-- Fix campaign application trigger owner column mismatch
-- ============================================================================
-- Current schema uses campaigns.owner_id.
-- This hotfix updates notify_campaign_application() to use owner_id and
-- preference-check against that owner user id.
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
    -- Resolve campaign owner user.
    SELECT
      c.id,
      c.title,
      c.owner_id AS owner_user_id,
      c.restaurant_id
    INTO campaign_record
    FROM campaigns c
    WHERE c.id = NEW.campaign_id;

    IF campaign_record.owner_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- campaign_applications.creator_id references creator_profiles.id
    SELECT cp.user_id INTO v_user_id
    FROM creator_profiles cp
    WHERE cp.id = NEW.creator_id;

    IF v_user_id IS NOT NULL THEN
        SELECT COALESCE(u.name, u.username, 'A creator'), u.avatar_url
        INTO creator_name, creator_avatar
        FROM users u
        WHERE u.id = v_user_id;
    END IF;

    creator_name := COALESCE(creator_name, 'A creator');

    -- Category-row preference check
    IF EXISTS (
        SELECT 1 FROM notification_preferences np
        WHERE np.user_id = campaign_record.owner_user_id
          AND np.category = 'campaigns'
          AND np.in_app_enabled = false
    ) THEN
        RETURN NEW;
    END IF;

    notification_id := create_notification(
        p_user_id := campaign_record.owner_user_id,
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
