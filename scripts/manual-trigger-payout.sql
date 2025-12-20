-- Manual Trigger: Process Payout for a Specific Deliverable
-- Use this to manually trigger processDeliverablePayout for deliverables that were approved
-- but didn't have the payout processing triggered

-- ============================================================================
-- STEP 1: Check current status before triggering
-- ============================================================================
SELECT 
    cd.id as deliverable_id,
    c.title as campaign_title,
    cd.status as deliverable_status,
    cd.payment_status,
    cd.payment_amount_cents,
    cd.payment_amount_cents / 100.0 as payment_amount_dollars,
    cd.payment_transaction_id,
    cd.payment_error,
    cp.stripe_account_id,
    cp.stripe_onboarding_completed
FROM campaign_deliverables cd
INNER JOIN campaigns c ON c.id = cd.campaign_id
INNER JOIN creator_profiles cp ON cp.id = cd.creator_id
WHERE cd.id = '255e2e96-643d-426e-b00d-e4a2931f89eb';

-- ============================================================================
-- STEP 2: Manual trigger via Edge Function (if needed)
-- ============================================================================
-- Note: This requires calling the Edge Function directly via Supabase Dashboard
-- or using the Supabase client. The Edge Function expects:
-- {
--   "deliverableId": "255e2e96-643d-426e-b00d-e4a2931f89eb",
--   "creatorId": "<creator_profile_id>",
--   "campaignId": "<campaign_id>",
--   "amountCents": 2500,
--   "stripeAccountId": "<stripe_account_id>"
-- }

-- Get the required IDs for manual Edge Function call:
SELECT 
    cd.id as deliverable_id,
    cd.creator_id as creator_profile_id,
    cd.campaign_id,
    cd.payment_amount_cents as amount_cents,
    cp.stripe_account_id,
    c.title as campaign_title,
    CASE 
        WHEN cd.status NOT IN ('approved', 'auto_approved') THEN '❌ Deliverable not approved'
        WHEN cp.stripe_account_id IS NULL THEN '❌ Creator has no Stripe account'
        WHEN cp.stripe_onboarding_completed = false THEN '❌ Creator onboarding not completed'
        WHEN cd.payment_amount_cents IS NULL OR cd.payment_amount_cents = 0 THEN '❌ payment_amount_cents not set'
        ELSE '✅ Ready to trigger payout'
    END as readiness_check
FROM campaign_deliverables cd
INNER JOIN campaigns c ON c.id = cd.campaign_id
INNER JOIN creator_profiles cp ON cp.id = cd.creator_id
WHERE cd.id = '255e2e96-643d-426e-b00d-e4a2931f89eb';

-- ============================================================================
-- STEP 3: Update payment_status to trigger retry (if using webhook/retry mechanism)
-- ============================================================================
-- This won't automatically trigger, but can be used if there's a retry mechanism
-- that checks for approved deliverables with pending payment_status
/*
UPDATE campaign_deliverables
SET 
    payment_status = 'pending',
    payment_error = NULL,
    updated_at = NOW()
WHERE id = '255e2e96-643d-426e-b00d-e4a2931f89eb'
  AND status IN ('approved', 'auto_approved');
*/

