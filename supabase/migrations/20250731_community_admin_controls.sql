-- Community Admin Controls Migration
-- Adds admin action logging and soft delete support for community moderation

-- Create community admin logs table if not exists
CREATE TABLE IF NOT EXISTS community_admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES users(id),
  action_type VARCHAR NOT NULL CHECK (
    action_type IN ('remove_member', 'delete_post', 'delete_message', 'update_role')
  ),
  target_id UUID NOT NULL,
  target_type VARCHAR NOT NULL CHECK (target_type IN ('user', 'post', 'message')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add soft delete columns to community_posts
ALTER TABLE community_posts 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_admin_logs_community 
  ON community_admin_logs(community_id);
CREATE INDEX IF NOT EXISTS idx_community_admin_logs_admin 
  ON community_admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_deleted 
  ON community_posts(community_id, deleted_at);

-- Enable RLS on community_admin_logs
ALTER TABLE community_admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_admin_logs
CREATE POLICY "Admins can view community admin logs" ON community_admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_admin_logs.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
      AND cm.status = 'active'
    )
  );

CREATE POLICY "Admins can insert admin logs" ON community_admin_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_admin_logs.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin', 'moderator')
      AND cm.status = 'active'
    )
  );

-- Update RLS for community_posts to exclude soft deleted posts
DROP POLICY IF EXISTS "Community members can view posts" ON community_posts;
CREATE POLICY "Community members can view posts" ON community_posts
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_posts.community_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
    )
  );

-- Function to check admin permissions
CREATE OR REPLACE FUNCTION check_community_permission(
  p_user_id UUID,
  p_community_id UUID,
  p_action VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_role VARCHAR;
BEGIN
  -- Get user's role in the community
  SELECT role INTO v_role
  FROM community_members
  WHERE user_id = p_user_id 
    AND community_id = p_community_id
    AND status = 'active';
  
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check permissions based on role
  CASE v_role
    WHEN 'owner' THEN
      RETURN TRUE; -- Owners can do everything
    WHEN 'admin' THEN
      RETURN p_action IN ('remove_member', 'delete_post', 'delete_message', 'view_audit_logs');
    WHEN 'moderator' THEN
      RETURN p_action IN ('delete_post', 'delete_message');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_community_permission(UUID, UUID, VARCHAR) TO authenticated;