-- Fix missing UPDATE policy for campaign_applications
-- This allows business owners and admins to update application status

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Business owners can update applications to their campaigns" ON campaign_applications;
CREATE POLICY "Business owners can update applications to their campaigns" ON campaign_applications
  FOR UPDATE USING (campaign_id IN (
    SELECT id FROM campaigns WHERE owner_id = auth.uid() OR creator_id = auth.uid()
  ));

-- Also add policy for admins to update any application
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Admins can update any application" ON campaign_applications;
CREATE POLICY "Admins can update any application" ON campaign_applications
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE email IN ('kouame@troodieapp.com', 'admin@troodieapp.com')
    )
  );
