-- WARNING: This script REVERTS the RLS policy changes. Only use if rollback is needed.
-- Reset Script: Campaign Acceptance RLS Fix
-- Date: 2026-02-09

-- 1. Revert campaign_applications admin policy to hardcoded UUID
DROP POLICY IF EXISTS "Admins can update any application" ON campaign_applications;
CREATE POLICY "Admins can update any application" ON campaign_applications
  FOR UPDATE USING (
    auth.uid() IN ('a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599')
  );

-- 2. Remove admin SELECT policy (didn't exist before)
DROP POLICY IF EXISTS "Admins can view any application" ON campaign_applications;

-- 3. Revert business owner policy to include creator_id
DROP POLICY IF EXISTS "Business owners can update applications to their campaigns" ON campaign_applications;
CREATE POLICY "Business owners can update applications to their campaigns" ON campaign_applications
  FOR UPDATE USING (campaign_id IN (
    SELECT id FROM campaigns WHERE owner_id = auth.uid() OR creator_id = auth.uid()
  ));

-- 4. Revert campaign_deliverables admin policies to hardcoded UUID
DROP POLICY IF EXISTS "Admins can update all deliverables" ON campaign_deliverables;
CREATE POLICY "Admins can update all deliverables" ON campaign_deliverables
  FOR UPDATE USING (
    auth.uid() IN ('a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599')
  );

DROP POLICY IF EXISTS "Admins can view all deliverables" ON campaign_deliverables;
CREATE POLICY "Admins can view all deliverables" ON campaign_deliverables
  FOR SELECT USING (
    auth.uid() IN ('a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599')
  );
