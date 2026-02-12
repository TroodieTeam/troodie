-- Step 3: Create active paid campaign for business1

INSERT INTO campaigns (
  restaurant_id,
  owner_id,
  name,
  title,
  description,
  status,
  payment_status,
  budget_cents,
  max_creators,
  requirements,
  start_date,
  end_date,
  created_at,
  updated_at
)
SELECT
  r.id,
  'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid,
  'E2E Deliverable Test Campaign',
  'E2E Deliverable Test - Submit Without URL',
  'Test campaign for deliverable submission flow. Creators can submit content for review before posting links.',
  'active',
  'paid',
  25000,
  2,
  ARRAY['Post a 30-60 second video', 'Tag the restaurant', 'Use campaign hashtag'],
  CURRENT_DATE - INTERVAL '5 days',
  CURRENT_DATE + INTERVAL '25 days',
  NOW(),
  NOW()
FROM restaurants r
JOIN business_profiles bp ON bp.restaurant_id = r.id
WHERE bp.user_id = 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid
LIMIT 1;
