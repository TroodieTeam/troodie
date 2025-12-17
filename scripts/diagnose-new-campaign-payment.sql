-- Diagnose: Why new campaign shows $0.00 in payments screen
-- Run this for a specific campaign that was just created and approved

-- Replace these IDs with your actual campaign/deliverable IDs
-- SET @campaign_id = 'YOUR_CAMPAIGN_ID';
-- SET @deliverable_id = 'YOUR_DELIVERABLE_ID';

-- ============================================================================
-- STEP 1: Check Campaign Details
-- ============================================================================
SELECT 
    c.id as campaign_id,
    c.title as campaign_title,
    c.budget_cents,
    c.budget_cents / 100.0 as budget_dollars,
    c.payment_status as campaign_payment_status,
    c.status as campaign_status
FROM campaigns c
WHERE c.id = 'YOUR_CAMPAIGN_ID'; -- Replace with actual campaign ID

-- ============================================================================
-- STEP 2: Check Campaign Payment Record
-- ============================================================================
SELECT 
    cp.id as payment_id,
    cp.campaign_id,
    cp.amount_cents,
    cp.amount_cents / 100.0 as amount_dollars,
    cp.platform_fee_cents,
    cp.platform_fee_cents / 100.0 as platform_fee_dollars,
    cp.creator_payout_cents,
    cp.creator_payout_cents / 100.0 as creator_payout_dollars,
    cp.status as payment_status,
    cp.stripe_payment_intent_id,
    cp.created_at,
    cp.paid_at
FROM campaign_payments cp
WHERE cp.campaign_id = 'YOUR_CAMPAIGN_ID' -- Replace with actual campaign ID
ORDER BY cp.created_at DESC;

-- ============================================================================
-- STEP 3: Check Deliverable Details
-- ============================================================================
SELECT 
    cd.id as deliverable_id,
    cd.campaign_id,
    cd.creator_id,
    cd.status as deliverable_status,
    cd.payment_amount_cents,
    cd.payment_amount_cents / 100.0 as payment_amount_dollars,
    cd.payment_status,
    cd.payment_error,
    cd.submitted_at,
    cd.reviewed_at,
    cd.reviewer_id
FROM campaign_deliverables cd
WHERE cd.campaign_id = 'YOUR_CAMPAIGN_ID' -- Replace with actual campaign ID
ORDER BY cd.submitted_at DESC;

-- ============================================================================
-- STEP 4: Check Specific Deliverable (if you have the ID)
-- ============================================================================
SELECT 
    cd.id as deliverable_id,
    cd.campaign_id,
    cd.creator_id,
    cd.status as deliverable_status,
    cd.payment_amount_cents,
    cd.payment_amount_cents / 100.0 as payment_amount_dollars,
    cd.payment_status,
    cd.payment_error,
    cd.submitted_at,
    cd.reviewed_at,
    c.title as campaign_title,
    c.budget_cents as campaign_budget_cents,
    cp.creator_payout_cents as campaign_payment_creator_payout_cents,
    cp.amount_cents as campaign_payment_amount_cents,
    cp.status as campaign_payment_status,
    CASE 
        WHEN cd.payment_amount_cents IS NULL THEN '❌ payment_amount_cents is NULL'
        WHEN cd.payment_amount_cents = 0 THEN '❌ payment_amount_cents is 0'
        WHEN cd.payment_amount_cents > 0 THEN '✅ payment_amount_cents is set'
        ELSE '❓ Unknown state'
    END as payment_amount_status,
    CASE 
        WHEN cp.id IS NULL THEN '❌ No campaign_payments record'
        WHEN cp.status != 'succeeded' THEN CONCAT('⚠️ Campaign payment status: ', cp.status)
        WHEN cp.status = 'succeeded' THEN '✅ Campaign payment succeeded'
        ELSE '❓ Unknown'
    END as campaign_payment_status_check
FROM campaign_deliverables cd
LEFT JOIN campaigns c ON c.id = cd.campaign_id
LEFT JOIN campaign_payments cp ON cp.campaign_id = cd.campaign_id AND cp.status = 'succeeded'
WHERE cd.id = 'YOUR_DELIVERABLE_ID'; -- Replace with actual deliverable ID

-- ============================================================================
-- STEP 5: Root Cause Analysis
-- ============================================================================
-- This query shows why payment_amount_cents might be NULL/0
SELECT 
    cd.id as deliverable_id,
    cd.payment_amount_cents,
    cd.status as deliverable_status,
    cd.payment_status,
    c.budget_cents as campaign_budget_cents,
    cp.creator_payout_cents as campaign_payment_creator_payout_cents,
    cp.amount_cents as campaign_payment_amount_cents,
    cp.status as campaign_payment_status,
    CASE 
        -- Check if campaign payment exists and succeeded
        WHEN cp.id IS NULL THEN 'ROOT CAUSE: No campaign_payments record exists'
        WHEN cp.status != 'succeeded' THEN CONCAT('ROOT CAUSE: Campaign payment not succeeded (status: ', cp.status, ')')
        -- Check if payment_amount_cents is set
        WHEN cd.payment_amount_cents IS NULL THEN 'ROOT CAUSE: payment_amount_cents was never set during approval'
        WHEN cd.payment_amount_cents = 0 THEN 'ROOT CAUSE: payment_amount_cents was set to 0 (likely budget_cents was 0 or NULL)'
        -- Check if amount is correct
        WHEN cd.payment_amount_cents != COALESCE(cp.creator_payout_cents, cp.amount_cents, c.budget_cents) THEN 'WARNING: payment_amount_cents does not match expected source'
        ELSE '✅ payment_amount_cents is correctly set'
    END as root_cause_diagnosis
FROM campaign_deliverables cd
LEFT JOIN campaigns c ON c.id = cd.campaign_id
LEFT JOIN campaign_payments cp ON cp.campaign_id = cd.campaign_id
WHERE cd.id = 'YOUR_DELIVERABLE_ID'; -- Replace with actual deliverable ID

-- ============================================================================
-- STEP 6: Fix Query (if needed)
-- ============================================================================
-- Only run this if you've identified the root cause and want to fix it
-- Replace the deliverable_id and adjust the amount calculation as needed

/*
UPDATE campaign_deliverables
SET 
    payment_amount_cents = (
        SELECT COALESCE(
            cp.creator_payout_cents,
            cp.amount_cents,
            c.budget_cents,
            0
        )
        FROM campaigns c
        LEFT JOIN campaign_payments cp ON cp.campaign_id = c.id AND cp.status = 'succeeded'
        WHERE c.id = campaign_deliverables.campaign_id
    ),
    updated_at = NOW()
WHERE id = 'YOUR_DELIVERABLE_ID' -- Replace with actual deliverable ID
  AND (payment_amount_cents IS NULL OR payment_amount_cents = 0);
*/
