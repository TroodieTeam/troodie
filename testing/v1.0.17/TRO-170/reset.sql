-- Reset Script: Multi-Restaurant Claims (TRO-170)
-- WARNING: Resets test data. Review before running.

-- 1. Delete extra business_profiles for a test user (keep the first one)
DELETE FROM business_profiles
WHERE user_id = '<user_id>'
  AND id NOT IN (
    SELECT id FROM business_profiles
    WHERE user_id = '<user_id>'
    ORDER BY created_at ASC
    LIMIT 1
  );

-- 2. Delete test restaurant claims beyond the first
DELETE FROM restaurant_claims
WHERE user_id = '<user_id>'
  AND id NOT IN (
    SELECT id FROM restaurant_claims
    WHERE user_id = '<user_id>'
    ORDER BY created_at ASC
    LIMIT 1
  );
