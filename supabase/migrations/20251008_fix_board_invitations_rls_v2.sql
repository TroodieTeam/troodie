-- Fix board_invitations RLS policies that are blocking invitee access
-- The issue: accessing auth.users table in RLS policies requires special permissions
-- Solution: Remove auth.users references and simplify policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can see their invitations" ON board_invitations;
DROP POLICY IF EXISTS "Users can update their invitations" ON board_invitations;

-- Create simplified SELECT policy
-- Users can see invitations where they are the inviter OR invitee
CREATE POLICY "Users can see their invitations"
  ON board_invitations FOR SELECT
  USING (
    invitee_id = auth.uid()
    OR inviter_id = auth.uid()
  );

-- Create simplified UPDATE policy
-- Users can update invitations where they are the invitee
CREATE POLICY "Users can update their invitations"
  ON board_invitations FOR UPDATE
  USING (invitee_id = auth.uid());

-- Add comments for clarity
COMMENT ON POLICY "Users can see their invitations" ON board_invitations
  IS 'Allow users to view invitations they sent or received';

COMMENT ON POLICY "Users can update their invitations" ON board_invitations
  IS 'Allow users to accept/decline their own invitations';
