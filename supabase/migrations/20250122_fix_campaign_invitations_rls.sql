-- ============================================================================
-- Fix Campaign Invitations RLS Policy
-- ============================================================================
-- Issue: RLS policy "Businesses can create invitations" is too restrictive
-- Error: "new row violates row-level security policy for table campaign_invitations"
-- Date: 2025-01-22
-- ============================================================================

-- First, let's create a diagnostic function to check why invitations fail
CREATE OR REPLACE FUNCTION diagnose_invitation_permission(
  p_campaign_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  campaign_exists BOOLEAN,
  campaign_status TEXT,
  restaurant_id UUID,
  restaurant_owner_id UUID,
  user_is_owner BOOLEAN,
  can_create_invitation BOOLEAN,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id IS NOT NULL as campaign_exists,
    COALESCE(c.status::TEXT, 'NOT_FOUND') as campaign_status,
    c.restaurant_id,
    r.owner_id as restaurant_owner_id,
    (r.owner_id = p_user_id) as user_is_owner,
    (
      c.id IS NOT NULL 
      AND c.status = 'active'
      AND r.owner_id = p_user_id
    ) as can_create_invitation,
    CASE
      WHEN c.id IS NULL THEN 'Campaign does not exist'
      WHEN c.status != 'active' THEN 'Campaign is not active (status: ' || c.status || ')'
      WHEN r.owner_id IS NULL THEN 'Restaurant owner not found'
      WHEN r.owner_id != p_user_id THEN 'User is not the restaurant owner'
      ELSE 'Should be able to create invitation'
    END as reason
  FROM campaigns c
  LEFT JOIN restaurants r ON c.restaurant_id = r.id
  WHERE c.id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION diagnose_invitation_permission IS
'Diagnostic function to check why a user cannot create a campaign invitation';

GRANT EXECUTE ON FUNCTION diagnose_invitation_permission TO authenticated;

-- Update the RLS policy to be more flexible
-- Allow invitations if the user is the restaurant owner OR if they're the campaign owner
DROP POLICY IF EXISTS "Businesses can create invitations" ON campaign_invitations;

CREATE POLICY "Businesses can create invitations"
  ON campaign_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN restaurants r ON c.restaurant_id = r.id
      WHERE c.id = campaign_invitations.campaign_id
      AND (
        r.owner_id = auth.uid()
        OR c.owner_id = auth.uid()
      )
      AND c.status = 'active'
    )
  );

COMMENT ON POLICY "Businesses can create invitations" ON campaign_invitations IS
'Allows restaurant owners or campaign owners to create invitations for active campaigns';
