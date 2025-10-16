-- ============================================
-- Demo Session Tracking Setup
-- ============================================
-- Run this query in Supabase SQL Editor (one time setup)
-- This adds demo_session_id columns to relevant tables
-- for tracking and cleaning up demo data
-- ============================================

-- Boards table
ALTER TABLE boards
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_boards_demo_session
ON boards(demo_session_id)
WHERE demo_session_id IS NOT NULL;

COMMENT ON COLUMN boards.demo_session_id IS 'Session ID for demo/test data. NULL for real data. Used for cleanup.';

-- Restaurant saves table
ALTER TABLE restaurant_saves
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_restaurant_saves_demo_session
ON restaurant_saves(demo_session_id)
WHERE demo_session_id IS NOT NULL;

COMMENT ON COLUMN restaurant_saves.demo_session_id IS 'Session ID for demo/test data. NULL for real data. Used for cleanup.';

-- Posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_demo_session
ON posts(demo_session_id)
WHERE demo_session_id IS NOT NULL;

COMMENT ON COLUMN posts.demo_session_id IS 'Session ID for demo/test data. NULL for real data. Used for cleanup.';

-- Board restaurants (junction table)
ALTER TABLE board_restaurants
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_board_restaurants_demo_session
ON board_restaurants(demo_session_id)
WHERE demo_session_id IS NOT NULL;

COMMENT ON COLUMN board_restaurants.demo_session_id IS 'Session ID for demo/test data. NULL for real data. Used for cleanup.';

-- User relationships table
ALTER TABLE user_relationships
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_relationships_demo_session
ON user_relationships(demo_session_id)
WHERE demo_session_id IS NOT NULL;

COMMENT ON COLUMN user_relationships.demo_session_id IS 'Session ID for demo/test data. NULL for real data. Used for cleanup.';
