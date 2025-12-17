-- ============================================================================
-- Creator Rating System
-- ============================================================================
-- Adds rating columns to campaign_applications for businesses to rate creators
-- Date: 2025-01-22
-- Task: CM-16
-- ============================================================================

-- Add rating columns to campaign_applications
ALTER TABLE campaign_applications
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) CHECK (rating >= 1.0 AND rating <= 5.0),
ADD COLUMN IF NOT EXISTS rating_comment TEXT,
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMP WITH TIME ZONE;

-- Add index for rating queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_campaign_applications_rating 
ON campaign_applications(creator_id, rating) 
WHERE rating IS NOT NULL;

-- Add comment explaining the rating system
COMMENT ON COLUMN campaign_applications.rating IS
'Business rating of creator performance (1.0-5.0), set after campaign completion. Only one rating per completed campaign.';

COMMENT ON COLUMN campaign_applications.rating_comment IS
'Optional feedback from business about creator performance';

COMMENT ON COLUMN campaign_applications.rated_at IS
'Timestamp when the rating was submitted';

-- RLS: Ratings can only be set by the business that owns the campaign
-- Note: This assumes businesses can identify themselves via campaign ownership
-- The actual RLS policy will be enforced at the application level since
-- we need to check campaign ownership through restaurant_id -> business_id






