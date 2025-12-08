-- ============================================================================
-- Fix Portfolio Image URL Nullable for Videos
-- ============================================================================
-- Issue: image_url is NOT NULL but videos don't always have thumbnails
-- Fix: Make image_url nullable and update function to handle null values
-- ============================================================================

-- Make image_url nullable (videos may not have thumbnails)
ALTER TABLE creator_portfolio_items
ALTER COLUMN image_url DROP NOT NULL;

-- Add a check constraint: if media_type is 'image', image_url must not be null
-- If media_type is 'video', image_url can be null (video_url must be provided)
ALTER TABLE creator_portfolio_items
DROP CONSTRAINT IF EXISTS check_portfolio_media_requirements;

ALTER TABLE creator_portfolio_items
ADD CONSTRAINT check_portfolio_media_requirements CHECK (
  (media_type = 'image' AND image_url IS NOT NULL) OR
  (media_type = 'video' AND video_url IS NOT NULL)
);

COMMENT ON COLUMN creator_portfolio_items.image_url IS
'URL to image file in storage (required for images, optional for videos - use thumbnail_url for video thumbnails)';

-- Update the function to handle null image_url for videos
CREATE OR REPLACE FUNCTION add_creator_portfolio_items(
  p_creator_profile_id UUID,
  p_items JSONB  -- Array of {image_url, video_url, media_type, thumbnail_url, caption, display_order, is_featured}
) RETURNS JSON AS $$
DECLARE
  v_item JSONB;
  v_items_added INTEGER := 0;
  v_media_type TEXT;
  v_image_url TEXT;
  v_video_url TEXT;
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
    v_media_type := COALESCE(v_item->>'media_type', 'image');
    v_image_url := NULLIF(v_item->>'image_url', '');
    v_video_url := NULLIF(v_item->>'video_url', '');
    
    -- For videos, use thumbnail_url as image_url if provided, otherwise null is OK
    IF v_media_type = 'video' THEN
      v_image_url := NULLIF(v_item->>'thumbnail_url', '');
    END IF;
    
    -- Validate media requirements
    IF v_media_type = 'image' AND v_image_url IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Image URL is required for image media type'
      );
    END IF;
    
    IF v_media_type = 'video' AND v_video_url IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Video URL is required for video media type'
      );
    END IF;
    
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
      v_image_url, -- Can be null for videos
      v_video_url,
      v_media_type,
      NULLIF(v_item->>'thumbnail_url', ''),
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
'Adds portfolio items (images or videos) to a creator profile. Supports both media types. For videos, image_url can be null if no thumbnail is provided.';
