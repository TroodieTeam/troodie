-- =============================================
-- Payment Test Setup: Automatic Payout Processing
-- Test Case: 4.1 - Successful Automatic Payout
-- =============================================
-- Purpose: Prepare campaign, business, creator, and deliverable for payout testing
-- Run this BEFORE testing automatic payout processing

DO $$
DECLARE
  v_business_user_id UUID;
  v_creator_user_id UUID;
  v_creator_profile_id UUID;
  v_campaign_id UUID;
  v_deliverable_id UUID;
  v_stripe_business_account_id TEXT := 'acct_test_business_' || substr(md5(random()::text), 1, 16);
  v_stripe_creator_account_id TEXT := 'acct_test_creator_' || substr(md5(random()::text), 1, 16);
BEGIN
  -- Find business user ID
  SELECT id INTO v_business_user_id
  FROM public.users
  WHERE email = 'test-business1@bypass.com';

  IF v_business_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-business1@bypass.com not found';
  END IF;

  -- Find creator user ID
  SELECT id INTO v_creator_user_id
  FROM public.users
  WHERE email = 'test-creator1@bypass.com';

  IF v_creator_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-creator1@bypass.com not found';
  END IF;

  -- Get creator profile ID
  SELECT id INTO v_creator_profile_id
  FROM public.creator_profiles
  WHERE user_id = v_creator_user_id;

  IF v_creator_profile_id IS NULL THEN
    RAISE EXCEPTION 'Creator profile not found for test-creator1@bypass.com';
  END IF;

  RAISE NOTICE 'Setting up payout processing test';

  -- Setup business Stripe account (completed onboarding)
  DELETE FROM public.stripe_accounts
  WHERE user_id = v_business_user_id
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
    v_business_user_id,
    'business',
    v_stripe_business_account_id,
    'enabled',
    true,
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created business Stripe account: %', v_stripe_business_account_id;

  -- Setup creator Stripe account (completed onboarding)
  DELETE FROM public.stripe_accounts
  WHERE user_id = v_creator_user_id
    AND account_type = 'creator';

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
    v_creator_user_id,
    'creator',
    v_stripe_creator_account_id,
    'enabled',
    true,
    NOW(),
    NOW()
  );

  -- Update creator profile with Stripe account ID
  UPDATE public.creator_profiles
  SET
    stripe_account_id = v_stripe_creator_account_id,
    stripe_onboarding_completed = true,
    updated_at = NOW()
  WHERE id = v_creator_profile_id;

  RAISE NOTICE 'Created creator Stripe account: %', v_stripe_creator_account_id;

  -- Find or create a paid campaign
  SELECT id INTO v_campaign_id
  FROM campaigns
  WHERE business_id = v_business_user_id
    AND payment_status = 'paid'
  LIMIT 1;

  -- If no paid campaign, create one and mark as paid
  IF v_campaign_id IS NULL THEN
    DECLARE
      v_restaurant_id UUID;
    BEGIN
      SELECT restaurant_id INTO v_restaurant_id
      FROM business_profiles
      WHERE user_id = v_business_user_id
      LIMIT 1;

      IF v_restaurant_id IS NULL THEN
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
        WHERE user_id = v_business_user_id;
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
        payment_intent_id,
        paid_at,
        start_date,
        end_date,
        created_at,
        updated_at
      ) VALUES (
        v_campaign_id,
        v_business_user_id,
        v_restaurant_id,
        'Test Payout Campaign',
        'Campaign for testing payout processing',
        5000, -- $50
        1,
        'active',
        'paid',
        'pi_test_' || substr(md5(random()::text), 1, 16),
        NOW(),
        NOW(),
        NOW() + INTERVAL '30 days',
        NOW(),
        NOW()
      );

      -- Create payment record
      INSERT INTO campaign_payments (
        id,
        campaign_id,
        business_id,
        restaurant_id,
        stripe_payment_intent_id,
        amount_cents,
        platform_fee_cents,
        creator_payout_cents,
        status,
        paid_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_campaign_id,
        v_business_user_id,
        v_restaurant_id,
        'pi_test_' || substr(md5(random()::text), 1, 16),
        5000,
        0, -- No platform fee
        5000, -- Full amount for creator
        'succeeded',
        NOW(),
        NOW(),
        NOW()
      );

      RAISE NOTICE 'Created paid campaign: %', v_campaign_id;
    END;
  END IF;

  -- Find or create deliverable for this creator and campaign
  SELECT id INTO v_deliverable_id
  FROM campaign_deliverables
  WHERE campaign_id = v_campaign_id
    AND creator_id = v_creator_profile_id
  LIMIT 1;

  -- If no deliverable, create one in submitted state
  IF v_deliverable_id IS NULL THEN
    -- Check if there's a campaign application
    DECLARE
      v_application_id UUID;
    BEGIN
      SELECT id INTO v_application_id
      FROM campaign_applications
      WHERE campaign_id = v_campaign_id
        AND creator_id = v_creator_profile_id
        AND status = 'accepted'
      LIMIT 1;

      -- If no application, create one
      IF v_application_id IS NULL THEN
        v_application_id := gen_random_uuid();
        INSERT INTO campaign_applications (
          id,
          campaign_id,
          creator_id,
          status,
          proposed_rate_cents,
          applied_at,
          created_at,
          updated_at
        ) VALUES (
          v_application_id,
          v_campaign_id,
          v_creator_profile_id,
          'accepted',
          5000,
          NOW(),
          NOW(),
          NOW()
        );
      END IF;

      v_deliverable_id := gen_random_uuid();
      INSERT INTO campaign_deliverables (
        id,
        campaign_id,
        campaign_application_id,
        creator_id,
        platform,
        platform_post_url,
        caption,
        status,
        payment_status,
        payment_amount_cents,
        submitted_at,
        created_at,
        updated_at
      ) VALUES (
        v_deliverable_id,
        v_campaign_id,
        v_application_id,
        v_creator_profile_id,
        'instagram',
        'https://instagram.com/p/test123',
        'Test deliverable for payout testing',
        'submitted', -- Not yet approved
        'pending',
        5000, -- Full campaign budget
        NOW(),
        NOW(),
        NOW()
      );

      RAISE NOTICE 'Created deliverable: %', v_deliverable_id;
    END;
  ELSE
    -- Reset deliverable to submitted state (not approved yet)
    UPDATE campaign_deliverables
    SET
      status = 'submitted',
      payment_status = 'pending',
      payment_transaction_id = NULL,
      paid_at = NULL,
      updated_at = NOW()
    WHERE id = v_deliverable_id;

    RAISE NOTICE 'Reset existing deliverable: %', v_deliverable_id;
  END IF;

  -- Remove any existing payout transactions
  DELETE FROM payment_transactions
  WHERE deliverable_id = v_deliverable_id
    AND transaction_type = 'payout';

  RAISE NOTICE 'Setup complete: Ready for payout test';
  RAISE NOTICE 'Campaign ID: %', v_campaign_id;
  RAISE NOTICE 'Deliverable ID: %', v_deliverable_id;
  RAISE NOTICE 'Next step: Approve deliverable to trigger payout';

END $$;

-- Verification query
SELECT 
  u_business.email as business_email,
  u_creator.email as creator_email,
  sa_business.stripe_account_id as business_stripe_account,
  sa_creator.stripe_account_id as creator_stripe_account,
  cp.stripe_account_id as creator_profile_stripe_account,
  cp.stripe_onboarding_completed,
  c.id as campaign_id,
  c.payment_status as campaign_payment_status,
  cd.id as deliverable_id,
  cd.status as deliverable_status,
  cd.payment_status as deliverable_payment_status
FROM campaigns c
JOIN users u_business ON c.business_id = u_business.id
JOIN campaign_deliverables cd ON cd.campaign_id = c.id
JOIN creator_profiles cp ON cd.creator_id = cp.id
JOIN users u_creator ON cp.user_id = u_creator.id
LEFT JOIN stripe_accounts sa_business ON sa_business.user_id = u_business.id AND sa_business.account_type = 'business'
LEFT JOIN stripe_accounts sa_creator ON sa_creator.user_id = u_creator.id AND sa_creator.account_type = 'creator'
WHERE u_business.email = 'test-business1@bypass.com'
  AND u_creator.email = 'test-creator1@bypass.com'
  AND c.payment_status = 'paid'
ORDER BY cd.created_at DESC
LIMIT 1;
-- Expected: Both Stripe accounts exist, campaign paid, deliverable submitted (not approved)
