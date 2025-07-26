-- Migration: Simple RLS policies for Communities
-- Description: Alternative RLS policies that avoid recursion
-- Author: Claude
-- Date: 2025-01-26

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Community members are viewable by community members" ON community_members;
DROP POLICY IF EXISTS "Community posts are viewable by members" ON community_posts;
DROP POLICY IF EXISTS "Community members can create posts" ON community_posts;

-- Drop communities policies that might cause recursion
DROP POLICY IF EXISTS "Community owners can update their communities" ON communities;

-- Create simpler policies that avoid recursion

-- Community members - simpler approach
CREATE POLICY "Community members viewable by anyone for public communities" 
  ON community_members FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM communities 
      WHERE id = community_members.community_id 
      AND type = 'public'
    )
  );

CREATE POLICY "Community members viewable by member for private communities" 
  ON community_members FOR SELECT 
  USING (
    community_members.user_id = auth.uid()
  );

-- For viewing other members in private communities, use a function
CREATE OR REPLACE FUNCTION can_view_community_members(p_community_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is a member of the community
  RETURN EXISTS (
    SELECT 1 FROM community_members 
    WHERE community_id = p_community_id 
    AND user_id = auth.uid() 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Communities - fix the update policy to avoid recursion
CREATE POLICY "Community owners can update their communities" 
  ON communities FOR UPDATE 
  USING (
    created_by = auth.uid() OR admin_id = auth.uid()
  );

-- Community posts - avoid recursion by checking membership directly
CREATE POLICY "Community posts viewable by members" 
  ON community_posts FOR SELECT 
  USING (
    (is_hidden IS NOT TRUE OR is_hidden IS NULL) 
    AND (
      -- Public community posts
      EXISTS (
        SELECT 1 FROM communities 
        WHERE id = community_posts.community_id 
        AND type = 'public'
      )
      OR
      -- Private community posts - check membership directly
      EXISTS (
        SELECT 1 FROM community_members
        WHERE community_id = community_posts.community_id 
        AND user_id = auth.uid() 
        AND status = 'active'
        LIMIT 1
      )
    )
  );

CREATE POLICY "Community members can create posts" 
  ON community_posts FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_posts.community_id 
      AND user_id = auth.uid() 
      AND status = 'active'
      LIMIT 1
    )
  );

-- Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION can_view_community_members TO authenticated;