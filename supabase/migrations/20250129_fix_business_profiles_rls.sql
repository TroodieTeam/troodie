-- Migration: Fix business_profiles RLS policies
-- Description: Ensure proper RLS policies for business_profiles table
-- Author: Claude
-- Date: 2025-01-29

-- Drop all existing policies on business_profiles to avoid conflicts
DROP POLICY IF EXISTS "Users can view business profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can manage their business profile" ON business_profiles;
DROP POLICY IF EXISTS "Users can view their own business profile" ON business_profiles;
DROP POLICY IF EXISTS "Users can update their own business profile" ON business_profiles;
DROP POLICY IF EXISTS "Users can insert their own business profile" ON business_profiles;

-- Create clean, comprehensive policies for business_profiles
CREATE POLICY "Anyone can view business profiles" ON business_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own business profile" ON business_profiles
  FOR ALL USING (user_id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
