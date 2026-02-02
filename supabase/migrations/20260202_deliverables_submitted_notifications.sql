-- =====================================================
-- Deliverables Submitted Notifications
-- =====================================================
-- This migration implements notifications for when creators submit deliverables
-- Notifies the restaurant owner via AFTER INSERT trigger
-- =====================================================

-- =====================================================
-- SECTION 1: Update notification type constraint
-- =====================================================

-- Drop existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with all notification types
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
  'deliverables_submitted',
  'board_invite',
  'follow',
  'new_campaign_posted',
  'restaurant_mention'
));

-- =====================================================
-- SECTION 2: Add notification preference columns
-- =====================================================

-- Add columns for deliverables submitted
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  deliverables_submitted_email_enabled BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  deliverables_submitted_push_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  deliverables_submitted_in_app_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  deliverables_submitted_frequency TEXT DEFAULT 'immediate';

-- =====================================================
-- SECTION 3: Seed default preferences for existing users
-- =====================================================

-- Insert default preferences for users who don't have them yet
INSERT INTO notification_preferences (user_id, category)
SELECT DISTINCT u.id, 'deliverables_submitted'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM notification_preferences np 
  WHERE np.user_id = u.id 
  AND np.category = 'deliverables_submitted'
)
ON CONFLICT (user_id, category) DO NOTHING;

-- =====================================================
-- SECTION 4: Create notification trigger function
-- =====================================================

CREATE OR REPLACE FUNCTION notify_restaurant_of_deliverable_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_restaurant_owner_id UUID;
  v_campaign_title TEXT;
  v_creator_name TEXT;
  v_prefs RECORD;
  v_restaurant_id UUID;
BEGIN
  -- Get restaurant owner ID (via restaurant_id stored in deliverables table)
  SELECT 
    owner_id,
    name
  INTO v_restaurant_owner_id, v_campaign_title -- temporary variable reuse
  FROM restaurants
  WHERE id = NEW.restaurant_id;

  -- Get campaign title
  SELECT title INTO v_campaign_title
  FROM campaigns
  WHERE id = NEW.campaign_id;
  
  -- Get creator name
  SELECT display_name
  INTO v_creator_name
  FROM creator_profiles
  WHERE id = NEW.creator_id;
  
  -- Default name fallback
  IF v_creator_name IS NULL THEN
    v_creator_name := 'A creator';
  END IF;

  -- Check restaurant owner's notification preferences
  SELECT 
    deliverables_submitted_push_enabled,
    deliverables_submitted_in_app_enabled
  INTO v_prefs
  FROM notification_preferences
  WHERE user_id = v_restaurant_owner_id
  AND category = 'deliverables_submitted';

  -- If preferences don't exist or in-app is enabled, create notification
  IF v_prefs IS NULL OR v_prefs.deliverables_submitted_in_app_enabled THEN
    
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
      v_restaurant_owner_id,
      'deliverables_submitted',
      'Content Submitted',
      v_creator_name || ' submitted content for ' || v_campaign_title || ' - Review now',
      jsonb_build_object(
        'campaign_id', NEW.campaign_id,
        'deliverable_id', NEW.id,
        'creator_id', NEW.creator_id,
        'application_id', NEW.campaign_application_id,
        'content_type', NEW.content_type
      ),
      NEW.id,
      'deliverable',
      2  -- Medium priority
    );
      
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 5: Create Trigger
-- =====================================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_restaurant_of_deliverable_submission ON campaign_deliverables;

-- Create AFTER INSERT trigger
CREATE TRIGGER trigger_notify_restaurant_of_deliverable_submission
AFTER INSERT ON campaign_deliverables
FOR EACH ROW
EXECUTE FUNCTION notify_restaurant_of_deliverable_submission();

-- =====================================================
-- SECTION 6: Permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION notify_restaurant_of_deliverable_submission() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_restaurant_of_deliverable_submission() TO service_role;
