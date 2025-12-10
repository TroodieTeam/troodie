-- ============================================================================
-- Update Portfolio Function for Video Support
-- ============================================================================
-- Updates add_creator_portfolio_items to support both images and videos
-- ============================================================================

CREATE OR REPLACE FUNCTION add_creator_portfolio_items(
  p_creator_profile_id UUID,
  p_items JSONB  -- Array of {image_url, video_url, media_type, thumbnail_url, caption, display_order, is_featured}
) RETURNS JSON AS $$
DECLARE
  v_item JSONB;
  v_items_added INTEGER := 0;
BEGIN
  -- Validate creator profile exists and belongs to current user
  IF NOT EXISTS (
    SELECT 1 FROM creator_profiles
    WHERE id = p_creator_profile_id
    AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Creator profile not found or unauthorized'
    );
  END IF;

  -- Delete existing portfolio items (replace mode)
  DELETE FROM creator_portfolio_items
  WHERE creator_profile_id = p_creator_profile_id;

  -- Insert new portfolio items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO creator_portfolio_items (
      creator_profile_id,
      image_url,
      video_url,
      media_type,
      thumbnail_url,
      caption,
      display_order,
      is_featured
    ) VALUES (
      p_creator_profile_id,
      COALESCE(v_item->>'image_url', v_item->>'thumbnail_url'), -- Use thumbnail for videos
      v_item->>'video_url',
      COALESCE(v_item->>'media_type', 'image'),
      v_item->>'thumbnail_url',
      COALESCE(v_item->>'caption', ''),
      COALESCE((v_item->>'display_order')::INTEGER, v_items_added),
      COALESCE((v_item->>'is_featured')::BOOLEAN, v_items_added = 0)
    );
    v_items_added := v_items_added + 1;
  END LOOP;

  -- Mark portfolio as uploaded
  UPDATE creator_profiles
  SET portfolio_uploaded = true, updated_at = NOW()
  WHERE id = p_creator_profile_id;

  RETURN json_build_object(
    'success', true,
    'items_added', v_items_added
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_creator_portfolio_items IS
'Adds portfolio items (images or videos) to a creator profile. Supports both media types.';

