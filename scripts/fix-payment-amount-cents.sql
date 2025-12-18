-- Fix payment_amount_cents for deliverables with NULL/0 values
-- This sets payment_amount_cents from campaign_payments or campaign budget

-- ============================================================================
-- STEP 1: Preview what will be fixed
-- ============================================================================
SELECT 
    cd.id as deliverable_id,
    c.title as campaign_title,
    cd.payment_amount_cents as current_payment_amount_cents,
    cd.payment_amount_cents / 100.0 as current_payment_amount_dollars,
    cd.status as deliverable_status,
    cd.payment_status,
    c.budget_cents as campaign_budget_cents,
    c.budget_cents / 100.0 as campaign_budget_dollars,
    cp.amount_cents as campaign_payment_amount_cents,
    cp.amount_cents / 100.0 as campaign_payment_amount_dollars,
    cp.creator_payout_cents as campaign_payment_creator_payout_cents,
    cp.creator_payout_cents / 100.0 as campaign_payment_creator_payout_dollars,
    CASE 
        WHEN cp.creator_payout_cents IS NOT NULL THEN cp.creator_payout_cents
        WHEN cp.amount_cents IS NOT NULL THEN cp.amount_cents
        WHEN c.budget_cents IS NOT NULL THEN c.budget_cents
        ELSE NULL
    END as new_payment_amount_cents,
    CASE 
        WHEN cp.creator_payout_cents IS NOT NULL THEN cp.creator_payout_cents / 100.0
        WHEN cp.amount_cents IS NOT NULL THEN cp.amount_cents / 100.0
        WHEN c.budget_cents IS NOT NULL THEN c.budget_cents / 100.0
        ELSE NULL
    END as new_payment_amount_dollars
FROM campaign_deliverables cd
INNER JOIN campaigns c ON c.id = cd.campaign_id
LEFT JOIN campaign_payments cp ON cp.campaign_id = cd.campaign_id AND cp.status = 'succeeded'
WHERE (cd.payment_amount_cents IS NULL OR cd.payment_amount_cents = 0)
  AND cd.status IN ('approved', 'auto_approved')
ORDER BY cd.submitted_at DESC;

-- ============================================================================
-- STEP 2: Fix specific deliverable (from diagnostic)
-- ============================================================================
UPDATE campaign_deliverables
SET 
    payment_amount_cents = COALESCE(
        (SELECT creator_payout_cents FROM campaign_payments 
         WHERE campaign_id = campaign_deliverables.campaign_id AND status = 'succeeded' LIMIT 1),
        (SELECT amount_cents FROM campaign_payments 
         WHERE campaign_id = campaign_deliverables.campaign_id AND status = 'succeeded' LIMIT 1),
        (SELECT budget_cents FROM campaigns WHERE id = campaign_deliverables.campaign_id),
        0
    ),
    updated_at = NOW()
WHERE id = '255e2e96-643d-426e-b00d-e4a2931f89eb';

-- ============================================================================
-- STEP 3: Fix ALL deliverables with NULL/0 payment_amount_cents
-- ============================================================================
-- Uncomment to run:
/*
UPDATE campaign_deliverables cd
SET 
    payment_amount_cents = COALESCE(
        (SELECT creator_payout_cents FROM campaign_payments cp
         WHERE cp.campaign_id = cd.campaign_id AND cp.status = 'succeeded' LIMIT 1),
        (SELECT amount_cents FROM campaign_payments cp
         WHERE cp.campaign_id = cd.campaign_id AND cp.status = 'succeeded' LIMIT 1),
        (SELECT budget_cents FROM campaigns c WHERE c.id = cd.campaign_id),
        0
    ),
    updated_at = NOW()
WHERE (cd.payment_amount_cents IS NULL OR cd.payment_amount_cents = 0)
  AND cd.status IN ('approved', 'auto_approved');
*/

-- ============================================================================
-- STEP 4: Verify the fix
-- ============================================================================
SELECT 
    cd.id as deliverable_id,
    c.title as campaign_title,
    cd.payment_amount_cents,
    cd.payment_amount_cents / 100.0 as payment_amount_dollars,
    cd.payment_status,
    cd.status as deliverable_status,
    c.budget_cents / 100.0 as expected_amount_dollars,
    CASE 
        WHEN cd.payment_amount_cents IS NULL OR cd.payment_amount_cents = 0 THEN '❌ Still NULL or 0'
        WHEN cd.payment_amount_cents = c.budget_cents THEN '✅ Matches campaign budget'
        ELSE '⚠️ Different from campaign budget'
    END as verification_status
FROM campaign_deliverables cd
INNER JOIN campaigns c ON c.id = cd.campaign_id
WHERE cd.id = '255e2e96-643d-426e-b00d-e4a2931f89eb';
