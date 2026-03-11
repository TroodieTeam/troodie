-- ============================================================================
-- Scenario 2.1 RESET: Revert prod-consumer2 to pre-test state
-- ============================================================================
-- Run after testing to clean up:
--   node scripts/run-sql.js --prod testing/v1.0.17/TRO-162/scenario-2.1-reset.sql
--
-- Reverts: account_type → consumer, claim → deleted, profile → deleted,
--          restaurant → unclaimed
-- ============================================================================

DO $proc$
DECLARE
  test_user_id UUID;
  test_restaurant_id UUID;
BEGIN
  SELECT id INTO test_user_id
  FROM users
  WHERE email = 'prod-consumer2@bypass.com';

  IF test_user_id IS NULL THEN
    RAISE NOTICE 'prod-consumer2@bypass.com not found — nothing to reset';
    RETURN;
  END IF;

  -- Find test restaurant
  SELECT r.id INTO test_restaurant_id
  FROM restaurants r
  WHERE r.name = 'Prod Test Claiming'
    AND r.is_test_restaurant = true;

  -- 1. Reset user to consumer
  UPDATE users
  SET
    account_type = 'consumer',
    is_restaurant = false,
    account_upgraded_at = NULL,
    updated_at = NOW()
  WHERE id = test_user_id;

  -- 2. Delete business profile
  DELETE FROM business_profiles
  WHERE user_id = test_user_id;

  -- 3. Delete claims
  DELETE FROM restaurant_claims
  WHERE user_id = test_user_id;

  -- 4. Reset restaurant to unclaimed
  IF test_restaurant_id IS NOT NULL THEN
    UPDATE restaurants
    SET is_claimed = false, owner_id = NULL, is_verified = false, updated_at = NOW()
    WHERE id = test_restaurant_id;
  END IF;

  RAISE NOTICE '✅ Reset complete — prod-consumer2 is back to consumer';
END
$proc$;

-- Verify reset
SELECT
  u.email,
  u.account_type,
  u.is_restaurant,
  (SELECT count(*) FROM restaurant_claims rc WHERE rc.user_id = u.id) AS claim_count,
  (SELECT count(*) FROM business_profiles bp WHERE bp.user_id = u.id) AS profile_count
FROM users u
WHERE u.email = 'prod-consumer2@bypass.com';
