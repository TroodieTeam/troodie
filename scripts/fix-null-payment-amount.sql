-- Fix: Set payment_amount_cents for deliverable f6be6a31-a018-424e-b838-b54fa098a95e
-- This will calculate the correct amount based on campaign_payments or campaigns.budget_cents

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

-- Verify the fix
SELECT 
    cd.id as deliverable_id,
    cd.payment_amount_cents,
    cd.payment_amount_cents / 100.0 as payment_amount_dollars,
    cd.payment_status,
    c.title as campaign_title,
    c.budget_cents / 100.0 as campaign_budget_dollars,
    cp.creator_payout_cents / 100.0 as campaign_payment_creator_payout_dollars,
    cp.amount_cents / 100.0 as campaign_payment_amount_dollars
FROM campaign_deliverables cd
LEFT JOIN campaigns c ON c.id = cd.campaign_id
LEFT JOIN campaign_payments cp ON cp.campaign_id = cd.campaign_id AND cp.status = 'succeeded'
WHERE cd.id = 'f6be6a31-a018-424e-b838-b54fa098a95e';

