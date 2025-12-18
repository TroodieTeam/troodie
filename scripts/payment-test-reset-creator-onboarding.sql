-- =============================================
-- Payment Test Reset: Creator Stripe Onboarding
-- Test Case: 3.1 - Creator Stripe Onboarding Before Deliverable Approval
-- =============================================
-- Purpose: Clean up after creator Stripe onboarding test
-- Run this AFTER testing to reset for next test

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

  RAISE NOTICE 'Resetting Stripe account for test-creator1@bypass.com';

  -- Get creator profile ID
  SELECT id INTO v_creator_profile_id
  FROM public.creator_profiles
  WHERE user_id = v_user_id;

  -- Remove Stripe account (created during test)
  DELETE FROM public.stripe_accounts
  WHERE user_id = v_user_id
    AND account_type = 'creator';

  -- Reset creator profile Stripe fields
  IF v_creator_profile_id IS NOT NULL THEN
    UPDATE public.creator_profiles
    SET
      stripe_account_id = NULL,
      stripe_onboarding_completed = false,
      updated_at = NOW()
    WHERE id = v_creator_profile_id;
  END IF;

  RAISE NOTICE 'Removed Stripe account';
  RAISE NOTICE 'Reset creator profile Stripe fields';
  RAISE NOTICE 'Reset complete: test-creator1@bypass.com is ready for next test';

END $$;

-- Verification query
SELECT 
  u.email,
  cp.stripe_account_id,
  cp.stripe_onboarding_completed,
  sa.id as stripe_account_record_id
FROM public.users u
JOIN public.creator_profiles cp ON cp.user_id = u.id
LEFT JOIN public.stripe_accounts sa ON sa.user_id = u.id AND sa.account_type = 'creator'
WHERE u.email = 'test-creator1@bypass.com';
-- Expected: stripe_account_id = NULL, stripe_onboarding_completed = false, stripe_account_record_id = NULL
