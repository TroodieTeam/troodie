-- =====================================================
-- Campaign Invitation Notifications
-- =====================================================
-- This migration implements notifications for when creators are invited to campaigns
-- Triggered by INSERT on campaign_invitations table
-- =====================================================

-- =====================================================
-- SECTION 1: Update notification type constraint
-- =====================================================

-- Drop existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with all notification types including 'campaign_invite'
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
  'restaurant_mention',
  'campaign_invite'  -- New Type
));

-- =====================================================
-- SECTION 2: Add notification preference columns
-- =====================================================

-- Add columns for campaign_invite
-- Note: Using singular "campaign_invite" to match Category and Type
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  campaign_invite_email_enabled BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  campaign_invite_push_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  campaign_invite_in_app_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  campaign_invite_frequency TEXT DEFAULT 'immediate';

-- =====================================================
-- SECTION 3: Seed default preferences for existing users
-- =====================================================

-- Insert default preferences for users who don't have them yet
INSERT INTO notification_preferences (user_id, category)
SELECT DISTINCT u.id, 'campaign_invite'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM notification_preferences np 
  WHERE np.user_id = u.id 
  AND np.category = 'campaign_invite'
)
ON CONFLICT (user_id, category) DO NOTHING;

-- =====================================================
-- SECTION 4: Create notification trigger function
-- =====================================================

CREATE OR REPLACE FUNCTION notify_creator_of_campaign_invite()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_title TEXT;
  v_restaurant_name TEXT;
  v_creator_user_id UUID;
  v_prefs RECORD;
BEGIN
  -- Get campaign title & restaurant name
  -- Join campaigns -> restaurants
  SELECT c.title, r.name 
  INTO v_campaign_title, v_restaurant_name
  FROM campaigns c
  JOIN restaurants r ON c.restaurant_id = r.id
  WHERE c.id = NEW.campaign_id;
  
  -- Get user_id from creator profile (Aliased to avoid ambiguity)
  -- campaign_invitations.creator_id points to creator_profiles.id
  SELECT cp.user_id INTO v_creator_user_id
  FROM creator_profiles cp
  WHERE cp.id = NEW.creator_id;

  -- Default to NULL check
  IF v_creator_user_id IS NULL THEN
    RAISE WARNING 'Creator profile not found for ID % in invitations', NEW.creator_id;
    RETURN NEW;
  END IF;

  -- Check creator's notification preferences
  SELECT 
    np.campaign_invite_push_enabled,
    np.campaign_invite_in_app_enabled
  INTO v_prefs
  FROM notification_preferences np
  WHERE np.user_id = v_creator_user_id
  AND np.category = 'campaign_invite';

  -- If preferences don't exist or in-app is enabled, create notification
  IF v_prefs IS NULL OR v_prefs.campaign_invite_in_app_enabled THEN
    
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
      'campaign_invite',
      'New Campaign Invite! 📩',
      v_restaurant_name || ' invited you to ' || v_campaign_title,
      jsonb_build_object(
        'campaign_id', NEW.campaign_id,
        'invitation_id', NEW.id,
        'restaurant_name', v_restaurant_name
      ),
      NEW.id,
      'campaign_invitation',
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
DROP TRIGGER IF EXISTS trigger_notify_creator_of_campaign_invite ON campaign_invitations;

-- Create AFTER INSERT trigger
CREATE TRIGGER trigger_notify_creator_of_campaign_invite
AFTER INSERT ON campaign_invitations
FOR EACH ROW
EXECUTE FUNCTION notify_creator_of_campaign_invite();

-- =====================================================
-- SECTION 6: Permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION notify_creator_of_campaign_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_creator_of_campaign_invite() TO service_role;
