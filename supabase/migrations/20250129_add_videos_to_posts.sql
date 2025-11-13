-- Migration: Add videos column to posts table
-- Description: Support video posting capability similar to photos
-- Date: 2025-01-29

-- Add videos column to posts table (array of video URLs, similar to photos)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS videos TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN posts.videos IS 'Array of video URLs for posts, similar to photos array';

