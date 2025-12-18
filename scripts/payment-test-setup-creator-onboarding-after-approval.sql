-- =============================================
-- Payment Test Setup: Creator Onboarding After Deliverable Approval
-- Test Case: 3.2 - Creator Onboarding Prompt After Deliverable Approval
-- =============================================
-- Purpose: Prepare test-creator2@bypass.com with approved deliverable but no Stripe account
-- Run this BEFORE testing creator onboarding prompt after deliverable approval

DO $$
DECLARE
  v_creator_user_id UUID;
  v_business_user_id UUID;
  v_creator_profile_id UUID;
  v_business_profile_id UUID;
  v_restaurant_id UUID;
  v_campaign_id UUID;
  v_application_id UUID;
  v_deliverable_id UUID;
BEGIN
  -- Find creator user ID
  SELECT id INTO v_creator_user_id
  FROM public.users
  WHERE email = 'test-creator2@bypass.com';

  IF v_creator_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-creator2@bypass.com not found';
  END IF;

  -- Find business user ID (test-business1@bypass.com)
  SELECT id INTO v_business_user_id
  FROM public.users
  WHERE email = 'test-business1@bypass.com';

  IF v_business_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-business1@bypass.com not found';
  END IF;

  RAISE NOTICE 'Setting up test-creator2@bypass.com for onboarding-after-approval test';

  -- Get creator profile ID
  SELECT id INTO v_creator_profile_id
  FROM public.creator_profiles
  WHERE user_id = v_creator_user_id;

  IF v_creator_profile_id IS NULL THEN
    RAISE EXCEPTION 'Creator profile not found for test-creator2@bypass.com';
  END IF;

  -- Ensure creator has NO Stripe account
  DELETE FROM public.stripe_accounts
  WHERE user_id = v_creator_user_id
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
  WHERE id = v_creator_user_id;

  RAISE NOTICE 'Removed existing Stripe account (if any)';
  RAISE NOTICE 'Reset creator profile Stripe fields';

  -- Get business profile and restaurant
  SELECT id, restaurant_id INTO v_business_profile_id, v_restaurant_id
  FROM business_profiles
  WHERE user_id = v_business_user_id
  LIMIT 1;

  -- If no restaurant, create one
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

    IF v_business_profile_id IS NULL THEN
      v_business_profile_id := gen_random_uuid();
      INSERT INTO business_profiles (
        id,
        user_id,
        restaurant_id,
        business_name,
        verified,
        created_at,
        updated_at
      ) VALUES (
        v_business_profile_id,
        v_business_user_id,
        v_restaurant_id,
        'Test Business 1',
        true,
        NOW(),
        NOW()
      );
    ELSE
      UPDATE business_profiles
      SET restaurant_id = v_restaurant_id
      WHERE id = v_business_profile_id;
    END IF;
  END IF;

  -- Find or create a paid campaign
  SELECT id INTO v_campaign_id
  FROM campaigns
  WHERE owner_id = v_business_user_id
    AND payment_status = 'paid'
  LIMIT 1;

  -- If no paid campaign, create one and mark as paid
  IF v_campaign_id IS NULL THEN
    v_campaign_id := gen_random_uuid();
    INSERT INTO campaigns (
      id,
      owner_id,
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
      'Test Campaign for Creator Onboarding',
      'Campaign for testing creator onboarding after deliverable approval',
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
  ELSE
    -- Campaign exists - ensure it has a payment record
    DECLARE
      v_payment_exists BOOLEAN;
    BEGIN
      SELECT EXISTS(
        SELECT 1 FROM campaign_payments 
        WHERE campaign_id = v_campaign_id 
        AND status = 'succeeded'
      ) INTO v_payment_exists;

      IF NOT v_payment_exists THEN
        -- Create payment record for existing campaign
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
        RAISE NOTICE 'Created payment record for existing campaign: %', v_campaign_id;
      END IF;
    END;

    -- Ensure campaign payment_status is 'paid'
    UPDATE campaigns
    SET
      payment_status = 'paid',
      status = 'active',
      payment_intent_id = COALESCE(payment_intent_id, 'pi_test_' || substr(md5(random()::text), 1, 16)),
      paid_at = COALESCE(paid_at, NOW()),
      updated_at = NOW()
    WHERE id = v_campaign_id
      AND payment_status != 'paid';

    RAISE NOTICE 'Updated existing campaign to paid status: %', v_campaign_id;
  END IF;

  -- Check if campaign application exists
  SELECT id INTO v_application_id
  FROM campaign_applications
  WHERE campaign_id = v_campaign_id
    AND creator_id = v_creator_profile_id
    AND status = 'accepted'
  LIMIT 1;

  -- If no application, create one (accepted)
  IF v_application_id IS NULL THEN
    v_application_id := gen_random_uuid();
      INSERT INTO campaign_applications (
        id,
        campaign_id,
        creator_id,
        status,
        proposed_rate_cents,
        applied_at
      ) VALUES (
        v_application_id,
        v_campaign_id,
        v_creator_profile_id,
        'accepted',
        5000,
        NOW()
      );

    RAISE NOTICE 'Created campaign application: %', v_application_id;
  END IF;

  -- Check if deliverable exists
  SELECT id INTO v_deliverable_id
  FROM campaign_deliverables
  WHERE campaign_id = v_campaign_id
    AND creator_id = v_creator_profile_id
  LIMIT 1;

  -- If no deliverable, create one and approve it
  IF v_deliverable_id IS NULL THEN
    -- Get restaurant_id from campaign (required field)
    DECLARE
      v_campaign_restaurant_id UUID;
    BEGIN
      SELECT restaurant_id INTO v_campaign_restaurant_id
      FROM campaigns
      WHERE id = v_campaign_id;
      
      IF v_campaign_restaurant_id IS NULL THEN
        RAISE EXCEPTION 'Campaign restaurant_id not found';
      END IF;

      v_deliverable_id := gen_random_uuid();
      INSERT INTO campaign_deliverables (
        id,
        campaign_id,
        campaign_application_id,
        creator_id,
        restaurant_id,
        content_type,
        content_url,
        social_platform,
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
        v_application_id, -- Use v_application_id from outer scope
        v_creator_profile_id,
        v_campaign_restaurant_id,
        'reel', -- content_type (required)
        'https://instagram.com/p/test123', -- content_url (required)
        'instagram', -- social_platform
        'https://instagram.com/p/test123', -- platform_post_url
        'Test deliverable for onboarding-after-approval testing',
        'approved', -- Approved by business
        'pending_onboarding', -- Waiting for creator to connect Stripe
        5000, -- Full campaign budget
        NOW() - INTERVAL '1 day', -- Submitted yesterday
        NOW() - INTERVAL '1 day',
        NOW()
      );
    END;

    RAISE NOTICE 'Created approved deliverable: %', v_deliverable_id;
  ELSE
    -- Update existing deliverable to approved status with pending_onboarding payment status
    UPDATE campaign_deliverables
    SET
      status = 'approved',
      payment_status = 'pending_onboarding',
      payment_transaction_id = NULL,
      paid_at = NULL,
      updated_at = NOW()
    WHERE id = v_deliverable_id;

    RAISE NOTICE 'Updated existing deliverable to approved with pending_onboarding: %', v_deliverable_id;
  END IF;

  -- Remove any existing payout transactions (shouldn't exist, but clean up)
  DELETE FROM payment_transactions
  WHERE deliverable_id = v_deliverable_id
    AND transaction_type = 'payout';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Setup complete for Test Case 3.2';
  RAISE NOTICE 'Creator: test-creator2@bypass.com';
  RAISE NOTICE 'Campaign ID: %', v_campaign_id;
  RAISE NOTICE 'Deliverable ID: %', v_deliverable_id;
  RAISE NOTICE 'Deliverable Status: approved';
  RAISE NOTICE 'Payment Status: pending_onboarding';
  RAISE NOTICE 'Creator Stripe Account: NONE (ready for onboarding)';
  RAISE NOTICE '========================================';

END $$;

-- Verification query
SELECT 
  u_creator.email as creator_email,
  u_business.email as business_email,
  c.id as campaign_id,
  c.title as campaign_title,
  c.payment_status as campaign_payment_status,
  cd.id as deliverable_id,
  cd.status as deliverable_status,
  cd.payment_status as deliverable_payment_status,
  cp.stripe_account_id,
  cp.stripe_onboarding_completed,
  sa.id as stripe_account_record_id
FROM campaign_deliverables cd
JOIN campaigns c ON cd.campaign_id = c.id
JOIN creator_profiles cp ON cd.creator_id = cp.id
JOIN users u_creator ON cp.user_id = u_creator.id
JOIN users u_business ON c.owner_id = u_business.id
LEFT JOIN stripe_accounts sa ON sa.user_id = u_creator.id AND sa.account_type = 'creator'
WHERE u_creator.email = 'test-creator2@bypass.com'
  AND cd.status = 'approved'
ORDER BY cd.created_at DESC
LIMIT 1;
-- Expected: deliverable_status = 'approved', deliverable_payment_status = 'pending_onboarding', stripe_account_id = NULL
