-- Fix critical schema issues that are preventing cross-posting from working
-- This migration addresses foreign key mismatches and data type inconsistencies

-- 1. Fix posts.restaurant_id data type (should be UUID, not VARCHAR)
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

-- 2. Now safely change the data type
ALTER TABLE posts 
ALTER COLUMN restaurant_id TYPE uuid USING restaurant_id::uuid;

-- 3. Add the missing foreign key constraint for restaurant_id
ALTER TABLE posts
ADD CONSTRAINT posts_restaurant_id_fkey 
FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE SET NULL;

-- 4. Ensure post_communities table has proper constraints and indexes
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

-- 5. Verify foreign key relationships in post_communities
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

-- 6. Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_communities_post_id ON post_communities(post_id);
CREATE INDEX IF NOT EXISTS idx_post_communities_community_id ON post_communities(community_id);
CREATE INDEX IF NOT EXISTS idx_post_communities_added_by ON post_communities(added_by);
CREATE INDEX IF NOT EXISTS idx_post_communities_added_at ON post_communities(added_at);

-- 7. Verify data integrity
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

-- 8. Update RLS policies to ensure they work correctly
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

-- 9. Add helpful comments
COMMENT ON TABLE post_communities IS 'Links posts to communities for cross-posting functionality';
COMMENT ON COLUMN post_communities.post_id IS 'References posts.id - the post being shared';
COMMENT ON COLUMN post_communities.community_id IS 'References communities.id - the community the post is shared to';
COMMENT ON COLUMN post_communities.added_by IS 'References users.id - user who cross-posted the content';
COMMENT ON COLUMN post_communities.added_at IS 'When the post was shared to the community';

-- 10. Final verification
DO $$
BEGIN
    RAISE NOTICE 'Schema fix completed successfully!';
    RAISE NOTICE 'Posts table restaurant_id is now UUID type with proper foreign key';
    RAISE NOTICE 'Post_communities table has proper constraints and indexes';
    RAISE NOTICE 'RLS policies updated for better compatibility';
END $$;