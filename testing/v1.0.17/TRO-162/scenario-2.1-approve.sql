-- ============================================================================
-- Scenario 2.1 APPROVE: Simulate admin approving the claim
-- ============================================================================
-- Run ON DEVICE B while prod-consumer2 is logged in on Device A:
--   node scripts/run-sql.js --prod testing/v1.0.17/TRO-162/scenario-2.1-approve.sql
--
-- This script:
--   1. Sets restaurant_claims.status = 'verified'
--   2. Sets users.account_type = 'business' (triggers realtime → Device A)
--   3. Updates business_profile verification_status to 'verified'
--   4. Marks restaurant as claimed with owner
--
-- Expected result on Device A (within seconds, NO logout):
--   - More tab shows "Business Tools" instead of "Claim Status"
-- ============================================================================

DO $proc$
DECLARE
  test_user_id UUID;
  test_restaurant_id UUID;
  test_claim_id UUID;
BEGIN
  -- Get user
  SELECT id INTO test_user_id
  FROM users
  WHERE email = 'prod-consumer2@bypass.com';

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'prod-consumer2@bypass.com not found';
  END IF;

  -- Get pending claim
  SELECT rc.id, rc.restaurant_id
  INTO test_claim_id, test_restaurant_id
  FROM restaurant_claims rc
  WHERE rc.user_id = test_user_id
    AND rc.status = 'pending'
  ORDER BY rc.created_at DESC
  LIMIT 1;

  IF test_claim_id IS NULL THEN
    RAISE EXCEPTION 'No pending claim found. Run scenario-2.1-setup.sql first.';
  END IF;

  -- 1. Approve the claim
  UPDATE restaurant_claims
  SET status = 'verified', verified_at = NOW(), updated_at = NOW()
  WHERE id = test_claim_id;

  -- 2. Upgrade account type (this triggers the realtime subscription)
  UPDATE users
  SET
    account_type = 'business',
    is_restaurant = true,
    account_upgraded_at = NOW(),
    updated_at = NOW()
  WHERE id = test_user_id;

  -- 3. Update business profile
  UPDATE business_profiles
  SET
    verification_status = 'verified',
    claimed_at = NOW(),
    updated_at = NOW()
  WHERE user_id = test_user_id
    AND restaurant_id = test_restaurant_id;

  -- 4. Mark restaurant as claimed
  UPDATE restaurants
  SET
    is_claimed = true,
    owner_id = test_user_id,
    is_verified = true,
    updated_at = NOW()
  WHERE id = test_restaurant_id;

  RAISE NOTICE '✅ Claim approved!';
  RAISE NOTICE '   User account_type → business (realtime event fired)';
  RAISE NOTICE '   Claim status → verified';
  RAISE NOTICE '   Restaurant → claimed';
  RAISE NOTICE '';
  RAISE NOTICE 'Now check Device A — More tab should show "Business Tools"';
END
$proc$;

-- Verify approval
SELECT
  u.email,
  u.account_type,
  u.is_restaurant,
  rc.status AS claim_status,
  rc.verified_at,
  r.name AS restaurant_name,
  r.is_claimed,
  bp.verification_status AS profile_status
FROM users u
LEFT JOIN restaurant_claims rc ON rc.user_id = u.id
LEFT JOIN restaurants r ON r.id = rc.restaurant_id
LEFT JOIN business_profiles bp ON bp.user_id = u.id AND bp.restaurant_id = r.id
WHERE u.email = 'prod-consumer2@bypass.com';
