-- Fix: Set payment_amount_cents for ALL approved deliverables where it's NULL or 0
-- This ensures all approved deliverables have a payment amount set

-- First, see how many will be affected
SELECT 
    COUNT(*) as affected_deliverables,
    COUNT(DISTINCT campaign_id) as affected_campaigns
FROM campaign_deliverables
WHERE status IN ('approved', 'auto_approved')
  AND (payment_amount_cents IS NULL OR payment_amount_cents = 0);

-- Preview what will be updated
SELECT 
    cd.id as deliverable_id,
    cd.campaign_id,
    c.title as campaign_title,
    cd.status as deliverable_status,
    cd.payment_amount_cents as current_payment_amount_cents,
    cd.payment_status,
    -- Show what the new value will be
    COALESCE(
        (SELECT cp.creator_payout_cents 
         FROM campaign_payments cp 
         WHERE cp.campaign_id = cd.campaign_id 
           AND cp.status = 'succeeded' 
         LIMIT 1),
        (SELECT cp.amount_cents 
         FROM campaign_payments cp 
         WHERE cp.campaign_id = cd.campaign_id 
           AND cp.status = 'succeeded' 
         LIMIT 1),
        c.budget_cents,
        0
    ) as new_payment_amount_cents,
    COALESCE(
        (SELECT cp.creator_payout_cents 
         FROM campaign_payments cp 
         WHERE cp.campaign_id = cd.campaign_id 
           AND cp.status = 'succeeded' 
         LIMIT 1),
        (SELECT cp.amount_cents 
         FROM campaign_payments cp 
         WHERE cp.campaign_id = cd.campaign_id 
           AND cp.status = 'succeeded' 
         LIMIT 1),
        c.budget_cents,
        0
    ) / 100.0 as new_payment_amount_dollars,
    CASE 
        WHEN (SELECT cp.id FROM campaign_payments cp WHERE cp.campaign_id = cd.campaign_id AND cp.status = 'succeeded' LIMIT 1) IS NOT NULL 
        THEN 'From campaign_payments.creator_payout_cents or amount_cents'
        WHEN c.budget_cents IS NOT NULL AND c.budget_cents > 0 
        THEN 'From campaigns.budget_cents'
        ELSE 'Will be set to 0 (error - needs manual fix)'
    END as source
FROM campaign_deliverables cd
LEFT JOIN campaigns c ON c.id = cd.campaign_id
WHERE cd.status IN ('approved', 'auto_approved')
  AND (cd.payment_amount_cents IS NULL OR cd.payment_amount_cents = 0)
ORDER BY cd.submitted_at DESC;

-- ============================================================================
-- ACTUAL FIX - Uncomment to run
-- ============================================================================
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
WHERE status IN ('approved', 'auto_approved')
  AND (payment_amount_cents IS NULL OR payment_amount_cents = 0);

-- Verify the fix
SELECT 
    COUNT(*) as fixed_count,
    COUNT(CASE WHEN payment_amount_cents > 0 THEN 1 END) as with_valid_amount,
    COUNT(CASE WHEN payment_amount_cents = 0 THEN 1 END) as with_zero_amount,
    COUNT(CASE WHEN payment_amount_cents IS NULL THEN 1 END) as still_null
FROM campaign_deliverables
WHERE status IN ('approved', 'auto_approved');
*/

