# Database Schema Design for Creator Marketplace

- Epic: CM (Creator Marketplace)
- Priority: Critical
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: CM-001

## Overview
Design and implement comprehensive database schema for Creator Marketplace including creator profiles, campaigns, applications, and attribution tracking. This forms the data foundation for all marketplace functionality.

## Business Value
- Enables all Creator Marketplace features with proper data relationships
- Ensures scalability for thousands of creators and campaigns
- Provides foundation for analytics and performance tracking
- Critical for campaign attribution and payment processing

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Creator Marketplace Database Schema
  As a developer
  I want a comprehensive database schema
  So that all marketplace features can store and retrieve data efficiently

  Scenario: Creator profile storage
    Given a user becomes a creator
    When they complete onboarding
    Then their creator profile is stored with all required fields
    And portfolio items are linked correctly
    And metrics are tracked with proper data types

  Scenario: Campaign lifecycle
    Given a restaurant creates a campaign
    When creators apply and are selected
    Then all campaign data is stored with proper relationships
    And application status changes are tracked
    And attribution events can be recorded

  Scenario: Performance queries
    Given thousands of creators and campaigns exist
    When searching for creator matches
    Then queries return results in under 200ms
    And database indexes optimize common access patterns
```

## Technical Implementation

### Core Tables

#### Creator Profiles
```sql
CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE,
  handle VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  
  -- Creator-specific fields
  creator_type VARCHAR(20) CHECK (creator_type IN ('influencer', 'blogger', 'photographer', 'reviewer')),
  specialties JSONB DEFAULT '[]', -- ['brunch', 'fine_dining', 'street_food']
  
  -- Metrics
  followers_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4) DEFAULT 0,
  avg_reach INTEGER DEFAULT 0,
  content_count INTEGER DEFAULT 0,
  
  -- Location & availability
  primary_location POINT,
  service_radius_km INTEGER DEFAULT 25,
  availability JSONB DEFAULT '{}',
  
  -- Monetization
  stripe_connect_id VARCHAR(255),
  payment_status VARCHAR(20) DEFAULT 'pending',
  base_rate_cents INTEGER,
  
  -- AI embeddings
  content_embedding vector(1536),
  style_embedding vector(512),
  
  -- Verification
  verified_platforms JSONB DEFAULT '[]',
  verification_status VARCHAR(20) DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_creator_profiles_location ON creator_profiles USING gist(primary_location);
CREATE INDEX idx_creator_profiles_specialties ON creator_profiles USING gin(specialties);
CREATE INDEX idx_creator_profiles_embedding ON creator_profiles USING ivfflat (content_embedding vector_cosine_ops);
CREATE INDEX idx_creator_profiles_verification ON creator_profiles (verification_status, created_at);
```

#### Campaigns
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id),
  owner_id UUID REFERENCES users(id),
  
  -- Campaign details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'draft',
  
  -- Targeting
  target_audience JSONB DEFAULT '{}',
  target_locations JSONB DEFAULT '[]',
  target_demographics JSONB DEFAULT '{}',
  
  -- Budget & timeline
  budget_cents INTEGER,
  budget_type VARCHAR(20) DEFAULT 'fixed',
  start_date DATE,
  end_date DATE,
  
  -- Deliverables
  deliverables JSONB DEFAULT '[]',
  content_guidelines JSONB DEFAULT '{}',
  
  -- AI-generated elements
  ai_suggestions JSONB DEFAULT '[]',
  predicted_reach INTEGER,
  predicted_engagement INTEGER,
  confidence_score DECIMAL(3,2),
  
  -- Performance tracking
  actual_reach INTEGER DEFAULT 0,
  actual_engagement INTEGER DEFAULT 0,
  attributed_visits INTEGER DEFAULT 0,
  roi_percentage DECIMAL(5,2),
  
  -- Creator management
  max_creators INTEGER DEFAULT 5,
  selected_creators_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_campaigns_status_dates ON campaigns (status, start_date, end_date);
CREATE INDEX idx_campaigns_restaurant ON campaigns (restaurant_id, status);
CREATE INDEX idx_campaigns_budget ON campaigns (budget_cents) WHERE status = 'active';
```

#### Campaign Applications
```sql
CREATE TABLE campaign_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id),
  creator_id UUID REFERENCES creator_profiles(id),
  
  -- Application details
  proposed_rate_cents INTEGER,
  proposed_deliverables TEXT,
  portfolio_samples JSONB DEFAULT '[]',
  cover_letter TEXT,
  
  -- AI scoring
  relevance_score DECIMAL(3,2),
  audience_match_score DECIMAL(3,2),
  past_performance_score DECIMAL(3,2),
  overall_score DECIMAL(3,2),
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending',
  applied_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewer_id UUID REFERENCES users(id),
  rejection_reason TEXT,
  
  -- Contract terms (if accepted)
  final_rate_cents INTEGER,
  contract_terms JSONB DEFAULT '{}',
  
  UNIQUE(campaign_id, creator_id)
);

-- Indexes
CREATE INDEX idx_applications_campaign_status ON campaign_applications (campaign_id, status);
CREATE INDEX idx_applications_creator_status ON campaign_applications (creator_id, status, applied_at);
CREATE INDEX idx_applications_score ON campaign_applications (overall_score DESC) WHERE status = 'pending';
```

#### Portfolio Items
```sql
CREATE TABLE portfolio_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creator_profiles(id),
  
  -- Content details
  platform VARCHAR(20), -- 'instagram', 'tiktok', 'youtube', 'troodie'
  content_url TEXT,
  content_type VARCHAR(20), -- 'photo', 'video', 'reel', 'story'
  thumbnail_url TEXT,
  
  -- Performance metrics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4),
  
  -- Restaurant association
  restaurant_id UUID REFERENCES restaurants(id),
  restaurant_name VARCHAR(255),
  location POINT,
  
  -- AI-extracted features
  cuisine_tags JSONB DEFAULT '[]',
  ambiance_tags JSONB DEFAULT '[]',
  price_range VARCHAR(10),
  content_embedding vector(1536),
  
  posted_at TIMESTAMP,
  imported_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_portfolio_creator_date ON portfolio_items (creator_id, posted_at DESC);
CREATE INDEX idx_portfolio_restaurant ON portfolio_items (restaurant_id) WHERE restaurant_id IS NOT NULL;
CREATE INDEX idx_portfolio_performance ON portfolio_items (engagement_rate DESC, views DESC);
```

#### Attribution Events
```sql
CREATE TABLE attribution_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id),
  creator_id UUID REFERENCES creator_profiles(id),
  user_id UUID REFERENCES users(id), -- who performed the action
  
  -- Event details
  event_type VARCHAR(50), -- 'view', 'click', 'visit', 'purchase', 'save'
  platform VARCHAR(20), -- where the event originated
  content_url TEXT,
  
  -- Attribution data
  referrer_url TEXT,
  user_agent TEXT,
  ip_address INET,
  location POINT,
  
  -- Value tracking
  value_cents INTEGER DEFAULT 0,
  conversion_type VARCHAR(50),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_attribution_campaign_date ON attribution_events (campaign_id, created_at);
CREATE INDEX idx_attribution_creator_date ON attribution_events (creator_id, created_at);
CREATE INDEX idx_attribution_type ON attribution_events (event_type, created_at);
CREATE INDEX idx_attribution_value ON attribution_events (value_cents) WHERE value_cents > 0;
```

#### Payment Transactions
```sql
CREATE TABLE creator_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creator_profiles(id),
  campaign_id UUID REFERENCES campaigns(id),
  
  -- Transaction details
  type VARCHAR(30), -- 'campaign_payment', 'bonus', 'refund', 'withdrawal'
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER DEFAULT 0,
  net_amount_cents INTEGER NOT NULL,
  
  -- Payment processing
  stripe_transfer_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transactions_creator_date ON creator_transactions (creator_id, created_at DESC);
CREATE INDEX idx_transactions_status ON creator_transactions (status, created_at);
CREATE INDEX idx_transactions_stripe ON creator_transactions (stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL;
```

### Views for Common Queries

```sql
-- Creator dashboard summary
CREATE VIEW creator_dashboard_summary AS
SELECT 
  cp.id,
  cp.display_name,
  cp.followers_count,
  cp.engagement_rate,
  COUNT(DISTINCT ca.id) as active_applications,
  COUNT(DISTINCT c.id) as active_campaigns,
  COALESCE(SUM(ct.net_amount_cents), 0) as total_earnings_cents,
  COALESCE(SUM(CASE WHEN ct.status = 'pending' THEN ct.net_amount_cents ELSE 0 END), 0) as pending_earnings_cents
FROM creator_profiles cp
LEFT JOIN campaign_applications ca ON cp.id = ca.creator_id AND ca.status IN ('pending', 'accepted')
LEFT JOIN campaigns c ON ca.campaign_id = c.id AND c.status = 'active'
LEFT JOIN creator_transactions ct ON cp.id = ct.creator_id
GROUP BY cp.id, cp.display_name, cp.followers_count, cp.engagement_rate;

-- Campaign performance summary
CREATE VIEW campaign_performance_summary AS
SELECT 
  c.id,
  c.name,
  c.status,
  c.budget_cents,
  COUNT(DISTINCT ca.creator_id) as total_applicants,
  COUNT(DISTINCT CASE WHEN ca.status = 'accepted' THEN ca.creator_id END) as selected_creators,
  COALESCE(SUM(ae.value_cents), 0) as attributed_value_cents,
  COUNT(DISTINCT ae.user_id) as unique_interactions
FROM campaigns c
LEFT JOIN campaign_applications ca ON c.id = ca.campaign_id
LEFT JOIN attribution_events ae ON c.id = ae.campaign_id
GROUP BY c.id, c.name, c.status, c.budget_cents;
```

### Migration Strategy
1. Create new tables without foreign key constraints
2. Populate with test data
3. Add foreign key constraints
4. Create indexes after data population
5. Test query performance
6. Update application code to use new schema

## Definition of Done
- [ ] All tables created with proper constraints
- [ ] Indexes optimized for expected query patterns
- [ ] Foreign key relationships established
- [ ] Views created for common dashboard queries
- [ ] Migration scripts tested on staging data
- [ ] Query performance meets requirements (<200ms)
- [ ] Database documentation updated
- [ ] Backup and recovery procedures tested

## Notes
- Use Supabase's built-in vector extension for AI embeddings
- Consider partitioning attribution_events table by date for large scale
- Plan for international creators (currency handling)
- Reference: tasks/CREATOR_MARKETPLACE_TECHNICAL_DESIGN.md sections 1.1, 1.2