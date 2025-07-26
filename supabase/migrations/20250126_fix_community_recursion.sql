-- Migration: Fix infinite recursion in community policies
-- Description: Replace recursive policies with simpler alternatives
-- Author: Claude
-- Date: 2025-01-26

-- Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Community members are viewable by community members" ON community_members;
DROP POLICY IF EXISTS "Community members viewable by anyone for public communities" ON community_members;
DROP POLICY IF EXISTS "Community members viewable by member for private communities" ON community_members;
DROP POLICY IF EXISTS "Community owners can update their communities" ON communities;
DROP POLICY IF EXISTS "Community admins can update" ON communities;
DROP POLICY IF EXISTS "Communities are viewable by everyone" ON communities;
DROP POLICY IF EXISTS "Users can create communities" ON communities;
DROP POLICY IF EXISTS "Public communities viewable by all" ON communities;
DROP POLICY IF EXISTS "Community members can view private communities" ON communities;
DROP POLICY IF EXISTS "Users can join public communities" ON community_members;
DROP POLICY IF EXISTS "Community posts are viewable by members" ON community_posts;
DROP POLICY IF EXISTS "Community members can create posts" ON community_posts;
DROP POLICY IF EXISTS "Community posts viewable by members" ON community_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON community_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON community_posts;

-- Create safe, non-recursive policies for communities
CREATE POLICY "Communities are viewable by everyone" 
  ON communities FOR SELECT 
  USING (is_active = TRUE);

CREATE POLICY "Users can create communities" 
  ON communities FOR INSERT 
  WITH CHECK (auth.uid() = created_by OR auth.uid() = admin_id);

CREATE POLICY "Community owners can update their communities" 
  ON communities FOR UPDATE 
  USING (created_by = auth.uid() OR admin_id = auth.uid());

-- Create safe policies for community_members
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
  USING (community_members.user_id = auth.uid());

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

-- Create safe policies for community_posts
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

CREATE POLICY "Users can update their own posts" 
  ON community_posts FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts" 
  ON community_posts FOR DELETE 
  USING (user_id = auth.uid());

-- Create a function for checking membership without recursion
CREATE OR REPLACE FUNCTION is_community_member(p_community_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM community_members 
    WHERE community_id = p_community_id 
    AND user_id = auth.uid() 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_community_member TO authenticated; 