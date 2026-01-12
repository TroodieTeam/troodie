-- Diagnostic Query: Investigate Unexpected Payout
-- Use this to check what happened with a specific payment intent and any associated payouts/refunds

-- STEP 1: Check the payment record for this campaign
SELECT 
  cp.id as payment_id,
  cp.campaign_id,
  cp.status as payment_status,
  cp.amount_cents / 100.0 as amount_dollars,
  cp.stripe_payment_intent_id,
  cp.paid_at,
  cp.refunded_at,
  cp.stripe_refund_id,
  c.title as campaign_title,
  c.payment_status as campaign_payment_status,
  c.status as campaign_status
FROM campaign_payments cp
JOIN campaigns c ON c.id = cp.campaign_id
WHERE cp.stripe_payment_intent_id = 'pi_3SfnCSDt5IHC2XMO24gt3p5y'  -- Replace with your payment intent ID
ORDER BY cp.created_at DESC;

-- STEP 2: Check for any refund transactions
SELECT 
  pt.id,
  pt.transaction_type,
  pt.status,
  pt.amount_cents / 100.0 as amount_dollars,
  pt.stripe_refund_id,
  pt.stripe_payment_intent_id,
  pt.completed_at,
  pt.created_at
FROM payment_transactions pt
WHERE pt.stripe_payment_intent_id = 'pi_3SfnCSDt5IHC2XMO24gt3p5y'  -- Replace with your payment intent ID
  AND pt.transaction_type = 'refund'
ORDER BY pt.created_at DESC;

-- STEP 3: Check for any deliverables (should be none if no creator applied)
SELECT 
  cd.id,
  cd.status as deliverable_status,
  cd.payment_status,
  cd.payment_amount_cents / 100.0 as payment_amount_dollars,
  cd.payment_transaction_id,
  cp.stripe_account_id as creator_stripe_account,
  cp.user_id as creator_user_id
FROM campaign_deliverables cd
LEFT JOIN creator_profiles cp ON cp.id = cd.creator_id
WHERE cd.campaign_id = '3673e1cc-939e-4ee5-81e6-f36f847a62af'  -- Replace with your campaign ID
ORDER BY cd.created_at DESC;

-- STEP 4: Check for any transfers (should be none if no creator applied)
SELECT 
  pt.id,
  pt.transaction_type,
  pt.status,
  pt.amount_cents / 100.0 as amount_dollars,
  pt.stripe_transfer_id,
  pt.deliverable_id,
  pt.creator_id,
  pt.completed_at
FROM payment_transactions pt
WHERE pt.campaign_id = '3673e1cc-939e-4ee5-81e6-f36f847a62af'  -- Replace with your campaign ID
  AND pt.transaction_type = 'payout'
ORDER BY pt.created_at DESC;

-- STEP 5: Check webhook logs (if available in your database)
-- Note: This assumes you have webhook logs stored. Adjust based on your setup.
-- You may need to check Supabase Edge Function logs instead

-- STEP 6: Summary - What should have happened vs what did happen
SELECT 
  'Payment Status' as check_type,
  cp.status as current_status,
  CASE 
    WHEN cp.status = 'succeeded' THEN '✅ Payment succeeded correctly'
    WHEN cp.status = 'refunded' THEN '⚠️ Payment was refunded'
    WHEN cp.status = 'failed' THEN '❌ Payment failed'
    ELSE '❓ Unexpected status: ' || cp.status
  END as diagnosis
FROM campaign_payments cp
WHERE cp.stripe_payment_intent_id = 'pi_3SfnCSDt5IHC2XMO24gt3p5y'  -- Replace with your payment intent ID

UNION ALL

SELECT 
  'Deliverables Count' as check_type,
  COUNT(*)::text as current_status,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No deliverables (expected - no creator applied)'
    ELSE '⚠️ ' || COUNT(*)::text || ' deliverable(s) found (unexpected)'
  END as diagnosis
FROM campaign_deliverables cd
WHERE cd.campaign_id = '3673e1cc-939e-4ee5-81e6-f36f847a62af'  -- Replace with your campaign ID

UNION ALL

SELECT 
  'Payout Transfers' as check_type,
  COUNT(*)::text as current_status,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No payout transfers (expected - no creator applied)'
    ELSE '❌ ' || COUNT(*)::text || ' payout transfer(s) found (SHOULD NOT EXIST)'
  END as diagnosis
FROM payment_transactions pt
WHERE pt.campaign_id = '3673e1cc-939e-4ee5-81e6-f36f847a62af'  -- Replace with your campaign ID
  AND pt.transaction_type = 'payout'

UNION ALL

SELECT 
  'Refund Transactions' as check_type,
  COUNT(*)::text as current_status,
  CASE 
    WHEN COUNT(*) = 0 THEN 'ℹ️ No refund transactions in database'
    ELSE '⚠️ ' || COUNT(*)::text || ' refund transaction(s) found'
  END as diagnosis
FROM payment_transactions pt
WHERE pt.stripe_payment_intent_id = 'pi_3SfnCSDt5IHC2XMO24gt3p5y'  -- Replace with your payment intent ID
  AND pt.transaction_type = 'refund';

