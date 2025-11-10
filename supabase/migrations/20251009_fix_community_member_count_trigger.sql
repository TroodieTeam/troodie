-- Fix community member count trigger for atomic updates
-- Date: 2025-10-09
-- Purpose: Ensure community.member_count updates atomically when members join/leave

-- Drop old triggers first (must drop triggers before functions)
DROP TRIGGER IF EXISTS update_community_member_count_trigger ON community_members;
DROP TRIGGER IF EXISTS trigger_update_community_member_count ON community_members;

-- Now safe to drop function
DROP FUNCTION IF EXISTS update_community_member_count() CASCADE;

-- Create atomic trigger function
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment member count
    UPDATE communities
    SET member_count = COALESCE(member_count, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.community_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement member count
    UPDATE communities
    SET member_count = GREATEST(COALESCE(member_count, 1) - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.community_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_community_member_count_trigger
AFTER INSERT OR DELETE ON community_members
FOR EACH ROW
EXECUTE FUNCTION update_community_member_count();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_joined_at ON community_members(joined_at DESC);

-- Add unique constraint to prevent duplicate memberships
ALTER TABLE community_members
DROP CONSTRAINT IF EXISTS community_members_unique;

ALTER TABLE community_members
ADD CONSTRAINT community_members_unique
UNIQUE (community_id, user_id);

COMMENT ON TRIGGER update_community_member_count_trigger ON community_members IS
  'Automatically updates communities.member_count when members join/leave';
