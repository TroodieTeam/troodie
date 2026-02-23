-- Verification: Restaurant Onboarding UX Fixes (TRO-160, 161, 163, 169)
-- Date: 2026-02-22
-- Note: Most changes are UI-only (BetaAccessGate removal, conditional rendering).
-- These queries validate the data conditions that drive the UI logic.

-- 1. Check pending claims for a specific user (drives "Claim Status" display)
SELECT rc.id, rc.user_id, rc.restaurant_id, r.name AS restaurant_name, rc.status, rc.created_at
FROM restaurant_claims rc
JOIN restaurants r ON r.id = rc.restaurant_id
WHERE rc.user_id = '<user_id>'
  AND rc.status = 'pending'
ORDER BY rc.created_at DESC;

-- 2. Check business_profiles for a user (drives "isBusiness" / hide claim button)
SELECT bp.id, bp.user_id, bp.restaurant_id, bp.verification_status, bp.created_at
FROM business_profiles bp
WHERE bp.user_id = '<user_id>';

-- 3. Check user's account_type (determines which More tab sections render)
SELECT id, account_type, updated_at
FROM users
WHERE id = '<user_id>';
