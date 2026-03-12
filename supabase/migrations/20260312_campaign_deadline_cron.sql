-- Campaign Deadline Reminder Cron Job
-- Runs daily at 9 AM UTC, reminds creators about campaigns ending in 2 days
-- Part of TRO-18: Push Notifications

-- Ensure pg_cron extension is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing cron job if it exists (idempotent)
SELECT cron.unschedule('campaign-deadline-reminder')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'campaign-deadline-reminder'
);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS notify_campaign_deadlines() CASCADE;

CREATE OR REPLACE FUNCTION notify_campaign_deadlines()
RETURNS void AS $$
DECLARE
    campaign_record RECORD;
    creator_record RECORD;
    notification_id UUID;
    campaign_restaurant_name TEXT;
BEGIN
    -- Find active campaigns with end_date exactly 2 days from now
    FOR campaign_record IN
        SELECT c.id, c.title, c.end_date, c.restaurant_id, c.business_id
        FROM campaigns c
        WHERE c.status = 'active'
          AND c.end_date IS NOT NULL
          AND c.end_date::date = (CURRENT_DATE + INTERVAL '2 days')::date
    LOOP
        -- Get restaurant name
        SELECT COALESCE(r.name, 'Restaurant')
        INTO campaign_restaurant_name
        FROM restaurants r
        WHERE r.id = campaign_record.restaurant_id;

        -- Find hired creators from campaign_applications (accepted) and creator_campaigns (accepted/active)
        FOR creator_record IN
            SELECT DISTINCT creator_id AS user_id
            FROM (
                -- Creators accepted via campaign_applications
                SELECT ca.creator_id
                FROM campaign_applications ca
                WHERE ca.campaign_id = campaign_record.id
                  AND ca.status = 'accepted'
                UNION
                -- Creators in creator_campaigns with active statuses
                SELECT cc.creator_id
                FROM creator_campaigns cc
                WHERE cc.campaign_id = campaign_record.id
                  AND cc.status IN ('accepted', 'active')
            ) hired_creators
            -- Deduplicate: skip if notification already sent today for this campaign+creator
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications n
                WHERE n.user_id = hired_creators.creator_id
                  AND n.type = 'campaign_deadline'
                  AND (n.data->>'campaignId')::text = campaign_record.id::text
                  AND n.created_at::date = CURRENT_DATE
            )
            -- Check notification preferences
            AND NOT EXISTS (
                SELECT 1 FROM notification_preferences np
                WHERE np.user_id = hired_creators.creator_id
                  AND np.campaigns_in_app_enabled = false
            )
        LOOP
            -- Create notification for each eligible creator
            notification_id := create_notification(
                p_user_id := creator_record.user_id,
                p_type := 'campaign_deadline',
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

-- Schedule the cron job: daily at 9 AM UTC
SELECT cron.schedule(
    'campaign-deadline-reminder',
    '0 9 * * *',
    'SELECT notify_campaign_deadlines()'
);
