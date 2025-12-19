-- ============================================================================
-- E2E TEST DATA SETUP FOR MAESTRO
-- ============================================================================
-- Purpose: Pre-seed data for fast E2E testing (skip manual setup)
-- Run this BEFORE running Maestro tests
-- This script does everything the manual 60-min flow does, in ~10 seconds
-- ============================================================================

DO $$
DECLARE
  v_creator1_user_id UUID := '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid;
  v_creator2_user_id UUID := '6740e5be-c1ca-444c-b100-6122c3dd8273'::uuid;
  v_business1_user_id UUID := 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid;
  v_creator1_profile_id UUID;
  v_creator2_profile_id UUID;
  v_restaurant_id UUID;
  v_campaign_id UUID;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'E2E TEST DATA SETUP FOR MAESTRO';
  RAISE NOTICE '========================================';

  -- ============================================================================
  -- STEP 1: Reset Previous Test Data
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 1: Resetting previous test data...';

  -- Get creator profile IDs
  SELECT id INTO v_creator1_profile_id FROM creator_profiles WHERE user_id = v_creator1_user_id;
  SELECT id INTO v_creator2_profile_id FROM creator_profiles WHERE user_id = v_creator2_user_id;

  -- Clear deliverables
  DELETE FROM campaign_deliverables WHERE creator_id IN (v_creator1_profile_id, v_creator2_profile_id);
  
  -- Clear applications
  DELETE FROM campaign_applications WHERE creator_id IN (v_creator1_profile_id, v_creator2_profile_id);
  
  -- Clear payment data
  DELETE FROM payment_transactions WHERE business_id = v_business1_user_id;
  DELETE FROM campaign_payments WHERE business_id = v_business1_user_id;
  
  RAISE NOTICE '   ✅ Cleared previous test data';

  -- ============================================================================
  -- STEP 2: Pre-Configure Stripe Accounts (Skip Onboarding!)
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '💳 Step 2: Pre-configuring Stripe accounts...';

  -- Business Stripe Account (pre-onboarded)
  INSERT INTO stripe_accounts (
    user_id,
    stripe_account_id,
    account_type,
    onboarding_completed,
    charges_enabled,
    payouts_enabled,
    created_at,
    updated_at
  )
  VALUES (
    v_business1_user_id,
    'acct_test_business1_' || EXTRACT(EPOCH FROM NOW())::text,
    'business',
    true,
    true,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, account_type) DO UPDATE SET
    onboarding_completed = true,
    charges_enabled = true,
    payouts_enabled = true,
    updated_at = NOW();

  RAISE NOTICE '   ✅ Business Stripe account configured';

  -- Creator 1 Stripe Account (pre-onboarded)
  INSERT INTO stripe_accounts (
    user_id,
    stripe_account_id,
    account_type,
    onboarding_completed,
    charges_enabled,
    payouts_enabled,
    created_at,
    updated_at
  )
  VALUES (
    v_creator1_user_id,
    'acct_test_creator1_' || EXTRACT(EPOCH FROM NOW())::text,
    'creator',
    true,
    true,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, account_type) DO UPDATE SET
    onboarding_completed = true,
    charges_enabled = true,
    payouts_enabled = true,
    updated_at = NOW();

  -- Update creator profile with Stripe info
  UPDATE creator_profiles
  SET 
    stripe_account_id = 'acct_test_creator1_' || EXTRACT(EPOCH FROM NOW())::text,
    stripe_onboarding_completed = true,
    updated_at = NOW()
  WHERE user_id = v_creator1_user_id;

  RAISE NOTICE '   ✅ Creator 1 Stripe account configured';

  -- ============================================================================
  -- STEP 3: Ensure Restaurant & Campaign Exist
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🏪 Step 3: Setting up restaurant and campaign...';

  -- Get restaurant for business1
  SELECT r.id INTO v_restaurant_id
  FROM restaurants r
  JOIN business_profiles bp ON bp.restaurant_id = r.id
  WHERE bp.user_id = v_business1_user_id
  LIMIT 1;

  IF v_restaurant_id IS NULL THEN
    -- Create restaurant if needed
    INSERT INTO restaurants (
      name, address, city, state, zip_code, cuisine_type,
      price_range, rating, latitude, longitude
    )
    VALUES (
      'E2E Test Restaurant',
      '123 Test Street',
      'Charlotte', 'NC', '28202',
      'American',
      '$$', 4.5,
      35.2271, -80.8431
    )
    RETURNING id INTO v_restaurant_id;

    -- Link to business
    UPDATE business_profiles
    SET restaurant_id = v_restaurant_id
    WHERE user_id = v_business1_user_id;
  END IF;

  RAISE NOTICE '   ✅ Restaurant configured: %', v_restaurant_id;

  -- Create/update paid campaign
  INSERT INTO campaigns (
    restaurant_id,
    owner_id,
    name,
    title,
    description,
    status,
    payment_status,
    budget_cents,
    max_creators,
    start_date,
    end_date,
    created_at,
    updated_at
  )
  VALUES (
    v_restaurant_id,
    v_business1_user_id,
    'E2E Test Campaign',
    'E2E Test Campaign - Maestro Automation',
    'This is an automated test campaign for E2E testing with Maestro.',
    'active',
    'paid', -- Pre-paid!
    35000, -- $350
    2,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_campaign_id;

  IF v_campaign_id IS NULL THEN
    SELECT id INTO v_campaign_id FROM campaigns 
    WHERE owner_id = v_business1_user_id AND status = 'active'
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  -- Ensure campaign is paid and active
  UPDATE campaigns
  SET 
    status = 'active',
    payment_status = 'paid',
    updated_at = NOW()
  WHERE id = v_campaign_id;

  RAISE NOTICE '   ✅ Campaign configured: %', v_campaign_id;

  -- ============================================================================
  -- STEP 4: Create Mock Campaign Payment Record
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '💰 Step 4: Creating payment records...';

  INSERT INTO campaign_payments (
    campaign_id,
    business_id,
    amount_cents,
    creator_payout_cents,
    platform_fee_cents,
    stripe_payment_intent_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_campaign_id,
    v_business1_user_id,
    35000,
    35000,
    0,
    'pi_test_e2e_' || EXTRACT(EPOCH FROM NOW())::text,
    'succeeded',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '   ✅ Payment record created';

  -- ============================================================================
  -- VERIFICATION
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ E2E TEST DATA SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for Maestro tests!';
  RAISE NOTICE '';
  RAISE NOTICE 'Pre-configured:';
  RAISE NOTICE '  ✅ Business Stripe account (skip onboarding)';
  RAISE NOTICE '  ✅ Creator Stripe account (skip onboarding)';
  RAISE NOTICE '  ✅ Paid campaign ready for applications';
  RAISE NOTICE '  ✅ Payment records in place';
  RAISE NOTICE '';
  RAISE NOTICE 'Run: npm run test:e2e:marketplace';
  RAISE NOTICE '';

END $$;

-- Verification output
SELECT 
  'Test Setup Complete' as status,
  (SELECT COUNT(*) FROM stripe_accounts WHERE onboarding_completed = true AND user_id IN (
    '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid,
    'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid
  )) as stripe_accounts_ready,
  (SELECT COUNT(*) FROM campaigns WHERE status = 'active' AND payment_status = 'paid' AND owner_id = 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid) as paid_campaigns_ready;
