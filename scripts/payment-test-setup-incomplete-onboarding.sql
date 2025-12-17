-- =============================================
-- Payment Test Setup: Business Incomplete Onboarding
-- Test Case: 1.2 - Business Stripe Onboarding Refresh
-- =============================================
-- Purpose: Create incomplete Stripe account for test-business2@bypass.com
-- Run this BEFORE testing incomplete onboarding refresh

DO $$
DECLARE
  v_user_id UUID;
  v_stripe_account_id TEXT := 'acct_test_incomplete_' || substr(md5(random()::text), 1, 16);
BEGIN
  -- Find the user ID
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'test-business2@bypass.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-business2@bypass.com not found';
  END IF;

  RAISE NOTICE 'Setting up incomplete Stripe account for test-business2@bypass.com';

  -- Remove any existing Stripe account
  DELETE FROM public.stripe_accounts
  WHERE user_id = v_user_id
    AND account_type = 'business';

  -- Create incomplete Stripe account (onboarding_completed = false)
  INSERT INTO public.stripe_accounts (
    id,
    user_id,
    account_type,
    stripe_account_id,
    stripe_account_status,
    onboarding_completed,
    onboarding_link,
    onboarding_link_expires_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'business',
    v_stripe_account_id,
    'pending',
    false, -- Incomplete onboarding
    'https://connect.stripe.com/setup/test/incomplete',
    NOW() + INTERVAL '1 hour',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created incomplete Stripe account: %', v_stripe_account_id;
  RAISE NOTICE 'Setup complete: test-business2@bypass.com has incomplete Stripe onboarding';

END $$;

-- Verification query
SELECT 
  u.email,
  sa.stripe_account_id,
  sa.onboarding_completed,
  sa.stripe_account_status,
  sa.onboarding_link IS NOT NULL as has_onboarding_link
FROM public.users u
JOIN public.stripe_accounts sa ON sa.user_id = u.id AND sa.account_type = 'business'
WHERE u.email = 'test-business2@bypass.com';
-- Expected: onboarding_completed = false, status = 'pending'
