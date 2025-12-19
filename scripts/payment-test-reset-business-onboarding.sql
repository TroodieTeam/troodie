-- =============================================
-- Payment Test Reset: Business Stripe Onboarding
-- Test Case: 1.1 - First-Time Business Stripe Onboarding
-- =============================================
-- Purpose: Clean up after testing business Stripe onboarding
-- Run this AFTER testing to reset for next test

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find the user ID
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'test-business1@bypass.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-business1@bypass.com not found';
  END IF;

  RAISE NOTICE 'Resetting Stripe account for test-business1@bypass.com';

  -- Remove Stripe account (created during test)
  DELETE FROM public.stripe_accounts
  WHERE user_id = v_user_id
    AND account_type = 'business';

  RAISE NOTICE 'Removed Stripe account';

  RAISE NOTICE 'Reset complete: test-business1@bypass.com is ready for next test';

END $$;

-- Verification query
SELECT 
  u.email,
  u.account_type,
  sa.id as stripe_account_id,
  sa.onboarding_completed
FROM public.users u
LEFT JOIN public.stripe_accounts sa ON sa.user_id = u.id AND sa.account_type = 'business'
WHERE u.email = 'test-business1@bypass.com';
-- Expected: stripe_account_id should be NULL
