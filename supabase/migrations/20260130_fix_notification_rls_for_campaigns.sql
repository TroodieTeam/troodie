-- ============================================================================
-- Fix Notification RLS for Campaign Notifications
-- ============================================================================
-- Ensures create_notification function exists and RLS allows campaign notifications
-- ============================================================================

-- Step 1: Drop all existing versions of create_notification to avoid ambiguity
-- Use dynamic drop to catch all variants (TEXT vs VARCHAR, different parameter counts)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all create_notification functions
    FOR r IN (
        SELECT oid::regprocedure as func_sig
        FROM pg_proc
        WHERE proname = 'create_notification'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    END LOOP;
END $$;

-- Step 2: Create the unified create_notification function with SECURITY DEFINER
-- Use TEXT for p_type, p_title, p_related_id, p_related_type to match PostgreSQL's TEXT type
-- This ensures consistency and avoids type ambiguity
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'::jsonb,
    p_related_id TEXT DEFAULT NULL,
    p_related_type TEXT DEFAULT NULL
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions (using TEXT types)
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO authenticated;

-- Ensure RLS policy allows authenticated users to insert (fallback)
DROP POLICY IF EXISTS "Allow authenticated insert" ON notifications;
CREATE POLICY "Allow authenticated insert" 
ON notifications FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Add comment
COMMENT ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) IS 
'TRO-137: Creates notifications bypassing RLS - used for campaign notifications to creators';
