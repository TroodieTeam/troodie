-- =============================================
-- Payment Test Reset: Automatic Payout Processing
-- Test Case: 4.1 - Successful Automatic Payout
-- =============================================
-- Purpose: Clean up after payout processing test
-- Run this AFTER testing to reset for next test

DO $$
DECLARE
  v_creator_user_id UUID;
BEGIN
  -- Find creator user ID
  SELECT id INTO v_creator_user_id
  FROM public.users
  WHERE email = 'test-creator1@bypass.com';

  IF v_creator_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-creator1@bypass.com not found';
  END IF;

  RAISE NOTICE 'Resetting payout processing test data';

  -- Reset deliverables to submitted state (remove payment status)
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
    SELECT id FROM creator_profiles WHERE user_id = v_creator_user_id
  )
  AND payment_status IN ('completed', 'processing', 'failed');

  -- Remove payout transaction records
  DELETE FROM payment_transactions
  WHERE creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id = v_creator_user_id
  )
  AND transaction_type = 'payout';

  RAISE NOTICE 'Reset deliverables payment status';
  RAISE NOTICE 'Removed payout transaction records';
  RAISE NOTICE 'Reset complete: Ready for next payout test';

END $$;

-- Verification query
SELECT 
  cd.id,
  cd.status,
  cd.payment_status,
  cd.payment_transaction_id,
  cd.paid_at,
  COUNT(pt.id) as payout_transaction_count
FROM campaign_deliverables cd
LEFT JOIN payment_transactions pt ON pt.deliverable_id = cd.id AND pt.transaction_type = 'payout'
WHERE cd.creator_id IN (
  SELECT id FROM creator_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'test-creator1@bypass.com')
)
GROUP BY cd.id, cd.status, cd.payment_status, cd.payment_transaction_id, cd.paid_at;
-- Expected: payment_status = 'pending', payment_transaction_id = NULL, payout_transaction_count = 0
