-- ================================================================
-- TROODIE-MANAGED CAMPAIGNS SCHEMA
-- ================================================================
-- Extends existing campaign schema to support platform-managed campaigns
-- Date: 2025-10-13
-- Task: TMC-001
-- ================================================================

-- ================================================================
-- EXTEND USERS TABLE
-- ================================================================
-- Add role column for admin access
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Add comment for clarity
COMMENT ON COLUMN users.role IS 'User role: user (default), admin, moderator';

-- Create index for role filtering
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role)
WHERE role != 'user';

-- ================================================================
-- EXTEND RESTAURANTS TABLE
-- ================================================================
-- Add platform management flags
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS is_platform_managed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS managed_by VARCHAR(50);

-- Add comment for clarity
COMMENT ON COLUMN restaurants.is_platform_managed IS 'True if restaurant is managed by Troodie (not a real restaurant)';
COMMENT ON COLUMN restaurants.managed_by IS 'Who manages this: troodie, partner, or NULL for regular restaurants';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_restaurants_platform_managed
ON restaurants(is_platform_managed)
WHERE is_platform_managed = TRUE;

-- ================================================================
-- EXTEND CAMPAIGNS TABLE
-- ================================================================
-- Add campaign source tracking
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS campaign_source VARCHAR(50) DEFAULT 'restaurant',
ADD COLUMN IF NOT EXISTS is_subsidized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subsidy_amount_cents INTEGER DEFAULT 0;

-- Add constraint for campaign_source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaign_source_check'
  ) THEN
    ALTER TABLE campaigns
    ADD CONSTRAINT campaign_source_check
    CHECK (campaign_source IN ('restaurant', 'troodie_direct', 'troodie_partnership', 'community_challenge'));
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN campaigns.campaign_source IS 'Source of campaign: restaurant (normal), troodie_direct, troodie_partnership, or community_challenge';
COMMENT ON COLUMN campaigns.is_subsidized IS 'True if Troodie is subsidizing part or all of campaign costs';
COMMENT ON COLUMN campaigns.subsidy_amount_cents IS 'Amount in cents that Troodie is subsidizing';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_source
ON campaigns(campaign_source);

CREATE INDEX IF NOT EXISTS idx_campaigns_subsidized
ON campaigns(is_subsidized)
WHERE is_subsidized = TRUE;

-- ================================================================
-- NEW TABLE: PLATFORM_MANAGED_CAMPAIGNS
-- ================================================================
-- Track internal information about Troodie-managed campaigns
CREATE TABLE IF NOT EXISTS platform_managed_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Management type
  management_type VARCHAR(50) NOT NULL CHECK (management_type IN ('direct', 'partnership', 'challenge')),

  -- Partnership details (if applicable)
  partner_restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  partnership_agreement_signed BOOLEAN DEFAULT FALSE,
  partnership_start_date DATE,
  partnership_end_date DATE,

  -- Budget tracking
  budget_source VARCHAR(50) NOT NULL CHECK (budget_source IN ('marketing', 'growth', 'product', 'partnerships', 'content', 'retention')),
  cost_center VARCHAR(100),
  approved_budget_cents INTEGER NOT NULL,
  actual_spend_cents INTEGER DEFAULT 0,

  -- Internal management
  internal_notes TEXT,
  campaign_manager_user_id UUID REFERENCES users(id),

  -- Success metrics
  target_creators INTEGER,
  target_content_pieces INTEGER,
  target_reach INTEGER,
  actual_creators INTEGER DEFAULT 0,
  actual_content_pieces INTEGER DEFAULT 0,
  actual_reach INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per campaign
  UNIQUE(campaign_id)
);

-- Add comments
COMMENT ON TABLE platform_managed_campaigns IS 'Internal tracking for Troodie-managed campaigns including budget, partnerships, and metrics';
COMMENT ON COLUMN platform_managed_campaigns.management_type IS 'Type: direct (Troodie-branded), partnership (appears as restaurant), or challenge (gamified)';
COMMENT ON COLUMN platform_managed_campaigns.budget_source IS 'Which budget this campaign draws from';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_platform_campaigns_type
ON platform_managed_campaigns(management_type);

CREATE INDEX IF NOT EXISTS idx_platform_campaigns_budget
ON platform_managed_campaigns(budget_source);

CREATE INDEX IF NOT EXISTS idx_platform_campaigns_manager
ON platform_managed_campaigns(campaign_manager_user_id);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE platform_managed_campaigns ENABLE ROW LEVEL SECURITY;

-- Only admins can see platform_managed_campaigns details
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Admins can view platform campaigns" ON platform_managed_campaigns;
CREATE POLICY "Admins can view platform campaigns"
  ON platform_managed_campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Admins can manage platform campaigns" ON platform_managed_campaigns;
CREATE POLICY "Admins can manage platform campaigns"
  ON platform_managed_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Creators can see campaigns but not internal management details
-- (campaigns table policies remain unchanged - they already allow viewing active campaigns)

-- ================================================================
-- FUNCTIONS
-- ================================================================

-- Function to update actual spend when campaign applications are accepted
CREATE OR REPLACE FUNCTION update_platform_campaign_spend()
RETURNS TRIGGER AS $$
BEGIN
  -- Update actual spend for Troodie-managed campaigns
  UPDATE platform_managed_campaigns
  SET
    actual_spend_cents = (
      SELECT COALESCE(SUM(proposed_rate_cents), 0)
      FROM campaign_applications
      WHERE campaign_id = NEW.campaign_id
      AND status = 'accepted'
    ),
    updated_at = NOW()
  WHERE campaign_id = NEW.campaign_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on campaign_applications
DROP TRIGGER IF EXISTS trigger_update_platform_spend ON campaign_applications;
CREATE TRIGGER trigger_update_platform_spend
AFTER INSERT OR UPDATE OR DELETE ON campaign_applications
FOR EACH ROW
EXECUTE FUNCTION update_platform_campaign_spend();

-- Function to update platform campaign metrics
CREATE OR REPLACE FUNCTION update_platform_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update actual metrics when creators complete campaigns
  UPDATE platform_managed_campaigns
  SET
    actual_creators = (
      SELECT COUNT(DISTINCT creator_id)
      FROM campaign_applications ca
      WHERE ca.campaign_id = NEW.campaign_id
      AND ca.status IN ('accepted', 'completed')
    ),
    actual_content_pieces = (
      SELECT COUNT(*)
      FROM campaign_applications ca
      WHERE ca.campaign_id = NEW.campaign_id
      AND ca.status = 'completed'
    ),
    updated_at = NOW()
  WHERE campaign_id = NEW.campaign_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on campaign_applications
DROP TRIGGER IF EXISTS trigger_update_platform_metrics ON campaign_applications;
CREATE TRIGGER trigger_update_platform_metrics
AFTER UPDATE ON campaign_applications
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION update_platform_campaign_metrics();

-- ================================================================
-- HELPER VIEWS
-- ================================================================

-- View for easy querying of Troodie campaigns
CREATE OR REPLACE VIEW troodie_campaigns_summary AS
SELECT
  c.id,
  c.title,
  c.campaign_source,
  c.status,
  c.budget,
  c.budget_cents,
  c.is_subsidized,
  c.subsidy_amount_cents,
  pmc.management_type,
  pmc.budget_source,
  pmc.cost_center,
  pmc.approved_budget_cents,
  pmc.actual_spend_cents,
  pmc.target_creators,
  pmc.actual_creators,
  pmc.target_content_pieces,
  pmc.actual_content_pieces,
  r.name as restaurant_name,
  r.is_platform_managed,
  c.created_at,
  c.start_date,
  c.end_date
FROM campaigns c
INNER JOIN platform_managed_campaigns pmc ON c.id = pmc.campaign_id
LEFT JOIN restaurants r ON c.restaurant_id = r.id
WHERE c.campaign_source != 'restaurant';

COMMENT ON VIEW troodie_campaigns_summary IS 'Summary view of all Troodie-managed campaigns with key metrics';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ TROODIE-MANAGED CAMPAIGNS SCHEMA CREATED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE 'Added:';
  RAISE NOTICE '• users.role - admin role for platform management';
  RAISE NOTICE '• restaurants.is_platform_managed - flag for Troodie-owned restaurants';
  RAISE NOTICE '• restaurants.managed_by - who manages the restaurant';
  RAISE NOTICE '• campaigns.campaign_source - source type tracking';
  RAISE NOTICE '• campaigns.is_subsidized - subsidy flag';
  RAISE NOTICE '• campaigns.subsidy_amount_cents - subsidy amount';
  RAISE NOTICE '• platform_managed_campaigns table - internal tracking';
  RAISE NOTICE '• troodie_campaigns_summary view - easy querying';
  RAISE NOTICE '• Automatic spend and metrics tracking triggers';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run TMC-002: Create Troodie system user account';
  RAISE NOTICE '2. Build admin campaign creation UI (TMC-003)';
  RAISE NOTICE '3. Update creator campaign browsing to show Troodie campaigns (TMC-004)';
  RAISE NOTICE '';
END $$;
