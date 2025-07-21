-- Step-by-step fix for storage upload issues
-- Run these commands one section at a time in your Supabase SQL Editor

-- STEP 1: Fix community_members policies
-- Run this section first
DROP POLICY IF EXISTS "Community members can view member list" ON community_members;
DROP POLICY IF EXISTS "Users can join public communities" ON community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;
DROP POLICY IF EXISTS "Users can update own membership" ON community_members;

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

-- STEP 2: Fix board_collaborators policies
-- Run this section second
DROP POLICY IF EXISTS "Board members can view collaborators" ON board_collaborators;
DROP POLICY IF EXISTS "Board owners can add collaborators" ON board_collaborators;
DROP POLICY IF EXISTS "Board owners can remove collaborators" ON board_collaborators;
DROP POLICY IF EXISTS "Collaborators can update own membership" ON board_collaborators;

CREATE POLICY "Board members can view collaborators" ON board_collaborators
    FOR SELECT USING (true);

CREATE POLICY "Board owners can add collaborators" ON board_collaborators
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_id
            AND boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Board owners can remove collaborators" ON board_collaborators
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_id
            AND boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Collaborators can update own membership" ON board_collaborators
    FOR UPDATE USING (user_id = auth.uid());

-- STEP 3: Fix board_restaurants policies
-- Run this section third
DROP POLICY IF EXISTS "Board members can view board restaurants" ON board_restaurants;
DROP POLICY IF EXISTS "Board members can add restaurants" ON board_restaurants;

CREATE POLICY "Board members can view board restaurants" ON board_restaurants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_id
            AND boards.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM board_collaborators
            WHERE board_collaborators.board_id = board_restaurants.board_id
            AND board_collaborators.user_id = auth.uid()
        )
    );

CREATE POLICY "Board members can add restaurants" ON board_restaurants
    FOR INSERT WITH CHECK (
        auth.uid() = added_by AND (
            EXISTS (
                SELECT 1 FROM boards
                WHERE boards.id = board_id
                AND boards.user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM board_collaborators
                WHERE board_collaborators.board_id = board_restaurants.board_id
                AND board_collaborators.user_id = auth.uid()
            )
        )
    );

-- STEP 4: Fix community_posts policies
-- Run this section fourth
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

-- STEP 5: Fix storage policies
-- Run this section last
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    ); 