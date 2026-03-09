-- ================================================================
-- v1.0.17 Test Case Reset Script
-- ================================================================
-- Resets data dirtied by v1.0.17 testing back to a clean state
-- WITHOUT deleting accounts or base data.
--
-- Tickets covered:
--   TRO-160/161/163/169 — Restaurant Onboarding UX Fixes (UI-only,
--       but Scenarios 5-6 create pending claims that need cleanup)
--   TRO-162 — Claim Approval Refresh (consumer→business revert)
--   TRO-168 — Hide Communities for Business (UI-only, no data reset)
--   TRO-170 — Multi-Restaurant Claims (delete extra claims/profiles)
--
-- Run:
--   node scripts/run-sql.js --prod testing/v1.0.17/reset-v1017-test-cases.sql
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- 1. RESET AUTH PASSWORDS
-- ================================================================
-- All test accounts use password '000000'. Ensures bypass login works.

UPDATE auth.users
SET encrypted_password = crypt('000000', gen_salt('bf')),
    updated_at = NOW()
WHERE email LIKE 'prod-%@bypass.com';

-- ================================================================
-- 2. DISABLE TRIGGERS
-- ================================================================
-- The log_restaurant_claim_reviews trigger requires auth context
-- (actor_id) that doesn't exist when running SQL via Management API.
-- Disable it for all claim mutations, re-enable at the end.

ALTER TABLE restaurant_claims DISABLE TRIGGER log_restaurant_claim_reviews;

-- ================================================================
-- 3. TRO-162: REVERT CLAIM APPROVAL REFRESH TESTING
-- ================================================================
-- During TRO-162 testing, a consumer's claim may have been approved,
-- changing their account_type to 'business' and creating a
-- business_profile. Revert consumers back to consumer status.

-- 3a. Reset account_type back to consumer
UPDATE users
SET account_type = 'consumer', updated_at = NOW()
WHERE email LIKE 'prod-consumer%@bypass.com'
  AND account_type != 'consumer';

-- 3b. Delete business_profiles created by claim approval
DELETE FROM business_profiles
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'prod-consumer%@bypass.com'
);

-- 3c. Delete ALL consumer claims (created during Scenarios 5-6 and TRO-162)
-- Baseline state has zero claims for consumers.
DELETE FROM restaurant_claims
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'prod-consumer%@bypass.com'
);

-- ================================================================
-- 4. TRO-170: RESET MULTI-RESTAURANT CLAIMS
-- ================================================================
-- During TRO-170 testing, business users may have claimed additional
-- restaurants. Delete extra claims and profiles, keeping only the
-- original baseline ones.
--
-- Baseline (from 10-setup-robust-test-scenario.sql):
--   prod-business1: claim ff111111, profile ff111111, restaurant dd111111
--   prod-business2: claim ff222222, profile ff222222, restaurant dd222222

-- 4a. Delete extra business_profiles beyond the baseline
DELETE FROM business_profiles
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'prod-business%@bypass.com'
)
AND id NOT IN (
  'ff111111-1111-4111-f111-111111111111',
  'ff222222-2222-4222-f222-222222222222'
);

-- 4b. Delete extra restaurant_claims beyond the baseline
DELETE FROM restaurant_claims
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'prod-business%@bypass.com'
)
AND id NOT IN (
  'ff111111-1111-4111-f111-111111111111',
  'ff222222-2222-4222-f222-222222222222'
);

-- 4c. Ensure baseline claims are verified
UPDATE restaurant_claims
SET status = 'verified', updated_at = NOW()
WHERE id IN (
  'ff111111-1111-4111-f111-111111111111',
  'ff222222-2222-4222-f222-222222222222'
)
AND status != 'verified';

-- ================================================================
-- 5. RE-ENABLE TRIGGERS
-- ================================================================

ALTER TABLE restaurant_claims ENABLE TRIGGER log_restaurant_claim_reviews;

-- ================================================================
-- 6. ENSURE BUSINESS USERS STAY BUSINESS
-- ================================================================

UPDATE users
SET account_type = 'business', updated_at = NOW()
WHERE email LIKE 'prod-business%@bypass.com'
  AND account_type != 'business';

-- ================================================================
-- 7. VERIFICATION
-- ================================================================

SELECT
  u.email,
  u.account_type,
  (SELECT COUNT(*) FROM restaurant_claims rc WHERE rc.user_id = u.id) AS claims,
  (SELECT COUNT(*) FROM business_profiles bp WHERE bp.user_id = u.id) AS profiles
FROM users u
WHERE u.email IN (
  'prod-consumer1@bypass.com', 'prod-consumer2@bypass.com',
  'prod-business1@bypass.com', 'prod-business2@bypass.com'
)
ORDER BY u.email;

-- Expected output:
--   prod-business1  | business | 1 claim | 1 profile
--   prod-business2  | business | 1 claim | 1 profile
--   prod-consumer1  | consumer | 0 claims | 0 profiles
--   prod-consumer2  | consumer | 0 claims | 0 profiles
