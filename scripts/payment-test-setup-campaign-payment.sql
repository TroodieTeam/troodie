-- =============================================
-- Payment Test Setup: Campaign Payment Processing
-- Test Case: 2.1 - Successful Campaign Payment
-- =============================================
-- Purpose: Prepare campaign and business for payment testing
-- Run this BEFORE testing campaign payment

DO $$
DECLARE
  v_user_id UUID;
  v_campaign_id UUID;
  v_stripe_account_id TEXT := 'acct_test_complete_' || substr(md5(random()::text), 1, 16);
BEGIN
  -- Find the user ID
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'test-business1@bypass.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-business1@bypass.com not found';
  END IF;

  RAISE NOTICE 'Setting up campaign payment test for test-business1@bypass.com';

  -- Ensure business has completed Stripe onboarding
  DELETE FROM public.stripe_accounts
  WHERE user_id = v_user_id
    AND account_type = 'business';

  INSERT INTO public.stripe_accounts (
    id,
    user_id,
    account_type,
    stripe_account_id,
    stripe_account_status,
    onboarding_completed,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'business',
    v_stripe_account_id,
    'enabled',
    true, -- Completed onboarding
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created completed Stripe account: %', v_stripe_account_id;

  -- Find or create a test campaign (use first holiday campaign or create new)
  SELECT id INTO v_campaign_id
  FROM campaigns
  WHERE business_id = v_user_id
    AND title LIKE '%Holiday%'
  LIMIT 1;

  -- If no campaign found, create one
  IF v_campaign_id IS NULL THEN
    -- Get restaurant ID for this business
    DECLARE
      v_restaurant_id UUID;
    BEGIN
      SELECT restaurant_id INTO v_restaurant_id
      FROM business_profiles
      WHERE user_id = v_user_id
      LIMIT 1;

      IF v_restaurant_id IS NULL THEN
        -- Create a fake restaurant if needed
        v_restaurant_id := gen_random_uuid();
        INSERT INTO restaurants (
          id,
          name,
          city,
          state,
          created_at,
          updated_at
        ) VALUES (
          v_restaurant_id,
          'Test Restaurant',
          'Charlotte',
          'NC',
          NOW(),
          NOW()
        );

        UPDATE business_profiles
        SET restaurant_id = v_restaurant_id
        WHERE user_id = v_user_id;
      END IF;

      v_campaign_id := gen_random_uuid();
      INSERT INTO campaigns (
        id,
        business_id,
        restaurant_id,
        title,
        description,
        budget_cents,
        max_creators,
        status,
        payment_status,
        start_date,
        end_date,
        created_at,
        updated_at
      ) VALUES (
        v_campaign_id,
        v_user_id,
        v_restaurant_id,
        'Test Payment Campaign',
        'Campaign for testing payment processing',
        5000, -- $50
        1,
        'draft',
        'unpaid',
        NOW(),
        NOW() + INTERVAL '30 days',
        NOW(),
        NOW()
      );

      RAISE NOTICE 'Created test campaign: %', v_campaign_id;
    END;
  ELSE
    -- Reset existing campaign to unpaid state
    UPDATE campaigns
    SET
      payment_status = 'unpaid',
      status = 'draft',
      payment_intent_id = NULL,
      updated_at = NOW()
    WHERE id = v_campaign_id;

    -- Remove any existing payment records
    DELETE FROM campaign_payments
    WHERE campaign_id = v_campaign_id;

    RAISE NOTICE 'Reset existing campaign: %', v_campaign_id;
  END IF;

  RAISE NOTICE 'Setup complete: Campaign % ready for payment test', v_campaign_id;

END $$;

-- Verification query
SELECT 
  u.email,
  sa.stripe_account_id,
  sa.onboarding_completed,
  c.id as campaign_id,
  c.title,
  c.budget_cents,
  c.payment_status,
  c.status
FROM public.users u
JOIN public.stripe_accounts sa ON sa.user_id = u.id AND sa.account_type = 'business'
LEFT JOIN campaigns c ON c.business_id = u.id AND c.payment_status = 'unpaid'
WHERE u.email = 'test-business1@bypass.com'
ORDER BY c.created_at DESC
LIMIT 1;
