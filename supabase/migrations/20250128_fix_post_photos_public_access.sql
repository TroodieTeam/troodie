-- Fix post-photos bucket public access to match actual folder structure
-- The current folder structure is: posts/{post_id}/filename.jpg
-- But policies were expecting: posts/{user_id}/filename.jpg

-- Drop the existing restrictive public policy
DROP POLICY IF EXISTS "Public can view post photos" ON storage.objects;

-- Create a simple public read policy for all post-photos
CREATE POLICY "Public can view all post photos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'post-photos');

-- Also ensure the bucket itself is marked as public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'post-photos'; 