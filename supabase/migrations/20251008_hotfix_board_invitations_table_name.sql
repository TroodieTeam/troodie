-- HOTFIX: Update board invitation functions to use board_collaborators instead of board_members
-- Date: 2025-10-08
-- Description: Fixes table name mismatch in accept_board_invitation function

-- Drop and recreate the accept_board_invitation function with correct table name
CREATE OR REPLACE FUNCTION accept_board_invitation(
  p_invitation_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_invitation RECORD;
  v_result JSONB;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM board_invitations
  WHERE id = p_invitation_id
  AND (invitee_id = p_user_id OR invite_email = (SELECT email FROM users WHERE id = p_user_id))
  AND status = 'pending'
  AND expires_at > NOW();

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation not found or expired'
    );
  END IF;

  -- Check if already a member (using board_collaborators, NOT board_members)
  IF EXISTS (
    SELECT 1 FROM board_collaborators
    WHERE board_id = v_invitation.board_id
    AND user_id = p_user_id
  ) THEN
    -- Update invitation status anyway
    UPDATE board_invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = p_invitation_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Already a member of this board'
    );
  END IF;

  -- Add user as board collaborator (not board_member)
  INSERT INTO board_collaborators (board_id, user_id, role)
  VALUES (v_invitation.board_id, p_user_id, 'member');

  -- Update invitation status
  UPDATE board_invitations
  SET status = 'accepted', accepted_at = NOW(), invitee_id = p_user_id
  WHERE id = p_invitation_id;

  -- Increment board member count
  UPDATE boards
  SET member_count = member_count + 1
  WHERE id = v_invitation.board_id;

  -- Create notification for inviter
  INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
  VALUES (
    v_invitation.inviter_id,
    'board_invite',
    'Invitation Accepted',
    (SELECT name FROM users WHERE id = p_user_id) || ' accepted your board invitation',
    v_invitation.board_id::TEXT,
    'board'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invitation accepted successfully',
    'board_id', v_invitation.board_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was created
SELECT 'HOTFIX: accept_board_invitation function updated successfully!' as status;
