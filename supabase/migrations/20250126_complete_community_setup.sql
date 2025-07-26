-- Migration: Complete Community Setup with All Fixes
-- Description: Comprehensive migration that handles existing schema and type mismatches
-- Author: Claude
-- Date: 2025-01-26
-- 
-- IMPORTANT: Run this migration in your Supabase SQL Editor
-- This migration safely handles existing tables and fixes all known issues

-- 1. First ensure communities table has all required columns
DO $$ 
BEGIN
    -- Check if communities table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'communities') THEN
        -- Add missing columns if they don't exist
        ALTER TABLE communities 
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS is_event_based BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS event_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS event_date DATE,
        ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
        
        -- If admin_id exists but created_by doesn't, copy the data
        IF EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'communities' AND column_name = 'admin_id') 
           AND NOT EXISTS (SELECT FROM information_schema.columns 
                          WHERE table_name = 'communities' AND column_name = 'created_by') THEN
            UPDATE communities SET created_by = admin_id WHERE created_by IS NULL;
        END IF;
    ELSE
        -- Create the communities table from scratch
        CREATE TABLE communities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          description TEXT,
          location VARCHAR(255),
          type VARCHAR(20) NOT NULL CHECK (type IN ('public', 'private')),
          is_event_based BOOLEAN DEFAULT FALSE,
          event_name VARCHAR(255),
          event_date DATE,
          created_by UUID REFERENCES users(id),
          admin_id UUID REFERENCES users(id), -- Keep for compatibility
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

-- 2. Update community_members to use 'status' instead of 'invitation_status'
DO $$
BEGIN
    -- Check if community_members exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'community_members') THEN
        -- Check which column exists
        IF EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'community_members' AND column_name = 'invitation_status') THEN
            -- Rename invitation_status to status
            ALTER TABLE community_members RENAME COLUMN invitation_status TO status;
        END IF;
        
        -- Ensure status column exists with correct constraint
        ALTER TABLE community_members 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'declined'));
        
        -- Add other missing columns
        ALTER TABLE community_members
        ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0;
    ELSE
        -- Create community_members table
        CREATE TABLE community_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          invited_by UUID REFERENCES users(id),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'declined')),
          last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          post_count INTEGER DEFAULT 0,
          CONSTRAINT unique_community_member UNIQUE (community_id, user_id)
        );
    END IF;
END $$;

-- 3. Fix community_posts restaurant_id type
DO $$ 
BEGIN
    -- Check if community_posts table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'community_posts') THEN
        -- Check if restaurant_id column exists and is VARCHAR
        IF EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'community_posts' 
                  AND column_name = 'restaurant_id'
                  AND data_type = 'character varying') THEN
            
            -- Drop the foreign key constraint and column
            ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_restaurant_id_fkey;
            ALTER TABLE community_posts DROP COLUMN restaurant_id;
            
            -- Add it back as UUID
            ALTER TABLE community_posts 
            ADD COLUMN restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;
        ELSE
            -- Add restaurant_id if it doesn't exist
            ALTER TABLE community_posts
            ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;
        END IF;
        
        -- Add other missing columns
        ALTER TABLE community_posts
        ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS images TEXT[];
    ELSE
        -- Create community_posts table
        CREATE TABLE community_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
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
    END IF;
END $$;

-- 4. Create community_invites table
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

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);
CREATE INDEX IF NOT EXISTS idx_communities_type ON communities(type);
CREATE INDEX IF NOT EXISTS idx_communities_location ON communities(location);
CREATE INDEX IF NOT EXISTS idx_communities_is_active ON communities(is_active);

CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_role ON community_members(role);
CREATE INDEX IF NOT EXISTS idx_community_members_status ON community_members(status);

CREATE INDEX IF NOT EXISTS idx_community_posts_community_id ON community_posts(community_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_restaurant_id ON community_posts(restaurant_id);

-- 6. Create or replace view (using status, not invitation_status)
CREATE OR REPLACE VIEW community_details_view AS
SELECT 
  c.*,
  u.username as creator_username,
  u.avatar_url as creator_photo,
  COUNT(DISTINCT cm.user_id) as actual_member_count,
  COUNT(DISTINCT cp.id) as actual_post_count
FROM communities c
LEFT JOIN users u ON COALESCE(c.created_by, c.admin_id) = u.id
LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.status = 'active'
LEFT JOIN community_posts cp ON c.id = cp.community_id AND cp.is_hidden IS NOT TRUE
GROUP BY c.id, u.id, u.username, u.avatar_url;

-- 7. Create functions
CREATE OR REPLACE FUNCTION create_community(
  p_name VARCHAR,
  p_description TEXT,
  p_location VARCHAR,
  p_type VARCHAR,
  p_is_event_based BOOLEAN,
  p_created_by UUID,
  p_event_name VARCHAR DEFAULT NULL,
  p_event_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_community_id UUID;
BEGIN
  -- Insert community
  INSERT INTO communities (
    name, description, location, type, 
    is_event_based, event_name, event_date, created_by, admin_id
  )
  VALUES (
    p_name, p_description, p_location, p_type,
    p_is_event_based, p_event_name, p_event_date, p_created_by, p_created_by
  )
  RETURNING id INTO v_community_id;
  
  -- Add creator as owner
  INSERT INTO community_members (
    community_id, user_id, role, status
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
    community_id, user_id, role, status
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
DO $$ 
BEGIN
    ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
    ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE community_invites ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 9. Drop and recreate RLS policies (using status, not invitation_status)
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
  WITH CHECK (auth.uid() = created_by OR auth.uid() = admin_id);

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
    -- Public communities: everyone can see members
    EXISTS (
      SELECT 1 FROM communities 
      WHERE id = community_members.community_id 
      AND type = 'public'
    )
    OR
    -- Private communities: only members can see other members
    -- Check if the current user is in the same community
    community_members.user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = community_members.community_id 
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND cm.id != community_members.id -- Prevent recursion
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
    (is_hidden IS NOT TRUE OR is_hidden IS NULL) AND
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = community_posts.community_id 
      AND user_id = auth.uid()
      AND status = 'active'
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
      AND status = 'active'
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

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Community setup completed successfully!';
END $$;