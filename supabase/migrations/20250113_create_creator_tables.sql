-- ================================================================
-- Creator Marketplace Tables
-- ================================================================
-- Tables for campaigns, earnings, analytics, and creator management
-- ================================================================

-- ================================================================
-- CAMPAIGNS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_accounts(id) ON DELETE SET NULL,
  
  -- Campaign Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  requirements JSONB DEFAULT '[]', -- Array of requirement strings
  deliverables JSONB DEFAULT '[]', -- Array of deliverable items
  
  -- Financial
  budget_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payout_per_creator DECIMAL(10,2) NOT NULL,
  max_creators INT DEFAULT 10,
  
  -- Targeting
  target_audience JSONB DEFAULT '{}', -- Demographics, interests, etc
  location VARCHAR(255),
  categories TEXT[], -- Food categories
  
  -- Status & Dates
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  application_deadline TIMESTAMPTZ,
  
  -- Metrics
  views_count INT DEFAULT 0,
  applications_count INT DEFAULT 0,
  accepted_creators_count INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ================================================================
-- CREATOR CAMPAIGNS (Junction Table)
-- ================================================================
CREATE TABLE IF NOT EXISTS creator_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_profile_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
  
  -- Application & Status
  status VARCHAR(50) DEFAULT 'applied' CHECK (status IN ('applied', 'accepted', 'rejected', 'active', 'completed', 'cancelled')),
  application_note TEXT,
  rejection_reason TEXT,
  
  -- Deliverables Tracking
  deliverables_status JSONB DEFAULT '{}', -- Map of deliverable_id -> boolean
  proof_urls TEXT[], -- Screenshots, links, etc
  completion_notes TEXT,
  
  -- Performance Metrics
  content_views INT DEFAULT 0,
  content_saves INT DEFAULT 0,
  content_clicks INT DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  
  -- Financial
  agreed_payout DECIMAL(10,2),
  actual_earnings DECIMAL(10,2),
  bonus_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Timestamps
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(campaign_id, creator_id)
);

-- ================================================================
-- CREATOR EARNINGS
-- ================================================================
CREATE TABLE IF NOT EXISTS creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  creator_campaign_id UUID REFERENCES creator_campaigns(id) ON DELETE SET NULL,
  
  -- Earning Details
  type VARCHAR(50) NOT NULL CHECK (type IN ('campaign', 'bonus', 'referral', 'tip', 'adjustment')),
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'processing', 'paid', 'failed', 'cancelled')),
  
  -- Payout Information
  payout_id UUID,
  payout_method VARCHAR(50), -- 'stripe', 'paypal', etc
  
  -- Timestamps
  earned_date TIMESTAMPTZ DEFAULT NOW(),
  available_date TIMESTAMPTZ, -- When it becomes available for payout
  paid_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CREATOR PAYOUTS
-- ================================================================
CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Payout Details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Status
  status VARCHAR(50) DEFAULT 'initiated' CHECK (status IN ('initiated', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Payment Provider
  provider VARCHAR(50) DEFAULT 'stripe',
  provider_payout_id VARCHAR(255), -- Stripe transfer ID, etc
  provider_response JSONB,
  
  -- Earnings Included
  earning_ids UUID[], -- Array of creator_earnings IDs included
  
  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Error Handling
  failure_reason TEXT,
  retry_count INT DEFAULT 0
);

-- ================================================================
-- CREATOR ANALYTICS
-- ================================================================
CREATE TABLE IF NOT EXISTS creator_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Date Range
  date DATE NOT NULL,
  period VARCHAR(20) DEFAULT 'daily' CHECK (period IN ('daily', 'weekly', 'monthly')),
  
  -- Content Metrics
  content_views INT DEFAULT 0,
  unique_viewers INT DEFAULT 0,
  content_saves INT DEFAULT 0,
  content_shares INT DEFAULT 0,
  content_clicks INT DEFAULT 0,
  
  -- Engagement Metrics
  engagement_rate DECIMAL(5,2),
  save_rate DECIMAL(5,2),
  click_through_rate DECIMAL(5,2),
  
  -- Audience Metrics
  new_followers INT DEFAULT 0,
  total_followers INT DEFAULT 0,
  unfollows INT DEFAULT 0,
  
  -- Campaign Metrics
  campaigns_active INT DEFAULT 0,
  campaigns_completed INT DEFAULT 0,
  campaign_applications INT DEFAULT 0,
  
  -- Financial Metrics
  earnings_total DECIMAL(10,2) DEFAULT 0,
  earnings_pending DECIMAL(10,2) DEFAULT 0,
  
  -- Calculated Scores
  influence_score DECIMAL(5,2),
  reliability_score DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one entry per creator per date/period
  UNIQUE(creator_id, date, period)
);

-- ================================================================
-- CONTENT ANALYTICS (Per Item)
-- ================================================================
CREATE TABLE IF NOT EXISTS content_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content Reference
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('restaurant_save', 'board', 'portfolio_item', 'campaign_post')),
  content_id UUID NOT NULL, -- ID from respective table
  content_name VARCHAR(255),
  
  -- Metrics (Lifetime)
  views INT DEFAULT 0,
  unique_viewers INT DEFAULT 0,
  saves INT DEFAULT 0,
  shares INT DEFAULT 0,
  clicks INT DEFAULT 0,
  avg_view_duration INT, -- in seconds
  
  -- Calculated Metrics
  engagement_rate DECIMAL(5,2),
  virality_score DECIMAL(5,2),
  
  -- Timestamps
  first_view_at TIMESTAMPTZ,
  last_view_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one entry per content item
  UNIQUE(creator_id, content_type, content_id)
);

-- ================================================================
-- AUDIENCE INSIGHTS
-- ================================================================
CREATE TABLE IF NOT EXISTS audience_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Time Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Demographics
  age_distribution JSONB DEFAULT '{}', -- {"18-24": 20, "25-34": 35, ...}
  gender_distribution JSONB DEFAULT '{}', -- {"male": 45, "female": 50, "other": 5}
  location_distribution JSONB DEFAULT '[]', -- [{"city": "Charlotte", "percentage": 65}, ...]
  
  -- Interests
  top_interests JSONB DEFAULT '[]', -- [{"category": "Italian Food", "percentage": 30}, ...]
  
  -- Behavior
  peak_engagement_times JSONB DEFAULT '[]', -- [{"hour": 19, "day": "Friday", "engagement": 85}, ...]
  avg_session_duration INT, -- in seconds
  
  -- Growth
  follower_growth_rate DECIMAL(5,2),
  
  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One report per period
  UNIQUE(creator_id, period_start, period_end)
);

-- ================================================================
-- INDEXES
-- ================================================================

-- Campaigns
CREATE INDEX idx_campaigns_restaurant ON campaigns(restaurant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_location ON campaigns(location);

-- Creator Campaigns
CREATE INDEX idx_creator_campaigns_campaign ON creator_campaigns(campaign_id);
CREATE INDEX idx_creator_campaigns_creator ON creator_campaigns(creator_id);
CREATE INDEX idx_creator_campaigns_status ON creator_campaigns(status);
CREATE INDEX idx_creator_campaigns_dates ON creator_campaigns(applied_at, completed_at);

-- Earnings
CREATE INDEX idx_creator_earnings_creator ON creator_earnings(creator_id);
CREATE INDEX idx_creator_earnings_campaign ON creator_earnings(campaign_id);
CREATE INDEX idx_creator_earnings_status ON creator_earnings(status);
CREATE INDEX idx_creator_earnings_dates ON creator_earnings(earned_date, paid_date);

-- Payouts
CREATE INDEX idx_creator_payouts_creator ON creator_payouts(creator_id);
CREATE INDEX idx_creator_payouts_status ON creator_payouts(status);
CREATE INDEX idx_creator_payouts_dates ON creator_payouts(requested_at, completed_at);

-- Analytics
CREATE INDEX idx_creator_analytics_creator_date ON creator_analytics(creator_id, date);
CREATE INDEX idx_creator_analytics_period ON creator_analytics(period);
CREATE INDEX idx_content_analytics_creator ON content_analytics(creator_id);
CREATE INDEX idx_content_analytics_content ON content_analytics(content_type, content_id);
CREATE INDEX idx_audience_insights_creator ON audience_insights(creator_id);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_insights ENABLE ROW LEVEL SECURITY;

-- Campaigns: Public read, business owners can manage
CREATE POLICY "Anyone can view active campaigns"
  ON campaigns FOR SELECT
  USING (status IN ('active', 'completed'));

CREATE POLICY "Business owners can manage their campaigns"
  ON campaigns FOR ALL
  USING (
    business_id IN (
      SELECT id FROM business_accounts WHERE user_id = auth.uid()
    )
  );

-- Creator Campaigns: Creators see their own, campaign owners see all
CREATE POLICY "Creators can view their campaign applications"
  ON creator_campaigns FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can apply to campaigns"
  ON creator_campaigns FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update their campaign status"
  ON creator_campaigns FOR UPDATE
  USING (creator_id = auth.uid());

-- Earnings: Creators see their own
CREATE POLICY "Creators can view their earnings"
  ON creator_earnings FOR SELECT
  USING (creator_id = auth.uid());

-- Payouts: Creators see their own
CREATE POLICY "Creators can view their payouts"
  ON creator_payouts FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can request payouts"
  ON creator_payouts FOR INSERT
  WITH CHECK (creator_id = auth.uid());

-- Analytics: Creators see their own
CREATE POLICY "Creators can view their analytics"
  ON creator_analytics FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can view their content analytics"
  ON content_analytics FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can view their audience insights"
  ON audience_insights FOR SELECT
  USING (creator_id = auth.uid());

-- ================================================================
-- FUNCTIONS
-- ================================================================

-- Function to calculate creator metrics
CREATE OR REPLACE FUNCTION calculate_creator_metrics(p_creator_id UUID)
RETURNS TABLE (
  total_views INT,
  total_saves INT,
  engagement_rate DECIMAL,
  active_campaigns INT,
  total_earnings DECIMAL,
  pending_earnings DECIMAL,
  available_balance DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ca.content_views), 0)::INT as total_views,
    COALESCE(SUM(ca.content_saves), 0)::INT as total_saves,
    CASE 
      WHEN SUM(ca.content_views) > 0 
      THEN ROUND(((SUM(ca.content_saves) + SUM(ca.content_clicks))::DECIMAL / SUM(ca.content_views) * 100), 2)
      ELSE 0
    END as engagement_rate,
    COUNT(DISTINCT CASE WHEN cc.status = 'active' THEN cc.campaign_id END)::INT as active_campaigns,
    COALESCE(SUM(ce.amount), 0) as total_earnings,
    COALESCE(SUM(CASE WHEN ce.status = 'pending' THEN ce.amount ELSE 0 END), 0) as pending_earnings,
    COALESCE(SUM(CASE WHEN ce.status = 'available' THEN ce.amount ELSE 0 END), 0) as available_balance
  FROM users u
  LEFT JOIN creator_campaigns cc ON cc.creator_id = u.id
  LEFT JOIN creator_analytics ca ON ca.creator_id = u.id AND ca.date >= CURRENT_DATE - INTERVAL '30 days'
  LEFT JOIN creator_earnings ce ON ce.creator_id = u.id
  WHERE u.id = p_creator_id
  GROUP BY u.id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update campaign metrics
CREATE OR REPLACE FUNCTION update_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE campaigns
    SET 
      applications_count = (
        SELECT COUNT(*) FROM creator_campaigns 
        WHERE campaign_id = NEW.campaign_id AND status = 'applied'
      ),
      accepted_creators_count = (
        SELECT COUNT(*) FROM creator_campaigns 
        WHERE campaign_id = NEW.campaign_id AND status IN ('accepted', 'active', 'completed')
      ),
      updated_at = NOW()
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_metrics
AFTER INSERT OR UPDATE ON creator_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_campaign_metrics();

-- ================================================================
-- SAMPLE DATA FOR TESTING
-- ================================================================

-- Insert sample campaigns (will be linked to restaurants later)
INSERT INTO campaigns (
  restaurant_id,
  title,
  description,
  requirements,
  deliverables,
  payout_per_creator,
  budget_total,
  status,
  start_date,
  end_date,
  application_deadline,
  location,
  categories
) 
SELECT
  r.id,
  'Featured Creator Campaign - ' || r.name,
  'Help us reach food lovers in Charlotte by sharing your authentic experience at ' || r.name,
  '["40+ restaurant saves", "Active in Charlotte area", "Authentic food content", "3+ boards"]'::JSONB,
  '["Create 1 Instagram post", "Save to 2+ boards", "Share with friends", "Tag restaurant"]'::JSONB,
  CASE 
    WHEN RANDOM() < 0.3 THEN 50
    WHEN RANDOM() < 0.6 THEN 75
    ELSE 100
  END,
  500,
  CASE 
    WHEN RANDOM() < 0.7 THEN 'active'
    WHEN RANDOM() < 0.9 THEN 'draft'
    ELSE 'completed'
  END,
  NOW() - INTERVAL '7 days',
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '7 days',
  'Charlotte, NC',
  ARRAY['Local Favorites', 'Trending']
FROM restaurants r
LIMIT 5;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ CREATOR MARKETPLACE TABLES CREATED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '• campaigns - Restaurant marketing campaigns';
  RAISE NOTICE '• creator_campaigns - Creator applications and participation';
  RAISE NOTICE '• creator_earnings - Earnings tracking';
  RAISE NOTICE '• creator_payouts - Payout management';
  RAISE NOTICE '• creator_analytics - Performance metrics';
  RAISE NOTICE '• content_analytics - Per-content metrics';
  RAISE NOTICE '• audience_insights - Audience demographics';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Implement the creator screens in the app';
END $$;