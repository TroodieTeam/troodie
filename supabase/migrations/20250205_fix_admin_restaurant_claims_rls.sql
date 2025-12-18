-- ============================================================================
-- Fix Admin RLS Policies for Restaurant Claims and Creator Applications
-- ============================================================================
-- This migration ensures admins (identified by hardcoded UUIDs) can view
-- and update all restaurant claims and creator applications for review purposes
-- ============================================================================

-- Admin user IDs (from adminReviewService.ts)
-- 'b08d9600-358d-4be9-9552-4607d9f50227'
-- '31744191-f7c0-44a4-8673-10b34ccbb87f'

-- ============================================================================
-- RESTAURANT CLAIMS ADMIN POLICIES
-- ============================================================================

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can view all claims" ON restaurant_claims;
DROP POLICY IF EXISTS "Admins can update claims" ON restaurant_claims;

-- Create admin policy for SELECT (view all claims)
-- Checks for admin UUIDs OR account_type = 'admin' OR is_verified = true
CREATE POLICY "Admins can view all claims"
  ON restaurant_claims FOR SELECT
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
  );

-- Create admin policy for UPDATE (approve/reject claims)
CREATE POLICY "Admins can update claims"
  ON restaurant_claims FOR UPDATE
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
-- CREATOR APPLICATIONS ADMIN POLICIES
-- ============================================================================

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can view all applications" ON creator_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON creator_applications;

-- Create admin policy for SELECT (view all applications)
CREATE POLICY "Admins can view all applications"
  ON creator_applications FOR SELECT
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
  );

-- Create admin policy for UPDATE (approve/reject applications)
CREATE POLICY "Admins can update applications"
  ON creator_applications FOR UPDATE
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
COMMENT ON POLICY "Admins can view all claims" ON restaurant_claims IS 
  'Allows admins (by UUID or account_type) to view all restaurant claims for review';

COMMENT ON POLICY "Admins can update claims" ON restaurant_claims IS 
  'Allows admins (by UUID or account_type) to approve/reject restaurant claims';

COMMENT ON POLICY "Admins can view all applications" ON creator_applications IS 
  'Allows admins (by UUID or account_type) to view all creator applications for review';

COMMENT ON POLICY "Admins can update applications" ON creator_applications IS 
  'Allows admins (by UUID or account_type) to approve/reject creator applications';
