-- =============================================
-- Payment Test Setup: Business Stripe Onboarding
-- Test Case: 1.1 - First-Time Business Stripe Onboarding
-- =============================================
-- Purpose: Prepare test-business1@bypass.com for Stripe onboarding testing
-- Run this BEFORE testing business Stripe onboarding

DO $$
DECLARE
  v_user_id UUID;
  v_business_profile_id UUID;
BEGIN
  -- Find the user ID
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'test-business1@bypass.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-business1@bypass.com not found';
  END IF;

  RAISE NOTICE 'Setting up test-business1@bypass.com for Stripe onboarding test';

  -- Get business profile ID
  SELECT id INTO v_business_profile_id
  FROM public.business_profiles
  WHERE user_id = v_user_id;

  -- Remove any existing Stripe account for this business
  DELETE FROM public.stripe_accounts
  WHERE user_id = v_user_id
    AND account_type = 'business';

  RAISE NOTICE 'Removed existing Stripe account (if any)';

  -- Ensure business profile exists
  IF v_business_profile_id IS NULL THEN
    v_business_profile_id := gen_random_uuid();
    INSERT INTO public.business_profiles (
      id,
      user_id,
      business_name,
      verified,
      created_at,
      updated_at
    ) VALUES (
      v_business_profile_id,
      v_user_id,
      'Test Business 1',
      true,
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Created business profile';
  END IF;

  -- Ensure user is set as business account type
  UPDATE public.users
  SET
    account_type = 'business',
    is_restaurant = true,
    updated_at = NOW()
  WHERE id = v_user_id;

  RAISE NOTICE 'User account type set to business';

  RAISE NOTICE 'Setup complete: test-business1@bypass.com is ready for Stripe onboarding test';
  RAISE NOTICE 'Expected state: No Stripe account, business account type, ready to onboard';

END $$;

-- Verification query
SELECT 
  u.email,
  u.account_type,
  sa.id as stripe_account_id,
  sa.onboarding_completed,
  bp.id as business_profile_id
FROM public.users u
LEFT JOIN public.stripe_accounts sa ON sa.user_id = u.id AND sa.account_type = 'business'
LEFT JOIN public.business_profiles bp ON bp.user_id = u.id
WHERE u.email = 'test-business1@bypass.com';
