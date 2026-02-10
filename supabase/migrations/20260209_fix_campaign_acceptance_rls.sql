-- ============================================================================
-- FIX: Campaign Application & Deliverable Admin RLS Policies
-- Tickets: TRO-148, TRO-149
-- Date: 2026-02-09
--
-- Root cause: Admin policies on campaign_applications and campaign_deliverables
-- use hardcoded UUIDs instead of users.role = 'admin'. This fails when the
-- admin logs in with a different account than the hardcoded one.
--
-- Fix: Standardize admin policies to use users.role = 'admin' pattern,
-- consistent with 20251013_troodie_managed_campaigns_schema.sql and
-- 20251016_enhanced_deliverables_system.sql.
--
-- Also tightens business owner policy by removing legacy OR creator_id clause.
-- ============================================================================

-- ============================================================================
-- 1. FIX campaign_applications ADMIN POLICIES (TRO-148)
-- ============================================================================

-- Replace hardcoded UUID admin UPDATE policy with role-based policy
DROP POLICY IF EXISTS "Admins can update any application" ON campaign_applications;
CREATE POLICY "Admins can update any application" ON campaign_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add admin SELECT policy (needed for admin to view all applications)
DROP POLICY IF EXISTS "Admins can view any application" ON campaign_applications;
CREATE POLICY "Admins can view any application" ON campaign_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 2. FIX business owner UPDATE policy — remove legacy OR creator_id clause
--
-- The campaigns.creator_id column is from the original schema and represents
-- the creator assigned to the campaign, NOT the business owner. Including it
-- in the policy could let assigned creators modify applications.
-- ============================================================================

DROP POLICY IF EXISTS "Business owners can update applications to their campaigns" ON campaign_applications;
CREATE POLICY "Business owners can update applications to their campaigns" ON campaign_applications
  FOR UPDATE USING (campaign_id IN (
    SELECT id FROM campaigns WHERE owner_id = auth.uid()
  ));

-- ============================================================================
-- 3. FIX campaign_deliverables ADMIN POLICIES (TRO-149)
-- ============================================================================

-- Replace hardcoded UUID admin UPDATE policy with role-based policy
DROP POLICY IF EXISTS "Admins can update all deliverables" ON campaign_deliverables;
CREATE POLICY "Admins can update all deliverables" ON campaign_deliverables
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Replace hardcoded UUID admin SELECT policy with role-based policy
DROP POLICY IF EXISTS "Admins can view all deliverables" ON campaign_deliverables;
CREATE POLICY "Admins can view all deliverables" ON campaign_deliverables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 4. ENSURE admin users have correct role in both environments
-- ============================================================================

-- Dev admin (kouame@troodieapp.com)
UPDATE users SET role = 'admin' WHERE id = 'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599';
-- Production admin (team@troodieapp.com)
UPDATE users SET role = 'admin' WHERE id = '5373475d-b6b5-4abd-bd47-8ec515c44a47';
