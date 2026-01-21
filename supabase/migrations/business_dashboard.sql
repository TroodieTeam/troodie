-- ============================================
-- Migration: Restaurant Team Invitation System
-- Date: 2026-01-15
-- Task: Multi-user restaurant access
-- ============================================

-- ============================================
-- PART 1: Create Tables
-- ============================================

-- Table: restaurant_team_invitations
-- Stores pending invitations sent via email
CREATE TABLE IF NOT EXISTS restaurant_team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(restaurant_id, email)
);

-- Table: restaurant_team_members
-- Stores users who have access to a restaurant
CREATE TABLE IF NOT EXISTS restaurant_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id),
  role VARCHAR(20) DEFAULT 'admin',  -- For future role-based access
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, user_id)
);

-- ============================================
-- PART 2: Create Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_team_invitations_restaurant ON restaurant_team_invitations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON restaurant_team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON restaurant_team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON restaurant_team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_members_restaurant ON restaurant_team_members(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON restaurant_team_members(user_id);

-- ============================================
-- PART 3: Enable Row Level Security
-- ============================================

ALTER TABLE restaurant_team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_team_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 4: RLS Policies for restaurant_team_invitations
-- ============================================

-- Owner or team member can view their restaurant's invitations
-- Also allow invitee to see their own invitation
CREATE POLICY "Can view invitations"
ON restaurant_team_invitations FOR SELECT
TO authenticated
USING (
  restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
    UNION
    SELECT restaurant_id FROM restaurant_team_members WHERE user_id = auth.uid()
  )
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Owner can create invitations
CREATE POLICY "Owner can create invitations"
ON restaurant_team_invitations FOR INSERT
TO authenticated
WITH CHECK (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  AND invited_by = auth.uid()
);

-- Owner can update invitations (cancel, etc.)
CREATE POLICY "Owner can update invitations"
ON restaurant_team_invitations FOR UPDATE
TO authenticated
USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

-- Owner can delete invitations
CREATE POLICY "Owner can delete invitations"
ON restaurant_team_invitations FOR DELETE
TO authenticated
USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

-- ============================================
-- PART 5: RLS Policies for restaurant_team_members
-- ============================================

-- Team members can view their team
CREATE POLICY "Team members can view team"
ON restaurant_team_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
    UNION
    SELECT restaurant_id FROM restaurant_team_members WHERE user_id = auth.uid()
  )
);

-- Owner can add team members (via accept function, but also direct)
CREATE POLICY "Owner can insert team members"
ON restaurant_team_members FOR INSERT
TO authenticated
WITH CHECK (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

-- Owner can remove team members
CREATE POLICY "Owner can delete team members"
ON restaurant_team_members FOR DELETE
TO authenticated
USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

-- ============================================
-- PART 6: Helper Functions
-- ============================================

-- Function to check if user has access to restaurant
CREATE OR REPLACE FUNCTION has_restaurant_access(p_user_id UUID, p_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is owner
  IF EXISTS (SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND owner_id = p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is team member
  IF EXISTS (SELECT 1 FROM restaurant_team_members WHERE restaurant_id = p_restaurant_id AND user_id = p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Function to accept a team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_member_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get invitation
  SELECT * INTO v_invitation
  FROM restaurant_team_invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > NOW();
  
  IF v_invitation IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Check email matches (case-insensitive)
  IF LOWER(v_invitation.email) != LOWER((SELECT email FROM auth.users WHERE id = v_user_id)) THEN
    RETURN json_build_object('success', false, 'error', 'Invitation was sent to a different email');
  END IF;
  
  -- Create team member
  INSERT INTO restaurant_team_members (restaurant_id, user_id, invited_by)
  VALUES (v_invitation.restaurant_id, v_user_id, v_invitation.invited_by)
  ON CONFLICT (restaurant_id, user_id) DO NOTHING
  RETURNING id INTO v_member_id;
  
  -- Update invitation status
  UPDATE restaurant_team_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_invitation.id;
  
  RETURN json_build_object(
    'success', true,
    'restaurant_id', v_invitation.restaurant_id,
    'member_id', v_member_id
  );
END;
$$;

-- Function to get all restaurants a user has access to
CREATE OR REPLACE FUNCTION get_my_restaurants()
RETURNS TABLE (
  restaurant_id UUID,
  restaurant_name TEXT,
  is_owner BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Restaurants where user is owner
  SELECT r.id, r.name::TEXT, TRUE
  FROM restaurants r
  WHERE r.owner_id = auth.uid()
  
  UNION
  
  -- Restaurants where user is team member
  SELECT r.id, r.name::TEXT, FALSE
  FROM restaurants r
  INNER JOIN restaurant_team_members tm ON r.id = tm.restaurant_id
  WHERE tm.user_id = auth.uid();
END;
$$;

-- ============================================
-- PART 7: Comments for Documentation
-- ============================================

COMMENT ON TABLE restaurant_team_invitations IS 'Pending team member invitations for restaurants';
COMMENT ON TABLE restaurant_team_members IS 'Users who have access to manage a restaurant';
COMMENT ON FUNCTION has_restaurant_access IS 'Check if user is owner or team member of a restaurant';
COMMENT ON FUNCTION accept_team_invitation IS 'Accept a pending invitation and join the team';
COMMENT ON FUNCTION get_my_restaurants IS 'Get all restaurants the current user can access';



ALTER TABLE restaurant_team_members 
DROP CONSTRAINT restaurant_team_members_user_id_fkey;
 
ALTER TABLE restaurant_team_members
ADD CONSTRAINT restaurant_team_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users (id)
ON DELETE CASCADE;