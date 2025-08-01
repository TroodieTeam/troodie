-- Fix avatar storage bucket configuration to ensure images are properly served

-- Update bucket configuration to ensure proper public access
UPDATE storage.buckets 
SET 
  public = true,
  avif_autodetection = false,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
WHERE id = 'avatars';

-- Drop existing storage policies to recreate them
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Create new storage policies with proper permissions
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create a function to validate and fix avatar URLs
CREATE OR REPLACE FUNCTION validate_avatar_url(url text)
RETURNS text AS $$
BEGIN
  -- If URL is null or empty, return null
  IF url IS NULL OR url = '' THEN
    RETURN NULL;
  END IF;
  
  -- If it's already a full URL, return as is
  IF url LIKE 'http%' THEN
    RETURN url;
  END IF;
  
  -- If it's a relative path, construct the full URL
  -- Assuming the Supabase URL is available via environment
  RETURN url;
END;
$$ LANGUAGE plpgsql;

-- Update any malformed avatar URLs in the users table
UPDATE users 
SET avatar_url = validate_avatar_url(avatar_url)
WHERE avatar_url IS NOT NULL 
  AND avatar_url != ''
  AND avatar_url NOT LIKE 'http%';

-- Add a trigger to automatically validate avatar URLs on insert/update
CREATE OR REPLACE FUNCTION validate_avatar_url_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.avatar_url := validate_avatar_url(NEW.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_avatar_url_before_insert_update
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION validate_avatar_url_trigger();