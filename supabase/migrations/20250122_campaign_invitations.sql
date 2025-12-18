-- ============================================================================
-- Campaign Invitations System
-- ============================================================================
-- Allows businesses to invite creators to specific campaigns
-- Date: 2025-01-22
-- Task: ER-007
-- ============================================================================

-- Create campaign_invitations table
CREATE TABLE IF NOT EXISTS campaign_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Invitation details
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  
  -- Timestamps
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(campaign_id, creator_id),
  
  -- Ensure campaign is active (checked via application logic, not constraint)
  CONSTRAINT valid_status_transitions CHECK (
    (status = 'pending' AND responded_at IS NULL) OR
    (status IN ('accepted', 'declined', 'expired', 'withdrawn') AND responded_at IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_invitations_campaign ON campaign_invitations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_invitations_creator ON campaign_invitations(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_invitations_status ON campaign_invitations(status);
CREATE INDEX IF NOT EXISTS idx_campaign_invitations_invited_by ON campaign_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_campaign_invitations_expires_at ON campaign_invitations(expires_at) WHERE status = 'pending';

-- RLS Policies
ALTER TABLE campaign_invitations ENABLE ROW LEVEL SECURITY;

-- Businesses can create invitations for their campaigns
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Businesses can create invitations" ON campaign_invitations;
CREATE POLICY "Businesses can create invitations"
  ON campaign_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN restaurants r ON c.restaurant_id = r.id
      WHERE c.id = campaign_invitations.campaign_id
      AND r.owner_id = auth.uid()
      AND c.status = 'active'
    )
  );

-- Creators can view invitations sent to them
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Creators can view their invitations" ON campaign_invitations;
CREATE POLICY "Creators can view their invitations"
  ON campaign_invitations FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Businesses can view invitations for their campaigns
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Businesses can view their campaign invitations" ON campaign_invitations;
CREATE POLICY "Businesses can view their campaign invitations"
  ON campaign_invitations FOR SELECT
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN restaurants r ON c.restaurant_id = r.id
      WHERE r.owner_id = auth.uid()
    )
  );

-- Creators can update invitation status (accept/decline)
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Creators can update invitation status" ON campaign_invitations;
CREATE POLICY "Creators can update invitation status"
  ON campaign_invitations FOR UPDATE
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Businesses can withdraw their invitations
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Businesses can withdraw invitations" ON campaign_invitations;
CREATE POLICY "Businesses can withdraw invitations"
  ON campaign_invitations FOR UPDATE
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN restaurants r ON c.restaurant_id = r.id
      WHERE r.owner_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    status = 'withdrawn'
  );

-- Function: Auto-expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE campaign_invitations
  SET 
    status = 'expired',
    responded_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION expire_old_invitations IS
'Auto-expires pending invitations that have passed their expiration date. Should be run daily.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION expire_old_invitations TO authenticated;

-- Function: Get invitation statistics
CREATE OR REPLACE FUNCTION get_invitation_stats(
  p_campaign_id UUID DEFAULT NULL,
  p_creator_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_invitations BIGINT,
  pending BIGINT,
  accepted BIGINT,
  declined BIGINT,
  expired BIGINT,
  acceptance_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_invitations,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending,
    COUNT(*) FILTER (WHERE status = 'accepted')::BIGINT as accepted,
    COUNT(*) FILTER (WHERE status = 'declined')::BIGINT as declined,
    COUNT(*) FILTER (WHERE status = 'expired')::BIGINT as expired,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('accepted', 'declined')) > 0 THEN
        (COUNT(*) FILTER (WHERE status = 'accepted')::DECIMAL /
         COUNT(*) FILTER (WHERE status IN ('accepted', 'declined'))::DECIMAL) * 100
      ELSE 0
    END as acceptance_rate
  FROM campaign_invitations
  WHERE (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
    AND (p_creator_id IS NULL OR creator_id = p_creator_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_invitation_stats IS
'Returns invitation statistics for a campaign or creator.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_invitation_stats TO authenticated;

