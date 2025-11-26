-- Migration: Add video support to post-photos bucket
-- Description: Update post-photos bucket to allow video MIME types in addition to images
-- Date: 2025-01-29

-- Update the post-photos bucket to allow video MIME types
-- Increase file size limit to 50MB to accommodate videos
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY[
    -- Image types (existing)
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    -- Video types (new)
    'video/mp4',
    'video/quicktime',  -- MOV files
    'video/x-msvideo', -- AVI files
    'video/x-matroska', -- MKV files
    'video/webm'
  ],
  file_size_limit = 52428800 -- 50MB (increased from 10MB for videos)
WHERE id = 'post-photos';

-- If bucket doesn't exist, create it with video support
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-photos',
  'post-photos',
  true,
  52428800, -- 50MB
  ARRAY[
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
  ]
)
ON CONFLICT (id) DO UPDATE SET
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
  ],
  file_size_limit = 52428800;

