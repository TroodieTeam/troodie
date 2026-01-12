-- Trace Payout Flow: Restaurant Payment → Platform Payout
-- Use this to trace the complete flow from payment to payout

-- STEP 1: Find the payment intent and related records
SELECT 
  '=== PAYMENT RECORD ===' as section,
  cp.id as payment_id,
  cp.campaign_id,
  cp.status as payment_status,
  cp.amount_cents / 100.0 as payment_amount_dollars,
  cp.stripe_payment_intent_id,
  cp.paid_at,
  cp.refunded_at,
  c.title as campaign_title,
  c.payment_status as campaign_payment_status
FROM campaign_payments cp
JOIN campaigns c ON c.id = cp.campaign_id
WHERE cp.stripe_payment_intent_id = 'pi_3SfnCSDt5IHC2XMO24gt3p5y'  -- Replace with your payment intent ID
ORDER BY cp.created_at DESC;

-- STEP 2: Check for platform payouts (Stripe → bank account)
SELECT 
  '=== PLATFORM PAYOUTS ===' as section,
  pt.id as transaction_id,
  pt.stripe_payout_id,
  pt.transaction_type,
  pt.status,
  pt.amount_cents / 100.0 as amount_dollars,
  pt.metadata->>'destination' as payout_destination,
  pt.metadata->>'method' as payout_method,
  pt.metadata->>'type' as payout_type,
  pt.created_at as payout_created_at,
  pt.completed_at as payout_completed_at
FROM payment_transactions pt
WHERE pt.transaction_type = 'platform_payout'
  AND pt.stripe_payout_id = 'po_1SgwlQDt5lHC2XM0bmCpoeu6'  -- Replace with your payout ID
ORDER BY pt.created_at DESC;

-- STEP 3: Check all transactions for this campaign
SELECT 
  '=== ALL TRANSACTIONS ===' as section,
  pt.id,
  pt.transaction_type,
  pt.status,
  pt.amount_cents / 100.0 as amount_dollars,
  pt.stripe_payment_intent_id,
  pt.stripe_transfer_id,
  pt.stripe_payout_id,
  pt.stripe_refund_id,
  pt.created_at,
  pt.completed_at,
  CASE 
    WHEN pt.transaction_type = 'payment' THEN 'Restaurant → Troodie'
    WHEN pt.transaction_type = 'payout' THEN 'Troodie → Creator'
    WHEN pt.transaction_type = 'platform_payout' THEN 'Stripe → Bank Account'
    WHEN pt.transaction_type = 'refund' THEN 'Troodie → Restaurant'
    ELSE 'Unknown'
  END as flow_direction
FROM payment_transactions pt
WHERE pt.campaign_id = '3673e1cc-939e-4ee5-81e6-f36f847a62af'  -- Replace with your campaign ID
ORDER BY pt.created_at DESC;

-- STEP 4: Check for any creator payouts (should be none)
SELECT 
  '=== CREATOR PAYOUTS (SHOULD BE EMPTY) ===' as section,
  pt.id,
  pt.transaction_type,
  pt.status,
  pt.amount_cents / 100.0 as amount_dollars,
  pt.stripe_transfer_id,
  pt.deliverable_id,
  pt.creator_id,
  cd.status as deliverable_status,
  cp.user_id as creator_user_id
FROM payment_transactions pt
LEFT JOIN campaign_deliverables cd ON cd.id = pt.deliverable_id
LEFT JOIN creator_profiles cp ON cp.id = pt.creator_id
WHERE pt.campaign_id = '3673e1cc-939e-4ee5-81e6-f36f847a62af'  -- Replace with your campaign ID
  AND pt.transaction_type = 'payout'
ORDER BY pt.created_at DESC;

-- STEP 5: Summary - Payment vs Payout comparison
SELECT 
  '=== SUMMARY ===' as section,
  'Payment Received' as transaction_type,
  SUM(pt.amount_cents) / 100.0 as total_dollars,
  COUNT(*) as transaction_count
FROM payment_transactions pt
WHERE pt.campaign_id = '3673e1cc-939e-4ee5-81e6-f36f847a62af'  -- Replace with your campaign ID
  AND pt.transaction_type = 'payment'

UNION ALL

SELECT 
  '=== SUMMARY ===' as section,
  'Platform Payouts' as transaction_type,
  SUM(pt.amount_cents) / 100.0 as total_dollars,
  COUNT(*) as transaction_count
FROM payment_transactions pt
WHERE pt.campaign_id = '3673e1cc-939e-4ee5-81e6-f36f847a62af'  -- Replace with your campaign ID
  AND pt.transaction_type = 'platform_payout'

UNION ALL

SELECT 
  '=== SUMMARY ===' as section,
  'Creator Payouts' as transaction_type,
  SUM(pt.amount_cents) / 100.0 as total_dollars,
  COUNT(*) as transaction_count
FROM payment_transactions pt
WHERE pt.campaign_id = '3673e1cc-939e-4ee5-81e6-f36f847a62af'  -- Replace with your campaign ID
  AND pt.transaction_type = 'payout'

UNION ALL

SELECT 
  '=== SUMMARY ===' as section,
  'Refunds' as transaction_type,
  SUM(pt.amount_cents) / 100.0 as total_dollars,
  COUNT(*) as transaction_count
FROM payment_transactions pt
WHERE pt.campaign_id = '3673e1cc-939e-4ee5-81e6-f36f847a62af'  -- Replace with your campaign ID
  AND pt.transaction_type = 'refund';

-- STEP 6: Timeline of events
SELECT 
  '=== TIMELINE ===' as section,
  pt.created_at as event_time,
  pt.transaction_type as event_type,
  pt.status as event_status,
  pt.amount_cents / 100.0 as amount_dollars,
  CASE 
    WHEN pt.stripe_payment_intent_id IS NOT NULL THEN 'Payment Intent: ' || pt.stripe_payment_intent_id
    WHEN pt.stripe_payout_id IS NOT NULL THEN 'Payout: ' || pt.stripe_payout_id
    WHEN pt.stripe_transfer_id IS NOT NULL THEN 'Transfer: ' || pt.stripe_transfer_id
    WHEN pt.stripe_refund_id IS NOT NULL THEN 'Refund: ' || pt.stripe_refund_id
    ELSE 'No Stripe ID'
  END as stripe_reference
FROM payment_transactions pt
WHERE pt.campaign_id = '3673e1cc-939e-4ee5-81e6-f36f847a62af'  -- Replace with your campaign ID
ORDER BY pt.created_at ASC;

