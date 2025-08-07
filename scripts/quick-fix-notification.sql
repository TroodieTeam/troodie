-- Quick fix to run directly in Supabase SQL Editor
-- This resolves the immediate issue

-- Drop the conflicting functions
DROP FUNCTION IF EXISTS create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB) CASCADE;

-- Keep only the 7-parameter version and make the last 2 parameters optional
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
$$ LANGUAGE plpgsql;

-- Fix the follow trigger to use the updated function
CREATE OR REPLACE FUNCTION notify_on_follow() RETURNS TRIGGER AS $$
DECLARE
    follower_name TEXT;
BEGIN
    SELECT COALESCE(name, username, 'Someone') INTO follower_name 
    FROM users 
    WHERE id = NEW.follower_id;
    
    PERFORM create_notification(
        NEW.following_id,
        'follow',
        'New Follower',
        follower_name || ' started following you',
        jsonb_build_object('follower_id', NEW.follower_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;