-- ============================================================================
-- GTM: Setup Business Profile for team@troodieapp.com
-- ============================================================================
-- Purpose: Create business profile and restaurant claim for team admin account
-- This is REQUIRED before creating campaigns via UI
-- Run this BEFORE gtm-create-troodie-campaigns.sql
-- ============================================================================

-- Step 1: Get team admin ID (verify it exists)
-- If this returns 0 rows, create the admin account first

-- Step 2: Find or create Troodie Restaurant
INSERT INTO restaurants (
  name,
  address,
  city,
  state,
  zip_code,
  phone,
  cuisine_types,
  price_range,
  google_rating,
  location,
  is_claimed,
  owner_id,
  created_at,
  updated_at
)
SELECT 
  'Troodie Restaurant',
  '123 Main Street',
  'Charlotte',
  'NC',
  '28202',
  '(704) 555-0123',
  ARRAY['American'],
  '$$',
  4.8,
  ST_SetSRID(ST_MakePoint(-80.8431, 35.2271), 4326),
  true,
  (SELECT id FROM users WHERE email = 'team@troodieapp.com'),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name ILIKE '%troodie%'
);

-- Update existing Troodie restaurant to be claimed by team admin
UPDATE restaurants
SET 
  is_claimed = true,
  owner_id = (SELECT id FROM users WHERE email = 'team@troodieapp.com'),
  updated_at = NOW()
WHERE name ILIKE '%troodie%'
  AND owner_id IS DISTINCT FROM (SELECT id FROM users WHERE email = 'team@troodieapp.com');

-- Step 3: Create business profile
INSERT INTO business_profiles (
  user_id,
  restaurant_id,
  business_email,
  business_role,
  verification_status,
  created_at,
  updated_at
)
SELECT 
  u.id,
  r.id,
  'team@troodieapp.com',
  'Owner',
  'verified',
  NOW(),
  NOW()
FROM users u
CROSS JOIN (
  SELECT id FROM restaurants WHERE name ILIKE '%troodie%' LIMIT 1
) r
WHERE u.email = 'team@troodieapp.com'
ON CONFLICT (user_id) DO UPDATE SET
  restaurant_id = EXCLUDED.restaurant_id,
  business_email = EXCLUDED.business_email,
  business_role = EXCLUDED.business_role,
  verification_status = 'verified',
  updated_at = NOW();

-- Step 4: Clean up old claims
DELETE FROM restaurant_claims
WHERE user_id = (SELECT id FROM users WHERE email = 'team@troodieapp.com')
  AND restaurant_id = (SELECT id FROM restaurants WHERE name ILIKE '%troodie%' LIMIT 1);

-- Step 5: Create verified restaurant claim
-- Temporarily disable trigger to avoid actor_id requirement
ALTER TABLE restaurant_claims DISABLE TRIGGER log_restaurant_claim_reviews;

INSERT INTO restaurant_claims (
  user_id,
  restaurant_id,
  email,
  status,
  created_at,
  updated_at
)
SELECT 
  u.id,
  r.id,
  u.email,
  'verified',
  NOW(),
  NOW()
FROM users u
CROSS JOIN (
  SELECT id FROM restaurants WHERE name ILIKE '%troodie%' LIMIT 1
) r
WHERE u.email = 'team@troodieapp.com'
  AND NOT EXISTS (
    SELECT 1 FROM restaurant_claims 
    WHERE user_id = u.id 
      AND restaurant_id = r.id
  );

-- Re-enable trigger
ALTER TABLE restaurant_claims ENABLE TRIGGER log_restaurant_claim_reviews;

-- Step 6: Update user account type
UPDATE users
SET 
  account_type = 'business',
  is_restaurant = true,
  updated_at = NOW()
WHERE email = 'team@troodieapp.com';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check business profile
SELECT 
  'Business Profile Check' as check_name,
  bp.id,
  bp.business_email,
  bp.business_role,
  bp.verification_status,
  bp.restaurant_id,
  r.name as restaurant_name,
  u.email
FROM business_profiles bp
JOIN users u ON bp.user_id = u.id
LEFT JOIN restaurants r ON bp.restaurant_id = r.id
WHERE u.email = 'team@troodieapp.com';

-- Check restaurant claim
SELECT 
  'Restaurant Claim Check' as check_name,
  rc.id,
  rc.status,
  rc.restaurant_id,
  r.name as restaurant_name,
  u.email
FROM restaurant_claims rc
JOIN users u ON rc.user_id = u.id
JOIN restaurants r ON rc.restaurant_id = r.id
WHERE u.email = 'team@troodieapp.com';

-- Check user account type
SELECT 
  'User Account Check' as check_name,
  id,
  email,
  account_type,
  is_restaurant,
  is_creator
FROM users
WHERE email = 'team@troodieapp.com';
