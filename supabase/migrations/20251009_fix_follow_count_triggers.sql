-- Fix follow count triggers for atomic updates
-- Date: 2025-10-09
-- Purpose: Ensure followers_count and following_count update atomically

-- Drop old triggers first (must drop triggers before functions)
DROP TRIGGER IF EXISTS update_follower_count_on_follow ON user_relationships;
DROP TRIGGER IF EXISTS update_following_count_on_follow ON user_relationships;
DROP TRIGGER IF EXISTS update_follow_counts_trigger ON user_relationships;
DROP TRIGGER IF EXISTS trigger_update_follow_counts ON user_relationships;

-- Now safe to drop function
DROP FUNCTION IF EXISTS update_follow_counts() CASCADE;

-- Create atomic trigger function
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the followed user
    UPDATE users
    SET followers_count = COALESCE(followers_count, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.following_id;

    -- Increment following count for the follower
    UPDATE users
    SET following_count = COALESCE(following_count, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.follower_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the unfollowed user
    UPDATE users
    SET followers_count = GREATEST(COALESCE(followers_count, 1) - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.following_id;

    -- Decrement following count for the unfollower
    UPDATE users
    SET following_count = GREATEST(COALESCE(following_count, 1) - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.follower_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_follow_counts_trigger
AFTER INSERT OR DELETE ON user_relationships
FOR EACH ROW
EXECUTE FUNCTION update_follow_counts();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_relationships_follower ON user_relationships(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_following ON user_relationships(following_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_created_at ON user_relationships(created_at DESC);

-- Add unique constraint to prevent duplicate follows
ALTER TABLE user_relationships
DROP CONSTRAINT IF EXISTS user_relationships_unique;

ALTER TABLE user_relationships
ADD CONSTRAINT user_relationships_unique
UNIQUE (follower_id, following_id);

-- Add check constraint to prevent self-follows
ALTER TABLE user_relationships
DROP CONSTRAINT IF EXISTS no_self_follow;

ALTER TABLE user_relationships
ADD CONSTRAINT no_self_follow
CHECK (follower_id != following_id);

COMMENT ON TRIGGER update_follow_counts_trigger ON user_relationships IS
  'Automatically updates users.followers_count and users.following_count when follows are added/removed';
