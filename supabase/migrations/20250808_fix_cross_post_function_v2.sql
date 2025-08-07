-- Fix the ambiguous column reference error - Version 2
-- Force drop and recreate with completely different approach

-- Drop everything related to cross_post_to_communities
DROP FUNCTION IF EXISTS cross_post_to_communities(UUID, UUID[], UUID) CASCADE;

-- Create a simpler, more explicit function
CREATE OR REPLACE FUNCTION cross_post_to_communities(
  p_post_id UUID,
  p_community_ids UUID[],
  p_user_id UUID
)
RETURNS TABLE (
  result_community_id UUID,
  result_success BOOLEAN,
  result_error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_community_id UUID;
  user_is_member BOOLEAN;
  post_already_exists BOOLEAN;
  post_exists_for_user BOOLEAN;
BEGIN
  -- First verify the post exists and belongs to the user
  SELECT EXISTS(
    SELECT 1 FROM posts p
    WHERE p.id = p_post_id 
    AND p.user_id = p_user_id
  ) INTO post_exists_for_user;
  
  IF NOT post_exists_for_user THEN
    -- Return error for all communities if post validation fails
    FOR i IN 1..array_length(p_community_ids, 1) LOOP
      result_community_id := p_community_ids[i];
      result_success := FALSE;
      result_error_message := 'Post not found or does not belong to user';
      RETURN NEXT;
    END LOOP;
    RETURN;
  END IF;

  -- Process each community individually
  FOR i IN 1..array_length(p_community_ids, 1) LOOP
    current_community_id := p_community_ids[i];
    
    BEGIN
      -- Check if user is a member of this specific community
      SELECT EXISTS(
        SELECT 1 FROM community_members
        WHERE community_members.community_id = current_community_id
        AND community_members.user_id = p_user_id 
        AND community_members.status = 'active'
      ) INTO user_is_member;
      
      -- Check if this post is already cross-posted to this community
      SELECT EXISTS(
        SELECT 1 FROM post_communities
        WHERE post_communities.post_id = p_post_id 
        AND post_communities.community_id = current_community_id
      ) INTO post_already_exists;
      
      IF post_already_exists THEN
        result_community_id := current_community_id;
        result_success := TRUE;
        result_error_message := 'Already posted to this community';
        RETURN NEXT;
      ELSIF NOT user_is_member THEN
        result_community_id := current_community_id;
        result_success := FALSE;
        result_error_message := 'User is not a member of this community';
        RETURN NEXT;
      ELSE
        -- Insert the cross-post record
        INSERT INTO post_communities (post_id, community_id, added_by)
        VALUES (p_post_id, current_community_id, p_user_id)
        ON CONFLICT (post_id, community_id) DO NOTHING;
        
        result_community_id := current_community_id;
        result_success := TRUE;
        result_error_message := NULL;
        RETURN NEXT;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      result_community_id := current_community_id;
      result_success := FALSE;
      result_error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cross_post_to_communities TO authenticated;

-- Update the PostService to handle the new return column names
COMMENT ON FUNCTION cross_post_to_communities IS 'Cross-post posts to communities - returns result_community_id, result_success, result_error_message';

-- Test the function
DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE 'Testing cross_post_to_communities function...';
  
  -- Simple test to make sure it doesn't crash
  FOR test_result IN 
    SELECT result_community_id, result_success, result_error_message
    FROM cross_post_to_communities(
      '00000000-0000-0000-0000-000000000000'::UUID,
      ARRAY['00000000-0000-0000-0000-000000000000'::UUID],
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  LOOP
    RAISE NOTICE 'Test result: community=%, success=%, error=%', 
      test_result.result_community_id, 
      test_result.result_success, 
      test_result.result_error_message;
  END LOOP;
  
  RAISE NOTICE 'Function test completed - no syntax errors!';
END $$;