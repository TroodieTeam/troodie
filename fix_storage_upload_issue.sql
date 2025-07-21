-- Fix infinite recursion in community_members RLS policies
-- Run these commands in your Supabase SQL Editor

-- Drop the problematic policies first
DROP POLICY IF EXISTS "Community members can view member list" ON community_members;
DROP POLICY IF EXISTS "Users can join public communities" ON community_members;

-- Recreate simplified policies without circular references
CREATE POLICY "Community members can view member list" ON community_members
    FOR SELECT USING (true);

CREATE POLICY "Users can join public communities" ON community_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM communities
            WHERE communities.id = community_id
            AND communities.type = 'public'
        )
    );

CREATE POLICY "Users can leave communities" ON community_members
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can update own membership" ON community_members
    FOR UPDATE USING (user_id = auth.uid());

-- Also fix the community_posts policy that references community_members
DROP POLICY IF EXISTS "Community members can view posts" ON community_posts;
DROP POLICY IF EXISTS "Community members can create posts" ON community_posts;

CREATE POLICY "Community members can view posts" ON community_posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_members
            WHERE community_members.community_id = community_posts.community_id
            AND community_members.user_id = auth.uid()
            AND community_members.status = 'active'
        )
    );

CREATE POLICY "Community members can create posts" ON community_posts
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM community_members
            WHERE community_members.community_id = community_posts.community_id
            AND community_members.user_id = auth.uid()
            AND community_members.status = 'active'
        )
    ); 