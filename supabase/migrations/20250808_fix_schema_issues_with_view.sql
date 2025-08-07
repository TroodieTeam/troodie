-- Fix critical schema issues that are preventing cross-posting from working
-- This migration addresses foreign key mismatches and data type inconsistencies
-- AND handles the activity_feed view dependency

-- Step 1: Drop the activity_feed view and related function first
DROP FUNCTION IF EXISTS get_activity_feed(UUID, VARCHAR, INT, INT, TIMESTAMPTZ) CASCADE;
DROP VIEW IF EXISTS public.activity_feed CASCADE;

-- Step 2: Fix posts.restaurant_id data type (should be UUID, not VARCHAR)
-- First check if there are any non-UUID values in restaurant_id
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Check for non-UUID restaurant_id values
    SELECT COUNT(*) INTO invalid_count
    FROM posts 
    WHERE restaurant_id IS NOT NULL 
    AND restaurant_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
    
    RAISE NOTICE 'Found % invalid restaurant_id values in posts table', invalid_count;
    
    -- If there are invalid values, set them to NULL
    IF invalid_count > 0 THEN
        UPDATE posts 
        SET restaurant_id = NULL 
        WHERE restaurant_id IS NOT NULL 
        AND restaurant_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
        
        RAISE NOTICE 'Set % invalid restaurant_id values to NULL', invalid_count;
    END IF;
END $$;

-- Step 3: Now safely change the data type
ALTER TABLE posts 
ALTER COLUMN restaurant_id TYPE uuid USING restaurant_id::uuid;

-- Step 4: Add the missing foreign key constraint for restaurant_id
ALTER TABLE posts
ADD CONSTRAINT posts_restaurant_id_fkey 
FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE SET NULL;

-- Step 5: Ensure post_communities table has proper constraints and indexes
-- Check if unique constraint exists
DO $$
BEGIN
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'post_communities_post_community_unique'
    ) THEN
        ALTER TABLE post_communities 
        ADD CONSTRAINT post_communities_post_community_unique 
        UNIQUE (post_id, community_id);
        
        RAISE NOTICE 'Added unique constraint to post_communities';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on post_communities';
    END IF;
END $$;

-- Step 6: Verify foreign key relationships in post_communities
-- These should already exist but let's make sure they're correct
DO $$
BEGIN
    -- Check if foreign keys exist, if not add them
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'post_communities_post_id_fkey' 
        AND table_name = 'post_communities'
    ) THEN
        ALTER TABLE post_communities
        ADD CONSTRAINT post_communities_post_id_fkey 
        FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added post_id foreign key to post_communities';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'post_communities_community_id_fkey' 
        AND table_name = 'post_communities'
    ) THEN
        ALTER TABLE post_communities
        ADD CONSTRAINT post_communities_community_id_fkey 
        FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added community_id foreign key to post_communities';
    END IF;
    
    -- For added_by, we need to ensure it references the correct users table
    -- Most of your app seems to use public.users, so let's use that
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'post_communities_added_by_fkey' 
        AND table_name = 'post_communities'
    ) THEN
        ALTER TABLE post_communities
        ADD CONSTRAINT post_communities_added_by_fkey 
        FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added added_by foreign key to post_communities';
    END IF;
END $$;

-- Step 7: Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_communities_post_id ON post_communities(post_id);
CREATE INDEX IF NOT EXISTS idx_post_communities_community_id ON post_communities(community_id);
CREATE INDEX IF NOT EXISTS idx_post_communities_added_by ON post_communities(added_by);
CREATE INDEX IF NOT EXISTS idx_post_communities_added_at ON post_communities(added_at);

-- Step 8: Verify data integrity
-- Check for orphaned records in post_communities
DO $$
DECLARE
    orphaned_posts INTEGER;
    orphaned_communities INTEGER;
    orphaned_users INTEGER;
BEGIN
    -- Check for posts that don't exist
    SELECT COUNT(*) INTO orphaned_posts
    FROM post_communities pc
    LEFT JOIN posts p ON p.id = pc.post_id
    WHERE p.id IS NULL;
    
    -- Check for communities that don't exist
    SELECT COUNT(*) INTO orphaned_communities
    FROM post_communities pc
    LEFT JOIN communities c ON c.id = pc.community_id
    WHERE c.id IS NULL;
    
    -- Check for users that don't exist
    SELECT COUNT(*) INTO orphaned_users
    FROM post_communities pc
    LEFT JOIN users u ON u.id = pc.added_by
    WHERE u.id IS NULL;
    
    RAISE NOTICE 'Data integrity check:';
    RAISE NOTICE '  Orphaned posts in post_communities: %', orphaned_posts;
    RAISE NOTICE '  Orphaned communities in post_communities: %', orphaned_communities;
    RAISE NOTICE '  Orphaned users in post_communities: %', orphaned_users;
    
    -- Clean up orphaned records if any exist
    IF orphaned_posts > 0 OR orphaned_communities > 0 OR orphaned_users > 0 THEN
        DELETE FROM post_communities 
        WHERE post_id NOT IN (SELECT id FROM posts)
        OR community_id NOT IN (SELECT id FROM communities)
        OR added_by NOT IN (SELECT id FROM users);
        
        RAISE NOTICE 'Cleaned up orphaned records in post_communities';
    END IF;
END $$;

-- Step 9: Update RLS policies to ensure they work correctly
DROP POLICY IF EXISTS "Users can view post_communities" ON post_communities;
DROP POLICY IF EXISTS "Users can add their posts to communities" ON post_communities;
DROP POLICY IF EXISTS "Users can remove their posts from communities" ON post_communities;

-- Create updated RLS policies
CREATE POLICY "Users can view post_communities" ON post_communities
  FOR SELECT USING (true);

CREATE POLICY "Users can add their posts to communities" ON post_communities
  FOR INSERT WITH CHECK (
    added_by = auth.uid()::uuid 
    AND EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_id 
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove their posts from communities" ON post_communities
  FOR DELETE USING (
    added_by = auth.uid()::uuid
    OR EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_id 
      AND posts.user_id = auth.uid()
    )
  );

-- Step 10: Recreate the activity_feed view with corrected UUID references
CREATE OR REPLACE VIEW public.activity_feed AS
-- Posts (Reviews)
SELECT 
  'post'::text as activity_type,
  p.id as activity_id,
  p.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  'created a review'::text as action,
  r.name::text as target_name,
  r.id as target_id,
  'restaurant'::text as target_type,
  p.rating,
  p.caption::text as content,
  p.photos,
  NULL::uuid as related_user_id,
  NULL::text as related_user_name,
  NULL::text as related_user_username,
  NULL::text as related_user_avatar,
  p.privacy::text as privacy,
  p.created_at,
  p.restaurant_id::uuid as restaurant_id,  -- Now correctly UUID
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN restaurants r ON p.restaurant_id = r.id  -- LEFT JOIN for simple posts
WHERE p.privacy = 'public'

UNION ALL

-- Restaurant Saves
SELECT 
  'save'::text as activity_type,
  rs.id as activity_id,
  rs.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  'saved'::text as action,
  r.name::text as target_name,
  r.id as target_id,
  'restaurant'::text as target_type,
  rs.personal_rating as rating,
  rs.notes::text as content,
  rs.photos,
  NULL::uuid as related_user_id,
  NULL::text as related_user_name,
  NULL::text as related_user_username,
  NULL::text as related_user_avatar,
  rs.privacy::text as privacy,
  rs.created_at,
  rs.restaurant_id::uuid as restaurant_id,  -- Already UUID
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM restaurant_saves rs
JOIN users u ON rs.user_id = u.id
JOIN restaurants r ON rs.restaurant_id = r.id
WHERE rs.privacy = 'public'

UNION ALL

-- Follows
SELECT 
  'follow'::text as activity_type,
  ur.id as activity_id,
  ur.follower_id as actor_id,
  u1.name::text as actor_name,
  u1.username::text as actor_username,
  u1.avatar_url::text as actor_avatar,
  u1.is_verified as actor_is_verified,
  'started following'::text as action,
  u2.name::text as target_name,
  ur.following_id as target_id,
  'user'::text as target_type,
  NULL::decimal as rating,
  NULL::text as content,
  NULL::text[] as photos,
  ur.following_id as related_user_id,
  u2.name::text as related_user_name,
  u2.username::text as related_user_username,
  u2.avatar_url::text as related_user_avatar,
  'public'::text as privacy,
  ur.created_at,
  NULL::uuid as restaurant_id,  -- NULL UUID instead of TEXT
  NULL::text[] as cuisine_types,
  NULL::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM user_relationships ur
JOIN users u1 ON ur.follower_id = u1.id
JOIN users u2 ON ur.following_id = u2.id

UNION ALL

-- Community Joins
SELECT 
  'community_join'::text as activity_type,
  cm.id as activity_id,
  cm.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  'joined community'::text as action,
  c.name::text as target_name,
  c.id as target_id,
  'community'::text as target_type,
  NULL::decimal as rating,
  c.description::text as content,
  ARRAY[c.cover_image_url]::text[] as photos,
  NULL::uuid as related_user_id,
  NULL::text as related_user_name,
  NULL::text as related_user_username,
  NULL::text as related_user_avatar,
  'public'::text as privacy,
  cm.joined_at as created_at,
  NULL::uuid as restaurant_id,  -- NULL UUID instead of TEXT
  NULL::text[] as cuisine_types,
  c.location::text as restaurant_location,
  c.id as community_id,
  c.name::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM community_members cm
JOIN users u ON cm.user_id = u.id
JOIN communities c ON cm.community_id = c.id
WHERE cm.status = 'active' AND c.type = 'public'

UNION ALL

-- Post Likes
SELECT 
  'like'::text as activity_type,
  pl.id as activity_id,
  pl.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  'liked a review'::text as action,
  COALESCE(r.name, 'Simple Post')::text as target_name,  -- Handle simple posts
  p.id as target_id,
  'post'::text as target_type,
  p.rating,
  p.caption::text as content,
  p.photos,
  p.user_id as related_user_id,
  u2.name::text as related_user_name,
  u2.username::text as related_user_username,
  u2.avatar_url::text as related_user_avatar,
  p.privacy::text as privacy,
  pl.created_at,
  p.restaurant_id::uuid as restaurant_id,  -- Now correctly UUID
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM post_likes pl
JOIN users u ON pl.user_id = u.id
JOIN posts p ON pl.post_id = p.id
LEFT JOIN restaurants r ON p.restaurant_id = r.id  -- LEFT JOIN for simple posts
JOIN users u2 ON p.user_id = u2.id
WHERE p.privacy = 'public'

UNION ALL

-- Comments
SELECT 
  'comment'::text as activity_type,
  pc.id as activity_id,
  pc.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  'commented on'::text as action,
  COALESCE(r.name, 'Simple Post')::text as target_name,  -- Handle simple posts
  p.id as target_id,
  'post'::text as target_type,
  p.rating,
  pc.content::text,
  p.photos,
  p.user_id as related_user_id,
  u2.name::text as related_user_name,
  u2.username::text as related_user_username,
  u2.avatar_url::text as related_user_avatar,
  p.privacy::text as privacy,
  pc.created_at,
  p.restaurant_id::uuid as restaurant_id,  -- Now correctly UUID
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM post_comments pc
JOIN users u ON pc.user_id = u.id
JOIN posts p ON pc.post_id = p.id
LEFT JOIN restaurants r ON p.restaurant_id = r.id  -- LEFT JOIN for simple posts
JOIN users u2 ON p.user_id = u2.id
WHERE p.privacy = 'public'

ORDER BY created_at DESC;

-- Step 11: Recreate the activity feed function with corrected UUID type
CREATE OR REPLACE FUNCTION get_activity_feed(
  p_user_id UUID DEFAULT NULL,
  p_filter VARCHAR DEFAULT 'all', -- 'all' or 'friends'
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_after_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  activity_type TEXT,
  activity_id UUID,
  actor_id UUID,
  actor_name TEXT,
  actor_username TEXT,
  actor_avatar TEXT,
  actor_is_verified BOOLEAN,
  action TEXT,
  target_name TEXT,
  target_id UUID,
  target_type TEXT,
  rating DECIMAL,
  content TEXT,
  photos TEXT[],
  related_user_id UUID,
  related_user_name TEXT,
  related_user_username TEXT,
  related_user_avatar TEXT,
  privacy TEXT,
  created_at TIMESTAMPTZ,
  restaurant_id UUID,  -- Changed from VARCHAR to UUID
  cuisine_types TEXT[],
  restaurant_location TEXT,
  community_id UUID,
  community_name TEXT,
  board_id UUID,
  board_name TEXT
) AS $$
BEGIN
  IF p_filter = 'friends' AND p_user_id IS NOT NULL THEN
    -- Return only activities from friends
    RETURN QUERY
    SELECT af.*
    FROM activity_feed af
    WHERE (
      -- Activities from users I follow
      af.actor_id IN (
        SELECT following_id 
        FROM user_relationships 
        WHERE follower_id = p_user_id
      )
      -- Or my own activities
      OR af.actor_id = p_user_id
    )
    AND (p_after_timestamp IS NULL OR af.created_at > p_after_timestamp)
    ORDER BY af.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    -- Return all public activities
    RETURN QUERY
    SELECT af.*
    FROM activity_feed af
    WHERE (p_after_timestamp IS NULL OR af.created_at > p_after_timestamp)
    ORDER BY af.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_privacy ON posts(privacy);
CREATE INDEX IF NOT EXISTS idx_restaurant_saves_created_at ON restaurant_saves(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restaurant_saves_privacy ON restaurant_saves(privacy);
CREATE INDEX IF NOT EXISTS idx_user_relationships_created_at ON user_relationships(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_members_joined_at ON community_members(joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);

-- Step 13: Grant permissions
GRANT SELECT ON public.activity_feed TO authenticated;
GRANT SELECT ON public.activity_feed TO anon;
GRANT EXECUTE ON FUNCTION get_activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_feed TO anon;

-- Step 14: Add helpful comments
COMMENT ON TABLE post_communities IS 'Links posts to communities for cross-posting functionality';
COMMENT ON COLUMN post_communities.post_id IS 'References posts.id - the post being shared';
COMMENT ON COLUMN post_communities.community_id IS 'References communities.id - the community the post is shared to';
COMMENT ON COLUMN post_communities.added_by IS 'References users.id - user who cross-posted the content';
COMMENT ON COLUMN post_communities.added_at IS 'When the post was shared to the community';

-- Step 15: Final verification
DO $$
BEGIN
    RAISE NOTICE 'Schema fix completed successfully!';
    RAISE NOTICE 'Posts table restaurant_id is now UUID type with proper foreign key';
    RAISE NOTICE 'Post_communities table has proper constraints and indexes';
    RAISE NOTICE 'Activity_feed view recreated with UUID restaurant_id';
    RAISE NOTICE 'RLS policies updated for better compatibility';
END $$;