-- Migration: Application Approval Notifications
-- Created: 2026-01-30
-- Purpose: Notify creators when their campaign application is accepted by restaurant owners

-- ============================================================================
-- 1. Update Notifications Table Type Constraint
-- ============================================================================

-- Add 'application_approved' to the allowed notification types
DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'notifications_type_check' 
        AND conrelid = 'notifications'::regclass
    ) THEN
        ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
    END IF;
    
    -- Re-create the constraint with ALL existing types plus the new one
    ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check CHECK (
        type IN (
            'board_invite',
            'campaign_application_submitted',
            'campaign_opportunity',
            'follow',
            'new_campaign_posted',
            'restaurant_mention',
            'system',
            'application_approved'  -- << New type
        )
    );
END $$;

-- ============================================================================
-- 2. Add Notification Preference Columns
-- ============================================================================

DO $$ 
BEGIN
    -- Add preference columns for application_approved notifications
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_preferences' 
        AND column_name = 'application_approved_email_enabled'
    ) THEN
        ALTER TABLE public.notification_preferences
        ADD COLUMN application_approved_email_enabled BOOLEAN DEFAULT false,
        ADD COLUMN application_approved_push_enabled BOOLEAN DEFAULT true,
        ADD COLUMN application_approved_in_app_enabled BOOLEAN DEFAULT true,
        ADD COLUMN application_approved_frequency TEXT DEFAULT 'immediate';
    END IF;
END $$;

-- ============================================================================
-- 3. Create Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_creator_of_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign_title TEXT;
    v_creator_user_id UUID;
    v_creator_name TEXT;
    v_restaurant_id UUID;
    v_in_app_enabled BOOLEAN;
    v_push_enabled BOOLEAN;
BEGIN
    -- Only trigger on UPDATE when status changes to 'accepted'
    IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        
        -- A. Get Campaign Info (Title & Restaurant ID)
        SELECT 
            COALESCE(c.title, c.name, 'a campaign'),
            c.restaurant_id
        INTO v_campaign_title, v_restaurant_id
        FROM public.campaigns c
        WHERE c.id = NEW.campaign_id;

        -- B. Get Creator Info (User ID & Display Name)
        SELECT 
            user_id,
            COALESCE(display_name, 'Creator')
        INTO v_creator_user_id, v_creator_name
        FROM public.creator_profiles
        WHERE id = NEW.creator_id;

        -- C. Check Preferences (Default to TRUE if no record exists)
        SELECT 
            COALESCE(application_approved_in_app_enabled, true),
            COALESCE(application_approved_push_enabled, true)
        INTO v_in_app_enabled, v_push_enabled
        FROM public.notification_preferences
        WHERE user_id = v_creator_user_id
        AND category = 'application_approved';

        -- If no preference row exists, default to enabled
        IF NOT FOUND THEN
            v_in_app_enabled := true;
            v_push_enabled := true;
        END IF;

        -- D. Insert Notification (if in-app or push enabled)
        IF v_in_app_enabled OR v_push_enabled THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                data,
                related_id,
                related_type,
                priority
            ) VALUES (
                v_creator_user_id,                      -- To: Creator
                'application_approved',                 -- Type
                'You''re Hired! 🎉',                    -- Title
                'You''re hired for ' || v_campaign_title || '! Get started now', -- Message
                jsonb_build_object(                     -- Data Payload
                    'campaign_id', NEW.campaign_id,
                    'application_id', NEW.id,
                    'restaurant_id', v_restaurant_id
                ),
                NEW.campaign_id,                        -- Related ID
                'campaign',                             -- Related Type
                3                                       -- Priority (high)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. Create Trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_notify_creator_of_approval ON public.campaign_applications;

CREATE TRIGGER trigger_notify_creator_of_approval
    AFTER UPDATE ON public.campaign_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_creator_of_approval();

-- ============================================================================
-- 5. Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.notify_creator_of_approval() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_creator_of_approval() TO service_role;

-- ============================================================================
-- NOTES
-- ============================================================================
-- Trigger Condition: status changes to 'accepted' (from any other status)
-- Notification Recipient: Creator (via creator_profiles.user_id)
-- Message: "You're hired for [Campaign Title]! Get started now"
-- Priority: 3 (high)
-- Data Payload: { campaign_id, application_id, restaurant_id }
