-- Migration: Fix restaurant_id type mismatch in community_posts
-- Description: Changes restaurant_id from VARCHAR to UUID to match restaurants table
-- Author: Claude
-- Date: 2025-01-26

-- First, check if the column exists and what type it is
DO $$ 
BEGIN
    -- Check if community_posts table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'community_posts') THEN
        -- Check if restaurant_id column exists
        IF EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'community_posts' AND column_name = 'restaurant_id') THEN
            
            -- Get the current data type of restaurant_id
            DECLARE
                current_type TEXT;
            BEGIN
                SELECT data_type INTO current_type
                FROM information_schema.columns
                WHERE table_name = 'community_posts' AND column_name = 'restaurant_id';
                
                -- If it's character varying (VARCHAR), we need to change it to UUID
                IF current_type = 'character varying' THEN
                    -- First drop the foreign key constraint if it exists
                    ALTER TABLE community_posts 
                    DROP CONSTRAINT IF EXISTS community_posts_restaurant_id_fkey;
                    
                    -- Remove the column and add it back as UUID
                    -- This is safer than trying to cast VARCHAR to UUID
                    ALTER TABLE community_posts DROP COLUMN restaurant_id;
                    
                    -- Add the column back as UUID with proper foreign key
                    ALTER TABLE community_posts 
                    ADD COLUMN restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;
                    
                    -- Create index for performance
                    CREATE INDEX IF NOT EXISTS idx_community_posts_restaurant_id 
                    ON community_posts(restaurant_id);
                    
                    RAISE NOTICE 'Successfully changed restaurant_id from VARCHAR to UUID';
                END IF;
            END;
        ELSE
            -- Column doesn't exist, add it as UUID
            ALTER TABLE community_posts 
            ADD COLUMN restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;
            
            -- Create index for performance
            CREATE INDEX IF NOT EXISTS idx_community_posts_restaurant_id 
            ON community_posts(restaurant_id);
            
            RAISE NOTICE 'Added restaurant_id column as UUID';
        END IF;
    END IF;
END $$;

-- Also update the community details view to ensure it works with the new type
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