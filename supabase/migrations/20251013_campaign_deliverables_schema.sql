-- =============================================
-- Campaign Deliverables System - Complete Schema
-- Date: 2025-10-13
-- Description: Tables for deliverable submission, review, payment, and disputes
-- =============================================

-- =============================================
-- MAIN DELIVERABLES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS campaign_deliverables (
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
    'pending_onboarding',
    'processing',
    'completed',
    'failed',
    'disputed',
    'refunded'
  )),
  payment_amount_cents INTEGER, -- From campaign_applications.proposed_rate_cents
  payment_transaction_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_error TEXT,
  payment_retry_count INTEGER DEFAULT 0,
  last_payment_retry_at TIMESTAMP WITH TIME ZONE,

  -- Dispute handling
  dispute_status VARCHAR(50) DEFAULT 'none' CHECK (dispute_status IN (
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

-- Indexes for campaign_deliverables
CREATE INDEX idx_deliverables_application ON campaign_deliverables(campaign_application_id);
CREATE INDEX idx_deliverables_creator ON campaign_deliverables(creator_id);
CREATE INDEX idx_deliverables_restaurant ON campaign_deliverables(restaurant_id);
CREATE INDEX idx_deliverables_campaign ON campaign_deliverables(campaign_id);
CREATE INDEX idx_deliverables_status ON campaign_deliverables(status);
CREATE INDEX idx_deliverables_payment_status ON campaign_deliverables(payment_status);
CREATE INDEX idx_deliverables_submitted_at ON campaign_deliverables(submitted_at);
CREATE INDEX idx_deliverables_auto_approval ON campaign_deliverables(submitted_at, status)
  WHERE status = 'pending_review';

-- =============================================
-- DELIVERABLE REVISIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS deliverable_revisions (
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

-- =============================================
-- DISPUTE SYSTEM TABLES
-- =============================================
CREATE TABLE IF NOT EXISTS deliverable_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id UUID REFERENCES campaign_deliverables(id) ON DELETE CASCADE NOT NULL,
  filed_by VARCHAR(20) NOT NULL CHECK (filed_by IN ('creator', 'restaurant')),
  filed_by_user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Dispute details
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[], -- Array of evidence image/video URLs

  -- Status
  status VARCHAR(50) DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',
    'under_investigation',
    'resolved_creator',
    'resolved_restaurant',
    'resolved_split',
    'dismissed'
  )),

  -- Resolution
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  resolution_action VARCHAR(50), -- 'payment_creator', 'refund_restaurant', 'split_payment', 'no_action'

  -- Payment adjustments
  original_amount_cents INTEGER,
  adjusted_amount_cents INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_disputes_deliverable ON deliverable_disputes(deliverable_id);
CREATE INDEX idx_disputes_status ON deliverable_disputes(status);
CREATE INDEX idx_disputes_created ON deliverable_disputes(created_at);

-- Dispute messages/communications
CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID REFERENCES deliverable_disputes(id) ON DELETE CASCADE NOT NULL,
  sender_user_id UUID REFERENCES auth.users(id) NOT NULL,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('creator', 'restaurant', 'admin')),

  message TEXT NOT NULL,
  attachments TEXT[], -- URLs to attached files

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dispute_messages_dispute ON dispute_messages(dispute_id, created_at);

-- =============================================
-- CRON JOB MONITORING
-- =============================================
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  total_checked INTEGER,
  success_count INTEGER,
  failure_count INTEGER,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cron_logs_job ON cron_job_logs(job_name, created_at DESC);

-- =============================================
-- UPDATE EXISTING TABLES
-- =============================================

-- Add deliverable tracking to campaign_applications
ALTER TABLE campaign_applications
  ADD COLUMN IF NOT EXISTS deliverables_submitted INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deliverables_approved INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned_cents INTEGER DEFAULT 0;

-- Add deliverable counters to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS deliverables_submitted INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deliverables_pending INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deliverables_approved INTEGER DEFAULT 0;

-- Add Stripe fields to creator_profiles
ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarded_at TIMESTAMP WITH TIME ZONE;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE campaign_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

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

-- Revision policies
CREATE POLICY "Users can view revisions for their deliverables" ON deliverable_revisions
  FOR SELECT USING (
    deliverable_id IN (
      SELECT id FROM campaign_deliverables
      WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
      OR restaurant_id IN (SELECT restaurant_id FROM business_profiles WHERE user_id = auth.uid())
    )
  );

-- Dispute policies
CREATE POLICY "Users can view their own disputes" ON deliverable_disputes
  FOR SELECT USING (
    filed_by_user_id = auth.uid() OR
    deliverable_id IN (
      SELECT id FROM campaign_deliverables
      WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
      OR restaurant_id IN (SELECT restaurant_id FROM business_profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can file disputes" ON deliverable_disputes
  FOR INSERT WITH CHECK (filed_by_user_id = auth.uid());

-- Dispute messages policies
CREATE POLICY "Users can view messages for their disputes" ON dispute_messages
  FOR SELECT USING (
    dispute_id IN (
      SELECT id FROM deliverable_disputes WHERE filed_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their disputes" ON dispute_messages
  FOR INSERT WITH CHECK (
    sender_user_id = auth.uid() AND
    dispute_id IN (
      SELECT id FROM deliverable_disputes WHERE filed_by_user_id = auth.uid()
    )
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

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
      payment_status = 'processing',
      updated_at = NOW()
    WHERE
      status = 'pending_review'
      AND submitted_at < NOW() - INTERVAL '72 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO approved_count FROM approved;

  RETURN approved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update campaign deliverable counts
CREATE OR REPLACE FUNCTION update_campaign_deliverable_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns
  SET
    deliverables_submitted = (
      SELECT COUNT(*) FROM campaign_deliverables
      WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
    ),
    deliverables_pending = (
      SELECT COUNT(*) FROM campaign_deliverables
      WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
      AND status = 'pending_review'
    ),
    deliverables_approved = (
      SELECT COUNT(*) FROM campaign_deliverables
      WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
      AND status IN ('approved', 'auto_approved')
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for campaign counts
DROP TRIGGER IF EXISTS update_deliverable_counts_trigger ON campaign_deliverables;
CREATE TRIGGER update_deliverable_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON campaign_deliverables
FOR EACH ROW
EXECUTE FUNCTION update_campaign_deliverable_counts();

-- Function to update application deliverable counts
CREATE OR REPLACE FUNCTION update_application_deliverable_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaign_applications
  SET
    deliverables_submitted = (
      SELECT COUNT(*) FROM campaign_deliverables
      WHERE campaign_application_id = COALESCE(NEW.campaign_application_id, OLD.campaign_application_id)
    ),
    deliverables_approved = (
      SELECT COUNT(*) FROM campaign_deliverables
      WHERE campaign_application_id = COALESCE(NEW.campaign_application_id, OLD.campaign_application_id)
      AND status IN ('approved', 'auto_approved')
    ),
    total_earned_cents = (
      SELECT COALESCE(SUM(payment_amount_cents), 0) FROM campaign_deliverables
      WHERE campaign_application_id = COALESCE(NEW.campaign_application_id, OLD.campaign_application_id)
      AND payment_status = 'completed'
    )
  WHERE id = COALESCE(NEW.campaign_application_id, OLD.campaign_application_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for application counts
DROP TRIGGER IF EXISTS update_application_counts_trigger ON campaign_deliverables;
CREATE TRIGGER update_application_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON campaign_deliverables
FOR EACH ROW
EXECUTE FUNCTION update_application_deliverable_counts();

-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.views_count > 0 THEN
    NEW.engagement_rate := (
      (COALESCE(NEW.likes_count, 0) +
       COALESCE(NEW.comments_count, 0) +
       COALESCE(NEW.shares_count, 0))::DECIMAL /
      NEW.views_count::DECIMAL
    ) * 100;
  ELSE
    NEW.engagement_rate := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for engagement rate calculation
DROP TRIGGER IF EXISTS calculate_engagement_rate_trigger ON campaign_deliverables;
CREATE TRIGGER calculate_engagement_rate_trigger
BEFORE INSERT OR UPDATE OF views_count, likes_count, comments_count, shares_count
ON campaign_deliverables
FOR EACH ROW
EXECUTE FUNCTION calculate_engagement_rate();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE campaign_deliverables IS 'Core table for campaign deliverable submissions, reviews, and payments';
COMMENT ON TABLE deliverable_revisions IS 'Tracks revision history when creators resubmit content';
COMMENT ON TABLE deliverable_disputes IS 'Dispute management for creator/restaurant conflicts';
COMMENT ON TABLE dispute_messages IS 'Communication thread for disputes';
COMMENT ON TABLE cron_job_logs IS 'Monitoring logs for automated jobs (auto-approval, payment retry)';

COMMENT ON COLUMN campaign_deliverables.status IS 'Workflow: draft → pending_review → approved/rejected/revision_requested → auto_approved (after 72h)';
COMMENT ON COLUMN campaign_deliverables.payment_status IS 'Payment lifecycle: pending → processing → completed/failed';
COMMENT ON COLUMN campaign_deliverables.dispute_status IS 'Dispute tracking: none → creator_disputed/restaurant_disputed → under_review → resolved';
