-- Diagnostic Query: Why is there no Stripe Transfer?
-- This traces the entire payment flow to find where it's failing
--
-- EXPECTED FLOW:
-- 1. Deliverable approved → approveDeliverable() called
-- 2. Calls processDeliverablePayout() 
-- 3. processDeliverablePayout checks:
--    a. Deliverable is approved ✓
--    b. Creator has Stripe account
--    c. Creator onboarding completed
--    d. Campaign payment exists and succeeded
-- 4. Calls Edge Function: stripe-process-payout
-- 5. Edge Function creates Stripe Transfer via stripe.transfers.create()
-- 6. Edge Function updates payment_status = 'processing' and payment_transaction_id = transfer.id
-- 7. Stripe webhook updates payment_status = 'completed' when transfer completes
--
-- IF NO TRANSFER EXISTS, CHECK:
-- - payment_status = 'pending' → processDeliverablePayout was NOT called or failed early
-- - payment_status = 'pending_onboarding' → Creator needs Stripe onboarding
-- - payment_status = 'processing' but no payment_transaction_id → Edge Function failed
-- - payment_status = 'failed' → Check payment_error field
-- - payment_transaction_id exists → Transfer was created, check Stripe Dashboard

-- ============================================================================
-- STEP 1: Check the deliverable and its payment status
-- ============================================================================
SELECT 
    cd.id as deliverable_id,
    c.title as campaign_title,
    cd.status as deliverable_status,
    cd.payment_status,
    cd.payment_amount_cents,
    cd.payment_amount_cents / 100.0 as payment_amount_dollars,
    cd.payment_transaction_id as stripe_transfer_id,
    cd.payment_error,
    cd.payment_retry_count,
    cd.submitted_at,
    cd.reviewed_at,
    cd.paid_at
FROM campaign_deliverables cd
INNER JOIN campaigns c ON c.id = cd.campaign_id
WHERE c.title LIKE '%Testing Payment Sheet 3%'
ORDER BY cd.submitted_at DESC
LIMIT 1;

-- ============================================================================
-- STEP 2: Check if creator has Stripe account and onboarding completed
-- ============================================================================
SELECT 
    cp.id as creator_profile_id,
    cp.user_id,
    cp.stripe_account_id,
    cp.stripe_onboarding_completed,
    cp.stripe_onboarded_at,
    CASE 
        WHEN cp.stripe_account_id IS NULL THEN '❌ No Stripe account ID'
        WHEN cp.stripe_onboarding_completed = false THEN '❌ Onboarding not completed'
        WHEN cp.stripe_onboarding_completed = true THEN '✅ Onboarding completed'
        ELSE '⚠️ Unknown status'
    END as onboarding_diagnosis
FROM campaign_deliverables cd
INNER JOIN campaigns c ON c.id = cd.campaign_id
INNER JOIN creator_profiles cp ON cp.id = cd.creator_id
WHERE c.title LIKE '%Testing Payment Sheet 3%'
ORDER BY cd.submitted_at DESC
LIMIT 1;

-- ============================================================================
-- STEP 3: Check if campaign payment exists (required for payout)
-- ============================================================================
SELECT 
    cp.id as campaign_payment_id,
    cp.campaign_id,
    cp.amount_cents,
    cp.amount_cents / 100.0 as amount_dollars,
    cp.creator_payout_cents,
    cp.creator_payout_cents / 100.0 as creator_payout_dollars,
    cp.status as payment_status,
    cp.stripe_payment_intent_id,
    c.title as campaign_title,
    CASE 
        WHEN cp.id IS NULL THEN '❌ No campaign payment found'
        WHEN cp.status != 'succeeded' THEN '❌ Campaign payment not succeeded'
        ELSE '✅ Campaign payment exists and succeeded'
    END as payment_diagnosis
FROM campaigns c
LEFT JOIN campaign_payments cp ON cp.campaign_id = c.id AND cp.status = 'succeeded'
WHERE c.title LIKE '%Testing Payment Sheet 3%'
ORDER BY cp.created_at DESC
LIMIT 1;

-- ============================================================================
-- STEP 4: Check payment_transactions table (created by Edge Function)
-- ============================================================================
SELECT 
    pt.id as transaction_id,
    pt.campaign_id,
    pt.deliverable_id,
    pt.creator_id,
    pt.stripe_transfer_id,
    pt.amount_cents,
    pt.amount_cents / 100.0 as amount_dollars,
    pt.creator_amount_cents,
    pt.creator_amount_cents / 100.0 as creator_amount_dollars,
    pt.transaction_type,
    pt.status as transaction_status,
    pt.created_at,
    pt.completed_at,
    c.title as campaign_title,
    CASE 
        WHEN pt.id IS NULL THEN '❌ No transaction record - Edge Function was NOT called'
        WHEN pt.stripe_transfer_id IS NULL THEN '⚠️ Transaction created but no Stripe transfer ID'
        WHEN pt.status = 'processing' THEN '⏳ Transfer created, waiting for Stripe'
        WHEN pt.status = 'completed' THEN '✅ Transfer completed'
        WHEN pt.status = 'failed' THEN '❌ Transfer failed'
        ELSE '⚠️ Unknown status'
    END as transaction_diagnosis
FROM campaigns c
LEFT JOIN payment_transactions pt ON pt.campaign_id = c.id AND pt.transaction_type = 'payout'
WHERE c.title LIKE '%Testing Payment Sheet 3%'
ORDER BY pt.created_at DESC;

-- ============================================================================
-- STEP 5: Comprehensive diagnostic - all conditions checked
-- ============================================================================
WITH deliverable_info AS (
    SELECT 
        cd.id as deliverable_id,
        cd.campaign_id,
        cd.creator_id,
        cd.status as deliverable_status,
        cd.payment_status,
        cd.payment_amount_cents,
        cd.payment_transaction_id,
        cd.payment_error,
        cd.submitted_at,
        cd.reviewed_at
    FROM campaign_deliverables cd
    INNER JOIN campaigns c ON c.id = cd.campaign_id
    WHERE c.title LIKE '%Testing Payment Sheet 3%'
    ORDER BY cd.submitted_at DESC
    LIMIT 1
),
creator_info AS (
    SELECT 
        cp.id as creator_profile_id,
        cp.stripe_account_id,
        cp.stripe_onboarding_completed
    FROM creator_profiles cp
    INNER JOIN deliverable_info di ON di.creator_id = cp.id
),
campaign_payment_info AS (
    SELECT 
        cp.id as campaign_payment_id,
        cp.status as payment_status,
        cp.amount_cents,
        cp.creator_payout_cents
    FROM campaign_payments cp
    INNER JOIN deliverable_info di ON di.campaign_id = cp.campaign_id
    WHERE cp.status = 'succeeded'
    ORDER BY cp.created_at DESC
    LIMIT 1
),
transaction_info AS (
    SELECT 
        pt.id as transaction_id,
        pt.stripe_transfer_id,
        pt.status as transaction_status
    FROM payment_transactions pt
    INNER JOIN deliverable_info di ON di.deliverable_id = pt.deliverable_id
    WHERE pt.transaction_type = 'payout'
    ORDER BY pt.created_at DESC
    LIMIT 1
)
SELECT 
    di.deliverable_id,
    di.deliverable_status,
    di.payment_status,
    di.payment_amount_cents,
    di.payment_transaction_id,
    di.payment_error,
    
    ci.stripe_account_id,
    ci.stripe_onboarding_completed,
    
    cpi.campaign_payment_id,
    cpi.payment_status as campaign_payment_status,
    cpi.amount_cents as campaign_payment_amount_cents,
    
    ti.transaction_id,
    ti.stripe_transfer_id,
    ti.transaction_status,
    
    -- Diagnostic flags
    CASE 
        WHEN di.deliverable_status NOT IN ('approved', 'auto_approved') THEN 
            '❌ STEP 1 FAILED: Deliverable not approved'
        WHEN ci.stripe_account_id IS NULL THEN 
            '❌ STEP 2 FAILED: Creator has no Stripe account'
        WHEN ci.stripe_onboarding_completed = false THEN 
            '❌ STEP 2 FAILED: Creator onboarding not completed'
        WHEN cpi.campaign_payment_id IS NULL THEN 
            '❌ STEP 3 FAILED: No campaign payment found'
        WHEN cpi.payment_status != 'succeeded' THEN 
            '❌ STEP 3 FAILED: Campaign payment not succeeded'
        WHEN ti.transaction_id IS NULL THEN 
            '❌ STEP 4 FAILED: Edge Function was NOT called (no transaction record)'
        WHEN ti.stripe_transfer_id IS NULL THEN 
            '❌ STEP 5 FAILED: Edge Function called but no Stripe transfer created'
        WHEN ti.stripe_transfer_id IS NOT NULL THEN 
            '✅ Transfer created: ' || ti.stripe_transfer_id
        ELSE '⚠️ Unknown issue'
    END as root_cause_diagnosis

FROM deliverable_info di
LEFT JOIN creator_info ci ON TRUE
LEFT JOIN campaign_payment_info cpi ON TRUE
LEFT JOIN transaction_info ti ON TRUE;

-- ============================================================================
-- STEP 6: Check Edge Function logs (if accessible)
-- ============================================================================
-- Note: This would need to be checked in Supabase Dashboard → Edge Functions → stripe-process-payout → Logs
-- Look for:
-- - Was the function invoked?
-- - What was the request body?
-- - Any errors in the response?

-- ============================================================================
-- STEP 7: Check if processDeliverablePayout was called
-- ============================================================================
-- This would show in application logs, but we can infer from:
-- - payment_status = 'processing' means it was called
-- - payment_status = 'pending_onboarding' means it was called but onboarding incomplete
-- - payment_status = 'pending' means it was NOT called
-- - payment_error field would contain error message if it failed

SELECT 
    cd.id as deliverable_id,
    cd.payment_status,
    cd.payment_error,
    CASE 
        WHEN cd.payment_status = 'pending' THEN 
            '❌ processDeliverablePayout was NOT called (still pending)'
        WHEN cd.payment_status = 'pending_onboarding' THEN 
            '⏳ processDeliverablePayout was called but creator needs onboarding'
        WHEN cd.payment_status = 'processing' AND cd.payment_transaction_id IS NULL THEN 
            '⚠️ processDeliverablePayout was called but Edge Function failed (no transaction_id)'
        WHEN cd.payment_status = 'processing' AND cd.payment_transaction_id IS NOT NULL THEN 
            '✅ processDeliverablePayout was called, Edge Function succeeded, transfer: ' || cd.payment_transaction_id
        WHEN cd.payment_status = 'failed' THEN 
            '❌ processDeliverablePayout failed: ' || COALESCE(cd.payment_error, 'Unknown error')
        WHEN cd.payment_status = 'completed' THEN 
            '✅ Payment completed'
        ELSE 
            '⚠️ Unknown status: ' || cd.payment_status
    END as payout_service_diagnosis
FROM campaign_deliverables cd
INNER JOIN campaigns c ON c.id = cd.campaign_id
WHERE c.title LIKE '%Testing Payment Sheet 3%'
ORDER BY cd.submitted_at DESC
LIMIT 1;
