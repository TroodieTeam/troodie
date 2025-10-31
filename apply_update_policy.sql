-- Fix missing UPDATE policy for campaign_applications
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Business owners can update applications to their campaigns" ON campaign_applications;
DROP POLICY IF EXISTS "Admins can update any application" ON campaign_applications;

-- Create business owners policy
CREATE POLICY "Business owners can update applications to their campaigns" ON campaign_applications
  FOR UPDATE USING (campaign_id IN (
    SELECT id FROM campaigns WHERE owner_id = auth.uid() OR creator_id = auth.uid()
  ));

-- Create admin policy (using hardcoded admin IDs)
CREATE POLICY "Admins can update any application" ON campaign_applications
  FOR UPDATE USING (
    auth.uid() IN (
      'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599' -- kouame@troodieapp.com
    )
  );
