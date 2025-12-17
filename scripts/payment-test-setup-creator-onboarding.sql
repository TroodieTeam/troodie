-- =============================================
-- Payment Test Setup: Creator Stripe Onboarding
-- Test Case: 3.1 - Creator Stripe Onboarding Before Deliverable Approval
-- =============================================
-- Purpose: Prepare test-creator1@bypass.com for Stripe onboarding testing
-- Run this BEFORE testing creator Stripe onboarding

DO $$
DECLARE
  v_user_id UUID;
  v_creator_profile_id UUID;
BEGIN
  -- Find the user ID
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'test-creator1@bypass.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-creator1@bypass.com not found';
  END IF;

  RAISE NOTICE 'Setting up test-creator1@bypass.com for Stripe onboarding test';

  -- Get creator profile ID
  SELECT id INTO v_creator_profile_id
  FROM public.creator_profiles
  WHERE user_id = v_user_id;

  IF v_creator_profile_id IS NULL THEN
    RAISE EXCEPTION 'Creator profile not found for test-creator1@bypass.com';
  END IF;

  -- Remove any existing Stripe account for this creator
  DELETE FROM public.stripe_accounts
  WHERE user_id = v_user_id
    AND account_type = 'creator';

  -- Reset creator profile Stripe fields
  UPDATE public.creator_profiles
  SET
    stripe_account_id = NULL,
    stripe_onboarding_completed = false,
    updated_at = NOW()
  WHERE id = v_creator_profile_id;

  -- Ensure user is set as creator account type
  UPDATE public.users
  SET
    account_type = 'creator',
    is_creator = true,
    updated_at = NOW()
  WHERE id = v_user_id;

  RAISE NOTICE 'Removed existing Stripe account (if any)';
  RAISE NOTICE 'Reset creator profile Stripe fields';
  RAISE NOTICE 'Setup complete: test-creator1@bypass.com is ready for Stripe onboarding test';
  RAISE NOTICE 'Expected state: No Stripe account, creator account type, ready to onboard';

END $$;

-- Verification query
SELECT 
  u.email,
  u.account_type,
  cp.id as creator_profile_id,
  cp.stripe_account_id,
  cp.stripe_onboarding_completed,
  sa.id as stripe_account_record_id
FROM public.users u
JOIN public.creator_profiles cp ON cp.user_id = u.id
LEFT JOIN public.stripe_accounts sa ON sa.user_id = u.id AND sa.account_type = 'creator'
WHERE u.email = 'test-creator1@bypass.com';
-- Expected: stripe_account_id = NULL, stripe_onboarding_completed = false, stripe_account_record_id = NULL
