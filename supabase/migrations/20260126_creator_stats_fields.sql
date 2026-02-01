-- Migration: Add creator stats fields for TRO-144
-- Description: Adds extended profile fields for creator discovery and filtering

-- Add primary city for location-based filtering
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS primary_city VARCHAR(100);

-- Add Instagram fields
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(100);

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS instagram_engagement_rate DECIMAL(5,2);

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS instagram_last_post_date DATE;

-- Add TikTok fields
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS tiktok_handle VARCHAR(100);

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS tiktok_engagement_rate DECIMAL(5,2);

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS tiktok_last_post_date DATE;

-- Add persona field (from onboarding quiz)
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS persona VARCHAR(100);

-- Add preferred compensation array
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS preferred_compensation TEXT[] DEFAULT '{}';

-- Add past collaborations free text field
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS past_restaurant_collabs TEXT;

-- Add verification fields for admin verification
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS social_stats_verified BOOLEAN DEFAULT false;

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS social_stats_verified_at TIMESTAMPTZ;

-- Create index for city-based filtering
CREATE INDEX IF NOT EXISTS idx_creator_profiles_primary_city
ON creator_profiles(primary_city)
WHERE primary_city IS NOT NULL;

-- Create index for compensation filtering
CREATE INDEX IF NOT EXISTS idx_creator_profiles_compensation
ON creator_profiles USING GIN(preferred_compensation);

-- Add comment for documentation
COMMENT ON COLUMN creator_profiles.primary_city IS 'Creator''s primary operating city for location-based matching';
COMMENT ON COLUMN creator_profiles.instagram_handle IS 'Instagram username without @';
COMMENT ON COLUMN creator_profiles.instagram_engagement_rate IS 'Instagram engagement rate as percentage (0.00-100.00)';
COMMENT ON COLUMN creator_profiles.instagram_last_post_date IS 'Date of most recent Instagram post';
COMMENT ON COLUMN creator_profiles.tiktok_handle IS 'TikTok username without @';
COMMENT ON COLUMN creator_profiles.tiktok_engagement_rate IS 'TikTok engagement rate as percentage (0.00-100.00)';
COMMENT ON COLUMN creator_profiles.tiktok_last_post_date IS 'Date of most recent TikTok post';
COMMENT ON COLUMN creator_profiles.persona IS 'Creator persona from Troodie onboarding quiz';
COMMENT ON COLUMN creator_profiles.preferred_compensation IS 'Array of compensation types: free, compensated_meals, pay_under_150, pay_150_500, pay_over_500';
COMMENT ON COLUMN creator_profiles.past_restaurant_collabs IS 'Free text description of past restaurant collaborations';
COMMENT ON COLUMN creator_profiles.social_stats_verified IS 'Whether admin has verified the social stats';
COMMENT ON COLUMN creator_profiles.social_stats_verified_at IS 'Timestamp when social stats were verified';
