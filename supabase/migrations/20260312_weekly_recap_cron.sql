-- Weekly Recap Cron Job
-- Runs every Sunday at 6 PM UTC, sends weekly recap notification to active users
-- Part of TRO-18: Push Notifications

-- Ensure pg_cron extension is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing cron job if it exists (idempotent)
SELECT cron.unschedule('weekly-recap-notification')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'weekly-recap-notification'
);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS notify_weekly_recap() CASCADE;

CREATE OR REPLACE FUNCTION notify_weekly_recap()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    notification_id UUID;
    week_start TEXT;
BEGIN
    -- Calculate the start of the current week (Monday)
    week_start := to_char(date_trunc('week', CURRENT_DATE), 'YYYY-MM-DD');

    -- Find active users: those who signed in within the last 30 days
    -- Use auth.users.last_sign_in_at for accurate activity tracking
    FOR user_record IN
        SELECT u.id, u.name
        FROM users u
        INNER JOIN auth.users au ON au.id = u.id
        WHERE au.last_sign_in_at IS NOT NULL
          AND au.last_sign_in_at >= (NOW() - INTERVAL '30 days')
          AND u.account_status = 'active'
          -- Check engagement notification preferences
          AND NOT EXISTS (
              SELECT 1 FROM notification_preferences np
              WHERE np.user_id = u.id
                AND np.engagement_in_app_enabled = false
          )
          -- Deduplicate: skip if recap already sent this week
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.user_id = u.id
                AND n.type = 'weekly_recap'
                AND (n.data->>'week')::text = week_start
          )
    LOOP
        -- Create notification for each eligible user
        notification_id := create_notification(
            p_user_id := user_record.id,
            p_type := 'weekly_recap',
            p_title := 'Your Weekly Recap',
            p_message := 'Check out what happened this week on Troodie!',
            p_data := jsonb_build_object(
                'week', week_start
            ),
            p_related_id := NULL,
            p_related_type := NULL
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job: every Sunday at 6 PM UTC
SELECT cron.schedule(
    'weekly-recap-notification',
    '0 18 * * 0',
    'SELECT notify_weekly_recap()'
);
