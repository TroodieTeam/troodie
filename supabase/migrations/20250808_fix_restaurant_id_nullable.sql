-- Fix restaurant_id to be nullable for simple posts
-- This ensures simple posts can be created without a restaurant

-- First, check if the column is still NOT NULL and fix it
DO $$ 
BEGIN
  -- Check if restaurant_id has NOT NULL constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'restaurant_id' 
    AND is_nullable = 'NO'
  ) THEN
    -- Make restaurant_id nullable
    ALTER TABLE posts 
    ALTER COLUMN restaurant_id DROP NOT NULL;
    
    RAISE NOTICE 'Made restaurant_id nullable in posts table';
  ELSE
    RAISE NOTICE 'restaurant_id is already nullable';
  END IF;
END $$;

-- Ensure post_type column exists with proper default
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'simple';

-- Update any NULL post_type values
UPDATE posts 
SET post_type = CASE 
  WHEN restaurant_id IS NOT NULL THEN 'restaurant'
  ELSE 'simple'
END
WHERE post_type IS NULL;

-- Remove or update the validation trigger to be less strict
DROP TRIGGER IF EXISTS trigger_validate_post_requirements ON posts;
DROP FUNCTION IF EXISTS validate_post_requirements() CASCADE;

-- Create a more lenient validation function
CREATE OR REPLACE FUNCTION validate_post_requirements()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate restaurant posts need a restaurant_id
  IF NEW.post_type = 'restaurant' AND NEW.restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurant posts require a restaurant_id';
  END IF;
  
  -- All posts need some content (caption or photos)
  IF (NEW.caption IS NULL OR NEW.caption = '') AND 
     (NEW.photos IS NULL OR array_length(NEW.photos, 1) = 0) THEN
    RAISE EXCEPTION 'Posts require either a caption or photos';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_validate_post_requirements
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_post_requirements();

-- Add helpful comments
COMMENT ON COLUMN posts.post_type IS 'Type of post: simple (general post), restaurant (review)';
COMMENT ON COLUMN posts.restaurant_id IS 'Optional - only required for restaurant review posts';