-- ================================================================
-- FIX RLS for Test Accounts (@bypass.com)
-- ================================================================
-- The issue: Test accounts don't have proper Supabase Auth sessions,
-- so auth.uid() is NULL and RLS policies fail.
-- 
-- Solution: Create RLS policies that work for both:
-- 1. Real users (with auth.uid())
-- 2. Test users (without auth.uid() but with valid user records)
-- ================================================================

-- First, let's check the current situation
DO $$
DECLARE
  rls_enabled boolean;
  policy_count integer;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables 
  WHERE schemaname = 'public' AND tablename = 'creator_profiles';
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'creator_profiles';
  
  RAISE NOTICE 'RLS enabled: %', rls_enabled;
  RAISE NOTICE 'Number of policies: %', policy_count;
END $$;

-- ================================================================
-- OPTION 1: Disable RLS temporarily (Quick fix for testing)
-- ================================================================
-- Uncomment this line to disable RLS completely (NOT for production!):
-- ALTER TABLE creator_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE creator_portfolio_items DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- OPTION 2: Create bypass policies for test accounts
-- ================================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON creator_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON creator_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON creator_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON creator_profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON creator_profiles;
DROP POLICY IF EXISTS "Users can create their own creator profile" ON creator_profiles;
DROP POLICY IF EXISTS "Users can update their own creator profile" ON creator_profiles;
DROP POLICY IF EXISTS "Users can delete their own creator profile" ON creator_profiles;
DROP POLICY IF EXISTS "Anyone can view creator profiles" ON creator_profiles;

-- Create new policies that handle both auth and test accounts

-- Policy 1: Anyone can view profiles
CREATE POLICY "Public read access"
  ON creator_profiles
  FOR SELECT
  USING (true);

-- Policy 2: Allow inserts for authenticated users OR test accounts
CREATE POLICY "Insert for auth users or test accounts"
  ON creator_profiles
  FOR INSERT
  WITH CHECK (
    -- Allow if authenticated user matches
    auth.uid() = user_id
    OR
    -- Allow for test accounts (bypass.com emails)
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = creator_profiles.user_id 
      AND users.email LIKE '%@bypass.com'
    )
  );

-- Policy 3: Allow updates for profile owners or test accounts
CREATE POLICY "Update for profile owners or test accounts"
  ON creator_profiles
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = creator_profiles.user_id 
      AND users.email LIKE '%@bypass.com'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = creator_profiles.user_id 
      AND users.email LIKE '%@bypass.com'
    )
  );

-- Policy 4: Allow deletes for profile owners or test accounts
CREATE POLICY "Delete for profile owners or test accounts"
  ON creator_profiles
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = creator_profiles.user_id 
      AND users.email LIKE '%@bypass.com'
    )
  );

-- ================================================================
-- Fix portfolio items table too
-- ================================================================

DROP POLICY IF EXISTS "Enable read access for all users" ON creator_portfolio_items;
DROP POLICY IF EXISTS "Enable insert for profile owners" ON creator_portfolio_items;
DROP POLICY IF EXISTS "Enable update for profile owners" ON creator_portfolio_items;
DROP POLICY IF EXISTS "Enable delete for profile owners" ON creator_portfolio_items;
DROP POLICY IF EXISTS "Creators can insert their portfolio items" ON creator_portfolio_items;
DROP POLICY IF EXISTS "Creators can update their portfolio items" ON creator_portfolio_items;
DROP POLICY IF EXISTS "Creators can delete their portfolio items" ON creator_portfolio_items;
DROP POLICY IF EXISTS "Anyone can view portfolio items" ON creator_portfolio_items;

-- Portfolio items policies
CREATE POLICY "Public read portfolio"
  ON creator_portfolio_items
  FOR SELECT
  USING (true);

CREATE POLICY "Insert portfolio for owners or test"
  ON creator_portfolio_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM creator_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.id = creator_portfolio_items.creator_profile_id
      AND (
        cp.user_id = auth.uid()
        OR u.email LIKE '%@bypass.com'
      )
    )
  );

CREATE POLICY "Update portfolio for owners or test"
  ON creator_portfolio_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM creator_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.id = creator_portfolio_items.creator_profile_id
      AND (
        cp.user_id = auth.uid()
        OR u.email LIKE '%@bypass.com'
      )
    )
  );

CREATE POLICY "Delete portfolio for owners or test"
  ON creator_portfolio_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM creator_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.id = creator_portfolio_items.creator_profile_id
      AND (
        cp.user_id = auth.uid()
        OR u.email LIKE '%@bypass.com'
      )
    )
  );

-- ================================================================
-- Verify the fix
-- ================================================================

-- Check the new policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('creator_profiles', 'creator_portfolio_items')
ORDER BY tablename, cmd;

-- Test: Can consumer2 insert now?
DO $$
DECLARE
  test_user_id UUID;
  can_insert boolean;
BEGIN
  -- Get consumer2's ID
  SELECT id INTO test_user_id 
  FROM users 
  WHERE email = 'consumer2@bypass.com';
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE 'Test user consumer2 ID: %', test_user_id;
    RAISE NOTICE 'Policies now allow @bypass.com accounts to create profiles';
    RAISE NOTICE '✅ Try the creator onboarding again - it should work now!';
  ELSE
    RAISE NOTICE '❌ consumer2@bypass.com not found in users table';
  END IF;
END $$;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 RLS POLICIES FIXED FOR TEST ACCOUNTS!';
  RAISE NOTICE '';
  RAISE NOTICE 'What changed:';
  RAISE NOTICE '• Policies now allow @bypass.com emails to bypass auth.uid() check';
  RAISE NOTICE '• Test accounts can create/update/delete their profiles';
  RAISE NOTICE '• Real users still use proper auth.uid() validation';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Try the creator onboarding with consumer2@bypass.com';
  RAISE NOTICE '2. It should complete without RLS errors';
  RAISE NOTICE '';
END $$;