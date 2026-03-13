-- Backfill missing 'campaigns' and 'engagement' notification preference rows
-- for existing users, and update the default creation trigger to include them.

-- 1. Backfill 'campaigns' for users who don't have it yet
INSERT INTO notification_preferences (user_id, category, push_enabled, in_app_enabled, email_enabled, frequency)
SELECT id, 'campaigns', true, true, false, 'immediate'
FROM auth.users
WHERE id NOT IN (
  SELECT user_id FROM notification_preferences WHERE category = 'campaigns'
);

-- 2. Backfill 'engagement' for users who don't have it yet
INSERT INTO notification_preferences (user_id, category, push_enabled, in_app_enabled, email_enabled, frequency)
SELECT id, 'engagement', true, true, false, 'immediate'
FROM auth.users
WHERE id NOT IN (
  SELECT user_id FROM notification_preferences WHERE category = 'engagement'
);

-- 3. Update the trigger function to include campaigns and engagement for new users
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
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
