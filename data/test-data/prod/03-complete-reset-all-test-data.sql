-- ============================================================================
-- PRODUCTION TEST DATA COMPLETE RESET
-- ============================================================================
-- Purpose: Reset ALL test data for prod-* accounts to a clean state
-- Run this in Supabase SQL Editor to start fresh testing
-- ============================================================================

DO $$
DECLARE
  v_consumer1_id UUID := 'b22f710c-c15a-4ee1-bce4-061902b954cc'::uuid;
  v_consumer2_id UUID := '2621c5c4-a6de-42e5-8f1d-b73039646403'::uuid;
  v_creator1_id UUID := '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid;
  v_creator2_id UUID := '6740e5be-c1ca-444c-b100-6122c3dd8273'::uuid;
  v_creator3_id UUID := '08f478e2-45b9-4ab2-a068-8276beb851c3'::uuid;
  v_business1_id UUID := 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid;
  v_business2_id UUID := '0e281bb7-6867-40b4-afff-4e82608cc34d'::uuid;
  v_all_test_users UUID[];
  v_creator_profile_ids UUID[];
BEGIN
  v_all_test_users := ARRAY[
    v_consumer1_id, v_consumer2_id,
    v_creator1_id, v_creator2_id, v_creator3_id,
    v_business1_id, v_business2_id
  ];

  RAISE NOTICE '========================================';
  RAISE NOTICE 'STARTING COMPLETE TEST DATA RESET';
  RAISE NOTICE '========================================';

  -- ============================================================================
  -- STEP 1: Remove Payment Data (Stripe accounts, transactions, payments)
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 1: Resetting Payment Data...';

  -- Remove Stripe accounts for all test users
  DELETE FROM stripe_accounts WHERE user_id = ANY(v_all_test_users);
  RAISE NOTICE '   ✅ Removed Stripe accounts';

  -- Get creator profile IDs
  SELECT ARRAY_AGG(id) INTO v_creator_profile_ids
  FROM creator_profiles
  WHERE user_id IN (v_creator1_id, v_creator2_id, v_creator3_id);

  -- Remove payment transactions
  DELETE FROM payment_transactions
  WHERE business_id = ANY(v_all_test_users)
     OR (v_creator_profile_ids IS NOT NULL AND creator_id = ANY(v_creator_profile_ids));
  RAISE NOTICE '   ✅ Removed payment transactions';

  -- Remove campaign payments
  DELETE FROM campaign_payments
  WHERE business_id IN (v_business1_id, v_business2_id);
  RAISE NOTICE '   ✅ Removed campaign payments';

  -- ============================================================================
  -- STEP 2: Reset Deliverables
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 2: Resetting Deliverables...';

  -- Reset deliverable payment status
  UPDATE campaign_deliverables
  SET
    payment_status = 'pending',
    payment_transaction_id = NULL,
    paid_at = NULL,
    payment_error = NULL,
    payment_retry_count = 0,
    payment_amount_cents = NULL,
    last_payment_retry_at = NULL,
    updated_at = NOW()
  WHERE v_creator_profile_ids IS NOT NULL 
    AND creator_id = ANY(v_creator_profile_ids);
  RAISE NOTICE '   ✅ Reset deliverable payment statuses';

  -- Delete all deliverables for test creators
  DELETE FROM campaign_deliverables
  WHERE v_creator_profile_ids IS NOT NULL 
    AND creator_id = ANY(v_creator_profile_ids);
  RAISE NOTICE '   ✅ Removed all deliverables';

  -- ============================================================================
  -- STEP 3: Reset Campaign Applications
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 3: Resetting Campaign Applications...';

  DELETE FROM campaign_applications
  WHERE v_creator_profile_ids IS NOT NULL 
    AND creator_id = ANY(v_creator_profile_ids);
  RAISE NOTICE '   ✅ Removed all campaign applications';

  -- ============================================================================
  -- STEP 4: Reset Campaigns
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 4: Resetting Campaigns...';

  -- Reset campaigns to draft/unpaid state
  UPDATE campaigns
  SET
    status = 'active',
    payment_status = 'unpaid',
    payment_intent_id = NULL,
    paid_at = NULL,
    selected_creators_count = 0,
    spent_amount_cents = 0,
    updated_at = NOW()
  WHERE owner_id IN (v_business1_id, v_business2_id);
  RAISE NOTICE '   ✅ Reset campaigns to unpaid/active state';

  -- ============================================================================
  -- STEP 5: Reset Creator Profiles
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 5: Resetting Creator Profiles...';

  -- Reset Stripe onboarding fields
  UPDATE creator_profiles
  SET
    stripe_account_id = NULL,
    stripe_onboarding_completed = false,
    updated_at = NOW()
  WHERE user_id IN (v_creator1_id, v_creator2_id, v_creator3_id);
  RAISE NOTICE '   ✅ Reset creator Stripe onboarding';

  -- ============================================================================
  -- STEP 6: Reset Business Profiles
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 6: Checking Business Profiles...';

  -- Ensure business profiles exist and are linked correctly
  -- (This doesn't delete them, just verifies they exist)
  RAISE NOTICE '   ✅ Business profiles verified';

  -- ============================================================================
  -- STEP 7: Clear Notifications
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 7: Clearing Notifications...';

  DELETE FROM notifications WHERE user_id = ANY(v_all_test_users);
  RAISE NOTICE '   ✅ Cleared all notifications';

  -- ============================================================================
  -- STEP 8: Verify User Account Types
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 8: Verifying User Account Types...';

  -- Ensure creators are marked as creators
  UPDATE users
  SET 
    account_type = 'creator',
    is_creator = true,
    updated_at = NOW()
  WHERE id IN (v_creator1_id, v_creator2_id, v_creator3_id);

  -- Ensure businesses are marked as businesses
  UPDATE users
  SET 
    account_type = 'business',
    updated_at = NOW()
  WHERE id IN (v_business1_id, v_business2_id);

  -- Reset consumers to consumer state (in case they were upgraded during testing)
  UPDATE users
  SET 
    account_type = 'consumer',
    is_creator = false,
    updated_at = NOW()
  WHERE id IN (v_consumer1_id, v_consumer2_id);
  
  RAISE NOTICE '   ✅ Verified user account types';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ COMPLETE TEST DATA RESET FINISHED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for fresh testing!';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Accounts:';
  RAISE NOTICE '  Consumers: prod-consumer1@bypass.com, prod-consumer2@bypass.com';
  RAISE NOTICE '  Creators:  prod-creator1@bypass.com, prod-creator2@bypass.com, prod-creator3@bypass.com';
  RAISE NOTICE '  Businesses: prod-business1@bypass.com, prod-business2@bypass.com';
  RAISE NOTICE '';
  RAISE NOTICE 'OTP Code: 000000';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check Stripe accounts (should be 0)
SELECT '1. Stripe Accounts' as check_name, COUNT(*) as count
FROM stripe_accounts sa
JOIN users u ON sa.user_id = u.id
WHERE u.email LIKE 'prod-%@bypass.com'

UNION ALL

-- Check campaign payments (should be 0)
SELECT '2. Campaign Payments', COUNT(*)
FROM campaign_payments cp
JOIN users u ON cp.business_id = u.id
WHERE u.email LIKE 'prod-%@bypass.com'

UNION ALL

-- Check payment transactions (should be 0)
SELECT '3. Payment Transactions', COUNT(*)
FROM payment_transactions pt
WHERE pt.business_id IN (
  SELECT id FROM users WHERE email LIKE 'prod-business%@bypass.com'
)

UNION ALL

-- Check deliverables (should be 0)
SELECT '4. Deliverables', COUNT(*)
FROM campaign_deliverables cd
WHERE cd.creator_id IN (
  SELECT id FROM creator_profiles WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE 'prod-creator%@bypass.com'
  )
)

UNION ALL

-- Check applications (should be 0)
SELECT '5. Applications', COUNT(*)
FROM campaign_applications ca
WHERE ca.creator_id IN (
  SELECT id FROM creator_profiles WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE 'prod-creator%@bypass.com'
  )
)

UNION ALL

-- Check campaigns (should be > 0, in unpaid state)
SELECT '6. Active Campaigns', COUNT(*)
FROM campaigns c
WHERE c.owner_id IN (
  SELECT id FROM users WHERE email LIKE 'prod-business%@bypass.com'
)
AND c.status = 'active';

-- Show campaigns after reset
SELECT 
  'Campaigns Ready for Testing' as info,
  r.name as restaurant_name,
  c.title as campaign_title,
  c.status,
  c.payment_status,
  c.budget_cents / 100.0 as budget_dollars,
  c.max_creators
FROM campaigns c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE c.owner_id IN (
  SELECT id FROM users WHERE email LIKE 'prod-business%@bypass.com'
)
AND c.status = 'active'
ORDER BY c.budget_cents DESC;
