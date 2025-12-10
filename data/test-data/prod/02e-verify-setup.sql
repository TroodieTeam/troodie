-- ============================================================================
-- PART 5: Verification Queries
-- ============================================================================
-- Run this part to verify everything was set up correctly
-- ============================================================================

-- Verify creator profiles
SELECT 
  u.email,
  cp.display_name,
  cp.availability_status,
  cp.open_to_collabs,
  cp.location
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email LIKE 'prod-creator%@bypass.com'
ORDER BY u.email;

-- Verify restaurant claims
SELECT 
  u.email as business_email,
  r.name as restaurant_name,
  rc.status as claim_status,
  r.is_test_restaurant
FROM restaurant_claims rc
JOIN users u ON rc.user_id = u.id
JOIN restaurants r ON rc.restaurant_id = r.id
WHERE u.email LIKE 'prod-business%@bypass.com'
ORDER BY u.email;

-- Verify boards created
SELECT 
  u.email,
  b.title as board_name
FROM boards b
JOIN users u ON b.user_id = u.id
WHERE u.email LIKE 'prod-%@bypass.com'
ORDER BY u.email, b.title;
