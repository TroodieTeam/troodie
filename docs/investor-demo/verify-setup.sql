-- ============================================================================
-- VERIFY: Check Test Data Setup
-- 
-- Usage: Run this to verify that all test data is set up correctly
-- ============================================================================

-- Check accounts and profiles
SELECT 
  'Accounts' as category,
  u.email,
  u.account_type,
  CASE WHEN cp.id IS NOT NULL THEN 'Has Creator Profile' ELSE 'No Profile' END as creator_status,
  CASE WHEN bp.id IS NOT NULL THEN 'Has Business Profile' ELSE 'No Profile' END as business_status
FROM users u
LEFT JOIN creator_profiles cp ON cp.user_id = u.id
LEFT JOIN business_profiles bp ON bp.user_id = u.id
WHERE u.email IN ('prod-consumer1@bypass.com', 'prod-creator1@bypass.com', 'prod-business1@bypass.com')
ORDER BY u.email;

-- Check campaigns
SELECT 
  'Campaigns' as category,
  c.title,
  c.status,
  c.budget_cents / 100.0 as budget_dollars,
  r.name as restaurant_name,
  u.email as business_email
FROM campaigns c
JOIN restaurants r ON c.restaurant_id = r.id
JOIN business_profiles bp ON bp.restaurant_id = r.id
JOIN users u ON bp.user_id = u.id
WHERE u.email = 'prod-business1@bypass.com'
  AND c.status = 'active'
ORDER BY c.created_at DESC;

-- Check unclaimed restaurants
SELECT 
  'Unclaimed Restaurants' as category,
  name,
  city,
  state,
  is_claimed,
  is_test_restaurant
FROM restaurants
WHERE is_test_restaurant = true
  AND is_claimed = false
ORDER BY name;
