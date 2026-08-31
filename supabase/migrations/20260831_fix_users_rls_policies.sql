-- Remediation for the three overly permissive RLS policies on public.users,
-- confirmed in production via scripts/verify-rls-state.sql.
--
-- Root cause: supabase/migrations/20250128_final_remove_all_auth_triggers.sql
-- created allow_all_select/allow_all_insert (TO anon, authenticated) while
-- debugging an unrelated "Database error saving new user" trigger issue, and
-- supabase/migrations/20250128_fix_user_creation_final.sql recreated
-- "Users can view all profiles" with no TO clause (defaults to PUBLIC, which
-- includes anon). Neither was ever tightened back up afterward.

BEGIN;

-- 1. Drop the three confirmed overly permissive policies.
DROP POLICY IF EXISTS "allow_all_select" ON public.users;
DROP POLICY IF EXISTS "allow_all_insert" ON public.users;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;

-- 2. Replace with policies scoped to signed-in users only.

-- Any authenticated user can still view any profile (browsing creators,
-- seeing who commented, business claim flow, etc. all depend on this) —
-- but a logged-out/anon caller can no longer read the table at all.
CREATE POLICY "authenticated_users_can_view_profiles" ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- A caller may only ever insert a row for their own auth.uid(). Note that
-- the normal profile-creation path goes through the SECURITY DEFINER
-- function ensure_user_profile(), which bypasses RLS entirely — this
-- policy only constrains direct client-side inserts, which should never
-- need to write anyone else's row.
CREATE POLICY "users_can_insert_own_profile" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

COMMIT;

-- After applying, re-run scripts/verify-rls-state.sql and confirm no
-- remaining policy on public.users has qual = 'true' or with_check = 'true'
-- other than authenticated_users_can_view_profiles' intentional USING (true)
-- (which is now restricted to the authenticated role, not anon/public).
