-- Quick fix for follow issues - Run this in Supabase SQL Editor

-- 1. Fix RLS for notifications - allow system to create notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authenticated users and system" ON notifications;
CREATE POLICY "Enable insert for authenticated users and system" 
ON notifications FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Make create_notification function bypass RLS
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
        related_type
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_data,
        p_related_id,
        p_related_type
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix follow counts trigger
CREATE OR REPLACE FUNCTION update_follow_counts() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update follower count for the person being followed
        UPDATE users 
        SET followers_count = COALESCE(followers_count, 0) + 1
        WHERE id = NEW.following_id;
        
        -- Update following count for the person doing the following
        UPDATE users 
        SET following_count = COALESCE(following_count, 0) + 1
        WHERE id = NEW.follower_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update counts for unfollow
        UPDATE users 
        SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0)
        WHERE id = OLD.following_id;
        
        UPDATE users 
        SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0)
        WHERE id = OLD.follower_id;
        
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_follow_counts ON user_relationships;
CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON user_relationships
FOR EACH ROW
EXECUTE FUNCTION update_follow_counts();

-- 4. Fix the notification trigger
CREATE OR REPLACE FUNCTION notify_on_follow() RETURNS TRIGGER AS $$
DECLARE
    follower_name TEXT;
BEGIN
    SELECT COALESCE(name, username, 'Someone') INTO follower_name 
    FROM users 
    WHERE id = NEW.follower_id;
    
    -- Use the SECURITY DEFINER function
    PERFORM create_notification(
        NEW.following_id,
        'follow',
        'New Follower',
        follower_name || ' started following you',
        jsonb_build_object('follower_id', NEW.follower_id)
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the follow if notification fails
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_follow_notification ON user_relationships;
CREATE TRIGGER trigger_follow_notification
AFTER INSERT ON user_relationships
FOR EACH ROW
EXECUTE FUNCTION notify_on_follow();

-- 5. Fix current counts (one-time correction)
UPDATE users u
SET followers_count = (
    SELECT COUNT(*) FROM user_relationships WHERE following_id = u.id
),
following_count = (
    SELECT COUNT(*) FROM user_relationships WHERE follower_id = u.id
);

-- 6. Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;