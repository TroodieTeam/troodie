-- Migration: Create Communities System
-- Description: Implements community creation and management
-- Author: Claude
-- Date: 2025-01-25

-- 1. Create communities table
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  type VARCHAR(20) NOT NULL CHECK (type IN ('public', 'private')),
  is_event_based BOOLEAN DEFAULT FALSE,
  event_name VARCHAR(255),
  event_date DATE,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Stats
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  
  -- Indexes for performance
  CONSTRAINT communities_name_unique UNIQUE (name)
);

-- 2. Create community_members table
CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  
  -- Membership details
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  invitation_status VARCHAR(20) DEFAULT 'active' CHECK (invitation_status IN ('pending', 'active', 'declined')),
  
  -- Activity tracking
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  post_count INTEGER DEFAULT 0,
  
  -- Ensure unique membership
  CONSTRAINT unique_community_member UNIQUE (community_id, user_id)
);

-- 3. Create community_posts table
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Post content
  content TEXT NOT NULL,
  restaurant_id VARCHAR(255) REFERENCES restaurants(id),
  images TEXT[], -- Array of image URLs
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Engagement
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Moderation
  is_pinned BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMP WITH TIME ZONE
);

-- 4. Create community_invites table for private communities
CREATE TABLE IF NOT EXISTS community_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  
  -- Invite details
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_email VARCHAR(255),
  invited_user_id UUID REFERENCES users(id),
  
  -- Invite status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invite_code VARCHAR(20) UNIQUE DEFAULT substr(md5(random()::text), 0, 9),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure one active invite per email/user per community
  CONSTRAINT unique_pending_invite UNIQUE (community_id, invited_email, status)
);

-- 5. Create indexes for performance
CREATE INDEX idx_communities_created_by ON communities(created_by);
CREATE INDEX idx_communities_type ON communities(type);
CREATE INDEX idx_communities_location ON communities(location);
CREATE INDEX idx_communities_is_active ON communities(is_active);

CREATE INDEX idx_community_members_user_id ON community_members(user_id);
CREATE INDEX idx_community_members_community_id ON community_members(community_id);
CREATE INDEX idx_community_members_role ON community_members(role);

CREATE INDEX idx_community_posts_community_id ON community_posts(community_id);
CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);

-- 6. Create views for easier querying
CREATE OR REPLACE VIEW community_details_view AS
SELECT 
  c.*,
  u.username as creator_username,
  u.profile_photo_url as creator_photo,
  COUNT(DISTINCT cm.user_id) as actual_member_count,
  COUNT(DISTINCT cp.id) as actual_post_count
FROM communities c
LEFT JOIN users u ON c.created_by = u.id
LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.invitation_status = 'active'
LEFT JOIN community_posts cp ON c.id = cp.community_id AND NOT cp.is_hidden
GROUP BY c.id, u.id;

-- 7. Create functions

-- Function to create a community and add creator as owner
CREATE OR REPLACE FUNCTION create_community(
  p_name VARCHAR,
  p_description TEXT,
  p_location VARCHAR,
  p_type VARCHAR,
  p_is_event_based BOOLEAN,
  p_event_name VARCHAR DEFAULT NULL,
  p_event_date DATE DEFAULT NULL,
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_community_id UUID;
BEGIN
  -- Insert community
  INSERT INTO communities (
    name, description, location, type, 
    is_event_based, event_name, event_date, created_by
  )
  VALUES (
    p_name, p_description, p_location, p_type,
    p_is_event_based, p_event_name, p_event_date, p_created_by
  )
  RETURNING id INTO v_community_id;
  
  -- Add creator as owner
  INSERT INTO community_members (
    community_id, user_id, role, invitation_status
  )
  VALUES (
    v_community_id, p_created_by, 'owner', 'active'
  );
  
  -- Update member count
  UPDATE communities 
  SET member_count = 1 
  WHERE id = v_community_id;
  
  RETURN v_community_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join a public community
CREATE OR REPLACE FUNCTION join_community(
  p_community_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_community_type VARCHAR;
  v_existing_member BOOLEAN;
BEGIN
  -- Check if community exists and is public
  SELECT type INTO v_community_type
  FROM communities 
  WHERE id = p_community_id AND is_active = TRUE;
  
  IF v_community_type IS NULL THEN
    RAISE EXCEPTION 'Community not found or inactive';
  END IF;
  
  IF v_community_type != 'public' THEN
    RAISE EXCEPTION 'Cannot join private community without invitation';
  END IF;
  
  -- Check if already a member
  SELECT EXISTS(
    SELECT 1 FROM community_members 
    WHERE community_id = p_community_id AND user_id = p_user_id
  ) INTO v_existing_member;
  
  IF v_existing_member THEN
    RAISE EXCEPTION 'Already a member of this community';
  END IF;
  
  -- Add as member
  INSERT INTO community_members (
    community_id, user_id, role, invitation_status
  )
  VALUES (
    p_community_id, p_user_id, 'member', 'active'
  );
  
  -- Update member count
  UPDATE communities 
  SET member_count = member_count + 1 
  WHERE id = p_community_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_invites ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies

-- Communities policies
CREATE POLICY "Communities are viewable by everyone" 
  ON communities FOR SELECT 
  USING (is_active = TRUE);

CREATE POLICY "Users can create communities" 
  ON communities FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Community owners can update their communities" 
  ON communities FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = communities.id 
      AND user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Community members policies
CREATE POLICY "Community members are viewable by community members" 
  ON community_members FOR SELECT 
  USING (
    -- Public communities: everyone can see members
    EXISTS (
      SELECT 1 FROM communities 
      WHERE id = community_members.community_id 
      AND type = 'public'
    )
    OR
    -- Private communities: only members can see members
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = community_members.community_id 
      AND cm.user_id = auth.uid()
      AND cm.invitation_status = 'active'
    )
  );

CREATE POLICY "Users can join public communities" 
  ON community_members FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM communities 
      WHERE id = community_members.community_id 
      AND type = 'public'
      AND is_active = TRUE
    )
  );

-- Community posts policies
CREATE POLICY "Community posts are viewable by members" 
  ON community_posts FOR SELECT 
  USING (
    NOT is_hidden AND
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = community_posts.community_id 
      AND user_id = auth.uid()
      AND invitation_status = 'active'
    )
  );

CREATE POLICY "Community members can create posts" 
  ON community_posts FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = community_posts.community_id 
      AND user_id = auth.uid()
      AND invitation_status = 'active'
    )
  );

CREATE POLICY "Users can update their own posts" 
  ON community_posts FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts" 
  ON community_posts FOR DELETE 
  USING (user_id = auth.uid());

-- 10. Grant permissions
GRANT SELECT ON communities TO authenticated;
GRANT INSERT, UPDATE ON communities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON community_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON community_invites TO authenticated;

GRANT SELECT ON community_details_view TO authenticated;
GRANT EXECUTE ON FUNCTION create_community TO authenticated;
GRANT EXECUTE ON FUNCTION join_community TO authenticated;