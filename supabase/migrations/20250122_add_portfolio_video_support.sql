-- ============================================================================
-- Add Video Support to Creator Portfolio
-- ============================================================================
-- This migration adds support for video uploads in creator portfolios
-- alongside existing image support.
--
-- Task: Portfolio Enhancement
-- ============================================================================

-- Add media type and video URL columns to portfolio items
ALTER TABLE creator_portfolio_items
ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'image'
  CHECK (media_type IN ('image', 'video')),
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Update existing records to be images
UPDATE creator_portfolio_items
SET media_type = 'image'
WHERE media_type IS NULL;

-- Create index for media type filtering
CREATE INDEX IF NOT EXISTS idx_portfolio_media_type
ON creator_portfolio_items(creator_profile_id, media_type);

COMMENT ON COLUMN creator_portfolio_items.media_type IS
'Type of media: image or video. Images use image_url, videos use video_url.';

COMMENT ON COLUMN creator_portfolio_items.video_url IS
'URL to video file in storage (for video media type).';

COMMENT ON COLUMN creator_portfolio_items.thumbnail_url IS
'Thumbnail URL for videos (optional, can use image_url for images).';

