-- =============================================
-- PENDING STATE SYSTEM MIGRATION
-- Date: 2025-01-16
-- Description: Add pending state workflow for restaurant claims and creator applications
-- Tasks: PS-001, PS-002, PS-003
-- =============================================

-- =============================================
-- PS-001: UPDATE RESTAURANT CLAIMS TABLE
-- =============================================
-- Add status and review fields to existing restaurant_claims table
ALTER TABLE restaurant_claims
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS can_resubmit BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ownership_proof_type TEXT
  CHECK (ownership_proof_type IN ('business_license', 'utility_bill', 'lease', 'domain_match', 'other')),
ADD COLUMN IF NOT EXISTS ownership_proof_url TEXT,
ADD COLUMN IF NOT EXISTS business_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- Create indexes for restaurant_claims
CREATE INDEX IF NOT EXISTS idx_restaurant_claims_status
  ON restaurant_claims(status);
CREATE INDEX IF NOT EXISTS idx_restaurant_claims_submitted
  ON restaurant_claims(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_restaurant_claims_user_status
  ON restaurant_claims(user_id, status);

-- Update existing claims to approved if they're already verified
UPDATE restaurant_claims
SET status = 'approved',
    reviewed_at = COALESCE(verified_at, updated_at)
WHERE status = 'verified';

-- =============================================
-- PS-001: CREATE CREATOR APPLICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS creator_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Application details
  instagram_handle VARCHAR(100),
  tiktok_handle VARCHAR(100),
  youtube_handle VARCHAR(100),
  twitter_handle VARCHAR(100),
  follower_count INTEGER NOT NULL CHECK (follower_count >= 0),
  content_categories TEXT[],
  sample_content_urls TEXT[],
  bio TEXT,
  location VARCHAR(255),
  preferred_cuisine_types TEXT[],
  has_business_email BOOLEAN DEFAULT false,

  -- Status and review fields
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  review_notes TEXT,
  can_resubmit BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT at_least_one_social_handle CHECK (
    instagram_handle IS NOT NULL OR
    tiktok_handle IS NOT NULL OR
    youtube_handle IS NOT NULL OR
    twitter_handle IS NOT NULL
  )
);

-- Create indexes for creator_applications
CREATE INDEX idx_creator_applications_user
  ON creator_applications(user_id);
CREATE INDEX idx_creator_applications_status
  ON creator_applications(status);
CREATE INDEX idx_creator_applications_submitted
  ON creator_applications(submitted_at DESC);

-- =============================================
-- PS-002: CREATE REVIEW LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS review_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('restaurant_claim', 'creator_application')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL
    CHECK (action IN ('created', 'viewed', 'approved', 'rejected', 'noted', 'escalated', 'updated')),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_role TEXT,
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for review_logs
CREATE INDEX idx_review_logs_entity
  ON review_logs(entity_type, entity_id);
CREATE INDEX idx_review_logs_actor
  ON review_logs(actor_id);
CREATE INDEX idx_review_logs_created
  ON review_logs(created_at DESC);
CREATE INDEX idx_review_logs_action
  ON review_logs(action);

-- =============================================
-- PS-002: CREATE REVIEW STATISTICS VIEW
-- =============================================
CREATE OR REPLACE VIEW review_statistics AS
WITH review_times AS (
  SELECT
    entity_type,
    entity_id,
    action,
    created_at,
    EXTRACT(EPOCH FROM (
      created_at - LAG(created_at) OVER (
        PARTITION BY entity_id ORDER BY created_at
      )
    )) as review_time_seconds
  FROM review_logs
  WHERE action IN ('approved', 'rejected')
)
SELECT
  rl.entity_type,
  rl.action,
  DATE(rl.created_at) as review_date,
  COUNT(*) as action_count,
  COUNT(DISTINCT rl.actor_id) as unique_reviewers,
  AVG(rt.review_time_seconds) as avg_review_time_seconds
FROM review_logs rl
LEFT JOIN review_times rt ON (
  rl.entity_type = rt.entity_type 
  AND rl.entity_id = rt.entity_id 
  AND rl.action = rt.action 
  AND rl.created_at = rt.created_at
)
GROUP BY rl.entity_type, rl.action, DATE(rl.created_at);

-- =============================================
-- PS-002: CREATE AUTOMATIC LOGGING FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION log_review_action()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type TEXT;
  v_action TEXT;
  v_actor_id UUID;
BEGIN
  -- Determine entity type from table name
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'restaurant_claims' THEN 'restaurant_claim'
    WHEN 'creator_applications' THEN 'creator_application'
    ELSE TG_TABLE_NAME
  END;

  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := NEW.status;
  ELSE
    v_action := 'updated';
  END IF;

  -- Get actor ID (use reviewed_by if available, otherwise current user)
  v_actor_id := COALESCE(NEW.reviewed_by, auth.uid());

  -- Insert log entry
  INSERT INTO review_logs (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_role,
    previous_status,
    new_status,
    notes,
    metadata
  ) VALUES (
    v_entity_type,
    NEW.id,
    v_action,
    v_actor_id,
    COALESCE(
      (SELECT account_type FROM users WHERE id = v_actor_id),
      'system'
    ),
    OLD.status,
    NEW.status,
    NEW.review_notes,
    jsonb_build_object(
      'rejection_reason', NEW.rejection_reason,
      'can_resubmit', NEW.can_resubmit
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach logging triggers
CREATE TRIGGER log_restaurant_claim_reviews
AFTER INSERT OR UPDATE ON restaurant_claims
FOR EACH ROW EXECUTE FUNCTION log_review_action();

CREATE TRIGGER log_creator_application_reviews
AFTER INSERT OR UPDATE ON creator_applications
FOR EACH ROW EXECUTE FUNCTION log_review_action();

-- =============================================
-- PS-003: ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on tables
ALTER TABLE restaurant_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own claims" ON restaurant_claims;
DROP POLICY IF EXISTS "Users can create claims" ON restaurant_claims;
DROP POLICY IF EXISTS "Admins can view all claims" ON restaurant_claims;
DROP POLICY IF EXISTS "Admins can update claims" ON restaurant_claims;

-- Restaurant Claims Policies
CREATE POLICY "Users can view own claims"
  ON restaurant_claims FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create claims"
  ON restaurant_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

CREATE POLICY "Admins can view all claims"
  ON restaurant_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true) -- Admin or verified users can review
    )
  );

CREATE POLICY "Admins can update claims"
  ON restaurant_claims FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true)
    )
  );

-- Creator Applications Policies
CREATE POLICY "Users can view own applications"
  ON creator_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications"
  ON creator_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM creator_applications
      WHERE user_id = auth.uid()
      AND status IN ('pending', 'approved')
    )
  );

CREATE POLICY "Admins can view all applications"
  ON creator_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true)
    )
  );

CREATE POLICY "Admins can update applications"
  ON creator_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true)
    )
  );

-- Review Logs Policies (Read-only for admins)
CREATE POLICY "Admins can view review logs"
  ON review_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (account_type = 'admin' OR is_verified = true)
    )
  );

-- System can insert review logs via triggers
CREATE POLICY "System can insert review logs"
  ON review_logs FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Triggers run with SECURITY DEFINER

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_uuid
    AND (account_type = 'admin' OR is_verified = true)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check claim ownership
CREATE OR REPLACE FUNCTION owns_claim(user_uuid UUID, claim_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM restaurant_claims
    WHERE id = claim_uuid
    AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check application ownership
CREATE OR REPLACE FUNCTION owns_application(user_uuid UUID, app_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM creator_applications
    WHERE id = app_uuid
    AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================
-- CREATE PENDING REVIEW QUEUE VIEW
-- =============================================
CREATE OR REPLACE VIEW pending_review_queue AS
SELECT
  'restaurant_claim' as type,
  rc.id,
  rc.user_id,
  u.name as user_name,
  u.email as user_email,
  rc.status,
  rc.submitted_at,
  rc.reviewed_at,
  jsonb_build_object(
    'restaurant_id', rc.restaurant_id,
    'restaurant_name', r.name,
    'ownership_proof_type', rc.ownership_proof_type,
    'business_email', rc.email,
    'business_phone', rc.business_phone
  ) as details
FROM restaurant_claims rc
JOIN users u ON rc.user_id = u.id
JOIN restaurants r ON rc.restaurant_id = r.id
WHERE rc.status = 'pending'

UNION ALL

SELECT
  'creator_application' as type,
  ca.id,
  ca.user_id,
  u.name as user_name,
  u.email as user_email,
  ca.status,
  ca.submitted_at,
  ca.reviewed_at,
  jsonb_build_object(
    'follower_count', ca.follower_count,
    'instagram', ca.instagram_handle,
    'tiktok', ca.tiktok_handle,
    'youtube', ca.youtube_handle,
    'twitter', ca.twitter_handle,
    'content_categories', ca.content_categories
  ) as details
FROM creator_applications ca
JOIN users u ON ca.user_id = u.id
WHERE ca.status = 'pending';

-- Add RLS to the view
CREATE OR REPLACE FUNCTION check_review_queue_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND (account_type = 'admin' OR is_verified = true)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant access to authenticated users
GRANT SELECT ON pending_review_queue TO authenticated;

-- =============================================
-- UPDATE TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_creator_applications_updated_at
  BEFORE UPDATE ON creator_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- MIGRATION COMMENTS
-- =============================================
COMMENT ON TABLE restaurant_claims IS 'Tracks restaurant ownership claims with pending review workflow';
COMMENT ON TABLE creator_applications IS 'Manages creator program applications with review workflow';
COMMENT ON TABLE review_logs IS 'Audit trail for all review actions on claims and applications';
COMMENT ON VIEW pending_review_queue IS 'Combined view of all pending items for admin review';

-- =============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =============================================
-- To rollback this migration:
-- 1. DROP VIEW IF EXISTS pending_review_queue;
-- 2. DROP VIEW IF EXISTS review_statistics;
-- 3. DROP TRIGGER IF EXISTS log_restaurant_claim_reviews ON restaurant_claims;
-- 4. DROP TRIGGER IF EXISTS log_creator_application_reviews ON creator_applications;
-- 5. DROP FUNCTION IF EXISTS log_review_action();
-- 6. DROP TABLE IF EXISTS review_logs;
-- 7. DROP TABLE IF EXISTS creator_applications;
-- 8. Remove added columns from restaurant_claims:
--    ALTER TABLE restaurant_claims
--    DROP COLUMN IF EXISTS status,
--    DROP COLUMN IF EXISTS submitted_at,
--    DROP COLUMN IF EXISTS reviewed_at,
--    DROP COLUMN IF EXISTS reviewed_by,
--    DROP COLUMN IF EXISTS rejection_reason,
--    DROP COLUMN IF EXISTS review_notes,
--    DROP COLUMN IF EXISTS can_resubmit,
--    DROP COLUMN IF EXISTS ownership_proof_type,
--    DROP COLUMN IF EXISTS ownership_proof_url,
--    DROP COLUMN IF EXISTS business_phone,
--    DROP COLUMN IF EXISTS additional_notes;