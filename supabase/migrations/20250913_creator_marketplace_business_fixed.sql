-- Creator Marketplace Business Tables Migration (Fixed)
-- Date: 2025-09-13
-- Description: Updates existing tables and adds new ones for business dashboard

-- =============================================
-- UPDATE EXISTING CAMPAIGNS TABLE
-- =============================================
-- Add missing columns to existing campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS budget_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS spent_amount_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS max_creators INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS selected_creators_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_deliverables INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivered_content_count INTEGER DEFAULT 0;

-- Update existing columns if needed
UPDATE campaigns SET name = title WHERE name IS NULL AND title IS NOT NULL;
UPDATE campaigns SET owner_id = creator_id WHERE owner_id IS NULL AND creator_id IS NOT NULL;
UPDATE campaigns SET budget_cents = (budget * 100)::INTEGER WHERE budget_cents = 0 AND budget IS NOT NULL;

-- =============================================
-- CAMPAIGN APPLICATIONS TABLE (NEW)
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
CREATE INDEX IF NOT EXISTS idx_applications_campaign ON campaign_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_applications_creator ON campaign_applications(creator_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON campaign_applications(status);

-- =============================================
-- PORTFOLIO ITEMS TABLE (NEW)
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
CREATE INDEX IF NOT EXISTS idx_portfolio_creator ON portfolio_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_campaign ON portfolio_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_restaurant ON portfolio_items(restaurant_id);

-- =============================================
-- UPDATE CREATOR PROFILES TABLE
-- =============================================
-- Add missing columns to existing creator_profiles
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS content_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_status VARCHAR(30) DEFAULT 'active' 
  CHECK (account_status IN ('active', 'suspended', 'pending_verification'));

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view public campaigns" ON campaigns;
DROP POLICY IF EXISTS "Business owners can manage their campaigns" ON campaigns;
DROP POLICY IF EXISTS "Creators can view their applications" ON campaign_applications;
DROP POLICY IF EXISTS "Business owners can view applications to their campaigns" ON campaign_applications;
DROP POLICY IF EXISTS "Creators can create applications" ON campaign_applications;
DROP POLICY IF EXISTS "Anyone can view portfolio items" ON portfolio_items;
DROP POLICY IF EXISTS "Creators can manage their portfolio" ON portfolio_items;
DROP POLICY IF EXISTS "Users can view business profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can manage their business profile" ON business_profiles;
DROP POLICY IF EXISTS "Anyone can view creator profiles" ON creator_profiles;
DROP POLICY IF EXISTS "Users can manage their creator profile" ON creator_profiles;

-- Campaigns policies
CREATE POLICY "Users can view public campaigns" ON campaigns
  FOR SELECT USING (status IN ('active', 'completed'));

CREATE POLICY "Business owners can manage their campaigns" ON campaigns
  FOR ALL USING (owner_id = auth.uid() OR creator_id = auth.uid());

-- Applications policies
CREATE POLICY "Creators can view their applications" ON campaign_applications
  FOR SELECT USING (creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Business owners can view applications to their campaigns" ON campaign_applications
  FOR SELECT USING (campaign_id IN (
    SELECT id FROM campaigns WHERE owner_id = auth.uid() OR creator_id = auth.uid()
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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_campaign_spent_trigger ON campaign_applications;
CREATE TRIGGER update_campaign_spent_trigger
AFTER INSERT OR UPDATE ON campaign_applications
FOR EACH ROW
EXECUTE FUNCTION update_campaign_spent_amount();

-- Function to update selected creators count
CREATE OR REPLACE FUNCTION update_selected_creators_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle both NEW (for INSERT/UPDATE) and OLD (for DELETE)
  IF TG_OP = 'DELETE' THEN
    UPDATE campaigns
    SET selected_creators_count = (
      SELECT COUNT(*)
      FROM campaign_applications
      WHERE campaign_id = OLD.campaign_id AND status = 'accepted'
    )
    WHERE id = OLD.campaign_id;
    RETURN OLD;
  ELSE
    UPDATE campaigns
    SET selected_creators_count = (
      SELECT COUNT(*)
      FROM campaign_applications
      WHERE campaign_id = NEW.campaign_id AND status = 'accepted'
    )
    WHERE id = NEW.campaign_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_creators_count_trigger ON campaign_applications;
CREATE TRIGGER update_creators_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON campaign_applications
FOR EACH ROW
EXECUTE FUNCTION update_selected_creators_count();

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================
-- Uncomment and update IDs to add sample data

-- Example: Update an existing campaign with new fields
-- UPDATE campaigns 
-- SET 
--   budget_cents = 50000,
--   start_date = '2025-09-01',
--   end_date = '2025-09-30',
--   max_creators = 5,
--   status = 'active'
-- WHERE id = 'YOUR_CAMPAIGN_ID';

-- Example: Create a test campaign
-- INSERT INTO campaigns (
--   restaurant_id, 
--   owner_id, 
--   name, 
--   description, 
--   status, 
--   budget_cents, 
--   start_date, 
--   end_date
-- ) VALUES (
--   'YOUR_RESTAURANT_ID', 
--   'YOUR_USER_ID', 
--   'Fall Promotion', 
--   'Promote our seasonal menu', 
--   'active', 
--   75000, 
--   '2025-09-15', 
--   '2025-10-15'
-- );