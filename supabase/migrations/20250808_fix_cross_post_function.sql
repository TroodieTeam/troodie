-- Fix the ambiguous column reference error in cross_post_to_communities function
-- This error occurs when column names conflict in the RETURN QUERY statements

-- Drop the existing function
DROP FUNCTION IF EXISTS cross_post_to_communities(UUID, UUID[], UUID);

-- Recreate the function with fixed column references
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
    -- Return error for all communities if post doesn't exist
    FOR i IN 1..array_length(p_community_ids, 1) LOOP
      RETURN QUERY
      SELECT 
        p_community_ids[i],
        FALSE,
        'Post not found or does not belong to user'::TEXT;
    END LOOP;
    RETURN;
  END IF;

  -- Process each community
  FOREACH v_community_id IN ARRAY p_community_ids
  LOOP
    BEGIN
      -- Check if user is a member of the community
      SELECT EXISTS(
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = v_community_id 
        AND cm.user_id = p_user_id 
        AND cm.status = 'active'
      ) INTO v_is_member;
      
      -- Check if already posted to this community
      SELECT EXISTS(
        SELECT 1 FROM post_communities pc
        WHERE pc.post_id = p_post_id 
        AND pc.community_id = v_community_id
      ) INTO v_already_posted;
      
      IF v_already_posted THEN
        RETURN QUERY
        SELECT 
          v_community_id,
          TRUE,
          'Already posted to this community'::TEXT;
      ELSIF NOT v_is_member THEN
        RETURN QUERY
        SELECT 
          v_community_id,
          FALSE,
          'User is not a member of this community'::TEXT;
      ELSE
        -- Insert the cross-post
        INSERT INTO post_communities (post_id, community_id, added_by)
        VALUES (p_post_id, v_community_id, p_user_id)
        ON CONFLICT (post_id, community_id) DO NOTHING;
        
        RETURN QUERY
        SELECT 
          v_community_id,
          TRUE,
          NULL::TEXT;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY
      SELECT 
        v_community_id,
        FALSE,
        SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cross_post_to_communities TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION cross_post_to_communities IS 'Cross-post a single post to multiple communities - fixed ambiguous column references';

-- Test the function with a simple verification
DO $$
BEGIN
  RAISE NOTICE 'cross_post_to_communities function recreated successfully!';
  RAISE NOTICE 'Fixed ambiguous column reference error';
END $$;