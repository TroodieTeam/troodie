-- =============================================
-- Payment Test Reset: Campaign Payment Processing
-- Test Case: 2.1 - Successful Campaign Payment
-- =============================================
-- Purpose: Clean up after campaign payment test
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

  RAISE NOTICE 'Resetting campaign payment test data';

  -- Remove payment records for test campaigns
  DELETE FROM campaign_payments
  WHERE campaign_id IN (
    SELECT id FROM campaigns WHERE owner_id = v_user_id
  );

  -- Remove transaction records
  DELETE FROM payment_transactions
  WHERE business_id = v_user_id
    AND transaction_type = 'payment';

  -- Reset campaigns to unpaid state
  UPDATE campaigns
  SET
    payment_status = 'unpaid',
    status = 'draft',
    payment_intent_id = NULL,
    paid_at = NULL,
    updated_at = NOW()
  WHERE owner_id = v_user_id
    AND payment_status IN ('paid', 'succeeded');

  RAISE NOTICE 'Reset complete: Campaigns ready for next payment test';

END $$;

-- Verification query
SELECT 
  c.id,
  c.title,
  c.payment_status,
  c.status,
  COUNT(cp.id) as payment_count
FROM campaigns c
LEFT JOIN campaign_payments cp ON cp.campaign_id = c.id
WHERE c.owner_id = (SELECT id FROM users WHERE email = 'test-business1@bypass.com')
GROUP BY c.id, c.title, c.payment_status, c.status;
-- Expected: payment_status = 'unpaid', payment_count = 0
