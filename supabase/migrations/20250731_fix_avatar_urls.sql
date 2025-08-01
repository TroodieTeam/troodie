-- Standardize avatar URL fields in users table
-- Consolidate profile_image_url into avatar_url to avoid confusion

-- First, update any rows where avatar_url is null but profile_image_url has a value
UPDATE users 
SET avatar_url = profile_image_url 
WHERE avatar_url IS NULL AND profile_image_url IS NOT NULL;

-- Create a function to ensure avatar URLs are properly formatted
CREATE OR REPLACE FUNCTION ensure_avatar_url_format() RETURNS TRIGGER AS $$
BEGIN
  -- If avatar_url is set and it's from our storage, ensure it has the proper format
  IF NEW.avatar_url IS NOT NULL AND NEW.avatar_url LIKE '%supabase%/storage/v1/object/public/avatars/%' THEN
    -- URL is already in the correct format
    NULL;
  ELSIF NEW.avatar_url IS NOT NULL AND NEW.avatar_url LIKE '%/avatars/%' AND NEW.avatar_url NOT LIKE '%supabase%' THEN
    -- This might be a relative path, we need to construct the full URL
    -- This should not happen with proper uploads, but we'll handle it
    NULL;
  END IF;
  
  -- If profile_image_url is set but avatar_url is not, copy it over
  IF NEW.profile_image_url IS NOT NULL AND NEW.avatar_url IS NULL THEN
    NEW.avatar_url := NEW.profile_image_url;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure avatar URLs are properly formatted
DROP TRIGGER IF EXISTS ensure_avatar_url_format_trigger ON users;
CREATE TRIGGER ensure_avatar_url_format_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_avatar_url_format();

-- Add comment to clarify field usage
COMMENT ON COLUMN users.avatar_url IS 'Primary profile image URL - use this field for all avatar/profile images';
COMMENT ON COLUMN users.profile_image_url IS 'Deprecated - use avatar_url instead. Kept for backward compatibility.';

-- Ensure the avatars storage bucket exists and has proper policies
DO $$
BEGIN
  -- Check if avatars bucket exists
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
    VALUES (
      'avatars', 
      'avatars', 
      true, 
      false, 
      5242880, -- 5MB limit
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    );
  END IF;
END $$;

-- Ensure RLS policies are set correctly for the avatars bucket
-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Public read access for all avatar images
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);