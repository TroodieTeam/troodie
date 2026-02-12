-- Step 2: Ensure business1 has a restaurant
-- Creates restaurant if none linked, otherwise no-op

INSERT INTO restaurants (
  name,
  address,
  city,
  state,
  zip_code,
  cuisine_type,
  price_range,
  rating,
  latitude,
  longitude
)
SELECT
  'E2E Deliverable Test Restaurant',
  '456 Test Ave',
  'Charlotte',
  'NC',
  '28202',
  'American',
  '$$',
  4.5,
  35.2271,
  -80.8431
WHERE NOT EXISTS (
  SELECT 1 FROM business_profiles bp
  JOIN restaurants r ON r.id = bp.restaurant_id
  WHERE bp.user_id = 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid
);

-- Link restaurant to business1 if not already linked
UPDATE business_profiles
SET restaurant_id = (
  SELECT id FROM restaurants
  WHERE name = 'E2E Deliverable Test Restaurant'
  ORDER BY created_at DESC
  LIMIT 1
)
WHERE user_id = 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid
  AND restaurant_id IS NULL;
