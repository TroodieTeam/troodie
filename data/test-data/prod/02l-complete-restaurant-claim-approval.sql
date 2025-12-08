-- ============================================================================
-- Complete Restaurant Claim Approval (Manual Fix)
-- ============================================================================
-- Use this to manually complete the approval process if it partially succeeded
-- Claim ID: d7487693-74a6-458a-941d-17bcc2500819
-- User ID: 2621c5c4-a6de-42e5-8f1d-b73039646403
-- Restaurant ID: 19eef4f4-0d38-47ad-9f23-e0bc3f0612a1
-- ============================================================================

DO $$
DECLARE
  v_claim_id UUID := 'd7487693-74a6-458a-941d-17bcc2500819';
  v_user_id UUID := '2621c5c4-a6de-42e5-8f1d-b73039646403';
  v_restaurant_id UUID := '19eef4f4-0d38-47ad-9f23-e0bc3f0612a1';
  v_admin_id UUID := '31744191-f7c0-44a4-8673-10b34ccbb87f'; -- Admin who approved
BEGIN
  -- 1. Verify claim status is 'verified'
  IF NOT EXISTS (
    SELECT 1 FROM restaurant_claims 
    WHERE id = v_claim_id AND status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Claim is not in verified status';
  END IF;

  -- 2. Update restaurant ownership
  UPDATE restaurants
  SET 
    owner_id = v_user_id,
    is_claimed = true,
    updated_at = NOW()
  WHERE id = v_restaurant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Restaurant not found: %', v_restaurant_id;
  END IF;

  -- 3. Update user account type to business
  UPDATE users
  SET 
    account_type = 'business',
    is_restaurant = true,
    updated_at = NOW()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', v_user_id;
  END IF;

  -- 4. Create or update business profile
  INSERT INTO business_profiles (
    user_id,
    restaurant_id,
    verification_status,
    business_email,
    created_at,
    updated_at
  )
  SELECT 
    v_user_id,
    v_restaurant_id,
    'verified',
    rc.email,
    NOW(),
    NOW()
  FROM restaurant_claims rc
  WHERE rc.id = v_claim_id
  ON CONFLICT (user_id) 
  DO UPDATE SET
    restaurant_id = EXCLUDED.restaurant_id,
    verification_status = 'verified',
    business_email = EXCLUDED.business_email,
    updated_at = NOW();

  -- 5. Update claim reviewed_at if not set
  UPDATE restaurant_claims
  SET 
    reviewed_at = COALESCE(reviewed_at, NOW()),
    reviewed_by = COALESCE(reviewed_by, v_admin_id),
    updated_at = NOW()
  WHERE id = v_claim_id;

END $$;

-- Verification query
SELECT 
  'Claim' as entity,
  rc.status as status,
  rc.reviewed_at::text as timestamp,
  COALESCE(rc.reviewed_by::text, 'Not set') as details
FROM restaurant_claims rc
WHERE rc.id = 'd7487693-74a6-458a-941d-17bcc2500819'

UNION ALL

SELECT 
  'Restaurant' as entity,
  CASE 
    WHEN r.owner_id = '2621c5c4-a6de-42e5-8f1d-b73039646403' THEN 'Claimed'
    ELSE 'Not claimed'
  END as status,
  r.updated_at::text as timestamp,
  COALESCE(r.owner_id::text, 'NULL') as details
FROM restaurants r
WHERE r.id = '19eef4f4-0d38-47ad-9f23-e0bc3f0612a1'

UNION ALL

SELECT 
  'User' as entity,
  u.account_type as status,
  u.updated_at::text as timestamp,
  u.id::text as details
FROM users u
WHERE u.id = '2621c5c4-a6de-42e5-8f1d-b73039646403'

UNION ALL

SELECT 
  'Business Profile' as entity,
  bp.verification_status as status,
  bp.updated_at::text as timestamp,
  COALESCE(bp.restaurant_id::text, 'NULL') as details
FROM business_profiles bp
WHERE bp.user_id = '2621c5c4-a6de-42e5-8f1d-b73039646403';
