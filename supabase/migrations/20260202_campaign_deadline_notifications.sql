-- =====================================================
-- Campaign Deadline Approaching Notifications
-- =====================================================
-- This migration implements time-based deadline reminder notifications
-- Sends reminders to creators 2 days before campaign end date
-- Uses pg_cron to schedule daily checks at 9 AM UTC
-- =====================================================

-- =====================================================
-- SECTION 1: Update notification type constraint
-- =====================================================

-- Drop existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with all notification types (including existing ones)
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
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
  'board_invite',
  'follow',
  'new_campaign_posted',
  'restaurant_mention'
));

-- =====================================================
-- SECTION 2: Add notification preference columns
-- =====================================================

-- Add columns for campaign deadline reminders
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  campaign_deadline_approaching_email_enabled BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  campaign_deadline_approaching_push_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  campaign_deadline_approaching_in_app_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  campaign_deadline_approaching_frequency TEXT DEFAULT 'immediate';

-- =====================================================
-- SECTION 3: Seed default preferences for existing users
-- =====================================================

-- Insert default preferences for users who don't have them yet
INSERT INTO notification_preferences (user_id, category)
SELECT DISTINCT u.id, 'campaign_deadline_approaching'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM notification_preferences np 
  WHERE np.user_id = u.id 
  AND np.category = 'campaign_deadline_approaching'
)
ON CONFLICT (user_id, category) DO NOTHING;

-- =====================================================
-- SECTION 4: Create deadline reminder function
-- =====================================================

CREATE OR REPLACE FUNCTION send_campaign_deadline_reminders()
RETURNS void AS $$
DECLARE
  v_campaign RECORD;
  v_creator RECORD;
  v_prefs RECORD;
BEGIN
  -- Find campaigns ending in exactly 2 days (using end_date column)
  FOR v_campaign IN
    SELECT 
      c.id,
      c.title,
      c.end_date,
      c.restaurant_id
    FROM campaigns c
    WHERE c.end_date = CURRENT_DATE + INTERVAL '2 days'
    AND c.status = 'active'
  LOOP
    
    -- Find creators with accepted applications for this campaign
    FOR v_creator IN
      SELECT 
        cp.user_id,
        cp.display_name,
        ca.id as application_id
      FROM campaign_applications ca
      JOIN creator_profiles cp ON ca.creator_id = cp.id
      WHERE ca.campaign_id = v_campaign.id
      AND ca.status = 'accepted'
    LOOP
      
      -- Check user's notification preferences
      SELECT 
        campaign_deadline_approaching_push_enabled,
        campaign_deadline_approaching_in_app_enabled
      INTO v_prefs
      FROM notification_preferences
      WHERE user_id = v_creator.user_id
      AND category = 'campaign_deadline_approaching';
      
      -- If preferences don't exist or in-app is enabled, create notification
      IF v_prefs IS NULL OR v_prefs.campaign_deadline_approaching_in_app_enabled THEN
        
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          data,
          related_id,
          related_type,
          priority
        ) VALUES (
          v_creator.user_id,
          'campaign_deadline_approaching',
          'Deadline Reminder ⏰',
          'Reminder: ' || v_campaign.title || ' deliverables due in 2 days',
          jsonb_build_object(
            'campaign_id', v_campaign.id,
            'application_id', v_creator.application_id,
            'days_remaining', 2,
            'restaurant_id', v_campaign.restaurant_id
          ),
          v_campaign.id,
          'campaign',
          2  -- Medium priority
        );
        
        -- Log for debugging
        RAISE NOTICE 'Deadline reminder sent to user % for campaign %', 
          v_creator.user_id, v_campaign.id;
      END IF;
      
    END LOOP;
    
  END LOOP;
  
  RAISE NOTICE 'Deadline reminder job completed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 5: Enable pg_cron extension
-- =====================================================

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- SECTION 6: Schedule the cron job
-- =====================================================

-- Remove existing job if it exists (for idempotency)
SELECT cron.unschedule('send-campaign-deadline-reminders') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-campaign-deadline-reminders'
);

-- Schedule daily at 9 AM UTC
SELECT cron.schedule(
  'send-campaign-deadline-reminders',  -- Job name
  '0 9 * * *',                         -- Cron schedule (9 AM daily)
  'SELECT send_campaign_deadline_reminders();'  -- SQL to execute
);

-- =====================================================
-- SECTION 7: Grant necessary permissions
-- =====================================================

-- Grant execute permission on the function to postgres user
GRANT EXECUTE ON FUNCTION send_campaign_deadline_reminders() TO postgres;

-- Grant usage on cron schema (if needed)
GRANT USAGE ON SCHEMA cron TO postgres;

-- =====================================================
-- SECTION 8: Verification queries (commented)
-- =====================================================

-- Uncomment to verify installation:

-- Check if cron job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'send-campaign-deadline-reminders';

-- View cron job execution history:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-campaign-deadline-reminders')
-- ORDER BY start_time DESC LIMIT 10;

-- Manually trigger the function for testing:
-- SELECT send_campaign_deadline_reminders();

-- Check campaigns that would trigger notifications:
-- SELECT id, title, end_date, status
-- FROM campaigns
-- WHERE end_date = CURRENT_DATE + INTERVAL '2 days'
-- AND status = 'active';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
