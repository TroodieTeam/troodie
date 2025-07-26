-- Migration: Create Communities System (Safe Version)
-- Description: Safely creates community tables, checking for existing structure
-- Author: Claude
-- Date: 2025-01-25

-- Check if communities table exists and has the right structure
DO $$ 
BEGIN
    -- Check if communities table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'communities') THEN
        -- Check if created_by column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'communities' AND column_name = 'created_by') THEN
            -- Add created_by column if missing
            ALTER TABLE communities ADD COLUMN created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
        END IF;
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE communities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          description TEXT,
          location VARCHAR(255),
          type VARCHAR(20) NOT NULL CHECK (type IN ('public', 'private')),
          is_event_based BOOLEAN DEFAULT FALSE,
          event_name VARCHAR(255),
          event_date DATE,
          created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          member_count INTEGER DEFAULT 0,
          post_count INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          settings JSONB DEFAULT '{}',
          CONSTRAINT communities_name_unique UNIQUE (name)
        );
    END IF;
END $$;

-- Continue with the rest of the migration only if needed
-- Check and create community_members table
CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  invitation_status VARCHAR(20) DEFAULT 'active' CHECK (invitation_status IN ('pending', 'active', 'declined')),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  post_count INTEGER DEFAULT 0,
  CONSTRAINT unique_community_member UNIQUE (community_id, user_id)
);

-- Check and create community_posts table
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  restaurant_id VARCHAR(255) REFERENCES restaurants(id),
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMP WITH TIME ZONE
);

-- Check and create community_invites table
CREATE TABLE IF NOT EXISTS community_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_email VARCHAR(255),
  invited_user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invite_code VARCHAR(20) UNIQUE DEFAULT substr(md5(random()::text), 0, 9),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_pending_invite UNIQUE (community_id, invited_email, status)
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);
CREATE INDEX IF NOT EXISTS idx_communities_type ON communities(type);
CREATE INDEX IF NOT EXISTS idx_communities_location ON communities(location);
CREATE INDEX IF NOT EXISTS idx_communities_is_active ON communities(is_active);

CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_role ON community_members(role);

CREATE INDEX IF NOT EXISTS idx_community_posts_community_id ON community_posts(community_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);

-- Create or replace view
CREATE OR REPLACE VIEW community_details_view AS
SELECT 
  c.*,
  u.username as creator_username,
  u.avatar_url as creator_photo,
  COUNT(DISTINCT cm.user_id) as actual_member_count,
  COUNT(DISTINCT cp.id) as actual_post_count
FROM communities c
LEFT JOIN users u ON c.created_by = u.id
LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.invitation_status = 'active'
LEFT JOIN community_posts cp ON c.id = cp.community_id AND NOT cp.is_hidden
GROUP BY c.id, u.id, u.username, u.avatar_url;

-- Create functions only if they don't exist
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
  INSERT INTO communities (
    name, description, location, type, 
    is_event_based, event_name, event_date, created_by
  )
  VALUES (
    p_name, p_description, p_location, p_type,
    p_is_event_based, p_event_name, p_event_date, p_created_by
  )
  RETURNING id INTO v_community_id;
  
  INSERT INTO community_members (
    community_id, user_id, role, invitation_status
  )
  VALUES (
    v_community_id, p_created_by, 'owner', 'active'
  );
  
  UPDATE communities 
  SET member_count = 1 
  WHERE id = v_community_id;
  
  RETURN v_community_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION join_community(
  p_community_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_community_type VARCHAR;
  v_existing_member BOOLEAN;
BEGIN
  SELECT type INTO v_community_type
  FROM communities 
  WHERE id = p_community_id AND is_active = TRUE;
  
  IF v_community_type IS NULL THEN
    RAISE EXCEPTION 'Community not found or inactive';
  END IF;
  
  IF v_community_type != 'public' THEN
    RAISE EXCEPTION 'Cannot join private community without invitation';
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM community_members 
    WHERE community_id = p_community_id AND user_id = p_user_id
  ) INTO v_existing_member;
  
  IF v_existing_member THEN
    RAISE EXCEPTION 'Already a member of this community';
  END IF;
  
  INSERT INTO community_members (
    community_id, user_id, role, invitation_status
  )
  VALUES (
    p_community_id, p_user_id, 'member', 'active'
  );
  
  UPDATE communities 
  SET member_count = member_count + 1 
  WHERE id = p_community_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS only if not already enabled
DO $$ 
BEGIN
    ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
    ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE community_invites ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Drop existing policies before creating new ones
DROP POLICY IF EXISTS "Communities are viewable by everyone" ON communities;
DROP POLICY IF EXISTS "Users can create communities" ON communities;
DROP POLICY IF EXISTS "Community owners can update their communities" ON communities;
DROP POLICY IF EXISTS "Community members are viewable by community members" ON community_members;
DROP POLICY IF EXISTS "Users can join public communities" ON community_members;
DROP POLICY IF EXISTS "Community posts are viewable by members" ON community_posts;
DROP POLICY IF EXISTS "Community members can create posts" ON community_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON community_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON community_posts;

-- Create RLS policies
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

CREATE POLICY "Community members are viewable by community members" 
  ON community_members FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM communities 
      WHERE id = community_members.community_id 
      AND type = 'public'
    )
    OR
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

-- Grant permissions
GRANT SELECT ON communities TO authenticated;
GRANT INSERT, UPDATE ON communities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON community_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON community_invites TO authenticated;

GRANT SELECT ON community_details_view TO authenticated;
GRANT EXECUTE ON FUNCTION create_community TO authenticated;
GRANT EXECUTE ON FUNCTION join_community TO authenticated;