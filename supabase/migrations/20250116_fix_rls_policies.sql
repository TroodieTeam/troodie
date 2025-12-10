-- Fix overly permissive RLS policies
-- This migration tightens security by removing anonymous access to sensitive tables

-- =============================================
-- USERS TABLE RLS POLICIES
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "allow_all_select" ON public.users;

-- Create proper policies for users table
CREATE POLICY "authenticated_users_can_view_profiles" ON public.users
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "users_can_view_own_profile" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public;
CREATE POLICY "users_can_update_own_profile" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public;
CREATE POLICY "users_can_insert_own_profile" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- =============================================
-- CREATOR_PROFILES TABLE RLS POLICIES
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view creator profiles" ON creator_profiles;

-- Create proper policies for creator_profiles
CREATE POLICY "authenticated_users_can_view_creator_profiles" ON creator_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "creators_can_manage_own_profile" ON creator_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- BUSINESS_PROFILES TABLE RLS POLICIES
-- =============================================

-- Ensure business_profiles has proper policies
DROP POLICY IF EXISTS "Users can view business profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can manage their business profile" ON business_profiles;

CREATE POLICY "authenticated_users_can_view_business_profiles" ON business_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "business_owners_can_manage_own_profile" ON business_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON POLICY "authenticated_users_can_view_profiles" ON public.users IS 'Only authenticated users can view user profiles';
COMMENT ON POLICY "authenticated_users_can_view_creator_profiles" ON creator_profiles IS 'Only authenticated users can view creator profiles';
COMMENT ON POLICY "authenticated_users_can_view_business_profiles" ON business_profiles IS 'Only authenticated users can view business profiles';
