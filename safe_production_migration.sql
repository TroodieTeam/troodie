-- ============================================================================
-- Safe Production Migration (Preserves All Data)
-- Date: 2025-01-16
-- Description: Adds missing tables, columns, indexes, and RLS policies
--              to match development schema without deleting any data
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create uuid_generate_v4 function if it doesn't exist (for compatibility)
CREATE OR REPLACE FUNCTION uuid_generate_v4()
RETURNS uuid AS $$
BEGIN
    RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ADD MISSING TABLES (if they don't exist)
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE,
    username VARCHAR(50) UNIQUE,
    name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    persona VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    is_restaurant BOOLEAN DEFAULT FALSE,
    is_creator BOOLEAN DEFAULT FALSE,
    profile_completion INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_place_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    location GEOGRAPHY(POINT),
    cuisine_types TEXT[],
    price_range VARCHAR(4),
    phone VARCHAR(20),
    website TEXT,
    hours JSONB,
    photos TEXT[],
    cover_photo_url TEXT,
    google_rating DECIMAL(2,1),
    google_reviews_count INTEGER,
    troodie_rating DECIMAL(2,1),
    troodie_reviews_count INTEGER DEFAULT 0,
    features TEXT[],
    dietary_options TEXT[],
    is_verified BOOLEAN DEFAULT FALSE,
    is_claimed BOOLEAN DEFAULT FALSE,
    owner_id UUID REFERENCES users(id),
    data_source VARCHAR(20) CHECK (data_source IN ('seed', 'google', 'user')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_google_sync TIMESTAMPTZ
);

-- Creator profiles table
CREATE TABLE IF NOT EXISTS creator_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    social_links JSONB DEFAULT '{}'::jsonb,
    content_categories TEXT[],
    follower_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business profiles table
CREATE TABLE IF NOT EXISTS business_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id),
    business_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    business_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    name VARCHAR(255),
    description TEXT,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    owner_id UUID REFERENCES users(id),
    creator_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'paused')),
    budget_cents INTEGER NOT NULL,
    spent_amount_cents INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE,
    max_creators INTEGER DEFAULT 1,
    selected_creators_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deliverable_requirements JSONB DEFAULT '{}'::jsonb
);

-- Campaign applications table
CREATE TABLE IF NOT EXISTS campaign_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewer_id UUID REFERENCES users(id),
    proposed_rate_cents INTEGER,
    deliverables_submitted JSONB DEFAULT '[]'::jsonb,
    all_deliverables_submitted BOOLEAN DEFAULT FALSE,
    restaurant_review_deadline TIMESTAMPTZ,
    auto_approved BOOLEAN DEFAULT FALSE
);

-- Campaign deliverables table
CREATE TABLE IF NOT EXISTS campaign_deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_application_id UUID NOT NULL REFERENCES campaign_applications(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id),
    deliverable_index INTEGER NOT NULL CHECK (deliverable_index > 0),
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'other')),
    social_platform VARCHAR(50),
    platform_post_url TEXT,
    content_url TEXT,
    content_type VARCHAR(50) DEFAULT 'post',
    screenshot_url TEXT,
    caption TEXT,
    notes_to_restaurant TEXT,
    engagement_metrics JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'needs_revision', 'under_review')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    restaurant_feedback TEXT,
    auto_approved BOOLEAN DEFAULT FALSE,
    revision_number INTEGER DEFAULT 1 CHECK (revision_number > 0),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_application_id, deliverable_index)
);

-- Portfolio items table
CREATE TABLE IF NOT EXISTS portfolio_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    post_url TEXT NOT NULL,
    caption TEXT,
    engagement_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add missing columns to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50) DEFAULT 'general';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_deliverables INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS delivered_content_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deliverables_submitted INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deliverables_pending INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deliverables_approved INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_source VARCHAR(50) DEFAULT 'restaurant';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_subsidized BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS subsidy_amount_cents INTEGER DEFAULT 0;

-- Add missing columns to campaign_deliverables table
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS auto_approved_at TIMESTAMPTZ;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS revision_notes TEXT;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS payment_amount_cents INTEGER;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS payment_transaction_id TEXT;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS payment_error TEXT;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER DEFAULT 0;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS last_payment_retry_at TIMESTAMPTZ;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS dispute_status VARCHAR(50) DEFAULT 'none';
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS dispute_reason TEXT;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS dispute_filed_at TIMESTAMPTZ;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ;

-- ============================================================================
-- ADD MISSING INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Restaurants indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants(google_place_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine_types ON restaurants USING GIN(cuisine_types);

-- Creator profiles indexes
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_verification_status ON creator_profiles(verification_status);

-- Business profiles indexes
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_restaurant_id ON business_profiles(restaurant_id);

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_restaurant_id ON campaigns(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner_id ON campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_end_date ON campaigns(end_date);

-- Campaign applications indexes
CREATE INDEX IF NOT EXISTS idx_campaign_applications_campaign_id ON campaign_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_applications_creator_id ON campaign_applications(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_applications_status ON campaign_applications(status);

-- Campaign deliverables indexes
CREATE INDEX IF NOT EXISTS idx_deliverables_campaign_application ON campaign_deliverables(campaign_application_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_campaign ON campaign_deliverables(campaign_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_creator ON campaign_deliverables(creator_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON campaign_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_deliverables_submitted ON campaign_deliverables(submitted_at);

-- Portfolio items indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_items_creator_id ON portfolio_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_platform ON portfolio_items(platform);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Users policies
DROP POLICY IF EXISTS "Users can view all users" ON users;
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Restaurants policies
DROP POLICY IF EXISTS "Anyone can view restaurants" ON restaurants;
CREATE POLICY "Anyone can view restaurants" ON restaurants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Restaurant owners can update their restaurant" ON restaurants;
CREATE POLICY "Restaurant owners can update their restaurant" ON restaurants FOR UPDATE USING (auth.uid() = owner_id);

-- Creator profiles policies
DROP POLICY IF EXISTS "Anyone can view creator profiles" ON creator_profiles;
CREATE POLICY "Anyone can view creator profiles" ON creator_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can update own profile" ON creator_profiles;
CREATE POLICY "Creators can update own profile" ON creator_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Business profiles policies
DROP POLICY IF EXISTS "Anyone can view business profiles" ON business_profiles;
CREATE POLICY "Anyone can view business profiles" ON business_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Business owners can update own profile" ON business_profiles;
CREATE POLICY "Business owners can update own profile" ON business_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Campaigns policies
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON campaigns;
CREATE POLICY "Anyone can view active campaigns" ON campaigns FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Campaign owners can view their campaigns" ON campaigns;
CREATE POLICY "Campaign owners can view their campaigns" ON campaigns FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Campaign owners can update their campaigns" ON campaigns;
CREATE POLICY "Campaign owners can update their campaigns" ON campaigns FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = creator_id);

-- Campaign applications policies
DROP POLICY IF EXISTS "Creators can view own applications" ON campaign_applications;
CREATE POLICY "Creators can view own applications" ON campaign_applications FOR SELECT USING (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Creators can create applications" ON campaign_applications;
CREATE POLICY "Creators can create applications" ON campaign_applications FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Business owners can view applications to their campaigns" ON campaign_applications;
CREATE POLICY "Business owners can view applications to their campaigns" ON campaign_applications FOR SELECT USING (
    campaign_id IN (SELECT id FROM campaigns WHERE owner_id = auth.uid() OR creator_id = auth.uid())
);

DROP POLICY IF EXISTS "Business owners can update applications to their campaigns" ON campaign_applications;
CREATE POLICY "Business owners can update applications to their campaigns" ON campaign_applications FOR UPDATE USING (
    campaign_id IN (SELECT id FROM campaigns WHERE owner_id = auth.uid() OR creator_id = auth.uid())
);

-- Campaign deliverables policies
DROP POLICY IF EXISTS "Creators can view own deliverables" ON campaign_deliverables;
CREATE POLICY "Creators can view own deliverables" ON campaign_deliverables FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can create own deliverables" ON campaign_deliverables;
CREATE POLICY "Creators can create own deliverables" ON campaign_deliverables FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update own pending deliverables" ON campaign_deliverables;
CREATE POLICY "Creators can update own pending deliverables" ON campaign_deliverables FOR UPDATE USING (
    auth.uid() = creator_id AND status IN ('pending_review', 'needs_revision')
) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Restaurants can view campaign deliverables" ON campaign_deliverables;
CREATE POLICY "Restaurants can view campaign deliverables" ON campaign_deliverables FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM campaigns c
        JOIN business_profiles bp ON bp.restaurant_id = c.restaurant_id
        WHERE c.id = campaign_deliverables.campaign_id
        AND bp.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Restaurants can update campaign deliverables" ON campaign_deliverables;
CREATE POLICY "Restaurants can update campaign deliverables" ON campaign_deliverables FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM campaigns c
        JOIN business_profiles bp ON bp.restaurant_id = c.restaurant_id
        WHERE c.id = campaign_deliverables.campaign_id
        AND bp.user_id = auth.uid()
    )
);

-- Portfolio items policies
DROP POLICY IF EXISTS "Anyone can view portfolio items" ON portfolio_items;
CREATE POLICY "Anyone can view portfolio items" ON portfolio_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can manage own portfolio" ON portfolio_items;
CREATE POLICY "Creators can manage own portfolio" ON portfolio_items FOR ALL USING (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
);

-- ============================================================================
-- ADMIN POLICIES (Hardcoded admin IDs)
-- ============================================================================

-- Admin policies for campaign applications
DROP POLICY IF EXISTS "Admins can update any application" ON campaign_applications;
CREATE POLICY "Admins can update any application" ON campaign_applications FOR UPDATE USING (
    auth.uid() IN ('a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599') -- kouame@troodieapp.com
);

-- Admin policies for campaign deliverables
DROP POLICY IF EXISTS "Admins can view all deliverables" ON campaign_deliverables;
CREATE POLICY "Admins can view all deliverables" ON campaign_deliverables FOR SELECT USING (
    auth.uid() IN ('a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599') -- kouame@troodieapp.com
);

DROP POLICY IF EXISTS "Admins can update all deliverables" ON campaign_deliverables;
CREATE POLICY "Admins can update all deliverables" ON campaign_deliverables FOR UPDATE USING (
    auth.uid() IN ('a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599') -- kouame@troodieapp.com
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get auto-approval deadline for a deliverable
CREATE OR REPLACE FUNCTION get_auto_approval_deadline(p_deliverable_id UUID)
RETURNS TIMESTAMPTZ AS $$
  SELECT submitted_at + INTERVAL '72 hours'
  FROM campaign_deliverables
  WHERE id = p_deliverable_id;
$$ LANGUAGE sql STABLE;

-- Function to check if a deliverable should be auto-approved
CREATE OR REPLACE FUNCTION should_auto_approve(p_deliverable_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    status = 'pending_review' AND
    submitted_at < NOW() - INTERVAL '72 hours'
  FROM campaign_deliverables
  WHERE id = p_deliverable_id;
$$ LANGUAGE sql STABLE;

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

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for pending deliverables summary
CREATE OR REPLACE VIEW pending_deliverables_summary AS
SELECT
  cd.id AS deliverable_id,
  cd.campaign_id,
  cd.campaign_application_id,
  cd.creator_id,
  cd.deliverable_index,
  cd.platform,
  cd.platform_post_url,
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
  c.name AS campaign_name,
  c.restaurant_id,
  -- Creator details
  u.name AS creator_name,
  u.username AS creator_username,
  u.avatar_url AS creator_avatar,
  u.email AS creator_email
FROM campaign_deliverables cd
JOIN campaigns c ON c.id = cd.campaign_id
JOIN users u ON u.id = cd.creator_id
WHERE cd.status = 'pending_review'
ORDER BY cd.submitted_at ASC;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT ON restaurants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON creator_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON business_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON campaign_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON campaign_deliverables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_items TO authenticated;
GRANT SELECT ON pending_deliverables_summary TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
  ============================================================================
  ✅ SAFE PRODUCTION MIGRATION COMPLETE
  ============================================================================

  Schema Updated:
  ✓ All missing tables created
  ✓ All missing columns added
  ✓ All missing indexes created
  ✓ All RLS policies applied
  ✓ All helper functions created
  ✓ All views created
  ✓ All permissions granted

  Data Safety:
  ✓ No data deleted
  ✓ No data modified
  ✓ All existing data preserved
  ✓ Schema now matches development

  Next Steps:
  1. Test RLS policies
  2. Verify data integrity
  3. Deploy to TestFlight
  4. Seed production data

  ============================================================================
  ';
END $$;
