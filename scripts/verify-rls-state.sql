-- Verify RLS is enabled and inspect policies on key tables.
-- Run in the Supabase SQL editor (or via scripts/run-sql.js --prod) against production.

-- 1. Is RLS enabled/forced on each table?
-- (forcerowsecurity lives on pg_class, not pg_tables, so join it in explicitly)
SELECT
  n.nspname AS schemaname,
  c.relname AS tablename,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('board_restaurants', 'creator_profiles', 'creator_portfolio_items', 'users')
ORDER BY c.relname;

-- 2. What policies exist, and how permissive are they?
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('board_restaurants', 'creator_profiles', 'creator_portfolio_items', 'users')
ORDER BY tablename, cmd, policyname;

-- 3. Flag any policy whose USING/WITH CHECK is just "true" (unconditionally permissive)
-- for these tables — this is the signature of a leftover temporary/debug policy.
SELECT
  tablename,
  policyname,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('board_restaurants', 'creator_profiles', 'creator_portfolio_items', 'users')
  AND (qual = 'true' OR with_check = 'true');
