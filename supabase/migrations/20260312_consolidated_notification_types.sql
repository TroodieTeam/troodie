-- ============================================================================
-- Consolidated Notification Types Migration
-- ============================================================================
-- Updates the notifications type constraint to include all 18 notification types
-- and adds campaign/engagement preference columns to notification_preferences.
--
-- Types added: campaign_opportunity, campaign_application, application_approved,
--   campaign_deadline, deliverable_submitted, payment_sent, campaign_invite,
--   friend_post, weekly_recap
--
-- Date: 2026-03-12
-- ============================================================================

-- 1. Drop and recreate the notifications type constraint with all 18 types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    -- Original types
    'like',
    'comment',
    'follow',
    'achievement',
    'restaurant_recommendation',
    'board_invite',
    'post_mention',
    'milestone',
    'system',
    -- Campaign types
    'campaign_opportunity',
    'campaign_application',
    'application_approved',
    'campaign_deadline',
    'deliverable_submitted',
    'payment_sent',
    'campaign_invite',
    -- Engagement types
    'friend_post',
    'weekly_recap'
  )
);

-- 2. Add campaign and engagement preference columns to notification_preferences
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS campaigns_push_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS campaigns_in_app_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS engagement_push_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS engagement_in_app_enabled BOOLEAN DEFAULT true;

-- 3. Update the default notification preferences trigger to include new categories
CREATE OR REPLACE FUNCTION insert_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, category) VALUES
    (NEW.id, 'social'),
    (NEW.id, 'achievements'),
    (NEW.id, 'restaurants'),
    (NEW.id, 'boards'),
    (NEW.id, 'system'),
    (NEW.id, 'campaigns'),
    (NEW.id, 'engagement')
  ON CONFLICT (user_id, category) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Backfill campaigns and engagement preference rows for existing users
-- who don't already have them
INSERT INTO notification_preferences (user_id, category)
SELECT u.id, cat.category
FROM auth.users u
CROSS JOIN (VALUES ('campaigns'), ('engagement')) AS cat(category)
WHERE NOT EXISTS (
  SELECT 1 FROM notification_preferences np
  WHERE np.user_id = u.id AND np.category = cat.category
)
ON CONFLICT (user_id, category) DO NOTHING;

COMMENT ON CONSTRAINT notifications_type_check ON notifications IS
  'Consolidated check for all 18 notification types (original 9 + campaign 7 + engagement 2)';
