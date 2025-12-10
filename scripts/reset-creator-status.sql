-- Reset Creator Status for test-consumer2@bypass.com
-- This will revert the user from creator back to consumer status

-- Get the user ID first
DO $$
DECLARE
  v_user_id UUID;
  v_creator_profile_id UUID;
BEGIN
  -- Find the user ID
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'test-consumer2@bypass.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-consumer2@bypass.com not found';
  END IF;

  RAISE NOTICE 'Resetting creator status for user: % (ID: %)', 'test-consumer2@bypass.com', v_user_id;

  -- Get creator profile ID if it exists
  SELECT id INTO v_creator_profile_id
  FROM public.creator_profiles
  WHERE user_id = v_user_id;

  -- Delete portfolio items if creator profile exists
  IF v_creator_profile_id IS NOT NULL THEN
    RAISE NOTICE 'Deleting portfolio items for creator profile: %', v_creator_profile_id;
    DELETE FROM public.creator_portfolio_items
    WHERE creator_profile_id = v_creator_profile_id;

    -- Delete campaign applications (optional - uncomment if you want to remove applications too)
    -- DELETE FROM public.campaign_applications
    -- WHERE creator_id = v_creator_profile_id;
  END IF;

  -- Delete creator profile
  IF v_creator_profile_id IS NOT NULL THEN
    RAISE NOTICE 'Deleting creator profile: %', v_creator_profile_id;
    DELETE FROM public.creator_profiles
    WHERE id = v_creator_profile_id;
  END IF;

  -- Reset user account type
  RAISE NOTICE 'Resetting user account type to consumer';
  UPDATE public.users
  SET
    account_type = 'consumer',
    is_creator = false,
    account_upgraded_at = NULL,
    updated_at = NOW()
  WHERE id = v_user_id;

  RAISE NOTICE 'Successfully reset creator status for test-consumer2@bypass.com';

END $$;

-- Verify the reset
SELECT 
  u.id,
  u.email,
  u.account_type,
  u.is_creator,
  u.account_upgraded_at,
  cp.id as creator_profile_id
FROM public.users u
LEFT JOIN public.creator_profiles cp ON cp.user_id = u.id
WHERE u.email = 'test-consumer2@bypass.com';

