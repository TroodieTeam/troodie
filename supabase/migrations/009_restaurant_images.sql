-- Create restaurant_images table for managing all restaurant photos
CREATE TABLE IF NOT EXISTS public.restaurant_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  user_id uuid,                      -- User who uploaded the image
  post_id uuid,                      -- Associated post if from a post
  image_url text NOT NULL,           -- URL of the image in storage
  caption text,                      -- Optional caption for the image
  uploaded_at timestamp with time zone DEFAULT now(),
  is_cover_photo boolean DEFAULT false,  -- Whether this is a cover photo candidate
  is_approved boolean DEFAULT true,  -- For moderation (auto-approved for now)
  approved_by uuid,                  -- Admin who approved
  approved_at timestamp with time zone,
  source character varying DEFAULT 'user_post' CHECK (source::text = ANY (ARRAY['user_post'::character varying, 'user_upload'::character varying, 'restaurant_upload'::character varying, 'external'::character varying]::text[])),
  attribution_name text,             -- For external sources
  attribution_url text,              -- Link to original source
  privacy character varying DEFAULT 'public' CHECK (privacy::text = ANY (ARRAY['public'::character varying, 'friends'::character varying, 'private'::character varying]::text[])),
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT restaurant_images_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_images_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE,
  CONSTRAINT restaurant_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT restaurant_images_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_images_restaurant ON restaurant_images(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_images_user ON restaurant_images(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_images_post ON restaurant_images(post_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_images_cover ON restaurant_images(restaurant_id, is_cover_photo) WHERE is_cover_photo = true;

-- Enable RLS
ALTER TABLE restaurant_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view public restaurant images
CREATE POLICY "Restaurant images are viewable by everyone for public images" ON restaurant_images
  FOR SELECT USING (privacy = 'public' OR user_id = auth.uid());

-- Users can insert their own images
CREATE POLICY "Users can insert their own restaurant images" ON restaurant_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own images
CREATE POLICY "Users can update their own restaurant images" ON restaurant_images
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete their own restaurant images" ON restaurant_images
  FOR DELETE USING (auth.uid() = user_id);

-- Function to add post images to restaurant gallery
CREATE OR REPLACE FUNCTION add_post_images_to_restaurant(
  p_post_id UUID,
  p_restaurant_id UUID,
  p_user_id UUID,
  p_photos TEXT[],
  p_privacy VARCHAR DEFAULT 'public'
) RETURNS VOID AS $$
BEGIN
  -- Insert each photo from the post into restaurant_images
  INSERT INTO restaurant_images (
    restaurant_id, user_id, post_id, image_url, source, privacy
  )
  SELECT 
    p_restaurant_id,
    p_user_id,
    p_post_id,
    unnest(p_photos),
    'user_post',
    p_privacy;
END;
$$ LANGUAGE plpgsql;

-- Function to update restaurant cover photo based on best available image
CREATE OR REPLACE FUNCTION update_restaurant_cover_photo(
  p_restaurant_id UUID
) RETURNS VOID AS $$
DECLARE
  v_best_photo TEXT;
BEGIN
  -- Select best photo based on engagement and recency
  SELECT image_url INTO v_best_photo
  FROM restaurant_images
  WHERE restaurant_id = p_restaurant_id
    AND privacy = 'public'
    AND is_approved = true
  ORDER BY 
    like_count DESC,
    view_count DESC,
    uploaded_at DESC
  LIMIT 1;
  
  -- Update restaurant cover photo if found
  IF v_best_photo IS NOT NULL THEN
    UPDATE restaurants 
    SET cover_photo_url = v_best_photo,
        updated_at = now()
    WHERE id = p_restaurant_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically add post images to restaurant gallery
CREATE OR REPLACE FUNCTION trigger_add_post_images_to_restaurant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if the post has photos and a restaurant_id
  IF NEW.photos IS NOT NULL AND array_length(NEW.photos, 1) > 0 AND NEW.restaurant_id IS NOT NULL THEN
    -- Call the function to add images
    PERFORM add_post_images_to_restaurant(
      NEW.id,
      NEW.restaurant_id::uuid,
      NEW.user_id,
      NEW.photos,
      NEW.privacy
    );
    
    -- Update restaurant cover photo if needed
    PERFORM update_restaurant_cover_photo(NEW.restaurant_id::uuid);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on posts table
DROP TRIGGER IF EXISTS trigger_post_images_to_restaurant ON posts;
CREATE TRIGGER trigger_post_images_to_restaurant
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_add_post_images_to_restaurant();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_restaurant_images_updated_at BEFORE UPDATE ON restaurant_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();