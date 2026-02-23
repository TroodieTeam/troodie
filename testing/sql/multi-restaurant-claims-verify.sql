-- Verification: Multi-Restaurant Claims (TRO-170)
-- Date: 2026-02-22

-- 1. Verify composite UNIQUE constraint exists (user_id + restaurant_id)
SELECT conname, contype
FROM pg_constraint
WHERE conname = 'business_profiles_user_restaurant_unique';

-- 2. Verify old single-column UNIQUE on user_id was dropped
SELECT conname FROM pg_constraint
WHERE conrelid = 'business_profiles'::regclass
  AND conname = 'business_profiles_user_id_key';
-- Expected: 0 rows

-- 3. Count business_profiles per user (multi-restaurant users should have > 1)
SELECT user_id, COUNT(*) AS profile_count
FROM business_profiles
GROUP BY user_id
ORDER BY profile_count DESC;

-- 4. Verify check_restaurant_claim_limit trigger exists
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname = 'enforce_claim_limit';

-- 5. Verify the trigger function enforces limit of 10
SELECT prosrc
FROM pg_proc
WHERE proname = 'check_restaurant_claim_limit';

-- 6. Check campaigns filtered by restaurant_id (for RestaurantSwitcher)
SELECT c.id, c.name, c.restaurant_id, r.name AS restaurant_name, c.status
FROM campaigns c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE c.restaurant_id = '<restaurant_id>'
ORDER BY c.created_at DESC;
