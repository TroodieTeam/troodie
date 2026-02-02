-- =====================================================
-- Payment Received Notifications
-- =====================================================
-- This migration implements notifications for when creators receive payment
-- Triggered by deliverable status changing to 'approved'
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

-- Add columns for payment received
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  payment_received_email_enabled BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  payment_received_push_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  payment_received_in_app_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  payment_received_frequency TEXT DEFAULT 'immediate';

-- =====================================================
-- SECTION 3: Seed default preferences for existing users
-- =====================================================

-- Insert default preferences for users who don't have them yet
INSERT INTO notification_preferences (user_id, category)
SELECT DISTINCT u.id, 'payment_received'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM notification_preferences np 
  WHERE np.user_id = u.id 
  AND np.category = 'payment_received'
)
ON CONFLICT (user_id, category) DO NOTHING;

-- =====================================================
-- SECTION 4: Create notification trigger function
-- =====================================================

CREATE OR REPLACE FUNCTION notify_creator_of_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_title TEXT;
  v_amount_display TEXT;
  v_prefs RECORD;
  v_creator_user_id UUID;
BEGIN
  -- Get campaign title
  SELECT c.title INTO v_campaign_title
  FROM campaigns c
  WHERE c.id = NEW.campaign_id;
  
  -- Get user_id from creator profile (Aliased to avoid ambiguity)
  SELECT cp.user_id INTO v_creator_user_id
  FROM creator_profiles cp
  WHERE cp.id = NEW.creator_id;

  -- Default to NULL if not found (safety check)
  IF v_creator_user_id IS NULL THEN
    RAISE WARNING 'Creator profile not found for ID %', NEW.creator_id;
    RETURN NEW;
  END IF;

  -- Format amount ($10.00)
  v_amount_display := '$' || COALESCE(NEW.payment_amount_cents / 100.0, 0)::numeric(10,2);
  
  -- Check creator's notification preferences
  SELECT 
    np.payment_received_push_enabled,
    np.payment_received_in_app_enabled
  INTO v_prefs
  FROM notification_preferences np
  WHERE np.user_id = v_creator_user_id
  AND np.category = 'payment_received';

  -- If preferences don't exist or in-app is enabled, create notification
  IF v_prefs IS NULL OR v_prefs.payment_received_in_app_enabled THEN
    
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
      v_creator_user_id,
      'payment_received',
      'Payment Sent! 💰',
      'Payment sent! You''ve earned ' || v_amount_display || ' for ' || v_campaign_title,
      jsonb_build_object(
        'campaign_id', NEW.campaign_id,
        'deliverable_id', NEW.id,
        'amount', NEW.payment_amount_cents,
        'amount_formatted', v_amount_display
      ),
      NEW.id,
      'deliverable',
      1  -- High priority
    );
      
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 5: Create Trigger
-- =====================================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_creator_of_payment ON campaign_deliverables;

-- Create AFTER UPDATE trigger
-- Fires when deliverable is approved or auto-approved
CREATE TRIGGER trigger_notify_creator_of_payment
AFTER UPDATE ON campaign_deliverables
FOR EACH ROW
WHEN (
  OLD.status IS DISTINCT FROM NEW.status 
  AND NEW.status IN ('approved', 'auto_approved')
)
EXECUTE FUNCTION notify_creator_of_payment();

-- =====================================================
-- SECTION 6: Permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION notify_creator_of_payment() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_creator_of_payment() TO service_role;
