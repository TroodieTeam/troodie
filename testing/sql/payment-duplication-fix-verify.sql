-- Verification: Payment Duplication Fix
-- Date: 2026-02-18

-- 1. Find applications with multiple payouts (should be 0 after fix)
SELECT ca.id, COUNT(CASE WHEN cd.payment_status IN ('processing','completed') THEN 1 END) AS payout_count
FROM campaign_applications ca
JOIN campaign_deliverables cd ON cd.campaign_application_id = ca.id
GROUP BY ca.id
HAVING COUNT(CASE WHEN cd.payment_status IN ('processing','completed') THEN 1 END) > 1;

-- 2. Verify payment_amount_cents only on trigger deliverable
SELECT cd.id, cd.campaign_application_id, cd.status, cd.payment_amount_cents, cd.payment_status
FROM campaign_deliverables cd
WHERE cd.payment_amount_cents > 0
ORDER BY cd.campaign_application_id;
