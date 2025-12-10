-- Fix RLS policies for campaign_deliverables table
-- Add missing UPDATE policies for admins and business owners

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can update campaign deliverables" ON campaign_deliverables;
DROP POLICY IF EXISTS "Business owners can update campaign deliverables" ON campaign_deliverables;

-- Admin policy for updating deliverables (using hardcoded admin IDs)
CREATE POLICY "Admins can update campaign deliverables" ON campaign_deliverables
  FOR UPDATE USING (
    auth.uid() IN (
      'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599' -- kouame@troodieapp.com
    )
  );

-- Business owners can update deliverables for their campaigns
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Business owners can update campaign deliverables" ON campaign_deliverables;
CREATE POLICY "Business owners can update campaign deliverables" ON campaign_deliverables
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE owner_id = auth.uid() OR creator_id = auth.uid()
    )
  );

-- Also ensure admins can view all deliverables
DROP POLICY IF EXISTS "Admins can view campaign deliverables" ON campaign_deliverables;
CREATE POLICY "Admins can view campaign deliverables" ON campaign_deliverables
  FOR SELECT USING (
    auth.uid() IN (
      'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599' -- kouame@troodieapp.com
    )
  );
