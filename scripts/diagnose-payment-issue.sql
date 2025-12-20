-- Diagnostic Query: Investigate $0.00 Payment Issue
-- This query checks all payment-related data for a campaign to identify why payout shows $0.00

-- Replace this campaign ID with the actual campaign ID from "Testing Payment Sheet 3"
-- You can find it by running: SELECT id, title FROM campaigns WHERE title LIKE '%Testing Payment Sheet 3%';

-- ============================================================================
-- STEP 1: Find the campaign
-- ============================================================================
SELECT 
    id as campaign_id,
    title,
    budget_cents,
    budget_cents / 100.0 as budget_dollars,
    max_creators,
    status as campaign_status
FROM campaigns
WHERE title LIKE '%Testing Payment Sheet 3%'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- STEP 2: Check campaign payment (business payment to platform)
-- ============================================================================
-- This shows if the business has paid for the campaign
SELECT 
    cp.id as payment_id,
    cp.campaign_id,
    cp.amount_cents,
    cp.amount_cents / 100.0 as amount_dollars,
    cp.creator_payout_cents,
    cp.creator_payout_cents / 100.0 as creator_payout_dollars,
    cp.status as payment_status,
    cp.stripe_payment_intent_id,
    cp.created_at,
    cp.updated_at
FROM campaign_payments cp
INNER JOIN campaigns c ON c.id = cp.campaign_id
WHERE c.title LIKE '%Testing Payment Sheet 3%'
ORDER BY cp.created_at DESC;

-- ============================================================================
-- STEP 3: Check campaign deliverables and their payment amounts
-- ============================================================================
-- This shows what amount is set on each deliverable
SELECT 
    cd.id as deliverable_id,
    cd.campaign_id,
    cd.creator_id,
    cd.status as deliverable_status,
    cd.payment_amount_cents,
    cd.payment_amount_cents / 100.0 as payment_amount_dollars,
    cd.payment_status,
    cd.payment_transaction_id,
    cd.submitted_at,
    cd.reviewed_at,
    c.title as campaign_title,
    cp.user_id as creator_user_id
FROM campaign_deliverables cd
INNER JOIN campaigns c ON c.id = cd.campaign_id
INNER JOIN creator_profiles cp ON cp.id = cd.creator_id
WHERE c.title LIKE '%Testing Payment Sheet 3%'
ORDER BY cd.submitted_at DESC;

-- ============================================================================
-- STEP 4: Check payment transactions (actual payout records)
-- ============================================================================
-- This shows the actual payout transactions created
SELECT 
    pt.id as transaction_id,
    pt.campaign_id,
    pt.deliverable_id,
    pt.creator_id,
    pt.transaction_type,
    pt.amount_cents,
    pt.amount_cents / 100.0 as amount_dollars,
    pt.creator_amount_cents,
    pt.creator_amount_cents / 100.0 as creator_amount_dollars,
    pt.status as transaction_status,
    pt.stripe_transfer_id,
    pt.created_at,
    pt.updated_at,
    c.title as campaign_title
FROM payment_transactions pt
INNER JOIN campaigns c ON c.id = pt.campaign_id
WHERE c.title LIKE '%Testing Payment Sheet 3%'
ORDER BY pt.created_at DESC;

-- ============================================================================
-- STEP 5: Comprehensive diagnostic for specific campaign
-- ============================================================================
-- Run this with a specific campaign_id to see everything at once
-- Replace 'YOUR_CAMPAIGN_ID' with the actual campaign ID

WITH campaign_info AS (
    SELECT 
        id,
        title,
        budget_cents,
        budget_cents / 100.0 as budget_dollars,
        max_creators,
        status
    FROM campaigns
    WHERE title LIKE '%Testing Payment Sheet 3%'
    ORDER BY created_at DESC
    LIMIT 1
),
campaign_payment_info AS (
    SELECT 
        cp.campaign_id,
        cp.amount_cents as payment_amount_cents,
        cp.amount_cents / 100.0 as payment_amount_dollars,
        cp.creator_payout_cents,
        cp.creator_payout_cents / 100.0 as creator_payout_dollars,
        cp.status as payment_status
    FROM campaign_payments cp
    INNER JOIN campaign_info ci ON ci.id = cp.campaign_id
    ORDER BY cp.created_at DESC
    LIMIT 1
),
deliverable_info AS (
    SELECT 
        cd.campaign_id,
        cd.id as deliverable_id,
        cd.payment_amount_cents as deliverable_payment_cents,
        cd.payment_amount_cents / 100.0 as deliverable_payment_dollars,
        cd.payment_status,
        cd.status as deliverable_status,
        cd.payment_transaction_id
    FROM campaign_deliverables cd
    INNER JOIN campaign_info ci ON ci.id = cd.campaign_id
    ORDER BY cd.submitted_at DESC
    LIMIT 1
),
transaction_info AS (
    SELECT 
        pt.campaign_id,
        pt.id as transaction_id,
        pt.amount_cents as transaction_amount_cents,
        pt.amount_cents / 100.0 as transaction_amount_dollars,
        pt.creator_amount_cents as transaction_creator_amount_cents,
        pt.creator_amount_cents / 100.0 as transaction_creator_amount_dollars,
        pt.status as transaction_status,
        pt.stripe_transfer_id
    FROM payment_transactions pt
    INNER JOIN campaign_info ci ON ci.id = pt.campaign_id
    ORDER BY pt.created_at DESC
    LIMIT 1
)
SELECT 
    ci.title as campaign_title,
    ci.budget_cents,
    ci.budget_dollars,
    ci.max_creators,
    ci.status as campaign_status,
    
    -- Campaign Payment Info
    cpi.payment_amount_cents,
    cpi.payment_amount_dollars,
    cpi.creator_payout_cents,
    cpi.creator_payout_dollars,
    cpi.payment_status,
    
    -- Deliverable Info
    di.deliverable_id,
    di.deliverable_payment_cents,
    di.deliverable_payment_dollars,
    di.payment_status as deliverable_payment_status,
    di.deliverable_status,
    di.payment_transaction_id,
    
    -- Transaction Info
    ti.transaction_id,
    ti.transaction_amount_cents,
    ti.transaction_amount_dollars,
    ti.transaction_creator_amount_cents,
    ti.transaction_creator_amount_dollars,
    ti.transaction_status,
    ti.stripe_transfer_id,
    
    -- Diagnostic Flags
    CASE 
        WHEN ci.budget_cents IS NULL OR ci.budget_cents = 0 THEN '❌ Campaign has no budget'
        WHEN cpi.payment_amount_cents IS NULL THEN '❌ No campaign payment found'
        WHEN cpi.payment_status != 'succeeded' THEN '❌ Campaign payment not succeeded'
        WHEN di.deliverable_payment_cents IS NULL OR di.deliverable_payment_cents = 0 THEN '❌ Deliverable payment_amount_cents is NULL or 0'
        WHEN ti.transaction_creator_amount_cents IS NULL OR ti.transaction_creator_amount_cents = 0 THEN '❌ Transaction creator_amount_cents is NULL or 0'
        ELSE '✅ All amounts look correct'
    END as diagnostic_status,
    
    -- Expected vs Actual
    ci.budget_dollars as expected_payout,
    COALESCE(ti.transaction_creator_amount_dollars, di.deliverable_payment_dollars, cpi.creator_payout_dollars, 0) as actual_payout_shown,
    ci.budget_dollars - COALESCE(ti.transaction_creator_amount_dollars, di.deliverable_payment_dollars, cpi.creator_payout_dollars, 0) as difference

FROM campaign_info ci
LEFT JOIN campaign_payment_info cpi ON cpi.campaign_id = ci.id
LEFT JOIN deliverable_info di ON di.campaign_id = ci.id
LEFT JOIN transaction_info ti ON ti.campaign_id = ci.id;

-- ============================================================================
-- QUICK DIAGNOSTIC: Check payment_amount_cents for "Testing Payment Sheet 3"
-- ============================================================================
-- This is the most likely issue - payment_amount_cents is NULL or 0
SELECT 
    cd.id as deliverable_id,
    c.title as campaign_title,
    cd.payment_amount_cents,
    cd.payment_amount_cents / 100.0 as payment_amount_dollars,
    cd.payment_status,
    cd.status as deliverable_status,
    c.budget_cents,
    c.budget_cents / 100.0 as expected_payout_dollars,
    cp.amount_cents as campaign_payment_amount_cents,
    cp.amount_cents / 100.0 as campaign_payment_amount_dollars,
    CASE 
        WHEN cd.payment_amount_cents IS NULL THEN '❌ NULL - This is the problem!'
        WHEN cd.payment_amount_cents = 0 THEN '❌ ZERO - This is the problem!'
        ELSE '✅ Set correctly'
    END as issue_diagnosis
FROM campaign_deliverables cd
INNER JOIN campaigns c ON c.id = cd.campaign_id
LEFT JOIN campaign_payments cp ON cp.campaign_id = cd.campaign_id AND cp.status = 'succeeded'
WHERE c.title LIKE '%Testing Payment Sheet 3%'
ORDER BY cd.submitted_at DESC;

-- ============================================================================
-- STEP 6: Check if payment_amount_cents was set when deliverable was approved
-- ============================================================================
-- This shows the deliverable approval flow
SELECT 
    cd.id as deliverable_id,
    cd.campaign_id,
    cd.payment_amount_cents,
    cd.payment_amount_cents / 100.0 as payment_amount_dollars,
    cd.status,
    cd.payment_status,
    c.budget_cents,
    c.budget_cents / 100.0 as campaign_budget_dollars,
    cp.amount_cents as campaign_payment_amount_cents,
    cp.amount_cents / 100.0 as campaign_payment_amount_dollars,
    cp.creator_payout_cents,
    cp.creator_payout_cents / 100.0 as campaign_payment_creator_payout_dollars,
    CASE 
        WHEN cd.payment_amount_cents IS NULL OR cd.payment_amount_cents = 0 THEN 
            'ISSUE: payment_amount_cents not set - should use campaign_payment.amount_cents or campaign.budget_cents'
        ELSE 
            'OK: payment_amount_cents is set'
    END as payment_amount_diagnostic
FROM campaign_deliverables cd
INNER JOIN campaigns c ON c.id = cd.campaign_id
LEFT JOIN campaign_payments cp ON cp.campaign_id = cd.campaign_id AND cp.status = 'succeeded'
WHERE c.title LIKE '%Testing Payment Sheet 3%'
ORDER BY cd.submitted_at DESC;

-- ============================================================================
-- FIX QUERY: Update payment_amount_cents for deliverables with NULL/0
-- ============================================================================
-- Run this AFTER diagnosing to fix the issue
-- This sets payment_amount_cents from campaign_payments or campaign budget

-- Preview what will be fixed:
SELECT 
    cd.id as deliverable_id,
    c.title as campaign_title,
    cd.payment_amount_cents as current_payment_amount_cents,
    c.budget_cents as campaign_budget_cents,
    cp.amount_cents as campaign_payment_amount_cents,
    cp.creator_payout_cents as campaign_payment_creator_payout_cents,
    CASE 
        WHEN cp.creator_payout_cents IS NOT NULL THEN cp.creator_payout_cents
        WHEN cp.amount_cents IS NOT NULL THEN cp.amount_cents
        WHEN c.budget_cents IS NOT NULL THEN c.budget_cents
        ELSE NULL
    END as should_be_payment_amount_cents
FROM campaign_deliverables cd
INNER JOIN campaigns c ON c.id = cd.campaign_id
LEFT JOIN campaign_payments cp ON cp.campaign_id = cd.campaign_id AND cp.status = 'succeeded'
WHERE c.title LIKE '%Testing Payment Sheet 3%'
  AND (cd.payment_amount_cents IS NULL OR cd.payment_amount_cents = 0)
  AND cd.status IN ('approved', 'auto_approved');

-- To actually fix it, uncomment and run this UPDATE:
/*
UPDATE campaign_deliverables cd
SET 
    payment_amount_cents = COALESCE(
        (SELECT creator_payout_cents FROM campaign_payments 
         WHERE campaign_id = cd.campaign_id AND status = 'succeeded' LIMIT 1),
        (SELECT amount_cents FROM campaign_payments 
         WHERE campaign_id = cd.campaign_id AND status = 'succeeded' LIMIT 1),
        (SELECT budget_cents FROM campaigns WHERE id = cd.campaign_id),
        0
    ),
    updated_at = NOW()
WHERE id IN (
    SELECT cd2.id
    FROM campaign_deliverables cd2
    INNER JOIN campaigns c ON c.id = cd2.campaign_id
    WHERE c.title LIKE '%Testing Payment Sheet 3%'
      AND (cd2.payment_amount_cents IS NULL OR cd2.payment_amount_cents = 0)
      AND cd2.status IN ('approved', 'auto_approved')
);
*/

