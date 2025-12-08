-- Critical Fixes Migration
-- Date: 2025-10-01
-- Description: Implements board collaboration invites, fixes like counter, and community member count

-- =====================================================
-- BOARD COLLABORATION SYSTEM
-- =====================================================

-- Board invitations table
CREATE TABLE IF NOT EXISTS board_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES users(id),
  invitee_id UUID REFERENCES users(id),
  invite_email VARCHAR(255),
  invite_link_token VARCHAR(100) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  CONSTRAINT invite_user_or_email CHECK (invitee_id IS NOT NULL OR invite_email IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_board_invitations_board ON board_invitations(board_id);
CREATE INDEX IF NOT EXISTS idx_board_invitations_invitee ON board_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_board_invitations_status ON board_invitations(status);
CREATE INDEX IF NOT EXISTS idx_board_invitations_token ON board_invitations(invite_link_token);

-- RLS policies for board_invitations
ALTER TABLE board_invitations ENABLE ROW LEVEL SECURITY;

-- Board owners can create invitations
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Board owners can create invitations" ON board_invitations;
CREATE POLICY "Board owners can create invitations"
  ON board_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_id
      AND boards.user_id = auth.uid()
    )
  );

-- Users can see their own invitations
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can see their invitations" ON board_invitations;
CREATE POLICY "Users can see their invitations"
  ON board_invitations FOR SELECT
  USING (
    invitee_id = auth.uid()
    OR inviter_id = auth.uid()
    OR invite_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can update their own invitations (accept/decline)
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can update their invitations" ON board_invitations;
CREATE POLICY "Users can update their invitations"
  ON board_invitations FOR UPDATE
  USING (invitee_id = auth.uid() OR invite_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Board owners can delete invitations
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Board owners can delete invitations" ON board_invitations;
CREATE POLICY "Board owners can delete invitations"
  ON board_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_id
      AND boards.user_id = auth.uid()
    )
  );

-- Function to accept board invitation
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

  -- Check if already a member
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

  -- Add user as board collaborator
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
    'board_id', v_invitation.board_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline board invitation
CREATE OR REPLACE FUNCTION decline_board_invitation(
  p_invitation_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
BEGIN
  UPDATE board_invitations
  SET status = 'declined'
  WHERE id = p_invitation_id
  AND (invitee_id = p_user_id OR invite_email = (SELECT email FROM users WHERE id = p_user_id))
  AND status = 'pending';

  IF FOUND THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIX LIKE COUNTER
-- =====================================================

-- Function to update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON post_likes;

-- Create trigger for like counter
CREATE TRIGGER trigger_update_post_likes_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW
EXECUTE FUNCTION update_post_likes_count();

-- Fix existing like counts (one-time cleanup)
UPDATE posts p
SET likes_count = (
  SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id
);

-- =====================================================
-- FIX COMMUNITY MEMBER COUNT
-- =====================================================

-- Function to update community member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE communities
    SET member_count = member_count + 1
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE communities
    SET member_count = GREATEST(0, member_count - 1)
    WHERE id = OLD.community_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE communities
      SET member_count = GREATEST(0, member_count - 1)
      WHERE id = NEW.community_id;
    ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE communities
      SET member_count = member_count + 1
      WHERE id = NEW.community_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_community_member_count ON community_members;

-- Create trigger for community member counter
CREATE TRIGGER trigger_update_community_member_count
AFTER INSERT OR UPDATE OR DELETE ON community_members
FOR EACH ROW
EXECUTE FUNCTION update_community_member_count();

-- Fix existing community member counts (one-time cleanup)
UPDATE communities c
SET member_count = (
  SELECT COUNT(*)
  FROM community_members cm
  WHERE cm.community_id = c.id
  AND cm.status = 'active'
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to generate invite link token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS VARCHAR AS $$
DECLARE
  v_token VARCHAR(100);
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random token
    v_token := encode(gen_random_bytes(32), 'base64');
    v_token := replace(v_token, '/', '_');
    v_token := replace(v_token, '+', '-');
    v_token := substring(v_token, 1, 100);

    -- Check if token already exists
    SELECT EXISTS (
      SELECT 1 FROM board_invitations WHERE invite_link_token = v_token
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending invitations for a user
CREATE OR REPLACE FUNCTION get_user_pending_invitations(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  board_id UUID,
  board_title VARCHAR,
  board_description TEXT,
  inviter_name VARCHAR,
  inviter_avatar VARCHAR,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bi.id,
    bi.board_id,
    b.title as board_title,
    b.description as board_description,
    u.name as inviter_name,
    u.avatar_url as inviter_avatar,
    bi.created_at,
    bi.expires_at
  FROM board_invitations bi
  JOIN boards b ON bi.board_id = b.id
  JOIN users u ON bi.inviter_id = u.id
  WHERE (bi.invitee_id = p_user_id OR bi.invite_email = (SELECT email FROM users WHERE id = p_user_id))
  AND bi.status = 'pending'
  AND bi.expires_at > NOW()
  ORDER BY bi.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE board_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE board_invitations IS 'Stores board collaboration invitations sent to users or email addresses';
COMMENT ON FUNCTION accept_board_invitation IS 'Accepts a board invitation and adds user as member';
COMMENT ON FUNCTION decline_board_invitation IS 'Declines a board invitation';
COMMENT ON FUNCTION update_post_likes_count IS 'Automatically updates posts.likes_count when likes are added/removed';
COMMENT ON FUNCTION update_community_member_count IS 'Automatically updates communities.member_count when members join/leave';
COMMENT ON FUNCTION generate_invite_token IS 'Generates a unique token for shareable board invite links';
COMMENT ON FUNCTION get_user_pending_invitations IS 'Returns all pending board invitations for a user';
COMMENT ON FUNCTION cleanup_expired_invitations IS 'Marks expired invitations as expired (run periodically)';
