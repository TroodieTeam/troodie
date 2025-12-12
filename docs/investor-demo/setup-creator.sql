-- ============================================================================
-- SETUP: Upgrade prod-consumer1 to Creator
-- 
-- Usage: Run this to set up prod-consumer1 as a creator with full profile
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'prod-creator1@bypass.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Upgrade account
    UPDATE users
    SET account_type = 'creator',
        is_creator = true,
        account_upgraded_at = NOW()
    WHERE id = v_user_id;
    
    -- Create profile
    INSERT INTO creator_profiles (
      user_id, display_name, bio, location, specialties,
      open_to_collabs, availability_status,
      instagram_followers, tiktok_followers,
      created_at, updated_at
    )
    VALUES (
      v_user_id,
      'Demo Creator',
      'Food enthusiast and content creator.',
      'Charlotte, NC',
      ARRAY['Food Photography', 'Local Restaurants'],
      true,
      'available',
      5000,
      3000,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      open_to_collabs = true,
      availability_status = 'available',
      updated_at = NOW();
    
    RAISE NOTICE '✅ prod-creator1 upgraded to Creator';
  ELSE
    RAISE NOTICE '❌ prod-creator1@bypass.com not found';
  END IF;
END $$;
