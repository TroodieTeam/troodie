-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('restaurant-photos', 'restaurant-photos', true),
  ('board-covers', 'board-covers', true),
  ('community-images', 'community-images', true);

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for restaurant-photos bucket
CREATE POLICY "Restaurant photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-photos');

CREATE POLICY "Authenticated users can upload restaurant photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'restaurant-photos' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own restaurant photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'restaurant-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own restaurant photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'restaurant-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for board-covers bucket
CREATE POLICY "Board covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'board-covers');

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
CREATE POLICY "Community images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-images');

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