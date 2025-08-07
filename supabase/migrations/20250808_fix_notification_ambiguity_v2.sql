-- Fix notification function ambiguity issue (v2)
-- This completely resolves the duplicate function signature problem

-- Step 1: Drop ALL existing create_notification functions
DROP FUNCTION IF EXISTS create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS create_notification(UUID, VARCHAR(50), VARCHAR(255), TEXT, JSONB, VARCHAR(255), VARCHAR(50)) CASCADE;
DROP FUNCTION IF EXISTS create_notification(target_user_id UUID, notification_type VARCHAR(50), notification_title VARCHAR(255), notification_message TEXT, notification_data JSONB, related_content_id VARCHAR(255), related_content_type VARCHAR(50)) CASCADE;

-- Step 2: Create a single, unified create_notification function that handles all cases
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'::jsonb,
    p_related_id VARCHAR DEFAULT NULL,
    p_related_type VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, 
        type, 
        title, 
        message, 
        data, 
        related_id, 
        related_type,
        is_read,
        is_actioned,
        created_at
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_data,
        p_related_id,
        p_related_type,
        false,
        false,
        now()
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Update the follow notification trigger to use explicit parameter names
DROP TRIGGER IF EXISTS trigger_follow_notification ON user_relationships;
DROP FUNCTION IF EXISTS notify_on_follow() CASCADE;

CREATE OR REPLACE FUNCTION notify_on_follow() RETURNS TRIGGER AS $$
DECLARE
    follower_name TEXT;
    notification_id UUID;
BEGIN
    -- Get follower's name
    SELECT COALESCE(name, username, 'Someone') INTO follower_name 
    FROM users 
    WHERE id = NEW.follower_id;
    
    -- Create notification with explicit parameters
    notification_id := create_notification(
        p_user_id := NEW.following_id,
        p_type := 'follow',
        p_title := 'New Follower',
        p_message := follower_name || ' started following you',
        p_data := jsonb_build_object('follower_id', NEW.follower_id),
        p_related_id := NEW.follower_id::text,
        p_related_type := 'user'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate the trigger
CREATE TRIGGER trigger_follow_notification
AFTER INSERT ON user_relationships
FOR EACH ROW
EXECUTE FUNCTION notify_on_follow();

-- Step 5: Fix other notification triggers that might have the same issue
-- Fix like notification trigger
DROP TRIGGER IF EXISTS trigger_like_notification ON save_interactions;
DROP FUNCTION IF EXISTS notify_on_like() CASCADE;

CREATE OR REPLACE FUNCTION notify_on_like() RETURNS TRIGGER AS $$
DECLARE
    save_owner_id UUID;
    liker_name TEXT;
    notification_id UUID;
BEGIN
    -- Don't notify for self-likes
    SELECT user_id INTO save_owner_id FROM restaurant_saves WHERE id = NEW.save_id;
    
    IF NEW.user_id != save_owner_id AND NEW.interaction_type = 'like' THEN
        SELECT COALESCE(name, username, 'Someone') INTO liker_name 
        FROM users 
        WHERE id = NEW.user_id;
        
        notification_id := create_notification(
            p_user_id := save_owner_id,
            p_type := 'like',
            p_title := 'New Like',
            p_message := liker_name || ' liked your save',
            p_data := jsonb_build_object('save_id', NEW.save_id, 'user_id', NEW.user_id),
            p_related_id := NEW.save_id::text,
            p_related_type := 'save'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_like_notification
AFTER INSERT ON save_interactions
FOR EACH ROW
WHEN (NEW.interaction_type = 'like')
EXECUTE FUNCTION notify_on_like();

-- Fix comment notification trigger
DROP TRIGGER IF EXISTS trigger_comment_notification ON comments;
DROP FUNCTION IF EXISTS notify_on_comment() CASCADE;

CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
DECLARE
    save_owner_id UUID;
    commenter_name TEXT;
    notification_id UUID;
BEGIN
    -- Don't notify for self-comments
    SELECT user_id INTO save_owner_id FROM restaurant_saves WHERE id = NEW.save_id;
    
    IF NEW.user_id != save_owner_id THEN
        SELECT COALESCE(name, username, 'Someone') INTO commenter_name 
        FROM users 
        WHERE id = NEW.user_id;
        
        notification_id := create_notification(
            p_user_id := save_owner_id,
            p_type := 'comment',
            p_title := 'New Comment',
            p_message := commenter_name || ' commented on your save',
            p_data := jsonb_build_object('save_id', NEW.save_id, 'comment_id', NEW.id, 'user_id', NEW.user_id),
            p_related_id := NEW.save_id::text,
            p_related_type := 'save'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_comment_notification
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION notify_on_comment();

-- Step 6: Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_follow() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_like() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_comment() TO authenticated;

-- Step 7: Add helpful comment
COMMENT ON FUNCTION create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB, VARCHAR, VARCHAR) IS 
'Unified notification creation function - handles all notification types with optional related fields';