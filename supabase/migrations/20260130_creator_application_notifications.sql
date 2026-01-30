-- Migration: Enable "Creator Applied" Notifications
-- Date: 2026-01-30
-- Description: Adds database support for notifying business owners when a creator applies to their campaign.
-- NOTE: Uses 'campaign_application_submitted' to match existing database naming convention

BEGIN;

-- 1. Add preference columns to notification_preferences
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'campaign_application_email_enabled') THEN
        ALTER TABLE public.notification_preferences ADD COLUMN campaign_application_email_enabled boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'campaign_application_push_enabled') THEN
        ALTER TABLE public.notification_preferences ADD COLUMN campaign_application_push_enabled boolean DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'campaign_application_in_app_enabled') THEN
        ALTER TABLE public.notification_preferences ADD COLUMN campaign_application_in_app_enabled boolean DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'campaign_application_frequency') THEN
        ALTER TABLE public.notification_preferences ADD COLUMN campaign_application_frequency text DEFAULT 'immediate';
    END IF;
END $$;

-- 2. Constraint update NOT needed - 'campaign_application_submitted' already exists in the constraint

-- 3. Create the Trigger Function
CREATE OR REPLACE FUNCTION notify_restaurant_of_application()
RETURNS TRIGGER AS $$
DECLARE
    v_campaign_title text;
    v_restaurant_owner_id uuid;
    v_creator_name text;
    v_restaurant_id uuid;
    v_pref_in_app boolean;
BEGIN
    -- A. Get Campaign Info (Title and Restaurant ID)
    SELECT title, restaurant_id INTO v_campaign_title, v_restaurant_id
    FROM public.campaigns
    WHERE id = NEW.campaign_id;

    -- B. Get Owner ID from Restaurant
    SELECT owner_id INTO v_restaurant_owner_id
    FROM public.restaurants
    WHERE id = v_restaurant_id;

    -- C. Get Creator Info (Name)
    SELECT 
        COALESCE(display_name, 'A creator')
    INTO v_creator_name
    FROM public.creator_profiles
    WHERE id = NEW.creator_id;

    -- D. Check Preferences (Default to TRUE if no record exists)
    SELECT COALESCE(campaign_application_in_app_enabled, true)
    INTO v_pref_in_app
    FROM public.notification_preferences
    WHERE user_id = v_restaurant_owner_id;

    -- E. Create Notification (if enabled)
    IF v_pref_in_app THEN
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
            v_restaurant_owner_id,                   -- To: Restaurant Owner
            'campaign_application_submitted',        -- Type (matches existing convention)
            'New Application Received',              -- Title
            v_creator_name || ' applied to your ' || v_campaign_title || ' campaign', -- Message
            jsonb_build_object(                      -- Data Payload
                'campaign_id', NEW.campaign_id,
                'creator_id', NEW.creator_id,
                'application_id', NEW.id
            ),
            NEW.campaign_id,                         -- Related ID
            'campaign',                              -- Related Type
            3                                        -- Priority (integer: 1=low, 2=medium, 3=high)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the Trigger
DROP TRIGGER IF EXISTS trigger_notify_restaurant_of_application ON public.campaign_applications;

CREATE TRIGGER trigger_notify_restaurant_of_application
AFTER INSERT ON public.campaign_applications
FOR EACH ROW
EXECUTE FUNCTION notify_restaurant_of_application();

COMMIT;
