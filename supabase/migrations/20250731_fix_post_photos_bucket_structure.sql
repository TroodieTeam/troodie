-- Fix post-photos bucket structure and ensure proper public access
-- This migration addresses the issue where post images are not rendering
-- NOTE: Storage policies must be configured in Supabase Dashboard under Storage > Policies

-- First, ensure the bucket exists and is public
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

-- Note: The following SQL comments document the required storage policies
-- These must be created manually in the Supabase Dashboard:
-- 
-- 1. Go to Storage > Policies in your Supabase Dashboard
-- 2. For the 'post-photos' bucket, create these policies:
--
-- Policy 1: "Anyone can view post photos"
-- - Allowed operation: SELECT
-- - Target roles: anon, authenticated
-- - Policy expression: bucket_id = 'post-photos'
--
-- Policy 2: "Authenticated users can upload post photos"
-- - Allowed operation: INSERT
-- - Target roles: authenticated
-- - Policy expression: bucket_id = 'post-photos'
--
-- Policy 3: "Users can update their own post photos"
-- - Allowed operation: UPDATE
-- - Target roles: authenticated
-- - Policy expression: bucket_id = 'post-photos'
--
-- Policy 4: "Users can delete their own post photos"
-- - Allowed operation: DELETE
-- - Target roles: authenticated
-- - Policy expression: bucket_id = 'post-photos'