-- Create the post-photos storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-photos',
  'post-photos',
  true, -- Public bucket for post photos
  10485760, -- 10MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own post photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own post photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own post photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view post photos" ON storage.objects;

-- Create RLS policies for the post-photos bucket

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload their own post photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-photos' AND
  (storage.foldername(name))[1] = 'posts' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update their own post photos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'post-photos' AND
  (storage.foldername(name))[1] = 'posts' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own post photos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'post-photos' AND
  (storage.foldername(name))[1] = 'posts' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow public read access to all post photos
CREATE POLICY "Public can view post photos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'post-photos');