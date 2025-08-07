-- Fix notification function ambiguity issue
-- The problem: Multiple versions of create_notification function exist causing ambiguity

-- Step 1: Drop the old version of create_notification (5 parameters)
DROP FUNCTION IF EXISTS create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB);

-- Step 2: Create a wrapper function that matches the old signature but calls the new one
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_body TEXT,
    p_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Call the new version with additional parameters as NULL
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
        p_body,
        p_data,
        NULL, -- related_id
        NULL  -- related_type
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Ensure the triggers work correctly
-- The notify_on_follow trigger should now work without ambiguity

-- Step 4: Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB) TO authenticated;

-- Optional: Add comment to clarify the function
COMMENT ON FUNCTION create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB) IS 
'Legacy wrapper for create_notification - calls the full version with NULL related fields';