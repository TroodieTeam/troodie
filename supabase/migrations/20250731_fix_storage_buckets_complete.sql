-- Complete storage bucket configuration for both avatars and post-photos
-- This migration ensures both buckets are properly configured for image uploads

-- Create or update avatars bucket for profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Create or update post-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-photos',
  'post-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Note: Storage policies must be configured in Supabase Dashboard
-- Required policies for avatars bucket:
-- 1. "Anyone can view avatars" - SELECT operation for anon, authenticated
-- 2. "Users can upload their own avatar" - INSERT for authenticated with bucket_id = 'avatars'
-- 3. "Users can update their own avatar" - UPDATE for authenticated with bucket_id = 'avatars'
-- 4. "Users can delete their own avatar" - DELETE for authenticated with bucket_id = 'avatars'
--
-- Required policies for post-photos bucket:
-- 1. "Anyone can view post photos" - SELECT operation for anon, authenticated
-- 2. "Authenticated users can upload post photos" - INSERT for authenticated with bucket_id = 'post-photos'
-- 3. "Users can update their own post photos" - UPDATE for authenticated with bucket_id = 'post-photos'
-- 4. "Users can delete their own post photos" - DELETE for authenticated with bucket_id = 'post-photos'