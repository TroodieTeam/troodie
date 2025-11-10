-- ================================================================
-- IMMEDIATE FIX for Creator Profile RLS Error
-- Run this in Supabase SQL Editor to fix the RLS policy error
-- ================================================================

-- First, check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('creator_profiles', 'creator_portfolio_items');

-- Drop all existing policies on creator_profiles
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'creator_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON creator_profiles', pol.policyname);
  END LOOP;
END $$;

-- Drop all existing policies on creator_portfolio_items
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'creator_portfolio_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON creator_portfolio_items', pol.policyname);
  END LOOP;
END $$;

-- Enable RLS on both tables
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_portfolio_items ENABLE ROW LEVEL SECURITY;

-- Create new policies for creator_profiles
CREATE POLICY "Enable read access for all users" 
  ON creator_profiles FOR SELECT 
  USING (true);

CREATE POLICY "Enable insert for authenticated users" 
  ON creator_profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" 
  ON creator_profiles FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" 
  ON creator_profiles FOR DELETE 
  USING (auth.uid() = user_id);

-- Create new policies for creator_portfolio_items
CREATE POLICY "Enable read access for all users" 
  ON creator_portfolio_items FOR SELECT 
  USING (true);

CREATE POLICY "Enable insert for profile owners" 
  ON creator_portfolio_items FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM creator_profiles
      WHERE creator_profiles.id = creator_portfolio_items.creator_profile_id
      AND creator_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Enable update for profile owners" 
  ON creator_portfolio_items FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM creator_profiles
      WHERE creator_profiles.id = creator_portfolio_items.creator_profile_id
      AND creator_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Enable delete for profile owners" 
  ON creator_portfolio_items FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM creator_profiles
      WHERE creator_profiles.id = creator_portfolio_items.creator_profile_id
      AND creator_profiles.user_id = auth.uid()
    )
  );

-- Test: Check all policies are created
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('creator_profiles', 'creator_portfolio_items')
ORDER BY tablename, cmd;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS policies have been fixed!';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now:';
  RAISE NOTICE '  • Create their own creator profile';
  RAISE NOTICE '  • Update their own creator profile';
  RAISE NOTICE '  • View all creator profiles';
  RAISE NOTICE '  • Manage their own portfolio items';
  RAISE NOTICE '';
  RAISE NOTICE 'Try the creator onboarding flow again - it should work now!';
END $$;