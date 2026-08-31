-- Consolidate the two redundant UPDATE policies on public.users into one.
--
-- DO NOT RUN YET. For review only, pending sign-off.
--
-- allow_own_update (from 20250128_final_remove_all_auth_triggers.sql) and
-- "Users can update their own profile" (from 20250128_fix_user_creation_final.sql)
-- both enforce the same restriction — a caller can only update the row where
-- id = auth.uid() — just written in different eras of this codebase with
-- slightly different role scoping. Neither is a security gap (an anon caller
-- has auth.uid() = NULL, which never matches id, so both already block
-- anonymous updates in practice), but having two differently-named policies
-- doing the same job makes the table's actual security posture harder to
-- verify at a glance. Replacing both with a single canonical policy, named
-- to match users_can_insert_own_profile added in 20260831_fix_users_rls_policies.sql.

BEGIN;

DROP POLICY IF EXISTS "allow_own_update" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "users_can_update_own_profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMIT;

-- After applying, re-run scripts/verify-rls-state.sql and confirm public.users
-- shows exactly one UPDATE policy (users_can_update_own_profile), alongside
-- authenticated_users_can_view_profiles (SELECT) and users_can_insert_own_profile
-- (INSERT) from the prior remediation.
