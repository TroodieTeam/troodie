-- Create storage buckets (only if they don't exist)
INSERT INTO storage.buckets (id, name, public) 
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars');

INSERT INTO storage.buckets (id, name, public) 
SELECT 'restaurant-photos', 'restaurant-photos', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'restaurant-photos');

INSERT INTO storage.buckets (id, name, public) 
SELECT 'board-covers', 'board-covers', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'board-covers');

INSERT INTO storage.buckets (id, name, public) 
SELECT 'community-images', 'community-images', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'community-images');

INSERT INTO storage.buckets (id, name, public) 
SELECT 'post-photos', 'post-photos', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'post-photos');

-- Storage policies for avatars bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for restaurant-photos bucket
DROP POLICY IF EXISTS "Restaurant photos are publicly accessible" ON storage.objects;
CREATE POLICY "Restaurant photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-photos');

DROP POLICY IF EXISTS "Authenticated users can upload restaurant photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload restaurant photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'restaurant-photos' AND 
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Users can update their own restaurant photos" ON storage.objects;
CREATE POLICY "Users can update their own restaurant photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'restaurant-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own restaurant photos" ON storage.objects;
CREATE POLICY "Users can delete their own restaurant photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'restaurant-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for board-covers bucket
DROP POLICY IF EXISTS "Board covers are publicly accessible" ON storage.objects;
CREATE POLICY "Board covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'board-covers');

DROP POLICY IF EXISTS "Board owners can upload board covers" ON storage.objects;
CREATE POLICY "Board owners can upload board covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'board-covers' AND 
  EXISTS (
    SELECT 1 FROM boards 
    WHERE user_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Board owners can update board covers" ON storage.objects;
CREATE POLICY "Board owners can update board covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'board-covers' AND 
  EXISTS (
    SELECT 1 FROM boards 
    WHERE user_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Board owners can delete board covers" ON storage.objects;
CREATE POLICY "Board owners can delete board covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'board-covers' AND 
  EXISTS (
    SELECT 1 FROM boards 
    WHERE user_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);

-- Storage policies for community-images bucket
DROP POLICY IF EXISTS "Community images are publicly accessible" ON storage.objects;
CREATE POLICY "Community images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-images');

DROP POLICY IF EXISTS "Community admins can upload images" ON storage.objects;
CREATE POLICY "Community admins can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-images' AND 
  EXISTS (
    SELECT 1 FROM communities 
    WHERE admin_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Community admins can update images" ON storage.objects;
CREATE POLICY "Community admins can update images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'community-images' AND 
  EXISTS (
    SELECT 1 FROM communities 
    WHERE admin_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Community admins can delete images" ON storage.objects;
CREATE POLICY "Community admins can delete images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-images' AND 
  EXISTS (
    SELECT 1 FROM communities 
    WHERE admin_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);

-- Storage policies for post-photos bucket
DROP POLICY IF EXISTS "Post photos are publicly accessible" ON storage.objects;
CREATE POLICY "Post photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-photos');

DROP POLICY IF EXISTS "Authenticated users can upload post photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload post photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-photos' AND 
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Users can update their own post photos" ON storage.objects;
CREATE POLICY "Users can update their own post photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own post photos" ON storage.objects;
CREATE POLICY "Users can delete their own post photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);