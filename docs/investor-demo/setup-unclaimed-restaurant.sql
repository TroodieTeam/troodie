-- ============================================================================
-- SETUP: Create Unclaimed Test Restaurant
-- 
-- Usage: Run this to create an unclaimed test restaurant for claiming tests
-- ============================================================================

INSERT INTO restaurants (
  name, address, city, state, zip_code,
  cuisine_types, price_range, description, website,
  is_test_restaurant, is_claimed,
  created_at, updated_at
)
SELECT
  'Prod Test Claiming Restaurant',
  '999 Claiming Street',
  'Charlotte',
  'NC',
  '28202',
  ARRAY['American'],
  '$$',
  'Unclaimed test restaurant for testing the claiming flow.',
  'https://claiming.test',
  true,
  false,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants
  WHERE name = 'Prod Test Claiming Restaurant'
    AND is_test_restaurant = true
);

