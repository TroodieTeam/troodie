-- Step 4: Create campaign payment record

INSERT INTO campaign_payments (
  campaign_id,
  business_id,
  amount_cents,
  creator_payout_cents,
  platform_fee_cents,
  stripe_payment_intent_id,
  status,
  created_at,
  updated_at
)
SELECT
  c.id,
  'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid,
  25000,
  25000,
  0,
  'pi_test_deliverable_' || EXTRACT(EPOCH FROM NOW())::bigint,
  'succeeded',
  NOW(),
  NOW()
FROM campaigns c
WHERE c.owner_id = 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid
  AND c.name = 'E2E Deliverable Test Campaign'
ORDER BY c.created_at DESC
LIMIT 1;
