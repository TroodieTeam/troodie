-- Post Photos Storage Bucket
-- This migration creates the storage bucket for post photos

-- Create storage bucket for post photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-photos',
  'post-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Create storage policies for post photos
CREATE POLICY "Users can upload their own post photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view public post photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-photos');

CREATE POLICY "Users can update their own post photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'post-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own post photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  ); 