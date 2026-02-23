-- Reset Script: Claim Approval Refresh (TRO-162)
-- WARNING: Resets test data. Review before running.

-- 1. Reset user back to consumer (undo approval)
UPDATE users
SET account_type = 'consumer', updated_at = NOW()
WHERE id = '<user_id>';

-- 2. Reset claim back to pending
UPDATE restaurant_claims
SET status = 'pending', updated_at = NOW()
WHERE user_id = '<user_id>'
  AND status = 'verified';

-- 3. Remove business profile created by approval
DELETE FROM business_profiles
WHERE user_id = '<user_id>';

-- Note: The realtime publication (supabase_realtime ADD TABLE public.users)
-- is a permanent schema change and should NOT be reverted.
