-- ============================================================================
-- Fix Admin RLS Policies for Restaurants and Users Tables
-- ============================================================================
-- This migration ensures admins can update restaurants and users tables
-- when approving restaurant claims
-- ============================================================================

-- Admin user IDs (from adminReviewService.ts)
-- 'b08d9600-358d-4be9-9552-4607d9f50227'
-- '31744191-f7c0-44a4-8673-10b34ccbb87f'

-- ============================================================================
-- RESTAURANTS ADMIN POLICIES
-- ============================================================================

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can update restaurants" ON restaurants;

-- Create admin policy for UPDATE (for approving claims)
CREATE POLICY "Admins can update restaurants"
  ON restaurants FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      'b08d9600-358d-4be9-9552-4607d9f50227'::uuid,
      '31744191-f7c0-44a4-8673-10b34ccbb87f'::uuid
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true)
    )
  )
  WITH CHECK (
    auth.uid() IN (
      'b08d9600-358d-4be9-9552-4607d9f50227'::uuid,
      '31744191-f7c0-44a4-8673-10b34ccbb87f'::uuid
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true)
    )
  );

-- ============================================================================
-- USERS ADMIN POLICIES
-- ============================================================================

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can update users" ON users;

-- Create admin policy for UPDATE (for upgrading users to business)
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      'b08d9600-358d-4be9-9552-4607d9f50227'::uuid,
      '31744191-f7c0-44a4-8673-10b34ccbb87f'::uuid
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true)
    )
  )
  WITH CHECK (
    auth.uid() IN (
      'b08d9600-358d-4be9-9552-4607d9f50227'::uuid,
      '31744191-f7c0-44a4-8673-10b34ccbb87f'::uuid
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true)
    )
  );

-- ============================================================================
-- BUSINESS_PROFILES ADMIN POLICIES
-- ============================================================================

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can insert business profiles" ON business_profiles;
DROP POLICY IF EXISTS "Admins can update business profiles" ON business_profiles;

-- Create admin policy for INSERT (for creating business profiles when approving claims)
CREATE POLICY "Admins can insert business profiles"
  ON business_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      'b08d9600-358d-4be9-9552-4607d9f50227'::uuid,
      '31744191-f7c0-44a4-8673-10b34ccbb87f'::uuid
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true)
    )
  );

-- Create admin policy for UPDATE (for updating business profiles)
CREATE POLICY "Admins can update business profiles"
  ON business_profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      'b08d9600-358d-4be9-9552-4607d9f50227'::uuid,
      '31744191-f7c0-44a4-8673-10b34ccbb87f'::uuid
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true)
    )
  )
  WITH CHECK (
    auth.uid() IN (
      'b08d9600-358d-4be9-9552-4607d9f50227'::uuid,
      '31744191-f7c0-44a4-8673-10b34ccbb87f'::uuid
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true)
    )
  );

-- Add comments
COMMENT ON POLICY "Admins can update restaurants" ON restaurants IS 
  'Allows admins (by UUID or account_type) to update restaurants when approving claims';

COMMENT ON POLICY "Admins can update users" ON users IS 
  'Allows admins (by UUID or account_type) to update users when approving claims/applications';

COMMENT ON POLICY "Admins can insert business profiles" ON business_profiles IS 
  'Allows admins (by UUID or account_type) to create business profiles when approving claims';

COMMENT ON POLICY "Admins can update business profiles" ON business_profiles IS 
  'Allows admins (by UUID or account_type) to update business profiles when approving claims';
