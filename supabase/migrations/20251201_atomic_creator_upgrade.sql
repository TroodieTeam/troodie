-- ================================================================
-- Atomic Creator Upgrade Migration
-- ================================================================
-- Task: CM-1 - Fix Creator Profile Race Condition
-- This migration creates an atomic function that upgrades a user to
-- creator AND creates their profile in a single transaction.
-- If either operation fails, the entire transaction is rolled back.
-- ================================================================

-- Drop existing function if exists to recreate
DROP FUNCTION IF EXISTS upgrade_to_creator(UUID, TEXT, TEXT, TEXT, TEXT[]);

-- ================================================================
-- ATOMIC CREATOR UPGRADE FUNCTION
-- ================================================================
-- This function handles both the user account upgrade and creator
-- profile creation atomically. If the profile creation fails,
-- the user remains a consumer with no partial state.
-- ================================================================
CREATE OR REPLACE FUNCTION upgrade_to_creator(
  p_user_id UUID,
  p_display_name TEXT,
  p_bio TEXT,
  p_location TEXT,
  p_specialties TEXT[]
) RETURNS JSON AS $$
DECLARE
  v_profile_id UUID;
  v_existing_profile_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Verify user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Check if user already has a creator profile
  SELECT id INTO v_existing_profile_id
  FROM creator_profiles
  WHERE user_id = p_user_id;

  IF v_existing_profile_id IS NOT NULL THEN
    -- User already has a creator profile, just ensure user is upgraded
    UPDATE users
    SET
      account_type = 'creator',
      is_creator = true,
      account_upgraded_at = COALESCE(account_upgraded_at, NOW()),
      updated_at = NOW()
    WHERE id = p_user_id;

    RETURN json_build_object(
      'success', true,
      'profile_id', v_existing_profile_id,
      'message', 'User already has creator profile'
    );
  END IF;

  -- Update user account type FIRST
  UPDATE users
  SET
    account_type = 'creator',
    is_creator = true,
    account_upgraded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to update user account'
    );
  END IF;

  -- Create creator profile
  INSERT INTO creator_profiles (
    user_id,
    display_name,
    bio,
    location,
    food_specialties,
    specialties,
    verification_status,
    instant_approved,
    portfolio_uploaded
  ) VALUES (
    p_user_id,
    COALESCE(p_display_name, 'Creator'),
    COALESCE(p_bio, 'Food lover and content creator'),
    COALESCE(p_location, 'Charlotte'),
    COALESCE(p_specialties, ARRAY['General']),
    COALESCE(p_specialties, ARRAY['General']),
    'verified',
    true,
    false  -- Will be set to true after portfolio images are uploaded
  )
  RETURNING id INTO v_profile_id;

  -- Return success with profile ID
  RETURN json_build_object(
    'success', true,
    'profile_id', v_profile_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error will cause automatic rollback of the entire transaction
  -- This ensures user account_type is NOT changed if profile creation fails
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upgrade_to_creator(UUID, TEXT, TEXT, TEXT, TEXT[]) TO authenticated;

-- ================================================================
-- ADD PORTFOLIO ITEMS FUNCTION
-- ================================================================
-- This function adds portfolio items to a creator profile
-- Called after successful creator upgrade with image URLs
-- ================================================================
CREATE OR REPLACE FUNCTION add_creator_portfolio_items(
  p_creator_profile_id UUID,
  p_items JSONB  -- Array of {image_url, caption, display_order, is_featured}
) RETURNS JSON AS $$
DECLARE
  v_item JSONB;
  v_items_added INTEGER := 0;
BEGIN
  -- Validate creator profile exists and belongs to current user
  IF NOT EXISTS (
    SELECT 1 FROM creator_profiles
    WHERE id = p_creator_profile_id
    AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Creator profile not found or unauthorized'
    );
  END IF;

  -- Delete existing portfolio items (replace mode)
  DELETE FROM creator_portfolio_items
  WHERE creator_profile_id = p_creator_profile_id;

  -- Insert new portfolio items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO creator_portfolio_items (
      creator_profile_id,
      image_url,
      caption,
      display_order,
      is_featured
    ) VALUES (
      p_creator_profile_id,
      v_item->>'image_url',
      COALESCE(v_item->>'caption', ''),
      COALESCE((v_item->>'display_order')::INTEGER, v_items_added),
      COALESCE((v_item->>'is_featured')::BOOLEAN, v_items_added = 0)
    );
    v_items_added := v_items_added + 1;
  END LOOP;

  -- Mark portfolio as uploaded
  UPDATE creator_profiles
  SET portfolio_uploaded = true, updated_at = NOW()
  WHERE id = p_creator_profile_id;

  RETURN json_build_object(
    'success', true,
    'items_added', v_items_added
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_creator_portfolio_items(UUID, JSONB) TO authenticated;

-- ================================================================
-- QUERY TO FIND ORPHANED CREATORS (for monitoring)
-- ================================================================
-- This query can be used to find users who are marked as creators
-- but don't have a creator_profiles record (broken state)
-- Run periodically to detect issues
-- ================================================================
-- SELECT u.id, u.username, u.email, u.account_type, u.account_upgraded_at
-- FROM users u
-- LEFT JOIN creator_profiles cp ON cp.user_id = u.id
-- WHERE u.account_type = 'creator' AND cp.id IS NULL;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ATOMIC CREATOR UPGRADE MIGRATION COMPLETE';
  RAISE NOTICE '';
  RAISE NOTICE 'Created functions:';
  RAISE NOTICE '• upgrade_to_creator(user_id, display_name, bio, location, specialties)';
  RAISE NOTICE '• add_creator_portfolio_items(creator_profile_id, items)';
  RAISE NOTICE '';
  RAISE NOTICE 'These functions ensure atomic creator onboarding:';
  RAISE NOTICE '1. User upgrade + profile creation happen together';
  RAISE NOTICE '2. If profile fails, user remains consumer';
  RAISE NOTICE '3. No orphaned creator accounts possible';
  RAISE NOTICE '';
END $$;
