-- ============================================================================
-- Reset Restaurant Claim for Testing
-- ============================================================================
-- Use this to reset a restaurant claim back to pending status so you can
-- test the approval flow again in the UI
-- 
-- Claim ID: d7487693-74a6-458a-941d-17bcc2500819
-- User ID: 2621c5c4-a6de-42e5-8f1d-b73039646403
-- Restaurant ID: 19eef4f4-0d38-47ad-9f23-e0bc3f0612a1
-- ============================================================================

DO $$
DECLARE
  v_claim_id UUID := 'd7487693-74a6-458a-941d-17bcc2500819';
  v_user_id UUID := '2621c5c4-a6de-42e5-8f1d-b73039646403';
  v_restaurant_id UUID := '19eef4f4-0d38-47ad-9f23-e0bc3f0612a1';
BEGIN
  -- Temporarily disable the trigger to avoid NULL actor_id constraint violation
  ALTER TABLE restaurant_claims DISABLE TRIGGER log_restaurant_claim_reviews;

  -- 1. Reset restaurant claim back to pending
  UPDATE restaurant_claims
  SET 
    status = 'pending',
    reviewed_at = NULL,
    reviewed_by = NULL,
    review_notes = NULL,
    rejection_reason = NULL,
    updated_at = NOW()
  WHERE id = v_claim_id;

  -- Re-enable the trigger
  ALTER TABLE restaurant_claims ENABLE TRIGGER log_restaurant_claim_reviews;

  -- 2. Remove restaurant ownership
  UPDATE restaurants
  SET 
    owner_id = NULL,
    is_claimed = false,
    updated_at = NOW()
  WHERE id = v_restaurant_id;

  -- 3. Reset user account type back to consumer
  UPDATE users
  SET 
    account_type = 'consumer',
    is_restaurant = false,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- 4. Delete business profile (if exists)
  DELETE FROM business_profiles
  WHERE user_id = v_user_id;

END $$;

-- Verification query - should show everything reset
SELECT 
  'Claim' as entity,
  rc.status as status,
  rc.reviewed_at::text as timestamp,
  COALESCE(rc.reviewed_by::text, 'NULL') as details
FROM restaurant_claims rc
WHERE rc.id = 'd7487693-74a6-458a-941d-17bcc2500819'

UNION ALL

SELECT 
  'Restaurant' as entity,
  CASE 
    WHEN r.owner_id IS NULL THEN 'Not claimed'
    ELSE 'Still claimed'
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
  CASE 
    WHEN bp.id IS NULL THEN 'Deleted'
    ELSE 'Still exists'
  END as status,
  COALESCE(bp.updated_at::text, 'N/A') as timestamp,
  COALESCE(bp.restaurant_id::text, 'NULL') as details
FROM users u
LEFT JOIN business_profiles bp ON bp.user_id = u.id
WHERE u.id = '2621c5c4-a6de-42e5-8f1d-b73039646403';

-- Check if claim appears in pending queue
SELECT 
  type,
  id,
  user_id,
  status,
  submitted_at,
  details->>'restaurant_name' as restaurant_name
FROM pending_review_queue
WHERE id = 'd7487693-74a6-458a-941d-17bcc2500819';
