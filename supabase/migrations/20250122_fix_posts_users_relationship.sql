-- Migration: Fix posts-users relationship
-- Description: Ensure posts table has proper foreign key to users table
-- Author: Claude
-- Date: 2025-01-22

-- First check if posts table exists
DO $$
BEGIN
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'posts_user_id_fkey' 
    AND table_name = 'posts'
  ) THEN
    -- Check if user_id column exists in posts
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'posts' 
      AND column_name = 'user_id'
    ) THEN
      -- Add foreign key constraint
      ALTER TABLE posts
      ADD CONSTRAINT posts_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES users(id) 
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Create posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  restaurant_id VARCHAR(255) NOT NULL,
  caption TEXT,
  photos TEXT[],
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  visit_date DATE,
  price_range VARCHAR(4),
  visit_type VARCHAR(50),
  tags TEXT[],
  privacy VARCHAR(20) DEFAULT 'public',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  is_trending BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_restaurant_id ON posts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_trending ON posts(is_trending);
CREATE INDEX IF NOT EXISTS idx_posts_privacy ON posts(privacy);

-- Enable RLS if not already enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view public posts" ON posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Create RLS policies
CREATE POLICY "Users can view public posts" ON posts
  FOR SELECT USING (privacy = 'public' OR user_id = auth.uid());

CREATE POLICY "Users can create their own posts" ON posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (user_id = auth.uid());