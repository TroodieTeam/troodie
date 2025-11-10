-- ================================================================
-- DIAGNOSE RLS Issue for creator_profiles
-- Run this to understand what's blocking the insert
-- ================================================================

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'creator_profiles';

-- 2. List all current policies on creator_profiles
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'creator_profiles'
ORDER BY cmd;

-- 3. Test if auth.uid() is working (run while logged in as consumer2)
SELECT auth.uid() as current_user_id;

-- 4. Check if user exists in users table
SELECT 
  id,
  email,
  account_type
FROM users 
WHERE email = 'consumer2@bypass.com';

-- 5. Check if creator profile already exists
SELECT 
  id,
  user_id,
  created_at
FROM creator_profiles 
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'consumer2@bypass.com'
);

-- ================================================================
-- IMMEDIATE FIX: Temporarily disable RLS (for testing only)
-- ================================================================
-- Uncomment the line below to temporarily disable RLS for testing:
-- ALTER TABLE creator_profiles DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- ALTERNATIVE FIX: Create a more permissive policy
-- ================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON creator_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON creator_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON creator_profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON creator_profiles;
DROP POLICY IF EXISTS "Users can create their own creator profile" ON creator_profiles;
DROP POLICY IF EXISTS "Users can update their own creator profile" ON creator_profiles;
DROP POLICY IF EXISTS "Users can delete their own creator profile" ON creator_profiles;
DROP POLICY IF EXISTS "Anyone can view creator profiles" ON creator_profiles;

-- Create a super simple policy for testing
CREATE POLICY "Allow all operations for authenticated users"
  ON creator_profiles
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the new policy
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'creator_profiles';

-- ================================================================
-- TEST: Try to see what auth.uid() returns for test user
-- ================================================================
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get the test user's ID
  SELECT id INTO test_user_id 
  FROM users 
  WHERE email = 'consumer2@bypass.com';
  
  RAISE NOTICE 'Test user ID from users table: %', test_user_id;
  RAISE NOTICE 'Current auth.uid(): %', auth.uid();
  
  IF auth.uid() IS NULL THEN
    RAISE NOTICE 'WARNING: auth.uid() is NULL - this is the problem!';
    RAISE NOTICE 'The user might not be properly authenticated with Supabase Auth';
  END IF;
END $$;