-- ============================================================================
-- Debug Restaurant Claim Status
-- ============================================================================
-- Query to investigate what happened to a restaurant claim after approval attempt
-- Use this when a claim disappears from the review queue
-- ============================================================================

-- Claim ID from the logs: d7487693-74a6-458a-941d-17bcc2500819
-- User ID: 2621c5c4-a6de-42e5-8f1d-b73039646403
-- Restaurant ID: 19eef4f4-0d38-47ad-9f23-e0bc3f0612a1

-- 1. Check the current status of the restaurant claim
SELECT 
  rc.id,
  rc.status,
  rc.user_id,
  rc.restaurant_id,
  rc.email,
  rc.submitted_at,
  rc.reviewed_at,
  rc.reviewed_by,
  rc.review_notes,
  rc.rejection_reason,
  rc.can_resubmit,
  rc.created_at,
  rc.updated_at,
  u.email as user_email,
  u.account_type as user_account_type,
  u.is_restaurant as user_is_restaurant,
  r.name as restaurant_name,
  r.owner_id as restaurant_owner_id,
  r.is_claimed as restaurant_is_claimed
FROM restaurant_claims rc
LEFT JOIN users u ON rc.user_id = u.id
LEFT JOIN restaurants r ON rc.restaurant_id = r.id
WHERE rc.id = 'd7487693-74a6-458a-941d-17bcc2500819';

-- 2. Check review logs for this claim
SELECT 
  rl.id,
  rl.entity_type,
  rl.entity_id,
  rl.action,
  rl.actor_id,
  rl.actor_role,
  rl.previous_status,
  rl.new_status,
  rl.notes,
  rl.metadata,
  rl.created_at,
  u.email as actor_email
FROM review_logs rl
LEFT JOIN users u ON rl.actor_id = u.id
WHERE rl.entity_type = 'restaurant_claim'
  AND rl.entity_id = 'd7487693-74a6-458a-941d-17bcc2500819'
ORDER BY rl.created_at DESC;

-- 3. Check if the user was upgraded to business
SELECT 
  id,
  email,
  account_type,
  is_restaurant,
  is_verified,
  created_at,
  updated_at
FROM users
WHERE id = '2621c5c4-a6de-42e5-8f1d-b73039646403';

-- 4. Check if business_profile was created/updated
SELECT 
  bp.id,
  bp.user_id,
  bp.restaurant_id,
  bp.verification_status,
  bp.business_email,
  bp.business_role,
  bp.created_at,
  bp.updated_at,
  r.name as restaurant_name
FROM business_profiles bp
LEFT JOIN restaurants r ON bp.restaurant_id = r.id
WHERE bp.user_id = '2621c5c4-a6de-42e5-8f1d-b73039646403';

-- 5. Check restaurant ownership status
SELECT 
  id,
  name,
  owner_id,
  is_claimed,
  is_verified,
  created_at,
  updated_at
FROM restaurants
WHERE id = '19eef4f4-0d38-47ad-9f23-e0bc3f0612a1';

-- 6. Check all pending restaurant claims (to see if it's still pending)
SELECT 
  rc.id,
  rc.status,
  rc.user_id,
  rc.restaurant_id,
  rc.email,
  rc.submitted_at,
  u.email as user_email,
  r.name as restaurant_name
FROM restaurant_claims rc
LEFT JOIN users u ON rc.user_id = u.id
LEFT JOIN restaurants r ON rc.restaurant_id = r.id
WHERE rc.status = 'pending'
ORDER BY rc.submitted_at DESC;

-- 7. Check the pending_review_queue view (what the UI sees)
SELECT *
FROM pending_review_queue
WHERE id = 'd7487693-74a6-458a-941d-17bcc2500819'
   OR user_id = '2621c5c4-a6de-42e5-8f1d-b73039646403';

-- 8. Summary query - all related data in one view
SELECT 
  'Claim Status' as check_type,
  rc.status as value,
  rc.reviewed_at as timestamp,
  rc.review_notes as notes
FROM restaurant_claims rc
WHERE rc.id = 'd7487693-74a6-458a-941d-17bcc2500819'

UNION ALL

SELECT 
  'User Account Type' as check_type,
  u.account_type::text as value,
  u.updated_at as timestamp,
  NULL as notes
FROM users u
WHERE u.id = '2621c5c4-a6de-42e5-8f1d-b73039646403'

UNION ALL

SELECT 
  'Restaurant Owner' as check_type,
  CASE 
    WHEN r.owner_id = '2621c5c4-a6de-42e5-8f1d-b73039646403' THEN 'Claimed by user'
    WHEN r.owner_id IS NULL THEN 'Not claimed'
    ELSE 'Claimed by different user'
  END as value,
  r.updated_at as timestamp,
  r.owner_id::text as notes
FROM restaurants r
WHERE r.id = '19eef4f4-0d38-47ad-9f23-e0bc3f0612a1'

UNION ALL

SELECT 
  'Business Profile' as check_type,
  bp.verification_status as value,
  bp.updated_at as timestamp,
  bp.restaurant_id::text as notes
FROM business_profiles bp
WHERE bp.user_id = '2621c5c4-a6de-42e5-8f1d-b73039646403'

ORDER BY timestamp DESC;
