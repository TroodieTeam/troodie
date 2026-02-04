-- =====================================================
-- WEEKLY RECAP NOTIFICATIONS MIGRATION
-- =====================================================
-- Description: Implements scheduled weekly recap notification
-- Sends every Sunday at 6:00 PM to active users
-- =====================================================

-- Start transaction for safety
BEGIN;

-- 1. Enable pg_cron extension for scheduled notifications
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Update notification type constraint to include 'weekly_recap'
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'system',
  'payment_received',
  'new_follower',
  'post_liked',
  'post_commented',
  'mentioned_in_post',
  'mentioned_in_comment',
  'campaign_opportunity',
  'campaign_application_submitted',
  'application_approved',
  'campaign_deadline_approaching',
  'deliverables_submitted',
  'board_invite',
  'follow',
  'new_campaign_posted',
  'restaurant_mention',
  'campaign_invite',
  'weekly_recap'
));

-- 3. Add notification preference columns for weekly_recap
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS weekly_recap_email_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_recap_push_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_recap_in_app_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_recap_frequency TEXT DEFAULT 'weekly';

-- Note: Default preferences will be handled by the application layer
-- when users first interact with notification settings

-- 5. Create function to send weekly recap notifications
CREATE OR REPLACE FUNCTION send_weekly_recap_notifications()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert notifications for all users who have push or in-app enabled
  -- Note: Preference columns will be NULL for users without preferences set
  -- We treat NULL as enabled (default behavior)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    priority
  )
  SELECT 
    u.id,
    'weekly_recap',
    'Weekly Recap 📸',
    'What did you eat this week? Share your favorites!',
    1
  FROM auth.users u
  WHERE u.id NOT IN (
    -- Exclude users who explicitly disabled this notification
    SELECT user_id FROM notification_preferences
    WHERE weekly_recap_push_enabled = false 
    AND weekly_recap_in_app_enabled = false
  );
  
  RAISE NOTICE 'Weekly recap notifications sent';
END;
$$;

-- 6. Schedule cron job for every Sunday at 6:00 PM
-- Note: This uses UTC timezone. For IST (UTC+5:30), use '30 12 * * 0' for 6:00 PM IST
-- Current schedule: Sunday at 18:00 UTC
SELECT cron.schedule(
  'send-weekly-recap',
  '0 18 * * 0',  -- Every Sunday at 18:00 UTC
  $$SELECT send_weekly_recap_notifications()$$
);

-- Verification queries (commented out, can be run separately)
/*
-- Check if function was created
SELECT proname FROM pg_proc WHERE proname = 'send_weekly_recap_notifications';

-- Check if cron job was scheduled
SELECT * FROM cron.job WHERE jobname = 'send-weekly-recap';

-- Manually trigger for testing
SELECT send_weekly_recap_notifications();

-- Check created notifications
SELECT * FROM notifications 
WHERE type = 'weekly_recap' 
ORDER BY created_at DESC 
LIMIT 5;
*/

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================
-- If everything looks good, commit the transaction:
COMMIT;

-- If something went wrong, run this instead to undo everything:
-- ROLLBACK;
