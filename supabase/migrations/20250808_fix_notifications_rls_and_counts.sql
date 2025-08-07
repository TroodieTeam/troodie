-- Fix RLS policies for notifications and follower/following counts

-- Step 1: Fix RLS policies for notifications table
-- Allow authenticated users to insert notifications for any user (needed for triggers)
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;

-- Allow the system (via triggers) to create notifications
CREATE POLICY "Enable insert for authenticated users and system" 
ON notifications FOR INSERT 
WITH CHECK (true);

-- Users can only read their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read, etc)
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications" 
ON notifications FOR DELETE 
USING (auth.uid() = user_id);

-- Step 2: Ensure the create_notification function has proper permissions
ALTER FUNCTION create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB, VARCHAR, VARCHAR) 
SECURITY DEFINER
SET search_path = public;

-- Step 3: Create function to update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment follower count for the user being followed
        UPDATE users 
        SET followers_count = COALESCE(followers_count, 0) + 1
        WHERE id = NEW.following_id;
        
        -- Increment following count for the user who is following
        UPDATE users 
        SET following_count = COALESCE(following_count, 0) + 1
        WHERE id = NEW.follower_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement follower count for the user being unfollowed
        UPDATE users 
        SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0)
        WHERE id = OLD.following_id;
        
        -- Decrement following count for the user who is unfollowing
        UPDATE users 
        SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0)
        WHERE id = OLD.follower_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger for updating counts
DROP TRIGGER IF EXISTS trigger_update_follow_counts ON user_relationships;
CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON user_relationships
FOR EACH ROW
EXECUTE FUNCTION update_follow_counts();

-- Step 5: Fix existing counts (one-time correction)
-- Update all users' follower counts
UPDATE users u
SET followers_count = (
    SELECT COUNT(*)
    FROM user_relationships
    WHERE following_id = u.id
);

-- Update all users' following counts
UPDATE users u
SET following_count = (
    SELECT COUNT(*)
    FROM user_relationships
    WHERE follower_id = u.id
);

-- Step 6: Ensure notify_on_follow function works with RLS
DROP FUNCTION IF EXISTS notify_on_follow() CASCADE;
CREATE OR REPLACE FUNCTION notify_on_follow() RETURNS TRIGGER AS $$
DECLARE
    follower_name TEXT;
    follower_username TEXT;
    notification_id UUID;
BEGIN
    -- Get follower's name and username
    SELECT name, username INTO follower_name, follower_username
    FROM users 
    WHERE id = NEW.follower_id;
    
    -- Create notification using the function with SECURITY DEFINER
    notification_id := create_notification(
        p_user_id := NEW.following_id,
        p_type := 'follow',
        p_title := 'New Follower',
        p_message := COALESCE(follower_name, follower_username, 'Someone') || ' started following you',
        p_data := jsonb_build_object(
            'follower_id', NEW.follower_id,
            'follower_name', follower_name,
            'follower_username', follower_username
        ),
        p_related_id := NEW.follower_id::text,
        p_related_type := 'user'
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the follow operation
        RAISE WARNING 'Failed to create follow notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Recreate the follow notification trigger
DROP TRIGGER IF EXISTS trigger_follow_notification ON user_relationships;
CREATE TRIGGER trigger_follow_notification
AFTER INSERT ON user_relationships
FOR EACH ROW
EXECUTE FUNCTION notify_on_follow();

-- Step 8: Grant necessary permissions
GRANT ALL ON notifications TO authenticated;
GRANT USAGE ON SEQUENCE notifications_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_follow() TO authenticated;
GRANT EXECUTE ON FUNCTION update_follow_counts() TO authenticated;

-- Step 9: Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_relationships ENABLE ROW LEVEL SECURITY;

-- Step 10: Add RLS policies for user_relationships if missing
DROP POLICY IF EXISTS "Users can insert their own relationships" ON user_relationships;
CREATE POLICY "Users can insert their own relationships" 
ON user_relationships FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can delete their own relationships" ON user_relationships;
CREATE POLICY "Users can delete their own relationships" 
ON user_relationships FOR DELETE 
USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Anyone can view relationships" ON user_relationships;
CREATE POLICY "Anyone can view relationships" 
ON user_relationships FOR SELECT 
USING (true);

-- Add helpful comments
COMMENT ON FUNCTION update_follow_counts() IS 'Automatically updates follower and following counts when relationships change';
COMMENT ON POLICY "Enable insert for authenticated users and system" ON notifications IS 'Allows triggers and authenticated users to create notifications';