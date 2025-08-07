-- Create function for cross-posting to multiple communities
-- This function allows posts to be shared to multiple communities at once

-- First ensure the post_communities table exists
CREATE TABLE IF NOT EXISTS post_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, community_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_communities_post_id ON post_communities(post_id);
CREATE INDEX IF NOT EXISTS idx_post_communities_community_id ON post_communities(community_id);
CREATE INDEX IF NOT EXISTS idx_post_communities_added_by ON post_communities(added_by);

-- Enable RLS
ALTER TABLE post_communities ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_communities
CREATE POLICY IF NOT EXISTS "Users can view post_communities" ON post_communities
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can add their posts to communities" ON post_communities
  FOR INSERT WITH CHECK (
    added_by = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_id 
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can remove their posts from communities" ON post_communities
  FOR DELETE USING (
    added_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_id 
      AND posts.user_id = auth.uid()
    )
  );

-- Create the cross-posting function
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
  v_post_exists BOOLEAN;
  v_already_posted BOOLEAN;
BEGIN
  -- Verify the post exists and belongs to the user
  SELECT EXISTS(
    SELECT 1 FROM posts 
    WHERE id = p_post_id 
    AND user_id = p_user_id
  ) INTO v_post_exists;
  
  IF NOT v_post_exists THEN
    RETURN QUERY
    SELECT 
      unnest(p_community_ids) AS community_id,
      FALSE AS success,
      'Post not found or does not belong to user' AS error_message;
    RETURN;
  END IF;

  -- Process each community
  FOREACH v_community_id IN ARRAY p_community_ids
  LOOP
    BEGIN
      -- Check if user is a member of the community
      SELECT EXISTS(
        SELECT 1 FROM community_members 
        WHERE community_id = v_community_id 
        AND user_id = p_user_id 
        AND status = 'active'
      ) INTO v_is_member;
      
      -- Check if already posted to this community
      SELECT EXISTS(
        SELECT 1 FROM post_communities 
        WHERE post_id = p_post_id 
        AND community_id = v_community_id
      ) INTO v_already_posted;
      
      IF v_already_posted THEN
        RETURN QUERY
        SELECT 
          v_community_id AS community_id,
          TRUE AS success,  -- Consider already posted as success
          'Already posted to this community' AS error_message;
      ELSIF NOT v_is_member THEN
        RETURN QUERY
        SELECT 
          v_community_id AS community_id,
          FALSE AS success,
          'User is not a member of this community' AS error_message;
      ELSE
        -- Insert the cross-post
        INSERT INTO post_communities (post_id, community_id, added_by)
        VALUES (p_post_id, v_community_id, p_user_id)
        ON CONFLICT (post_id, community_id) DO NOTHING;
        
        RETURN QUERY
        SELECT 
          v_community_id AS community_id,
          TRUE AS success,
          NULL AS error_message;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY
      SELECT 
        v_community_id AS community_id,
        FALSE AS success,
        SQLERRM AS error_message;
    END;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cross_post_to_communities TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION cross_post_to_communities IS 'Cross-post a single post to multiple communities';
COMMENT ON TABLE post_communities IS 'Links posts to communities for cross-posting functionality';
COMMENT ON COLUMN post_communities.added_by IS 'User who cross-posted the content';
COMMENT ON COLUMN post_communities.added_at IS 'When the post was shared to the community';