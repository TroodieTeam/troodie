-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE save_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE save_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_spots ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can view public profiles" ON users;
CREATE POLICY "Users can view public profiles" ON users
    FOR SELECT USING (true);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User relationships policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Anyone can view relationships" ON user_relationships;
CREATE POLICY "Anyone can view relationships" ON user_relationships
    FOR SELECT USING (true);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can create their own follows" ON user_relationships;
CREATE POLICY "Users can create their own follows" ON user_relationships
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can delete their own follows" ON user_relationships;
CREATE POLICY "Users can delete their own follows" ON user_relationships
    FOR DELETE USING (auth.uid() = follower_id);

-- Restaurants policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Anyone can view restaurants" ON restaurants;
CREATE POLICY "Anyone can view restaurants" ON restaurants
    FOR SELECT USING (true);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Authenticated users can create restaurants" ON restaurants;
CREATE POLICY "Authenticated users can create restaurants" ON restaurants
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Restaurant owners can update their restaurants" ON restaurants;
CREATE POLICY "Restaurant owners can update their restaurants" ON restaurants
    FOR UPDATE USING (auth.uid() = owner_id OR is_claimed = false);

-- Boards policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Public boards are viewable by all" ON boards;
CREATE POLICY "Public boards are viewable by all" ON boards
    FOR SELECT USING (type = 'free');

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Private boards viewable by members" ON boards;
CREATE POLICY "Private boards viewable by members" ON boards
    FOR SELECT USING (
        type = 'private' AND (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM board_collaborators
                WHERE board_id = boards.id
                AND user_id = auth.uid()
            )
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Paid boards viewable by subscribers" ON boards;
CREATE POLICY "Paid boards viewable by subscribers" ON boards
    FOR SELECT USING (
        type = 'paid' AND (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM board_subscriptions
                WHERE board_id = boards.id
                AND user_id = auth.uid()
                AND status = 'active'
                AND expires_at > NOW()
            )
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can create boards" ON boards;
CREATE POLICY "Users can create boards" ON boards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Board owners can update their boards" ON boards;
CREATE POLICY "Board owners can update their boards" ON boards
    FOR UPDATE USING (auth.uid() = user_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Board owners can delete their boards" ON boards;
CREATE POLICY "Board owners can delete their boards" ON boards
    FOR DELETE USING (auth.uid() = user_id);

-- Board collaborators policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Board members can view collaborators" ON board_collaborators;
CREATE POLICY "Board members can view collaborators" ON board_collaborators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_id
            AND (boards.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM board_collaborators bc2
                    WHERE bc2.board_id = board_id
                    AND bc2.user_id = auth.uid()
                ))
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Board owners can add collaborators" ON board_collaborators;
CREATE POLICY "Board owners can add collaborators" ON board_collaborators
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_id
            AND boards.user_id = auth.uid()
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Board owners can remove collaborators" ON board_collaborators;
CREATE POLICY "Board owners can remove collaborators" ON board_collaborators
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_id
            AND boards.user_id = auth.uid()
        )
    );

-- Board restaurants policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Anyone can view board restaurants for public boards" ON board_restaurants;
CREATE POLICY "Anyone can view board restaurants for public boards" ON board_restaurants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_id
            AND boards.type = 'free'
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Board members can view board restaurants" ON board_restaurants;
CREATE POLICY "Board members can view board restaurants" ON board_restaurants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_id
            AND (boards.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = board_id
                    AND board_collaborators.user_id = auth.uid()
                ))
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Board members can add restaurants" ON board_restaurants;
CREATE POLICY "Board members can add restaurants" ON board_restaurants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_id
            AND (boards.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = board_id
                    AND board_collaborators.user_id = auth.uid()
                ))
        ) AND auth.uid() = added_by
    );

-- Restaurant saves policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Public saves are viewable by all" ON restaurant_saves;
CREATE POLICY "Public saves are viewable by all" ON restaurant_saves
    FOR SELECT USING (privacy = 'public');

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Friends can view friends-only saves" ON restaurant_saves;
CREATE POLICY "Friends can view friends-only saves" ON restaurant_saves
    FOR SELECT USING (
        privacy = 'friends' AND 
        EXISTS (
            SELECT 1 FROM user_relationships 
            WHERE follower_id = auth.uid() 
            AND following_id = user_id
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can view own saves" ON restaurant_saves;
CREATE POLICY "Users can view own saves" ON restaurant_saves
    FOR SELECT USING (user_id = auth.uid());

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can create own saves" ON restaurant_saves;
CREATE POLICY "Users can create own saves" ON restaurant_saves
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can update own saves" ON restaurant_saves;
CREATE POLICY "Users can update own saves" ON restaurant_saves
    FOR UPDATE USING (user_id = auth.uid());

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can delete own saves" ON restaurant_saves;
CREATE POLICY "Users can delete own saves" ON restaurant_saves
    FOR DELETE USING (user_id = auth.uid());

-- Save boards policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Save owners can manage board associations" ON save_boards;
CREATE POLICY "Save owners can manage board associations" ON save_boards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM restaurant_saves
            WHERE restaurant_saves.id = save_id
            AND restaurant_saves.user_id = auth.uid()
        )
    );

-- Save interactions policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Anyone can view interactions on public saves" ON save_interactions;
CREATE POLICY "Anyone can view interactions on public saves" ON save_interactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM restaurant_saves
            WHERE restaurant_saves.id = save_id
            AND restaurant_saves.privacy = 'public'
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can create interactions" ON save_interactions;
CREATE POLICY "Users can create interactions" ON save_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can delete own interactions" ON save_interactions;
CREATE POLICY "Users can delete own interactions" ON save_interactions
    FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Anyone can view comments on public saves" ON comments;
CREATE POLICY "Anyone can view comments on public saves" ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM restaurant_saves
            WHERE restaurant_saves.id = save_id
            AND restaurant_saves.privacy = 'public'
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- Communities policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Public communities viewable by all" ON communities;
CREATE POLICY "Public communities viewable by all" ON communities
    FOR SELECT USING (type = 'public');

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Community members can view private communities" ON communities;
CREATE POLICY "Community members can view private communities" ON communities
    FOR SELECT USING (
        type IN ('private', 'paid') AND
        EXISTS (
            SELECT 1 FROM community_members
            WHERE community_id = communities.id
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can create communities" ON communities;
CREATE POLICY "Users can create communities" ON communities
    FOR INSERT WITH CHECK (auth.uid() = admin_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Community admins can update" ON communities;
CREATE POLICY "Community admins can update" ON communities
    FOR UPDATE USING (auth.uid() = admin_id);

-- Community members policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Community members can view member list" ON community_members;
CREATE POLICY "Community members can view member list" ON community_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_members cm2
            WHERE cm2.community_id = community_id
            AND cm2.user_id = auth.uid()
            AND cm2.status = 'active'
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can join public communities" ON community_members;
CREATE POLICY "Users can join public communities" ON community_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM communities
            WHERE communities.id = community_id
            AND communities.type = 'public'
        ) AND user_id = auth.uid()
    );

-- Community posts policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Community members can view posts" ON community_posts;
CREATE POLICY "Community members can view posts" ON community_posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_members
            WHERE community_members.community_id = community_id
            AND community_members.user_id = auth.uid()
            AND community_members.status = 'active'
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Community members can create posts" ON community_posts;
CREATE POLICY "Community members can create posts" ON community_posts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM community_members
            WHERE community_members.community_id = community_id
            AND community_members.user_id = auth.uid()
            AND community_members.status = 'active'
        ) AND user_id = auth.uid()
    );

-- Campaigns policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Active campaigns are public" ON campaigns;
CREATE POLICY "Active campaigns are public" ON campaigns
    FOR SELECT USING (status = 'active');

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Campaign parties can view all details" ON campaigns;
CREATE POLICY "Campaign parties can view all details" ON campaigns
    FOR SELECT USING (
        auth.uid() = creator_id OR
        EXISTS (
            SELECT 1 FROM restaurants
            WHERE restaurants.id = restaurant_id
            AND restaurants.owner_id = auth.uid()
        )
    );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Creators and restaurants can create campaigns" ON campaigns;
CREATE POLICY "Creators and restaurants can create campaigns" ON campaigns
    FOR INSERT WITH CHECK (
        auth.uid() = creator_id OR
        EXISTS (
            SELECT 1 FROM restaurants
            WHERE restaurants.id = restaurant_id
            AND restaurants.owner_id = auth.uid()
        )
    );

-- Notifications policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- User preferences policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can create own preferences" ON user_preferences;
CREATE POLICY "Users can create own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User onboarding policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can view own onboarding" ON user_onboarding;
CREATE POLICY "Users can view own onboarding" ON user_onboarding
    FOR SELECT USING (auth.uid() = user_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can create own onboarding" ON user_onboarding;
CREATE POLICY "Users can create own onboarding" ON user_onboarding
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can update own onboarding" ON user_onboarding;
CREATE POLICY "Users can update own onboarding" ON user_onboarding
    FOR UPDATE USING (auth.uid() = user_id);

-- Favorite spots policies
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can view own favorite spots" ON favorite_spots;
CREATE POLICY "Users can view own favorite spots" ON favorite_spots
    FOR SELECT USING (auth.uid() = user_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can create own favorite spots" ON favorite_spots;
CREATE POLICY "Users can create own favorite spots" ON favorite_spots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can delete own favorite spots" ON favorite_spots;
CREATE POLICY "Users can delete own favorite spots" ON favorite_spots
    FOR DELETE USING (auth.uid() = user_id);