-- Diagnose why payment_amount_cents is NULL for deliverable f6be6a31-a018-424e-b838-b54fa098a95e

-- ============================================================================
-- STEP 1: Check Campaign Payment Record
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
    cp.paid_at,
    CASE 
        WHEN cp.id IS NULL THEN '❌ No campaign_payments record exists'
        WHEN cp.status != 'succeeded' THEN CONCAT('⚠️ Payment status: ', cp.status, ' (not succeeded)')
        WHEN cp.status = 'succeeded' THEN '✅ Payment succeeded - creator_payout_cents available'
        ELSE '❓ Unknown status'
    END as payment_status_check
FROM campaign_payments cp
WHERE cp.campaign_id = '12009845-b8da-4dbc-90f3-67ec5343dc78'
ORDER BY cp.created_at DESC;

-- ============================================================================
-- STEP 2: Check Campaign Budget
-- ============================================================================
SELECT 
    c.id as campaign_id,
    c.title as campaign_title,
    c.budget_cents,
    c.budget_cents / 100.0 as budget_dollars,
    c.payment_status as campaign_payment_status,
    c.status as campaign_status,
    CASE 
        WHEN c.budget_cents IS NULL THEN '❌ budget_cents is NULL'
        WHEN c.budget_cents = 0 THEN '❌ budget_cents is 0'
        WHEN c.budget_cents > 0 THEN '✅ budget_cents is set'
        ELSE '❓ Unknown'
    END as budget_status_check
FROM campaigns c
WHERE c.id = '12009845-b8da-4dbc-90f3-67ec5343dc78';

-- ============================================================================
-- STEP 3: Complete Root Cause Analysis
-- ============================================================================
SELECT 
    cd.id as deliverable_id,
    cd.payment_amount_cents,
    cd.payment_amount_cents / 100.0 as payment_amount_dollars,
    cd.status as deliverable_status,
    cd.payment_status,
    cd.reviewed_at,
    c.budget_cents as campaign_budget_cents,
    c.budget_cents / 100.0 as campaign_budget_dollars,
    cp.creator_payout_cents as campaign_payment_creator_payout_cents,
    cp.creator_payout_cents / 100.0 as campaign_payment_creator_payout_dollars,
    cp.amount_cents as campaign_payment_amount_cents,
    cp.amount_cents / 100.0 as campaign_payment_amount_dollars,
    cp.status as campaign_payment_status,
    CASE 
        -- Check if campaign payment exists and succeeded
        WHEN cp.id IS NULL THEN 'ROOT CAUSE: No campaign_payments record exists - approval should have used budget_cents'
        WHEN cp.status != 'succeeded' THEN CONCAT('ROOT CAUSE: Campaign payment not succeeded (status: ', cp.status, ') - approval should have used budget_cents')
        WHEN cp.status = 'succeeded' AND cp.creator_payout_cents IS NOT NULL AND cp.creator_payout_cents > 0 THEN 'ROOT CAUSE: Campaign payment succeeded with creator_payout_cents, but approval did not set payment_amount_cents'
        WHEN cp.status = 'succeeded' AND cp.creator_payout_cents IS NULL THEN 'ROOT CAUSE: Campaign payment succeeded but creator_payout_cents is NULL'
        WHEN cp.status = 'succeeded' AND cp.creator_payout_cents = 0 THEN 'ROOT CAUSE: Campaign payment succeeded but creator_payout_cents is 0'
        -- Check if budget_cents exists
        WHEN c.budget_cents IS NULL THEN 'ROOT CAUSE: budget_cents is NULL - no fallback available'
        WHEN c.budget_cents = 0 THEN 'ROOT CAUSE: budget_cents is 0 - no fallback available'
        WHEN c.budget_cents > 0 AND cp.id IS NULL THEN 'ROOT CAUSE: No campaign_payments but budget_cents exists - approval should have used budget_cents but did not'
        WHEN c.budget_cents > 0 AND cp.status != 'succeeded' THEN 'ROOT CAUSE: Campaign payment not succeeded but budget_cents exists - approval should have used budget_cents but did not'
        -- Check if payment_amount_cents is set
        WHEN cd.payment_amount_cents IS NULL THEN 'ROOT CAUSE: payment_amount_cents was never set during approval (BUG)'
        WHEN cd.payment_amount_cents = 0 THEN 'ROOT CAUSE: payment_amount_cents was set to 0 during approval'
        ELSE '✅ payment_amount_cents should be set'
    END as root_cause_diagnosis,
    -- Expected value
    COALESCE(
        cp.creator_payout_cents,
        cp.amount_cents,
        c.budget_cents,
        0
    ) as expected_payment_amount_cents,
    COALESCE(
        cp.creator_payout_cents,
        cp.amount_cents,
        c.budget_cents,
        0
    ) / 100.0 as expected_payment_amount_dollars
FROM campaign_deliverables cd
LEFT JOIN campaigns c ON c.id = cd.campaign_id
LEFT JOIN campaign_payments cp ON cp.campaign_id = cd.campaign_id
WHERE cd.id = 'f6be6a31-a018-424e-b838-b54fa098a95e';

-- ============================================================================
-- STEP 4: Fix Query
-- ============================================================================
-- This will set payment_amount_cents based on the correct source
-- Run this AFTER reviewing the root cause diagnosis above

/*
UPDATE campaign_deliverables
SET 
    payment_amount_cents = (
        SELECT COALESCE(
            -- Priority 1: creator_payout_cents from succeeded campaign_payments
            (SELECT cp.creator_payout_cents 
             FROM campaign_payments cp 
             WHERE cp.campaign_id = campaign_deliverables.campaign_id 
               AND cp.status = 'succeeded' 
             LIMIT 1),
            -- Priority 2: amount_cents from succeeded campaign_payments
            (SELECT cp.amount_cents 
             FROM campaign_payments cp 
             WHERE cp.campaign_id = campaign_deliverables.campaign_id 
               AND cp.status = 'succeeded' 
             LIMIT 1),
            -- Priority 3: budget_cents from campaigns
            (SELECT c.budget_cents 
             FROM campaigns c 
             WHERE c.id = campaign_deliverables.campaign_id),
            -- Fallback: 0 (will cause error but better than NULL)
            0
        )
    ),
    updated_at = NOW()
WHERE id = 'f6be6a31-a018-424e-b838-b54fa098a95e'
  AND (payment_amount_cents IS NULL OR payment_amount_cents = 0);
*/
