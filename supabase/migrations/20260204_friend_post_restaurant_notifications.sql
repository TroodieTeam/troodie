-- =====================================================
-- FRIEND POST AT RESTAURANT NOTIFICATIONS MIGRATION
-- =====================================================
-- Description: Notifies followers when a user posts at a restaurant
-- =====================================================

-- Start transaction for safety
BEGIN;

-- 1. Update notification type constraint to include 'friend_post_restaurant'
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
  'weekly_recap',
  'friend_post_restaurant'
));

-- 2. Add notification preference columns
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS friend_post_restaurant_email_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS friend_post_restaurant_push_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS friend_post_restaurant_in_app_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS friend_post_restaurant_frequency TEXT DEFAULT 'immediate';

-- 3. Create trigger function to notify followers
CREATE OR REPLACE FUNCTION notify_followers_of_restaurant_post()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_username TEXT;
  v_restaurant_name TEXT;
  v_follower_record RECORD;
  v_poster_user_record_id UUID;
BEGIN
  -- Get poster's user record ID from users table
  SELECT id INTO v_poster_user_record_id
  FROM users
  WHERE id = NEW.user_id;

  -- Get poster's username
  SELECT username INTO v_username
  FROM users
  WHERE id = NEW.user_id;

  -- Get restaurant name
  SELECT name INTO v_restaurant_name
  FROM restaurants
  WHERE id = NEW.restaurant_id;

  -- Notify all followers
  FOR v_follower_record IN
    SELECT ur.follower_id
    FROM user_relationships ur
    WHERE ur.following_id = v_poster_user_record_id
  LOOP
    -- Insert notification (respects preferences, NULL = enabled by default)
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      related_type,
      related_id,
      priority
    )
    SELECT
      v_follower_record.follower_id,
      'friend_post_restaurant',
      'Friend Activity 🍽️',
      '@' || v_username || ' just tried ' || v_restaurant_name || '! See their review',
      jsonb_build_object(
        'post_id', NEW.id,
        'username', v_username,
        'restaurant_name', v_restaurant_name,
        'restaurant_id', NEW.restaurant_id
      ),
      'post',
      NEW.id,
      1
    WHERE NOT EXISTS (
      -- Skip if user explicitly disabled this notification
      SELECT 1 FROM notification_preferences np
      WHERE np.user_id = v_follower_record.follower_id
      AND np.friend_post_restaurant_push_enabled = false
      AND np.friend_post_restaurant_in_app_enabled = false
    );
  END LOOP;

  RAISE NOTICE 'Notified followers of restaurant post';
  RETURN NEW;
END;
$$;

-- 4. Create trigger on posts table
DROP TRIGGER IF EXISTS trigger_notify_followers_of_restaurant_post ON posts;

CREATE TRIGGER trigger_notify_followers_of_restaurant_post
AFTER INSERT ON posts
FOR EACH ROW
WHEN (NEW.restaurant_id IS NOT NULL)
EXECUTE FUNCTION notify_followers_of_restaurant_post();

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================
COMMIT;

-- If something went wrong, run this instead to undo everything:
-- ROLLBACK;

-- =====================================================
-- VERIFICATION QUERIES (Run separately)
-- =====================================================
/*
-- Check if trigger was created
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_notify_followers_of_restaurant_post';

-- Check if function exists
SELECT proname FROM pg_proc 
WHERE proname = 'notify_followers_of_restaurant_post';

-- Test by creating a post at a restaurant
INSERT INTO posts (user_id, restaurant_id, content)
SELECT 
  u.id,
  (SELECT id FROM restaurants LIMIT 1),
  'Test post at restaurant!'
FROM auth.users u
LIMIT 1;

-- Check notifications created
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.data,
  u.email as recipient
FROM notifications n
JOIN auth.users u ON n.user_id = u.id
WHERE n.type = 'friend_post_restaurant'
ORDER BY n.created_at DESC
LIMIT 5;
*/
