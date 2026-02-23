-- Verification: Claim Approval Refresh (TRO-162)
-- Date: 2026-02-22

-- 1. Verify users table is in supabase_realtime publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'users'
  AND schemaname = 'public';

-- 2. Check user's account_type after approval (should be 'business')
SELECT id, account_type, updated_at
FROM users
WHERE id = '<user_id>';

-- 3. Confirm claim was approved (status = 'verified')
SELECT rc.id, rc.user_id, rc.restaurant_id, rc.status, rc.updated_at
FROM restaurant_claims rc
WHERE rc.user_id = '<user_id>'
ORDER BY rc.updated_at DESC
LIMIT 1;
