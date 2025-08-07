-- Final fix for notification RLS policies to allow follow notifications

-- Step 1: Drop ALL existing notification policies to start fresh
DO $$ 
BEGIN
    -- Drop all existing policies on notifications table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notifications') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON notifications';
    END LOOP;
END $$;

-- Step 2: Create new comprehensive policies for notifications
-- Allow anyone authenticated to insert (needed for triggers and cross-user notifications)
CREATE POLICY "Allow authenticated insert" 
ON notifications FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Users can only see their own notifications
CREATE POLICY "Users read own notifications" 
ON notifications FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Users can only update their own notifications
CREATE POLICY "Users update own notifications" 
ON notifications FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own notifications
CREATE POLICY "Users delete own notifications" 
ON notifications FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Step 3: Recreate the create_notification function with SECURITY DEFINER
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
    v_notification_id UUID;
BEGIN
    -- Insert notification without RLS checks (SECURITY DEFINER)
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data,
        related_id,
        related_type,
        is_read,
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
        NOW()
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create notification: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate the notify_on_follow function with better error handling
CREATE OR REPLACE FUNCTION notify_on_follow() RETURNS TRIGGER AS $$
DECLARE
    follower_name TEXT;
    follower_username TEXT;
    follower_avatar TEXT;
    notification_id UUID;
BEGIN
    -- Get follower's details
    SELECT name, username, avatar_url 
    INTO follower_name, follower_username, follower_avatar
    FROM users 
    WHERE id = NEW.follower_id;
    
    -- Create notification for the user being followed
    -- This runs with SECURITY DEFINER privileges
    notification_id := create_notification(
        NEW.following_id,  -- user who receives the notification
        'follow',
        'New Follower',
        COALESCE(follower_name, follower_username, 'Someone') || ' started following you',
        jsonb_build_object(
            'follower_id', NEW.follower_id,
            'follower_name', follower_name,
            'follower_username', follower_username,
            'follower_avatar', follower_avatar,
            'created_at', NEW.created_at
        ),
        NEW.follower_id::text,
        'user'
    );
    
    IF notification_id IS NULL THEN
        RAISE WARNING 'Failed to create notification for follow event';
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the follow operation
        RAISE WARNING 'Error in notify_on_follow: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS trigger_follow_notification ON user_relationships;
CREATE TRIGGER trigger_follow_notification
AFTER INSERT ON user_relationships
FOR EACH ROW
EXECUTE FUNCTION notify_on_follow();

-- Step 6: Grant execute permissions
GRANT EXECUTE ON FUNCTION create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_follow() TO authenticated;

-- Step 7: Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 8: Add comment for clarity
COMMENT ON POLICY "Allow authenticated insert" ON notifications IS 
'Allows any authenticated user to insert notifications - needed for triggers creating notifications for other users during follow events';

-- Step 9: Test that policies are working
DO $$
BEGIN
    -- Check if policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Allow authenticated insert'
    ) THEN
        RAISE EXCEPTION 'Insert policy was not created successfully';
    END IF;
    
    RAISE NOTICE 'Notification RLS policies have been successfully configured';
END $$;