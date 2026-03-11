-- Audit: Historical Overpayments (Q2: Option B)
-- Date: 2026-02-18

SELECT ca.id AS app_id, c.title, u.name, u.email,
  COUNT(cd.id) AS deliverables,
  COUNT(CASE WHEN cd.payment_status IN ('processing','completed') THEN 1 END) AS payouts,
  SUM(CASE WHEN cd.payment_status IN ('processing','completed') THEN cd.payment_amount_cents ELSE 0 END) AS total_paid_cents,
  cpay.creator_payout_cents AS expected_cents
FROM campaign_applications ca
JOIN campaign_deliverables cd ON cd.campaign_application_id = ca.id
JOIN campaigns c ON c.id = ca.campaign_id
JOIN creator_profiles cp ON cp.id = ca.creator_id
JOIN users u ON u.id = cp.user_id
LEFT JOIN campaign_payments cpay ON cpay.campaign_id = ca.campaign_id AND cpay.status = 'succeeded'
GROUP BY ca.id, c.title, u.name, u.email, cpay.creator_payout_cents
HAVING COUNT(CASE WHEN cd.payment_status IN ('processing','completed') THEN 1 END) > 1
ORDER BY total_paid_cents DESC;
