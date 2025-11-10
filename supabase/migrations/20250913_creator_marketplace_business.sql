-- Creator Marketplace Business Tables Migration
-- Date: 2025-09-13
-- Description: Add tables for business dashboard, campaigns, and analytics

-- =============================================
-- CAMPAIGNS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Campaign details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50) DEFAULT 'general',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'paused')),
  
  -- Budget & costs
  budget_cents INTEGER NOT NULL DEFAULT 0,
  spent_amount_cents INTEGER DEFAULT 0,
  
  -- Timeline
  start_date DATE,
  end_date DATE,
  
  -- Creator management
  max_creators INTEGER DEFAULT 5,
  selected_creators_count INTEGER DEFAULT 0,
  
  -- Deliverables tracking
  total_deliverables INTEGER DEFAULT 0,
  delivered_content_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for campaigns
CREATE INDEX idx_campaigns_restaurant ON campaigns(restaurant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

-- =============================================
-- CAMPAIGN APPLICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS campaign_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
  
  -- Application details
  proposed_rate_cents INTEGER,
  proposed_deliverables TEXT,
  cover_letter TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  
  -- Timestamps
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_id UUID REFERENCES auth.users(id),
  
  -- Unique constraint
  UNIQUE(campaign_id, creator_id)
);

-- Indexes for applications
CREATE INDEX idx_applications_campaign ON campaign_applications(campaign_id);
CREATE INDEX idx_applications_creator ON campaign_applications(creator_id);
CREATE INDEX idx_applications_status ON campaign_applications(status);

-- =============================================
-- PORTFOLIO ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS portfolio_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- Content details
  content_url TEXT,
  thumbnail_url TEXT,
  content_type VARCHAR(20) CHECK (content_type IN ('photo', 'video', 'reel', 'story')),
  caption TEXT,
  
  -- Metrics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  
  -- Restaurant association
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  restaurant_name VARCHAR(255),
  
  -- Timestamps
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for portfolio items
CREATE INDEX idx_portfolio_creator ON portfolio_items(creator_id);
CREATE INDEX idx_portfolio_campaign ON portfolio_items(campaign_id);
CREATE INDEX idx_portfolio_restaurant ON portfolio_items(restaurant_id);

-- =============================================
-- BUSINESS PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  
  -- Verification
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Permissions
  management_permissions TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for business profiles
CREATE INDEX idx_business_profiles_user ON business_profiles(user_id);
CREATE INDEX idx_business_profiles_restaurant ON business_profiles(restaurant_id);

-- =============================================
-- CREATOR PROFILES TABLE (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Profile info
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  specialties TEXT[],
  location VARCHAR(255),
  
  -- Status
  account_status VARCHAR(30) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending_verification')),
  
  -- Metrics
  followers_count INTEGER DEFAULT 0,
  content_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for creator profiles
CREATE INDEX idx_creator_profiles_user ON creator_profiles(user_id);
CREATE INDEX idx_creator_profiles_status ON creator_profiles(account_status);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- Campaigns policies
CREATE POLICY "Users can view public campaigns" ON campaigns
  FOR SELECT USING (status IN ('active', 'completed'));

CREATE POLICY "Business owners can manage their campaigns" ON campaigns
  FOR ALL USING (owner_id = auth.uid());

-- Applications policies
CREATE POLICY "Creators can view their applications" ON campaign_applications
  FOR SELECT USING (creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Business owners can view applications to their campaigns" ON campaign_applications
  FOR SELECT USING (campaign_id IN (
    SELECT id FROM campaigns WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Creators can create applications" ON campaign_applications
  FOR INSERT WITH CHECK (creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  ));

-- Portfolio items policies
CREATE POLICY "Anyone can view portfolio items" ON portfolio_items
  FOR SELECT USING (true);

CREATE POLICY "Creators can manage their portfolio" ON portfolio_items
  FOR ALL USING (creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  ));

-- Business profiles policies
CREATE POLICY "Users can view business profiles" ON business_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their business profile" ON business_profiles
  FOR ALL USING (user_id = auth.uid());

-- Creator profiles policies
CREATE POLICY "Anyone can view creator profiles" ON creator_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their creator profile" ON creator_profiles
  FOR ALL USING (user_id = auth.uid());

-- =============================================
-- FUNCTIONS FOR ANALYTICS
-- =============================================

-- Function to update campaign spent amount
CREATE OR REPLACE FUNCTION update_campaign_spent_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns
  SET spent_amount_cents = (
    SELECT COALESCE(SUM(proposed_rate_cents), 0)
    FROM campaign_applications
    WHERE campaign_id = NEW.campaign_id AND status = 'accepted'
  )
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update spent amount
CREATE TRIGGER update_campaign_spent_trigger
AFTER INSERT OR UPDATE ON campaign_applications
FOR EACH ROW
EXECUTE FUNCTION update_campaign_spent_amount();

-- Function to update selected creators count
CREATE OR REPLACE FUNCTION update_selected_creators_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns
  SET selected_creators_count = (
    SELECT COUNT(*)
    FROM campaign_applications
    WHERE campaign_id = NEW.campaign_id AND status = 'accepted'
  )
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update creators count
CREATE TRIGGER update_creators_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON campaign_applications
FOR EACH ROW
EXECUTE FUNCTION update_selected_creators_count();

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================
-- Uncomment to add sample data

-- INSERT INTO business_profiles (user_id, restaurant_id, verification_status)
-- VALUES 
--   ('YOUR_USER_ID', 'YOUR_RESTAURANT_ID', 'verified');

-- INSERT INTO campaigns (restaurant_id, owner_id, name, description, status, budget_cents, start_date, end_date)
-- VALUES
--   ('YOUR_RESTAURANT_ID', 'YOUR_USER_ID', 'Summer Food Promotion', 'Promote our summer menu', 'active', 50000, '2025-09-01', '2025-09-30'),
--   ('YOUR_RESTAURANT_ID', 'YOUR_USER_ID', 'Grand Opening', 'Celebrate our grand opening', 'draft', 100000, '2025-10-01', '2025-10-31');