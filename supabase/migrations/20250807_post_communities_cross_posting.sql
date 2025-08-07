-- Create post_communities join table for cross-posting functionality
-- This table enables posts to be shared across multiple communities

-- Create the join table
CREATE TABLE IF NOT EXISTS post_communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure a post can only be added to a community once
  UNIQUE(post_id, community_id)
);

-- Add indexes for performance
CREATE INDEX idx_post_communities_post_id ON post_communities(post_id);
CREATE INDEX idx_post_communities_community_id ON post_communities(community_id);
CREATE INDEX idx_post_communities_added_by ON post_communities(added_by);
CREATE INDEX idx_post_communities_added_at ON post_communities(added_at DESC);

-- Enable Row Level Security
ALTER TABLE post_communities ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view cross-posted content in communities they're members of
CREATE POLICY "Members can view community posts"
  ON post_communities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = post_communities.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM communities
      WHERE communities.id = post_communities.community_id
      AND communities.type = 'public'
    )
  );

-- Post authors can add their posts to communities they're members of
CREATE POLICY "Authors can cross-post to their communities"
  ON post_communities FOR INSERT
  WITH CHECK (
    -- User must be the post author
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_communities.post_id
      AND posts.user_id = auth.uid()
    )
    AND
    -- User must be a member of the target community
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = post_communities.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
    )
    AND
    -- Added_by must be the current user
    added_by = auth.uid()
  );

-- Post authors can remove their posts from communities
CREATE POLICY "Authors can remove cross-posts"
  ON post_communities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_communities.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- Community admins/moderators can remove posts from their communities
CREATE POLICY "Community admins can manage posts"
  ON post_communities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = post_communities.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('owner', 'admin', 'moderator')
    )
  );

-- Function to get posts for a community feed (including cross-posted content)
CREATE OR REPLACE FUNCTION get_community_feed(
  p_community_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  restaurant_id UUID,
  caption TEXT,
  photos TEXT[],
  rating NUMERIC,
  visit_date TIMESTAMPTZ,
  likes_count INTEGER,
  comments_count INTEGER,
  saves_count INTEGER,
  created_at TIMESTAMPTZ,
  is_cross_posted BOOLEAN,
  cross_posted_at TIMESTAMPTZ,
  username TEXT,
  user_avatar TEXT,
  restaurant_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id AS post_id,
    p.user_id,
    p.restaurant_id::UUID,
    p.caption,
    p.photos,
    p.rating,
    p.visit_date,
    p.likes_count,
    p.comments_count,
    p.saves_count,
    p.created_at,
    pc.id IS NOT NULL AS is_cross_posted,
    pc.added_at AS cross_posted_at,
    u.username,
    u.avatar_url AS user_avatar,
    r.name AS restaurant_name
  FROM posts p
  INNER JOIN users u ON p.user_id = u.id
  INNER JOIN restaurants r ON p.restaurant_id::TEXT = r.id::TEXT
  LEFT JOIN post_communities pc ON p.id = pc.post_id AND pc.community_id = p_community_id
  WHERE 
    -- Include posts created directly in the community (legacy support)
    (p.id IN (
      SELECT cp.id FROM community_posts cp 
      WHERE cp.community_id = p_community_id
    ))
    OR
    -- Include cross-posted content
    (pc.community_id = p_community_id)
  ORDER BY COALESCE(pc.added_at, p.created_at) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to cross-post to multiple communities
CREATE OR REPLACE FUNCTION cross_post_to_communities(
  p_post_id UUID,
  p_community_ids UUID[],
  p_user_id UUID
)
RETURNS TABLE (
  community_id UUID,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_community_id UUID;
  v_is_member BOOLEAN;
  v_is_author BOOLEAN;
BEGIN
  -- Verify user is the post author
  SELECT EXISTS(
    SELECT 1 FROM posts 
    WHERE id = p_post_id AND user_id = p_user_id
  ) INTO v_is_author;
  
  IF NOT v_is_author THEN
    RETURN QUERY
    SELECT 
      unnest(p_community_ids) AS community_id,
      FALSE AS success,
      'You are not the author of this post' AS error_message;
    RETURN;
  END IF;

  -- Process each community
  FOREACH v_community_id IN ARRAY p_community_ids
  LOOP
    -- Check if user is a member of the community
    SELECT EXISTS(
      SELECT 1 FROM community_members
      WHERE community_id = v_community_id
      AND user_id = p_user_id
      AND status = 'active'
    ) INTO v_is_member;
    
    IF v_is_member THEN
      -- Try to insert the cross-post
      BEGIN
        INSERT INTO post_communities (post_id, community_id, added_by)
        VALUES (p_post_id, v_community_id, p_user_id)
        ON CONFLICT (post_id, community_id) DO NOTHING;
        
        RETURN QUERY
        SELECT v_community_id, TRUE, NULL::TEXT;
      EXCEPTION WHEN OTHERS THEN
        RETURN QUERY
        SELECT v_community_id, FALSE, SQLERRM;
      END;
    ELSE
      RETURN QUERY
      SELECT v_community_id, FALSE, 'You are not a member of this community';
    END IF;
  END LOOP;
END;
$$;

-- Trigger to send notifications when a post is cross-posted
CREATE OR REPLACE FUNCTION notify_community_on_cross_post()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_post_author_id UUID;
  v_post_author_name TEXT;
  v_community_name TEXT;
  v_member RECORD;
BEGIN
  -- Get post author info
  SELECT p.user_id, u.name
  INTO v_post_author_id, v_post_author_name
  FROM posts p
  JOIN users u ON p.user_id = u.id
  WHERE p.id = NEW.post_id;
  
  -- Get community name
  SELECT name INTO v_community_name
  FROM communities
  WHERE id = NEW.community_id;
  
  -- Notify active community members (except the post author)
  FOR v_member IN
    SELECT user_id
    FROM community_members
    WHERE community_id = NEW.community_id
    AND status = 'active'
    AND user_id != v_post_author_id
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_id,
      related_type,
      data
    ) VALUES (
      v_member.user_id,
      'post_mention',
      'New post in ' || v_community_name,
      v_post_author_name || ' shared a restaurant experience',
      NEW.post_id,
      'post',
      jsonb_build_object(
        'community_id', NEW.community_id,
        'community_name', v_community_name,
        'post_id', NEW.post_id
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_cross_post
  AFTER INSERT ON post_communities
  FOR EACH ROW
  EXECUTE FUNCTION notify_community_on_cross_post();

-- Update community activity when posts are cross-posted
CREATE OR REPLACE FUNCTION update_community_activity_on_cross_post()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Increment activity level for the community
  UPDATE communities
  SET 
    activity_level = activity_level + 1,
    updated_at = NOW()
  WHERE id = NEW.community_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_community_activity
  AFTER INSERT ON post_communities
  FOR EACH ROW
  EXECUTE FUNCTION update_community_activity_on_cross_post();

-- Add comment explaining the schema
COMMENT ON TABLE post_communities IS 'Join table for cross-posting posts to multiple communities';
COMMENT ON COLUMN post_communities.post_id IS 'Reference to the original post';
COMMENT ON COLUMN post_communities.community_id IS 'Reference to the community where the post is shared';
COMMENT ON COLUMN post_communities.added_by IS 'User who cross-posted the content';
COMMENT ON COLUMN post_communities.added_at IS 'Timestamp when the post was shared to this community';