-- ================================================================
-- Portfolio Storage Bucket Migration
-- ================================================================
-- Task: CM-2 - Fix Portfolio Image Upload to Cloud Storage
-- This migration creates the storage bucket for creator portfolio
-- images and sets up the necessary RLS policies.
-- ================================================================

-- ================================================================
-- CREATE PORTFOLIO STORAGE BUCKET
-- ================================================================
-- Note: In Supabase, storage bucket creation via SQL may need to
-- be done through the dashboard or via the API. This SQL serves
-- as documentation and will create policies assuming bucket exists.
-- ================================================================

-- Insert bucket if it doesn't exist (may need dashboard creation)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creator-portfolios',
  'creator-portfolios',
  true,  -- Public bucket for portfolio images
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ================================================================
-- STORAGE POLICIES
-- ================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Creators can upload portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Portfolio images are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Creators can update their portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Creators can delete their portfolio images" ON storage.objects;

-- Policy: Anyone can view portfolio images (public bucket)
CREATE POLICY "Portfolio images are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'creator-portfolios');

-- Policy: Authenticated users can upload to their own folder
-- The folder structure is: creator-portfolios/{user_id}/{filename}
CREATE POLICY "Creators can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'creator-portfolios'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own portfolio images
CREATE POLICY "Creators can update their portfolio images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'creator-portfolios'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own portfolio images
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
  RAISE NOTICE '  • Max file size: 5MB';
  RAISE NOTICE '  • Allowed types: JPEG, PNG, WebP';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies:';
  RAISE NOTICE '  • Public read access';
  RAISE NOTICE '  • Creators can upload to their folder';
  RAISE NOTICE '  • Creators can update/delete their images';
  RAISE NOTICE '';
  RAISE NOTICE 'Folder structure: creator-portfolios/{user_id}/{timestamp}-{id}.jpg';
  RAISE NOTICE '';
END $$;
