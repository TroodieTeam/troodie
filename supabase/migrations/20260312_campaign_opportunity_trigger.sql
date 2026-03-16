-- Campaign Opportunity Notification Trigger
-- Fires when a campaign status changes to 'active', notifying local creators
-- Part of TRO-18: Push Notifications

-- Drop existing trigger and function if they exist (idempotent)
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
    -- Only fire when status changes to 'active'
    IF NEW.status != 'active' OR OLD.status = 'active' THEN
        RETURN NEW;
    END IF;

    -- Get restaurant info for this campaign
    SELECT r.id, r.city, COALESCE(r.name, 'Restaurant')
    INTO campaign_restaurant_id, campaign_restaurant_city, campaign_restaurant_name
    FROM restaurants r
    WHERE r.id = NEW.restaurant_id;

    -- If no restaurant found, skip
    IF campaign_restaurant_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Find eligible creators:
    -- 1. Must be a creator account
    -- 2. Must be in the same city as the campaign restaurant, OR campaign has a location that matches
    -- 3. Must have campaigns_in_app_enabled preference (checked per-user)
    FOR creator_record IN
        SELECT DISTINCT u.id AS user_id
        FROM users u
        WHERE u.account_type = 'creator'
          AND u.id != COALESCE(NEW.business_id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND (
              -- Match by restaurant city
              (campaign_restaurant_city IS NOT NULL AND u.location ILIKE '%' || campaign_restaurant_city || '%')
              -- Or match by campaign location field
              OR (NEW.location IS NOT NULL AND u.location ILIKE '%' || NEW.location || '%')
              -- If no location data, notify all creators (broad reach for campaigns without geo)
              OR (campaign_restaurant_city IS NULL AND NEW.location IS NULL)
          )
          -- Check notification preferences: campaigns must be enabled
          AND NOT EXISTS (
              SELECT 1 FROM notification_preferences np
              WHERE np.user_id = u.id
                AND np.category = 'campaigns'
                AND np.in_app_enabled = false
          )
          -- Also check the campaigns_in_app_enabled column on any preference row
          AND NOT EXISTS (
              SELECT 1 FROM notification_preferences np
              WHERE np.user_id = u.id
                AND np.campaigns_in_app_enabled = false
          )
    LOOP
        -- Create notification for each eligible creator
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

-- Create the trigger
CREATE TRIGGER trigger_campaign_opportunity_notification
AFTER UPDATE ON campaigns
FOR EACH ROW
WHEN (NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active')
EXECUTE FUNCTION notify_campaign_opportunity();
