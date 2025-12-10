-- ============================================================================
-- PART 2: Create Test Restaurants
-- ============================================================================
-- Run this part to create restaurants for business accounts
-- ============================================================================

-- Restaurant 1: For prod-business1 (NEW - no campaigns yet)
INSERT INTO restaurants (
  id,
  name,
  address,
  city,
  state,
  zip_code,
  cuisine_types,
  price_range,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'Prod Test Restaurant 1',
  '123 Test Street',
  'Charlotte',
  'NC',
  '28202',
  ARRAY['American', 'Casual Dining'],
  '$$',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants r
  JOIN restaurant_claims rc ON rc.restaurant_id = r.id
  WHERE rc.user_id = 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid -- prod-business1@bypass.com
    AND rc.status = 'verified'
);

-- Restaurant 2: For prod-business2 (MEDIUM activity)
INSERT INTO restaurants (
  id,
  name,
  address,
  city,
  state,
  zip_code,
  cuisine_types,
  price_range,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'Prod Test Restaurant 2',
  '456 Test Avenue',
  'Charlotte',
  'NC',
  '28203',
  ARRAY['Italian', 'Fine Dining'],
  '$$$',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants r
  JOIN restaurant_claims rc ON rc.restaurant_id = r.id
  WHERE rc.user_id = '0e281bb7-6867-40b4-afff-4e82608cc34d'::uuid -- prod-business2@bypass.com
    AND rc.status = 'verified'
);
