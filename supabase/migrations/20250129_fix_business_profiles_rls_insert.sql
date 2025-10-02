-- Migration: Fix business_profiles RLS INSERT permission issue
-- Description: Properly handle INSERT permissions with WITH CHECK clause
-- Author: Claude
-- Date: 2025-01-29

-- Drop ALL existing policies on business_profiles to avoid any conflicts
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'business_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON business_profiles', pol.policyname);
    END LOOP;
END $$;

-- Enable RLS on the table
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies with proper INSERT handling

-- Policy 1: Anyone can view all business profiles (public read)
CREATE POLICY "public_read_business_profiles" ON business_profiles
  FOR SELECT
  USING (true);

-- Policy 2: Users can INSERT their own business profile
-- WITH CHECK ensures the user_id in the new row matches the authenticated user
CREATE POLICY "users_insert_own_business_profile" ON business_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can UPDATE their own business profile
CREATE POLICY "users_update_own_business_profile" ON business_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can DELETE their own business profile
CREATE POLICY "users_delete_own_business_profile" ON business_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT ALL ON business_profiles TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;