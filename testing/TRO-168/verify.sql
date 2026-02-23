-- Verification: Hide Communities for Business Accounts (TRO-168)
-- Date: 2026-02-22
-- Note: This is a UI-only feature. No database changes were made.
-- The isBusiness flag from useAccountType() drives conditional rendering.

-- 1. Verify user's account_type (use to confirm test account setup)
SELECT id, account_type, username
FROM users
WHERE id = '<user_id>';

-- 2. Confirm community data still exists (not deleted, just hidden for business)
SELECT COUNT(*) AS total_communities
FROM communities;
