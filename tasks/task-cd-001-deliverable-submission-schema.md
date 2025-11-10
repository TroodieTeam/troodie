# Task: Campaign Deliverable Submission Schema

**Epic:** deliverable-submission
**Priority:** P0 - Critical
**Estimate:** 2 days
**Status:** 🟡 Needs Review

---

## Overview

Create the database schema to support campaign deliverable submissions, tracking, approval workflow, and payment processing.

## Business Value

Foundation for the entire campaign deliverables MVP - enables creators to submit work, restaurants to review, and automated payment flow.

## Acceptance Criteria

```gherkin
Feature: Campaign Deliverable Submission Schema

  Scenario: Creator submits a deliverable
    Given a campaign application with status "accepted"
    When the creator submits deliverable content with metadata
    Then the deliverable is stored with status "pending_review"
    And the submission timestamp is recorded
    And the restaurant owner is notified

  Scenario: Restaurant reviews deliverable
    Given a deliverable with status "pending_review"
    When the restaurant owner approves or rejects it
    Then the deliverable status is updated
    And the review timestamp is recorded
    And the reviewer ID is stored

  Scenario: Auto-approval after 72 hours
    Given a deliverable with status "pending_review"
    When 72 hours have elapsed since submission
    And no review action has been taken
    Then the deliverable status changes to "auto_approved"
    And payment processing is triggered

  Scenario: Payment tracking
    Given an approved deliverable
    When payment is processed
    Then payment status, amount, and transaction ID are recorded
    And payment timestamp is stored
```

## Technical Implementation

### 1. Create `campaign_deliverables` table

```sql
CREATE TABLE campaign_deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_application_id UUID REFERENCES campaign_applications(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,

  -- Deliverable content
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('photo', 'video', 'reel', 'story', 'post')),
  content_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  social_platform VARCHAR(50), -- instagram, tiktok, youtube, twitter, etc.
  platform_post_url TEXT, -- Link to the actual post

  -- Metrics (can be updated after posting)
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2), -- Calculated field

  -- Submission & Review workflow
  status VARCHAR(50) DEFAULT 'pending_review' CHECK (status IN (
    'draft',
    'pending_review',
    'approved',
    'auto_approved',
    'rejected',
    'revision_requested',
    'disputed'
  )),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_id UUID REFERENCES auth.users(id),
  auto_approved_at TIMESTAMP WITH TIME ZONE,

  -- Review feedback
  review_notes TEXT,
  rejection_reason TEXT,
  revision_notes TEXT,

  -- Payment
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'disputed',
    'refunded'
  )),
  payment_amount_cents INTEGER, -- From campaign_applications.proposed_rate_cents
  payment_transaction_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Dispute handling
  dispute_status VARCHAR(50) CHECK (dispute_status IN (
    'none',
    'creator_disputed',
    'restaurant_disputed',
    'under_review',
    'resolved'
  )),
  dispute_reason TEXT,
  dispute_filed_at TIMESTAMP WITH TIME ZONE,
  dispute_resolved_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_auto_approval CHECK (
    (status = 'auto_approved' AND auto_approved_at IS NOT NULL) OR
    (status != 'auto_approved')
  )
);

-- Indexes
CREATE INDEX idx_deliverables_application ON campaign_deliverables(campaign_application_id);
CREATE INDEX idx_deliverables_creator ON campaign_deliverables(creator_id);
CREATE INDEX idx_deliverables_restaurant ON campaign_deliverables(restaurant_id);
CREATE INDEX idx_deliverables_campaign ON campaign_deliverables(campaign_id);
CREATE INDEX idx_deliverables_status ON campaign_deliverables(status);
CREATE INDEX idx_deliverables_payment_status ON campaign_deliverables(payment_status);
CREATE INDEX idx_deliverables_submitted_at ON campaign_deliverables(submitted_at);
CREATE INDEX idx_deliverables_auto_approval ON campaign_deliverables(submitted_at, status)
  WHERE status = 'pending_review';
```

### 2. Create `deliverable_revisions` table (for revision history)

```sql
CREATE TABLE deliverable_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id UUID REFERENCES campaign_deliverables(id) ON DELETE CASCADE NOT NULL,

  -- Revision content
  content_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  revision_number INTEGER NOT NULL,

  -- Tracking
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_by UUID REFERENCES auth.users(id),
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_revisions_deliverable ON deliverable_revisions(deliverable_id);
```

### 3. Update existing tables

```sql
-- Add deliverable tracking to campaign_applications
ALTER TABLE campaign_applications
  ADD COLUMN deliverables_submitted INTEGER DEFAULT 0,
  ADD COLUMN deliverables_approved INTEGER DEFAULT 0,
  ADD COLUMN total_earned_cents INTEGER DEFAULT 0;

-- Add deliverable counters to campaigns
ALTER TABLE campaigns
  ADD COLUMN deliverables_submitted INTEGER DEFAULT 0,
  ADD COLUMN deliverables_pending INTEGER DEFAULT 0,
  ADD COLUMN deliverables_approved INTEGER DEFAULT 0;
```

### 4. Create RLS Policies

```sql
-- Enable RLS
ALTER TABLE campaign_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_revisions ENABLE ROW LEVEL SECURITY;

-- Creators can view their own deliverables
CREATE POLICY "Creators can view own deliverables" ON campaign_deliverables
  FOR SELECT USING (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
  );

-- Creators can insert their own deliverables
CREATE POLICY "Creators can submit deliverables" ON campaign_deliverables
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
  );

-- Creators can update their own draft deliverables
CREATE POLICY "Creators can update draft deliverables" ON campaign_deliverables
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
    AND status = 'draft'
  );

-- Restaurant owners can view deliverables for their campaigns
CREATE POLICY "Restaurant owners can view campaign deliverables" ON campaign_deliverables
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Restaurant owners can update deliverable status (review)
CREATE POLICY "Restaurant owners can review deliverables" ON campaign_deliverables
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM business_profiles WHERE user_id = auth.uid()
    )
    AND status IN ('pending_review', 'revision_requested')
  );
```

### 5. Create helper functions

```sql
-- Function to auto-approve deliverables after 72 hours
CREATE OR REPLACE FUNCTION auto_approve_deliverables()
RETURNS INTEGER AS $$
DECLARE
  approved_count INTEGER;
BEGIN
  WITH approved AS (
    UPDATE campaign_deliverables
    SET
      status = 'auto_approved',
      auto_approved_at = NOW(),
      payment_status = 'processing'
    WHERE
      status = 'pending_review'
      AND submitted_at < NOW() - INTERVAL '72 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO approved_count FROM approved;

  RETURN approved_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update campaign deliverable counts
CREATE OR REPLACE FUNCTION update_campaign_deliverable_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns
  SET
    deliverables_submitted = (
      SELECT COUNT(*) FROM campaign_deliverables
      WHERE campaign_id = NEW.campaign_id
    ),
    deliverables_pending = (
      SELECT COUNT(*) FROM campaign_deliverables
      WHERE campaign_id = NEW.campaign_id AND status = 'pending_review'
    ),
    deliverables_approved = (
      SELECT COUNT(*) FROM campaign_deliverables
      WHERE campaign_id = NEW.campaign_id AND status IN ('approved', 'auto_approved')
    ),
    updated_at = NOW()
  WHERE id = NEW.campaign_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for campaign counts
CREATE TRIGGER update_deliverable_counts_trigger
AFTER INSERT OR UPDATE ON campaign_deliverables
FOR EACH ROW
EXECUTE FUNCTION update_campaign_deliverable_counts();
```

## Files to Create/Modify

- `supabase/migrations/20251012_campaign_deliverables_schema.sql` - Main migration file

## Dependencies

- ✅ `campaigns` table exists
- ✅ `campaign_applications` table exists
- ✅ `creator_profiles` table exists
- ✅ `business_profiles` table exists

## Definition of Done

- [ ] Migration file created with all tables and indexes
- [ ] RLS policies implemented and tested
- [ ] Helper functions created
- [ ] Auto-approval function tested manually
- [ ] Verified with `SELECT * FROM campaign_deliverables LIMIT 1` (should return structure)
- [ ] Confirmed RLS policies work for creator and restaurant roles
- [ ] Migration applied successfully to development database
- [ ] Schema documented in this task file

## Related Tasks

- task-cd-002-deliverable-submission-service.md (API layer)
- task-cd-003-creator-deliverable-ui.md (Creator UI)
- task-cd-004-restaurant-review-dashboard.md (Restaurant UI)
