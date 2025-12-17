-- =============================================
-- Payment Test Reset: Complete Cleanup
-- Purpose: Reset all payment test data for fresh testing
-- Run this to clean up ALL payment test data
-- =============================================
-- WARNING: This will delete payment-related test data
-- Use with caution - only run in test environments

DO $$
DECLARE
  v_business1_user_id UUID;
  v_business2_user_id UUID;
  v_creator1_user_id UUID;
  v_creator2_user_id UUID;
  v_creator3_user_id UUID;
BEGIN
  -- Find test user IDs
  SELECT id INTO v_business1_user_id FROM users WHERE email = 'test-business1@bypass.com';
  SELECT id INTO v_business2_user_id FROM users WHERE email = 'test-business2@bypass.com';
  SELECT id INTO v_creator1_user_id FROM users WHERE email = 'test-creator1@bypass.com';
  SELECT id INTO v_creator2_user_id FROM users WHERE email = 'test-creator2@bypass.com';
  SELECT id INTO v_creator3_user_id FROM users WHERE email = 'test-creator3@bypass.com';

  RAISE NOTICE 'Resetting all payment test data...';

  -- Remove all Stripe accounts for test users
  DELETE FROM stripe_accounts
  WHERE user_id IN (
    COALESCE(v_business1_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_business2_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_creator1_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_creator2_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_creator3_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

  RAISE NOTICE 'Removed Stripe accounts';

  -- Reset creator profile Stripe fields
  UPDATE creator_profiles
  SET
    stripe_account_id = NULL,
    stripe_onboarding_completed = false,
    updated_at = NOW()
  WHERE user_id IN (
    COALESCE(v_creator1_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_creator2_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_creator3_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

  RAISE NOTICE 'Reset creator profile Stripe fields';

  -- Remove payment records for test campaigns
  DELETE FROM campaign_payments
  WHERE business_id IN (
    COALESCE(v_business1_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_business2_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

  RAISE NOTICE 'Removed campaign payment records';

  -- Remove payment transaction records
  DELETE FROM payment_transactions
  WHERE business_id IN (
    COALESCE(v_business1_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_business2_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  OR creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id IN (
      COALESCE(v_creator1_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(v_creator2_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(v_creator3_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
  );

  RAISE NOTICE 'Removed payment transaction records';

  -- Reset campaigns to unpaid state
  UPDATE campaigns
  SET
    payment_status = 'unpaid',
    status = CASE 
      WHEN payment_status = 'paid' THEN 'draft'
      ELSE status
    END,
    payment_intent_id = NULL,
    paid_at = NULL,
    updated_at = NOW()
  WHERE business_id IN (
    COALESCE(v_business1_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_business2_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

  RAISE NOTICE 'Reset campaigns to unpaid state';

  -- Reset deliverables payment status
  UPDATE campaign_deliverables
  SET
    payment_status = 'pending',
    payment_transaction_id = NULL,
    paid_at = NULL,
    payment_error = NULL,
    payment_retry_count = 0,
    last_payment_retry_at = NULL,
    updated_at = NOW()
  WHERE creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id IN (
      COALESCE(v_creator1_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(v_creator2_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(v_creator3_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
  );

  RAISE NOTICE 'Reset deliverables payment status';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'All payment test data reset complete';
  RAISE NOTICE 'Ready for fresh testing';
  RAISE NOTICE '========================================';

END $$;

-- Verification queries
SELECT 'Stripe Accounts' as entity, COUNT(*) as count
FROM stripe_accounts sa
JOIN users u ON sa.user_id = u.id
WHERE u.email LIKE 'test-%@bypass.com'

UNION ALL

SELECT 'Campaign Payments', COUNT(*)
FROM campaign_payments cp
JOIN users u ON cp.business_id = u.id
WHERE u.email LIKE 'test-%@bypass.com'

UNION ALL

SELECT 'Payment Transactions', COUNT(*)
FROM payment_transactions pt
JOIN users u ON pt.business_id = u.id OR pt.creator_id IN (
  SELECT id FROM creator_profiles WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE 'test-%@bypass.com'
  )
)
WHERE EXISTS (
  SELECT 1 FROM users WHERE id = pt.business_id AND email LIKE 'test-%@bypass.com'
) OR EXISTS (
  SELECT 1 FROM creator_profiles cp2
  JOIN users u2 ON cp2.user_id = u2.id
  WHERE cp2.id = pt.creator_id AND u2.email LIKE 'test-%@bypass.com'
);

-- Expected: All counts should be 0
