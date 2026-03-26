-- Fix overly permissive RLS policies
-- This script tightens security by removing anonymous access to sensitive tables

-- =============================================
-- USERS TABLE RLS POLICIES
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "allow_all_select" ON public.users;

-- Create proper policies for users table
CREATE POLICY "authenticated_users_can_view_profiles" ON public.users
  FOR SELECT TO authenticated
  USING (true);

-- =============================================
-- CREATOR_PROFILES TABLE RLS POLICIES
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view creator profiles" ON creator_profiles;

-- Create proper policies for creator_profiles
CREATE POLICY "authenticated_users_can_view_creator_profiles" ON creator_profiles
  FOR SELECT TO authenticated
  USING (true);

-- =============================================
-- BUSINESS_PROFILES TABLE RLS POLICIES
-- =============================================

-- Ensure business_profiles has proper policies
DROP POLICY IF EXISTS "Users can view business profiles" ON business_profiles;

CREATE POLICY "authenticated_users_can_view_business_profiles" ON business_profiles
  FOR SELECT TO authenticated
  USING (true);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON POLICY "authenticated_users_can_view_profiles" ON public.users IS 'Only authenticated users can view user profiles';
COMMENT ON POLICY "authenticated_users_can_view_creator_profiles" ON creator_profiles IS 'Only authenticated users can view creator profiles';
COMMENT ON POLICY "authenticated_users_can_view_business_profiles" ON business_profiles IS 'Only authenticated users can view business profiles';
