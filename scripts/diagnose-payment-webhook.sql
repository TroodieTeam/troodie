-- Diagnostic script to check payment webhook flow
-- Run this after a payment succeeds in Stripe but stays pending in the app

-- 1. Check recent payment intents created
SELECT 
  id,
  campaign_id,
  business_id,
  stripe_payment_intent_id,
  status,
  amount_cents,
  created_at,
  updated_at,
  paid_at
FROM campaign_payments
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check campaigns with pending payments
SELECT 
  c.id as campaign_id,
  c.title,
  c.status as campaign_status,
  c.payment_status,
  c.payment_intent_id,
  cp.id as payment_record_id,
  cp.stripe_payment_intent_id,
  cp.status as payment_record_status,
  cp.created_at as payment_created,
  cp.updated_at as payment_updated
FROM campaigns c
LEFT JOIN campaign_payments cp ON c.id = cp.campaign_id
WHERE c.payment_status = 'pending' 
  OR cp.status = 'pending'
ORDER BY cp.created_at DESC
LIMIT 10;

-- 3. Check for payment intents that succeeded in Stripe but not in DB
-- (This requires manual comparison with Stripe dashboard)
SELECT 
  cp.stripe_payment_intent_id,
  cp.status,
  cp.campaign_id,
  c.title,
  c.payment_status as campaign_payment_status
FROM campaign_payments cp
JOIN campaigns c ON cp.campaign_id = c.id
WHERE cp.status = 'pending'
  AND cp.stripe_payment_intent_id IS NOT NULL
ORDER BY cp.created_at DESC;
