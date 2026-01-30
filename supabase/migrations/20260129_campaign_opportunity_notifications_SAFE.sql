-- =====================================================
-- Campaign Opportunity Notifications Migration
-- WITH TRANSACTION AND ROLLBACK SUPPORT
-- =====================================================
-- 
-- This migration is wrapped in a transaction.
-- If anything fails, all changes will be rolled back automatically.
--

BEGIN;

-- Set this to see what's happening
SET client_min_messages TO NOTICE;

-- =====================================================
-- 1. Add Campaign Notification Preference Columns
-- =====================================================

DO $$
BEGIN
  -- Add campaign notification preferences to notification_preferences table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notification_preferences' 
    AND column_name = 'campaign_opportunities_push_enabled'
  ) THEN
    ALTER TABLE notification_preferences 
    ADD COLUMN campaign_opportunities_push_enabled BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added column: campaign_opportunities_push_enabled';
  ELSE
    RAISE NOTICE 'Column already exists: campaign_opportunities_push_enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notification_preferences' 
    AND column_name = 'campaign_opportunities_in_app_enabled'
  ) THEN
    ALTER TABLE notification_preferences 
    ADD COLUMN campaign_opportunities_in_app_enabled BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added column: campaign_opportunities_in_app_enabled';
  ELSE
    RAISE NOTICE 'Column already exists: campaign_opportunities_in_app_enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notification_preferences' 
    AND column_name = 'campaign_opportunities_email_enabled'
  ) THEN
    ALTER TABLE notification_preferences 
    ADD COLUMN campaign_opportunities_email_enabled BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added column: campaign_opportunities_email_enabled';
  ELSE
    RAISE NOTICE 'Column already exists: campaign_opportunities_email_enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notification_preferences' 
    AND column_name = 'campaign_opportunities_frequency'
  ) THEN
    ALTER TABLE notification_preferences 
    ADD COLUMN campaign_opportunities_frequency TEXT DEFAULT 'immediate';
    RAISE NOTICE 'Added column: campaign_opportunities_frequency';
  ELSE
    RAISE NOTICE 'Column already exists: campaign_opportunities_frequency';
  END IF;
  
  RAISE NOTICE 'Step 1 completed: Preference columns added';
END $$;

-- Add column comments
COMMENT ON COLUMN notification_preferences.campaign_opportunities_push_enabled 
IS 'Enable push notifications for new campaign opportunities';

COMMENT ON COLUMN notification_preferences.campaign_opportunities_in_app_enabled 
IS 'Enable in-app notifications for new campaign opportunities';

COMMENT ON COLUMN notification_preferences.campaign_opportunities_frequency 
IS 'Frequency for campaign opportunity notifications: immediate, daily, or weekly';

-- =====================================================
-- 1.5. Update Notifications Type Check Constraint
-- =====================================================
-- CRITICAL: The notifications table has a CHECK constraint that validates allowed types.
-- We must add 'campaign_opportunity' to this constraint or inserts will fail.

DO $$
BEGIN
  -- Drop the old constraint
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  
  -- Create new constraint with campaign_opportunity included
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type::text = ANY (ARRAY[
    'like'::text,
    'comment'::text,
    'follow'::text,
    'achievement'::text,
    'restaurant_recommendation'::text,
    'board_invite'::text,
    'post_mention'::text,
    'milestone'::text,
    'campaign_opportunity'::text,  -- NEW TYPE ADDED
    'system'::text,
    'restaurant_mention'::text,
    'new_campaign_posted'::text,
    'campaign_application_submitted'::text
  ]));
  
  RAISE NOTICE 'Updated notifications_type_check constraint to include campaign_opportunity';
END $$;

DO $$ BEGIN RAISE NOTICE 'Step 1.5 completed: Notifications type constraint updated'; END $$;

-- =====================================================
-- 2. Create Function to Get Creators by Location
-- =====================================================

CREATE OR REPLACE FUNCTION get_creators_in_city(
  p_city TEXT,
  p_state TEXT DEFAULT NULL
)
RETURNS TABLE (
  creator_id UUID,
  user_id UUID,
  display_name VARCHAR(100),
  location VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id as creator_id,
    cp.user_id,
    cp.display_name,
    cp.location
  FROM creator_profiles cp
  WHERE 
    cp.location IS NOT NULL
    AND cp.location != ''
    AND (
      -- Match exact city name at start of location (case-insensitive)
      -- Examples: "Charlotte, NC", "Charlotte", "charlotte, nc"
      LOWER(cp.location) LIKE LOWER(p_city) || '%'
      OR
      -- Match city name with comma (handles "City, State" format)
      LOWER(cp.location) LIKE LOWER(p_city || ',%')
    )
    -- Optional: If state is provided, ensure it's in the location string
    AND (
      p_state IS NULL 
      OR LOWER(cp.location) LIKE '%' || LOWER(p_state) || '%'
    );
END;
$$;

COMMENT ON FUNCTION get_creators_in_city 
IS 'Returns creators whose location matches the given city name. Handles free-form location text like "Charlotte, NC"';

DO $$ BEGIN RAISE NOTICE 'Step 2 completed: get_creators_in_city function created'; END $$;

-- =====================================================
-- 3. Create Trigger Function for Campaign Notifications
-- =====================================================

CREATE OR REPLACE FUNCTION notify_creators_of_new_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant RECORD;
  v_creator RECORD;
  v_notification_data JSONB;
  v_notification_count INTEGER := 0;
BEGIN
  -- Only process active restaurant-created campaigns
  IF NEW.status != 'active' OR NEW.campaign_source != 'restaurant' THEN
    RAISE NOTICE 'Skipping notification: status=% source=%', NEW.status, NEW.campaign_source;
    RETURN NEW;
  END IF;

  -- Get restaurant details (only columns that exist)
  SELECT id, name, city, state
  INTO v_restaurant
  FROM restaurants
  WHERE id = NEW.restaurant_id;

  -- Skip if no restaurant or no city data
  IF v_restaurant IS NULL OR v_restaurant.city IS NULL OR v_restaurant.city = '' THEN
    RAISE NOTICE 'Skipping notification: no restaurant city data';
    RETURN NEW;
  END IF;

  -- Prepare notification data
  v_notification_data := jsonb_build_object(
    'campaignId', NEW.id,
    'campaignTitle', NEW.title,
    'restaurantId', v_restaurant.id,
    'restaurantName', v_restaurant.name,
    'restaurantCity', v_restaurant.city,
    'budgetCents', NEW.budget_cents
  );

  -- Create notifications for all creators in the same city
  FOR v_creator IN (
    SELECT user_id, display_name, location
    FROM get_creators_in_city(
      v_restaurant.city,
      v_restaurant.state
    )
  ) LOOP
    BEGIN
      -- Insert notification
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data,
        related_id,
        related_type,
        priority,
        is_read,
        is_actioned,
        created_at
      ) VALUES (
        v_creator.user_id,
        'campaign_opportunity',
        'New Campaign Opportunity Posted',
        'New campaign opportunity at ' || v_restaurant.name,
        v_notification_data,
        NEW.id,
        'campaign',
        2,
        false,
        false,
        NOW()
      );
      
      v_notification_count := v_notification_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the campaign creation
      RAISE WARNING 'Failed to create notification for creator % (location: %): %', 
        v_creator.user_id, v_creator.location, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Created % campaign opportunity notifications for campaign % in %', 
    v_notification_count, NEW.id, v_restaurant.city;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_creators_of_new_campaign 
IS 'Trigger function that notifies creators in the same city when a restaurant posts a new campaign';

DO $$ BEGIN RAISE NOTICE 'Step 3 completed: notify_creators_of_new_campaign function created'; END $$;

-- =====================================================
-- 4. Create Trigger on Campaigns Table
-- =====================================================

-- Drop trigger if it exists (for re-running migration)
DROP TRIGGER IF EXISTS trigger_notify_creators_of_new_campaign ON campaigns;

-- Create trigger on campaigns table
CREATE TRIGGER trigger_notify_creators_of_new_campaign
  AFTER INSERT ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION notify_creators_of_new_campaign();

COMMENT ON TRIGGER trigger_notify_creators_of_new_campaign ON campaigns 
IS 'Automatically notifies creators in the same city when a restaurant posts a campaign';

DO $$ BEGIN RAISE NOTICE 'Step 4 completed: Trigger created on campaigns table'; END $$;

-- =====================================================
-- 5. Verification
-- =====================================================

DO $$
DECLARE
  v_trigger_count INTEGER;
  v_function_count INTEGER;
  v_column_count INTEGER;
BEGIN
  -- Check trigger exists
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname = 'trigger_notify_creators_of_new_campaign';
  
  -- Check function exists
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE proname IN ('notify_creators_of_new_campaign', 'get_creators_in_city');
  
  -- Check columns exist
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'notification_preferences'
    AND column_name LIKE 'campaign_opportunities_%';
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Migration Verification:';
  RAISE NOTICE 'Trigger created: %', CASE WHEN v_trigger_count > 0 THEN 'YES ✓' ELSE 'NO ✗' END;
  RAISE NOTICE 'Functions created: % of 2', v_function_count;
  RAISE NOTICE 'Preference columns added: % of 4', v_column_count;
  RAISE NOTICE '===========================================';
  
  -- Fail transaction if verification doesn't pass
  IF v_trigger_count = 0 OR v_function_count < 2 OR v_column_count < 4 THEN
    RAISE EXCEPTION 'Migration verification failed! Rolling back...';
  END IF;
  
  RAISE NOTICE 'All verifications passed! ✓';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Migration completed successfully!';
  RAISE NOTICE 'All changes have been committed.';
END $$;

-- =====================================================
-- COMMIT THE TRANSACTION
-- =====================================================

COMMIT;
