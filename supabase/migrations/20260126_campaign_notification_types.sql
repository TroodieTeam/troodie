-- ============================================================================
-- TRO-146: Campaign Notification Types
-- ============================================================================
-- Adds notification preference types for campaign alerts:
-- - new_campaign_opportunity: Alert creators about new campaigns
-- - new_campaign_applicant: Alert restaurants about new applicants
-- Date: 2026-01-26
-- ============================================================================

-- Insert notification preference types if they don't exist
INSERT INTO notification_preference_types (key, label, description, default_enabled, category)
VALUES
  (
    'new_campaign_opportunity',
    'New Campaign Opportunities',
    'Get notified when restaurants post campaigns matching your profile',
    true,
    'campaigns'
  ),
  (
    'new_campaign_applicant',
    'New Campaign Applicants',
    'Get notified when creators apply to your campaigns',
    true,
    'campaigns'
  )
ON CONFLICT (key) DO UPDATE
SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  default_enabled = EXCLUDED.default_enabled,
  category = EXCLUDED.category;

-- Add comment for documentation
COMMENT ON TABLE notification_preference_types IS 'TRO-146: Added campaign notification types for creator/restaurant alerts';
