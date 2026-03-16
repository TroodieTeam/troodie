-- Friend Post Notification Trigger
-- Fires when a new post is created (INSERT on posts)
-- Notifies followers of the post author
-- Rate-limited: max 1 friend_post notification per follower per hour
-- Part of TRO-18: Push Notifications

-- Drop existing trigger and function if they exist (idempotent)
DROP TRIGGER IF EXISTS trigger_friend_post_notification ON posts;
DROP FUNCTION IF EXISTS notify_friend_post() CASCADE;

CREATE OR REPLACE FUNCTION notify_friend_post()
RETURNS TRIGGER AS $$
DECLARE
    author_record RECORD;
    follower_record RECORD;
    restaurant_name TEXT;
    notification_id UUID;
BEGIN
    -- Only notify for public posts
    IF COALESCE(NEW.privacy, 'public') != 'public' THEN
        RETURN NEW;
    END IF;

    -- Get author info
    SELECT u.id, u.name, u.avatar_url
    INTO author_record
    FROM users u
    WHERE u.id = NEW.user_id;

    IF author_record.id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get restaurant name if this is a restaurant post
    IF NEW.restaurant_id IS NOT NULL THEN
        SELECT COALESCE(r.name, 'a restaurant')
        INTO restaurant_name
        FROM restaurants r
        WHERE r.id = NEW.restaurant_id;
    END IF;

    -- Find followers and notify each one
    FOR follower_record IN
        SELECT ur.follower_id
        FROM user_relationships ur
        WHERE ur.following_id = NEW.user_id
          -- Check engagement notification preferences
          AND NOT EXISTS (
              SELECT 1 FROM notification_preferences np
              WHERE np.user_id = ur.follower_id
                AND np.engagement_in_app_enabled = false
          )
          -- Rate limit: no friend_post notification for this follower in the last hour
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.user_id = ur.follower_id
                AND n.type = 'friend_post'
                AND n.data->>'authorId' = NEW.user_id::text
                AND n.created_at > NOW() - INTERVAL '1 hour'
          )
    LOOP
        notification_id := create_notification(
            p_user_id := follower_record.follower_id,
            p_type := 'friend_post',
            p_title := COALESCE(author_record.name, 'Someone you follow') || ' shared a new post',
            p_message := CASE
                WHEN restaurant_name IS NOT NULL THEN
                    COALESCE(author_record.name, 'Someone') || ' posted about ' || restaurant_name
                ELSE
                    COALESCE(author_record.name, 'Someone') || ' shared a new post'
            END,
            p_data := jsonb_build_object(
                'postId', NEW.id,
                'postType', COALESCE(NEW.post_type, 'restaurant'),
                'authorId', NEW.user_id,
                'authorName', COALESCE(author_record.name, ''),
                'authorAvatar', COALESCE(author_record.avatar_url, ''),
                'restaurantName', COALESCE(restaurant_name, '')
            ),
            p_related_id := NEW.id::text,
            p_related_type := 'post'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on INSERT only
CREATE TRIGGER trigger_friend_post_notification
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION notify_friend_post();
