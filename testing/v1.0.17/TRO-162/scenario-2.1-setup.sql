-- ============================================================================
-- Scenario 2.1 SETUP: Create pending claim for prod-consumer2
-- ============================================================================
-- Run BEFORE testing: node scripts/run-sql.js --prod testing/v1.0.17/TRO-162/scenario-2.1-setup.sql
--
-- This script:
--   1. Ensures prod-consumer2 is a consumer (resets if previously upgraded)
--   2. Finds or creates the "Prod Test Claiming" restaurant
--   3. Cleans up any prior claims/profiles
--   4. Creates a fresh pending restaurant_claim + pending business_profile
-- ============================================================================

DO $proc$
DECLARE
  test_user_id UUID;
  test_restaurant_id UUID;
  new_claim_id UUID;
BEGIN
  -- 1. Get prod-consumer2
  SELECT id INTO test_user_id
  FROM users
  WHERE email = 'prod-consumer2@bypass.com';

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'prod-consumer2@bypass.com does not exist. Run test data setup first.';
  END IF;

  -- 2. Reset account type to consumer
  UPDATE users
  SET
    account_type = 'consumer',
    is_restaurant = false,
    account_upgraded_at = NULL,
    updated_at = NOW()
  WHERE id = test_user_id;

  -- 3. Find or create unclaimed test restaurant
  SELECT r.id INTO test_restaurant_id
  FROM restaurants r
  WHERE r.name = 'Prod Test Claiming'
    AND r.is_test_restaurant = true;

  IF test_restaurant_id IS NULL THEN
    INSERT INTO restaurants (
      id, name, address, city, state, zip_code, phone,
      cuisine_types, price_range, is_test_restaurant, is_claimed,
      created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      'Prod Test Claiming',
      '999 Claiming Street', 'Charlotte', 'NC', '28202',
      '(555) 999-0000', ARRAY['American'], '$$',
      true, false, NOW(), NOW()
    )
    RETURNING id INTO test_restaurant_id;

    RAISE NOTICE 'Created test restaurant: %', test_restaurant_id;
  ELSE
    -- Reset restaurant to unclaimed
    UPDATE restaurants
    SET is_claimed = false, owner_id = NULL, is_verified = false, updated_at = NOW()
    WHERE id = test_restaurant_id;
  END IF;

  -- 4. Clean up prior claims and profiles
  DELETE FROM business_profiles WHERE user_id = test_user_id;
  DELETE FROM restaurant_claims
  WHERE user_id = test_user_id
     OR (restaurant_id = test_restaurant_id AND status IN ('verified', 'approved'));

  -- 5. Create pending claim
  INSERT INTO restaurant_claims (
    id, user_id, restaurant_id, status, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), test_user_id, test_restaurant_id,
    'pending', NOW(), NOW()
  )
  RETURNING id INTO new_claim_id;

  -- 6. Create pending business_profile (mirrors what submitRestaurantClaim does)
  INSERT INTO business_profiles (
    id, user_id, restaurant_id, verification_status, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), test_user_id, test_restaurant_id,
    'pending', NOW(), NOW()
  );

  RAISE NOTICE '✅ Setup complete';
  RAISE NOTICE '   User: prod-consumer2@bypass.com (consumer)';
  RAISE NOTICE '   Claim ID: %  (status: pending)', new_claim_id;
  RAISE NOTICE '   Restaurant: Prod Test Claiming (%)' , test_restaurant_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Log in on Device A, then run scenario-2.1-approve.sql';
END
$proc$;

-- Verify setup
SELECT
  u.email,
  u.account_type,
  rc.id AS claim_id,
  rc.status AS claim_status,
  r.name AS restaurant_name,
  r.is_claimed,
  bp.verification_status AS profile_status
FROM users u
LEFT JOIN restaurant_claims rc ON rc.user_id = u.id
LEFT JOIN restaurants r ON r.id = rc.restaurant_id
LEFT JOIN business_profiles bp ON bp.user_id = u.id AND bp.restaurant_id = r.id
WHERE u.email = 'prod-consumer2@bypass.com';
