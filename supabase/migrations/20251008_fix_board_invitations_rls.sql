-- Fix board_invitations RLS policy that's causing permission denied error
-- The issue is that the UPDATE policy tries to access auth.users table which requires special permissions

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can update their invitations" ON board_invitations;

-- Recreate it without accessing auth.users table
-- Users can update invitations where they are the invitee
CREATE POLICY "Users can update their invitations"
  ON board_invitations FOR UPDATE
  USING (invitee_id = auth.uid());

-- Also ensure the SELECT policy doesn't cause issues
DROP POLICY IF EXISTS "Users can see their invitations" ON board_invitations;

CREATE POLICY "Users can see their invitations"
  ON board_invitations FOR SELECT
  USING (
    invitee_id = auth.uid()
    OR inviter_id = auth.uid()
  );

COMMENT ON POLICY "Users can update their invitations" ON board_invitations IS 'Allow users to accept/decline their own invitations';
COMMENT ON POLICY "Users can see their invitations" ON board_invitations IS 'Allow users to view invitations they sent or received';
