-- Check Platform Account Balance Status
-- This helps diagnose why transfers are failing

-- ============================================================================
-- STEP 1: Check Recent Campaign Payments
-- ============================================================================
SELECT 
    cp.id as payment_id,
    cp.campaign_id,
    c.title as campaign_title,
    cp.status as payment_status,
    cp.amount_cents / 100.0 as amount_dollars,
    cp.creator_payout_cents / 100.0 as creator_payout_dollars,
    cp.stripe_payment_intent_id,
    cp.created_at,
    cp.paid_at,
    CASE 
        WHEN cp.status = 'succeeded' THEN '✅ Payment succeeded - funds should be in platform account'
        WHEN cp.status = 'pending' THEN '⏸️ Payment pending - not yet captured'
        WHEN cp.status = 'processing' THEN '⏸️ Payment processing'
        WHEN cp.status = 'failed' THEN '❌ Payment failed'
        ELSE CONCAT('❓ Status: ', cp.status)
    END as payment_status_note
FROM campaign_payments cp
JOIN campaigns c ON c.id = cp.campaign_id
ORDER BY cp.created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 2: Check Failed Transfers (Due to Insufficient Balance)
-- ============================================================================
SELECT 
    cd.id as deliverable_id,
    c.title as campaign_title,
    cd.payment_status,
    cd.payment_amount_cents / 100.0 as payment_amount_dollars,
    cd.payment_error,
    cd.payment_transaction_id,
    pt.stripe_transfer_id,
    pt.status as transaction_status,
    pt.error_message as transaction_error,
    cd.updated_at as last_updated
FROM campaign_deliverables cd
JOIN campaigns c ON c.id = cd.campaign_id
LEFT JOIN payment_transactions pt ON pt.deliverable_id = cd.id
WHERE cd.status IN ('approved', 'auto_approved')
  AND (cd.payment_status = 'failed' OR cd.payment_error LIKE '%insufficient%' OR cd.payment_error LIKE '%balance%')
ORDER BY cd.updated_at DESC;

-- ============================================================================
-- STEP 3: Summary - Total Funds Needed vs Available
-- ============================================================================
SELECT 
    COUNT(*) as pending_payouts,
    SUM(cd.payment_amount_cents) / 100.0 as total_payout_needed_dollars,
    SUM(CASE WHEN cd.payment_status = 'processing' THEN cd.payment_amount_cents ELSE 0 END) / 100.0 as processing_payouts_dollars,
    SUM(CASE WHEN cd.payment_status = 'failed' THEN cd.payment_amount_cents ELSE 0 END) / 100.0 as failed_payouts_dollars,
    SUM(CASE WHEN cd.payment_status = 'pending' THEN cd.payment_amount_cents ELSE 0 END) / 100.0 as pending_payouts_dollars
FROM campaign_deliverables cd
WHERE cd.status IN ('approved', 'auto_approved')
  AND cd.payment_amount_cents > 0
  AND cd.payment_status != 'completed';

-- ============================================================================
-- NOTE: Platform Balance Check
-- ============================================================================
-- ⚠️ IMPORTANT: In TEST MODE, Stripe doesn't automatically add funds to your
-- platform account balance when payments succeed. You need to manually add
-- test funds using test card 4000000000000077.
--
-- To add test funds:
-- 1. Go to Stripe Dashboard → Payments → Create Payment
-- 2. Use card: 4000000000000077
-- 3. Enter amount needed (e.g., $1000)
-- 4. Complete payment
-- 5. Funds will appear in Available Balance
--
-- In PRODUCTION MODE, this won't be an issue - real payments automatically
-- add funds to your platform account.

