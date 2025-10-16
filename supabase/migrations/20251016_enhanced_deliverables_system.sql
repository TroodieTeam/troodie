-- ============================================================================
-- Migration: Enhanced Deliverables System
-- Date: 2025-10-16
-- Description: Adds comprehensive deliverable submission, review, and
--              auto-approval workflow for campaign deliverables
-- ============================================================================

-- ============================================================================
-- 1. EXTEND CAMPAIGNS TABLE - Add deliverable requirements
-- ============================================================================

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS deliverable_requirements JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN campaigns.deliverable_requirements IS
'Structured requirements for campaign deliverables including:
- Basic details (title, goal, type, due date, compensation, etc.)
- Creative guidelines (tone, themes, music, voiceover, etc.)
- Approval settings (pre-approval, handles, hashtags, repost rights)
See types/deliverableRequirements.ts for full schema';

-- Index for querying by deliverable type
CREATE INDEX IF NOT EXISTS idx_campaigns_deliverable_type
ON campaigns ((deliverable_requirements->>'type'));

-- Index for querying by goal
CREATE INDEX IF NOT EXISTS idx_campaigns_deliverable_goal
ON campaigns ((deliverable_requirements->>'goal'));

-- ============================================================================
-- 2. EXTEND CREATOR_CAMPAIGNS TABLE - Add submission tracking
-- ============================================================================

ALTER TABLE creator_campaigns
ADD COLUMN IF NOT EXISTS deliverables_submitted JSONB DEFAULT '[]'::jsonb;

ALTER TABLE creator_campaigns
ADD COLUMN IF NOT EXISTS all_deliverables_submitted BOOLEAN DEFAULT FALSE;

ALTER TABLE creator_campaigns
ADD COLUMN IF NOT EXISTS restaurant_review_deadline TIMESTAMPTZ;

ALTER TABLE creator_campaigns
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN creator_campaigns.deliverables_submitted IS
'Array of submitted deliverables with basic metadata.
Detailed tracking in campaign_deliverables table.';

COMMENT ON COLUMN creator_campaigns.all_deliverables_submitted IS
'Boolean flag indicating if all required deliverables have been submitted.';

COMMENT ON COLUMN creator_campaigns.restaurant_review_deadline IS
'Timestamp when deliverables will auto-approve if not reviewed (72 hours after submission).';

COMMENT ON COLUMN creator_campaigns.auto_approved IS
'Flag indicating if deliverables were auto-approved due to restaurant timeout.';

-- ============================================================================
-- 3. CREATE CAMPAIGN_DELIVERABLES TABLE - Detailed deliverable tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_deliverables (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_campaign_id UUID NOT NULL REFERENCES creator_campaigns(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Submission details
  deliverable_index INTEGER NOT NULL CHECK (deliverable_index > 0),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'other')),
  post_url TEXT NOT NULL,
  screenshot_url TEXT,
  caption TEXT,
  notes_to_restaurant TEXT,

  -- Engagement metrics (self-reported initially, can be verified later)
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  -- Example: {"views": 1000, "likes": 50, "comments": 10, "shares": 5}

  -- Review status and feedback
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision', 'under_review')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  restaurant_feedback TEXT,
  auto_approved BOOLEAN DEFAULT FALSE,
  revision_number INTEGER DEFAULT 1 CHECK (revision_number > 0),

  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one deliverable per index per creator campaign
  UNIQUE(creator_campaign_id, deliverable_index)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deliverables_creator_campaign
ON campaign_deliverables(creator_campaign_id);

CREATE INDEX IF NOT EXISTS idx_deliverables_campaign
ON campaign_deliverables(campaign_id);

CREATE INDEX IF NOT EXISTS idx_deliverables_creator
ON campaign_deliverables(creator_id);

CREATE INDEX IF NOT EXISTS idx_deliverables_status
ON campaign_deliverables(status);

CREATE INDEX IF NOT EXISTS idx_deliverables_submitted
ON campaign_deliverables(submitted_at);

CREATE INDEX IF NOT EXISTS idx_deliverables_auto_approval_check
ON campaign_deliverables(status, submitted_at)
WHERE status = 'pending';

COMMENT ON TABLE campaign_deliverables IS
'Tracks individual deliverable submissions with detailed review and approval workflow.
Each row represents one deliverable submission (e.g., a single Instagram post).
Supports revision tracking, auto-approval after 72 hours, and detailed feedback.';

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE campaign_deliverables ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Creators can view own deliverables" ON campaign_deliverables;
DROP POLICY IF EXISTS "Creators can create own deliverables" ON campaign_deliverables;
DROP POLICY IF EXISTS "Creators can update own deliverables" ON campaign_deliverables;
DROP POLICY IF EXISTS "Restaurants can view campaign deliverables" ON campaign_deliverables;
DROP POLICY IF EXISTS "Restaurants can update campaign deliverables" ON campaign_deliverables;
DROP POLICY IF EXISTS "Admins can view all deliverables" ON campaign_deliverables;
DROP POLICY IF EXISTS "Admins can update all deliverables" ON campaign_deliverables;

-- Creators can view and manage their own deliverables
CREATE POLICY "Creators can view own deliverables"
  ON campaign_deliverables FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can create own deliverables"
  ON campaign_deliverables FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own pending deliverables"
  ON campaign_deliverables FOR UPDATE
  USING (auth.uid() = creator_id AND status IN ('pending', 'needs_revision'))
  WITH CHECK (auth.uid() = creator_id);

-- Restaurants can view and review deliverables for their campaigns
CREATE POLICY "Restaurants can view campaign deliverables"
  ON campaign_deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN business_profiles bp ON bp.restaurant_id = c.restaurant_id
      WHERE c.id = campaign_deliverables.campaign_id
      AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurants can update campaign deliverables"
  ON campaign_deliverables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN business_profiles bp ON bp.restaurant_id = c.restaurant_id
      WHERE c.id = campaign_deliverables.campaign_id
      AND bp.user_id = auth.uid()
    )
  );

-- Admins can view and manage all deliverables
CREATE POLICY "Admins can view all deliverables"
  ON campaign_deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all deliverables"
  ON campaign_deliverables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get auto-approval deadline for a deliverable
CREATE OR REPLACE FUNCTION get_auto_approval_deadline(p_deliverable_id UUID)
RETURNS TIMESTAMPTZ AS $$
  SELECT submitted_at + INTERVAL '72 hours'
  FROM campaign_deliverables
  WHERE id = p_deliverable_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_auto_approval_deadline IS
'Returns the timestamp when a deliverable will auto-approve (72 hours after submission).';

-- Function to check if a deliverable should be auto-approved
CREATE OR REPLACE FUNCTION should_auto_approve(p_deliverable_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    status = 'pending' AND
    submitted_at < NOW() - INTERVAL '72 hours'
  FROM campaign_deliverables
  WHERE id = p_deliverable_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION should_auto_approve IS
'Returns true if a deliverable has been pending for >72 hours and should be auto-approved.';

-- Function to get time remaining until auto-approval
CREATE OR REPLACE FUNCTION time_until_auto_approval(p_deliverable_id UUID)
RETURNS INTERVAL AS $$
  SELECT
    GREATEST(
      (submitted_at + INTERVAL '72 hours') - NOW(),
      INTERVAL '0 seconds'
    )
  FROM campaign_deliverables
  WHERE id = p_deliverable_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION time_until_auto_approval IS
'Returns the time remaining until auto-approval. Returns 0 if already past deadline.';

-- ============================================================================
-- 6. AUTO-APPROVAL FUNCTION (Called by cron job)
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_approve_overdue_deliverables()
RETURNS TABLE (
  deliverable_id UUID,
  creator_id UUID,
  campaign_id UUID,
  creator_campaign_id UUID,
  approved_at TIMESTAMPTZ,
  creator_email TEXT,
  campaign_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE campaign_deliverables cd
  SET
    status = 'approved',
    auto_approved = TRUE,
    reviewed_at = NOW(),
    updated_at = NOW()
  FROM campaigns c, users u
  WHERE
    cd.status = 'pending'
    AND cd.submitted_at < NOW() - INTERVAL '72 hours'
    AND cd.campaign_id = c.id
    AND cd.creator_id = u.id
  RETURNING
    cd.id AS deliverable_id,
    cd.creator_id,
    cd.campaign_id,
    cd.creator_campaign_id,
    cd.reviewed_at AS approved_at,
    u.email AS creator_email,
    c.title AS campaign_title;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_approve_overdue_deliverables IS
'Auto-approves all deliverables that have been pending for more than 72 hours.
Returns details of auto-approved deliverables for notification purposes.
Should be called by Supabase Edge Function (cron job) every hour.';

-- ============================================================================
-- 7. TRIGGER TO UPDATE creator_campaigns WHEN DELIVERABLE CHANGES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_creator_campaign_deliverable_status()
RETURNS TRIGGER AS $$
DECLARE
  total_required INTEGER;
  total_submitted INTEGER;
  all_approved BOOLEAN;
BEGIN
  -- Count total deliverables submitted for this creator campaign
  SELECT COUNT(*)
  INTO total_submitted
  FROM campaign_deliverables
  WHERE creator_campaign_id = NEW.creator_campaign_id
  AND status IN ('approved', 'pending', 'under_review');

  -- Check if all submitted deliverables are approved
  SELECT COUNT(*) = 0
  INTO all_approved
  FROM campaign_deliverables
  WHERE creator_campaign_id = NEW.creator_campaign_id
  AND status NOT IN ('approved');

  -- Update creator_campaigns table
  UPDATE creator_campaigns
  SET
    all_deliverables_submitted = (total_submitted > 0),
    restaurant_review_deadline = CASE
      WHEN NEW.status = 'pending' AND NEW.submitted_at IS NOT NULL
      THEN NEW.submitted_at + INTERVAL '72 hours'
      ELSE restaurant_review_deadline
    END,
    auto_approved = CASE
      WHEN NEW.auto_approved = TRUE THEN TRUE
      ELSE auto_approved
    END,
    updated_at = NOW()
  WHERE id = NEW.creator_campaign_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_creator_campaign_on_deliverable_change
AFTER INSERT OR UPDATE ON campaign_deliverables
FOR EACH ROW
EXECUTE FUNCTION update_creator_campaign_deliverable_status();

COMMENT ON FUNCTION update_creator_campaign_deliverable_status IS
'Updates creator_campaigns table when deliverables are submitted or reviewed.
Tracks submission status, review deadlines, and auto-approval flags.';

-- ============================================================================
-- 8. VALIDATION FUNCTION FOR DELIVERABLE REQUIREMENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_deliverable_requirements(requirements JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  required_fields TEXT[] := ARRAY['title', 'goal', 'type', 'due_date', 'compensation_type', 'compensation_value', 'visit_type', 'payment_timing', 'revisions_allowed'];
  field TEXT;
BEGIN
  -- Check that all required fields exist
  FOREACH field IN ARRAY required_fields
  LOOP
    IF NOT (requirements ? field) THEN
      RAISE EXCEPTION 'Missing required field: %', field;
    END IF;
  END LOOP;

  -- Validate goal enum
  IF NOT (requirements->>'goal' IN ('awareness', 'foot_traffic', 'new_menu', 'event', 'brand_content')) THEN
    RAISE EXCEPTION 'Invalid goal value. Must be one of: awareness, foot_traffic, new_menu, event, brand_content';
  END IF;

  -- Validate type enum
  IF NOT (requirements->>'type' IN ('reel', 'tiktok', 'story', 'static_post', 'carousel')) THEN
    RAISE EXCEPTION 'Invalid type value. Must be one of: reel, tiktok, story, static_post, carousel';
  END IF;

  -- Validate compensation_type enum
  IF NOT (requirements->>'compensation_type' IN ('free_meal', 'cash', 'gift_card', 'store_credit', 'discount', 'other')) THEN
    RAISE EXCEPTION 'Invalid compensation_type. Must be one of: free_meal, cash, gift_card, store_credit, discount, other';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_deliverable_requirements IS
'Validates that deliverable_requirements JSONB has all required fields and valid enum values.
Used in application layer before inserting/updating campaigns.';

-- ============================================================================
-- 9. VIEW FOR PENDING DELIVERABLES (Restaurant Dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW pending_deliverables_summary AS
SELECT
  cd.id AS deliverable_id,
  cd.campaign_id,
  cd.creator_campaign_id,
  cd.creator_id,
  cd.deliverable_index,
  cd.platform,
  cd.post_url,
  cd.screenshot_url,
  cd.caption,
  cd.notes_to_restaurant,
  cd.engagement_metrics,
  cd.submitted_at,
  cd.status,
  cd.revision_number,
  -- Time calculations
  get_auto_approval_deadline(cd.id) AS auto_approval_deadline,
  time_until_auto_approval(cd.id) AS time_remaining,
  EXTRACT(EPOCH FROM time_until_auto_approval(cd.id)) / 3600 AS hours_remaining,
  -- Campaign details
  c.title AS campaign_title,
  c.restaurant_id,
  -- Creator details
  u.full_name AS creator_name,
  u.username AS creator_username,
  u.avatar_url AS creator_avatar,
  u.email AS creator_email
FROM campaign_deliverables cd
JOIN campaigns c ON c.id = cd.campaign_id
JOIN users u ON u.id = cd.creator_id
WHERE cd.status = 'pending'
ORDER BY cd.submitted_at ASC;

COMMENT ON VIEW pending_deliverables_summary IS
'Provides a complete view of pending deliverables with time calculations and related details.
Used by restaurant dashboard to show deliverables awaiting review.';

-- ============================================================================
-- 10. VIEW FOR DELIVERABLE STATISTICS (Analytics)
-- ============================================================================

CREATE OR REPLACE VIEW deliverable_statistics AS
SELECT
  c.id AS campaign_id,
  c.title AS campaign_title,
  c.restaurant_id,
  COUNT(DISTINCT cd.creator_id) AS total_creators,
  COUNT(cd.id) AS total_deliverables,
  COUNT(cd.id) FILTER (WHERE cd.status = 'pending') AS pending_count,
  COUNT(cd.id) FILTER (WHERE cd.status = 'approved') AS approved_count,
  COUNT(cd.id) FILTER (WHERE cd.status = 'rejected') AS rejected_count,
  COUNT(cd.id) FILTER (WHERE cd.status = 'needs_revision') AS revision_count,
  COUNT(cd.id) FILTER (WHERE cd.auto_approved = TRUE) AS auto_approved_count,
  AVG(EXTRACT(EPOCH FROM (cd.reviewed_at - cd.submitted_at)) / 3600) FILTER (WHERE cd.reviewed_at IS NOT NULL) AS avg_review_hours,
  MAX(cd.submitted_at) AS last_submission_at,
  MAX(cd.reviewed_at) AS last_review_at
FROM campaigns c
LEFT JOIN campaign_deliverables cd ON cd.campaign_id = c.id
GROUP BY c.id, c.title, c.restaurant_id;

COMMENT ON VIEW deliverable_statistics IS
'Provides aggregated statistics for deliverables by campaign.
Used for analytics dashboards and performance tracking.';

-- ============================================================================
-- 11. GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON campaign_deliverables TO authenticated;
GRANT SELECT ON pending_deliverables_summary TO authenticated;
GRANT SELECT ON deliverable_statistics TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
  ============================================================================
  ✅ ENHANCED DELIVERABLES SYSTEM MIGRATION COMPLETE
  ============================================================================

  Changes Applied:
  ✓ Added deliverable_requirements to campaigns table
  ✓ Extended creator_campaigns with submission tracking
  ✓ Created campaign_deliverables table with full workflow support
  ✓ Added RLS policies for creators, restaurants, and admins
  ✓ Created helper functions for auto-approval logic
  ✓ Added trigger to sync creator_campaigns status
  ✓ Created views for pending deliverables and statistics
  ✓ Granted appropriate permissions

  Helper Functions Available:
  - get_auto_approval_deadline(deliverable_id)
  - should_auto_approve(deliverable_id)
  - time_until_auto_approval(deliverable_id)
  - auto_approve_overdue_deliverables() [For cron job]
  - validate_deliverable_requirements(requirements)

  Views Available:
  - pending_deliverables_summary (for restaurant dashboard)
  - deliverable_statistics (for analytics)

  Next Steps:
  1. Deploy Supabase Edge Function for auto-approval cron
  2. Implement TypeScript services (deliverableSubmissionService, deliverableReviewService)
  3. Build UI components (submission form, review dashboard)
  4. Test end-to-end workflow

  For Edge Function deployment:
  supabase functions deploy auto-approve-deliverables --project-ref YOUR_PROJECT_REF

  ============================================================================
  ';
END $$;
