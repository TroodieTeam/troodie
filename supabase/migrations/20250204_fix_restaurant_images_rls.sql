-- Drop existing policies
DROP POLICY IF EXISTS "Restaurant images are viewable by everyone for public images" ON restaurant_images;
DROP POLICY IF EXISTS "Users can insert their own restaurant images" ON restaurant_images;
DROP POLICY IF EXISTS "Users can update their own restaurant images" ON restaurant_images;
DROP POLICY IF EXISTS "Users can delete their own restaurant images" ON restaurant_images;

-- Create new, more permissive policies

-- Anyone can view public restaurant images
CREATE POLICY "Anyone can view public restaurant images" ON restaurant_images
  FOR SELECT USING (
    privacy = 'public' 
    OR user_id = auth.uid()
    OR user_id IS NULL -- Allow viewing images without user attribution
  );

-- Authenticated users can insert images
CREATE POLICY "Authenticated users can insert restaurant images" ON restaurant_images
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() 
      OR user_id IS NULL -- Allow system/trigger inserts
    )
  );

-- Users can update their own images or images without an owner
CREATE POLICY "Users can update their own restaurant images" ON restaurant_images
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR (user_id IS NULL AND auth.uid() IS NOT NULL)
  );

-- Users can delete their own images
CREATE POLICY "Users can delete their own restaurant images" ON restaurant_images
  FOR DELETE USING (auth.uid() = user_id);

-- Create a service role function that bypasses RLS for system operations
CREATE OR REPLACE FUNCTION public.sync_post_images_to_restaurant(
  p_post_id UUID
) RETURNS VOID AS $$
DECLARE
  v_post RECORD;
  v_photo TEXT;
BEGIN
  -- Get post details
  SELECT id, restaurant_id, user_id, photos, privacy, caption
  INTO v_post
  FROM posts
  WHERE id = p_post_id;

  -- Check if post exists and has photos
  IF v_post.id IS NULL OR v_post.photos IS NULL OR array_length(v_post.photos, 1) = 0 THEN
    RETURN;
  END IF;

  -- Insert each photo that doesn't already exist
  FOREACH v_photo IN ARRAY v_post.photos
  LOOP
    INSERT INTO restaurant_images (
      restaurant_id,
      user_id,
      post_id,
      image_url,
      caption,
      source,
      privacy,
      is_approved
    )
    SELECT
      v_post.restaurant_id,
      v_post.user_id,
      v_post.id,
      v_photo,
      v_post.caption,
      'user_post',
      v_post.privacy,
      true
    WHERE NOT EXISTS (
      SELECT 1 FROM restaurant_images 
      WHERE post_id = v_post.id 
      AND image_url = v_photo
    );
  END LOOP;

  -- Update restaurant cover photo if needed
  PERFORM update_restaurant_cover_photo(v_post.restaurant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.sync_post_images_to_restaurant(UUID) TO authenticated;

-- Fix the trigger function to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION trigger_add_post_images_to_restaurant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if the post has photos and a restaurant_id
  IF NEW.photos IS NOT NULL AND array_length(NEW.photos, 1) > 0 AND NEW.restaurant_id IS NOT NULL THEN
    -- Use the security definer function
    PERFORM sync_post_images_to_restaurant(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_post_images_to_restaurant ON posts;
CREATE TRIGGER trigger_post_images_to_restaurant
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_add_post_images_to_restaurant();