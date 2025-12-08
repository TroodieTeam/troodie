-- ============================================================================
-- PART 9: Setup Restaurant Claim & Account Upgrade Test
-- ============================================================================

DO $proc$
DECLARE
  test_user_id UUID;
  test_restaurant_id UUID;
BEGIN
  -- GET TEST CONSUMER USER (prod-consumer2)
  SELECT id INTO test_user_id
  FROM users
  WHERE email = 'prod-consumer2@bypass.com';
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Test user prod-consumer2@bypass.com does not exist. Please create it first.';
  END IF;
  
  -- Reset account type to consumer if it was previously upgraded
  UPDATE users
  SET 
    account_type = 'consumer',
    is_restaurant = false,
    account_upgraded_at = NULL,
    updated_at = NOW()
  WHERE id = test_user_id;
  
  -- FIND OR CREATE UNCLAIMED TEST RESTAURANT
  SELECT r.id INTO test_restaurant_id
  FROM restaurants r
  WHERE r.name = 'Prod Test Claiming'
    AND r.is_test_restaurant = true;
  
  IF test_restaurant_id IS NULL THEN
    INSERT INTO restaurants (
      id,
      name,
      address,
      city,
      state,
      zip_code,
      phone,
      cuisine_types,
      price_range,
      is_test_restaurant,
      is_claimed,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      'Prod Test Claiming',
      '999 Claiming Street',
      'Charlotte',
      'NC',
      '28202',
      '(555) 999-0000',
      ARRAY['American'],
      '$$',
      true,
      false,
      NOW(),
      NOW()
    )
    RETURNING id INTO test_restaurant_id;
  ELSE
    -- Reset restaurant to unclaimed state
    UPDATE restaurants
    SET 
      is_claimed = false,
      owner_id = NULL,
      is_verified = false,
      updated_at = NOW()
    WHERE id = test_restaurant_id;
  END IF;
  
  -- CLEAN UP ANY EXISTING BUSINESS PROFILE OR CLAIMS
  DELETE FROM business_profiles
  WHERE user_id = test_user_id;
  
  DELETE FROM restaurant_claims
  WHERE user_id = test_user_id;

END
$proc$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  u.email,
  u.account_type,
  u.account_upgraded_at,
  u.is_restaurant,
  u.is_test_account,
  bp.id as business_profile_id,
  bp.restaurant_id,
  bp.verification_status,
  bp.claimed_at,
  r.name as restaurant_name,
  r.is_claimed,
  r.owner_id,
  rc.id as claim_id,
  rc.status as claim_status,
  rc.verified_at
FROM users u
LEFT JOIN business_profiles bp ON bp.user_id = u.id
LEFT JOIN restaurants r ON bp.restaurant_id = r.id
LEFT JOIN restaurant_claims rc ON rc.user_id = u.id AND rc.restaurant_id = COALESCE(bp.restaurant_id, r.id)
WHERE u.email = 'prod-consumer2@bypass.com';

-- ============================================================================
-- RESET QUERY
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
    RETURN;
  END IF;
  
  SELECT r.id INTO test_restaurant_id
  FROM restaurants r
  WHERE r.name = 'Prod Test Claiming'
    AND r.is_test_restaurant = true;
  
  IF test_restaurant_id IS NOT NULL THEN
    UPDATE restaurants
    SET 
      is_claimed = false,
      owner_id = NULL,
      is_verified = false,
      updated_at = NOW()
    WHERE id = test_restaurant_id;
  END IF;
  
  DELETE FROM business_profiles
  WHERE user_id = test_user_id;
  
  DELETE FROM restaurant_claims
  WHERE user_id = test_user_id;
  
  UPDATE users
  SET 
    account_type = 'consumer',
    is_restaurant = false,
    account_upgraded_at = NULL,
    updated_at = NOW()
  WHERE id = test_user_id;
  
END
$proc$;