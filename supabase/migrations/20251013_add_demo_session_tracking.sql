-- Migration: Add demo_session_id for tracking demo data
-- Purpose: Allow tagging and cleanup of demo/test data for real user accounts
-- Date: 2025-10-13

-- Add demo_session_id column to relevant tables
-- This column will be NULL for real data and populated for demo data

-- Boards table
ALTER TABLE boards
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_boards_demo_session
ON boards(demo_session_id)
WHERE demo_session_id IS NOT NULL;

-- Restaurant saves table
ALTER TABLE restaurant_saves
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_restaurant_saves_demo_session
ON restaurant_saves(demo_session_id)
WHERE demo_session_id IS NOT NULL;

-- Posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_demo_session
ON posts(demo_session_id)
WHERE demo_session_id IS NOT NULL;

-- Board restaurants (junction table)
ALTER TABLE board_restaurants
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_board_restaurants_demo_session
ON board_restaurants(demo_session_id)
WHERE demo_session_id IS NOT NULL;

-- User relationships table
ALTER TABLE user_relationships
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_relationships_demo_session
ON user_relationships(demo_session_id)
WHERE demo_session_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN boards.demo_session_id IS 'Session ID for demo/test data. NULL for real data. Used for cleanup.';
COMMENT ON COLUMN restaurant_saves.demo_session_id IS 'Session ID for demo/test data. NULL for real data. Used for cleanup.';
COMMENT ON COLUMN posts.demo_session_id IS 'Session ID for demo/test data. NULL for real data. Used for cleanup.';
COMMENT ON COLUMN board_restaurants.demo_session_id IS 'Session ID for demo/test data. NULL for real data. Used for cleanup.';
COMMENT ON COLUMN user_relationships.demo_session_id IS 'Session ID for demo/test data. NULL for real data. Used for cleanup.';
