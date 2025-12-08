-- ================================================================
-- Portfolio Storage Bucket Migration
-- ================================================================
-- Task: CM-2 - Fix Portfolio Image Upload to Cloud Storage
-- This migration creates the storage bucket for creator portfolio
-- images and sets up the necessary RLS policies.
-- 
-- NOTE: Bucket must be created manually in Supabase Dashboard first:
-- Storage > Create Bucket > Name: creator-portfolios, Public: true
-- ================================================================

-- ================================================================
-- CREATE PORTFOLIO STORAGE BUCKET (if not exists)
-- ================================================================
-- Attempt to create/update bucket via SQL
-- If this fails, bucket must be created via Dashboard
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creator-portfolios',
  'creator-portfolios',
  true,  -- Public bucket for portfolio images and videos
  52428800,  -- 50MB max file size (matches post-photos bucket)
  ARRAY[
    -- Image types
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    -- Video types
    'video/mp4',
    'video/quicktime',  -- MOV files
    'video/x-msvideo',  -- AVI files
    'video/x-matroska', -- MKV files
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm'
  ];

-- ================================================================
-- STORAGE POLICIES
-- ================================================================
-- These policies require the bucket to exist first
-- ================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Creators can upload portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Portfolio images are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Creators can update their portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Creators can delete their portfolio images" ON storage.objects;

-- Policy: Anyone can view portfolio images and videos (public bucket)
CREATE POLICY "Portfolio images are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'creator-portfolios');

-- Policy: Authenticated users can upload to their own folder
-- The folder structure is: creator-portfolios/{user_id}/{filename}
-- Supports both images and videos
CREATE POLICY "Creators can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'creator-portfolios'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own portfolio images and videos
CREATE POLICY "Creators can update their portfolio images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'creator-portfolios'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own portfolio images and videos
CREATE POLICY "Creators can delete their portfolio images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'creator-portfolios'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ PORTFOLIO STORAGE BUCKET MIGRATION COMPLETE';
  RAISE NOTICE '';
  RAISE NOTICE 'Bucket: creator-portfolios';
  RAISE NOTICE 'Settings:';
  RAISE NOTICE '  • Public: true (anyone can view)';
  RAISE NOTICE '  • Max file size: 50MB';
  RAISE NOTICE '  • Allowed types: JPEG, JPG, PNG, GIF, WebP, MP4, MOV, AVI, MKV, WebM';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies:';
  RAISE NOTICE '  • Public read access';
  RAISE NOTICE '  • Creators can upload to their folder';
  RAISE NOTICE '  • Creators can update/delete their images and videos';
  RAISE NOTICE '';
  RAISE NOTICE 'Folder structure: creator-portfolios/{user_id}/{timestamp}-{id}.{ext}';
  RAISE NOTICE '';
END $$;
