-- ============================================================================
-- TRO-137: Subscription Payment Collection - Database Schema
-- ============================================================================
-- Adds subscription tracking fields to support $49/month restaurant subscriptions
-- with 14-day free trial.
-- Date: 2026-01-26
-- ============================================================================

-- Add subscription fields to restaurant_claims table
-- (restaurant_claims tracks verified restaurant owners)
ALTER TABLE restaurant_claims
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_reminder_dismissed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_created_at TIMESTAMPTZ;

-- Add check constraint for subscription_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_claims_subscription_status_check'
  ) THEN
    ALTER TABLE restaurant_claims
    ADD CONSTRAINT restaurant_claims_subscription_status_check
    CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'));
  END IF;
END $$;

-- Create index for finding subscriptions by status
CREATE INDEX IF NOT EXISTS idx_restaurant_claims_subscription_status
ON restaurant_claims(subscription_status)
WHERE subscription_status IS NOT NULL AND subscription_status != 'none';

-- Create index for finding subscriptions by Stripe ID
CREATE INDEX IF NOT EXISTS idx_restaurant_claims_stripe_subscription
ON restaurant_claims(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN restaurant_claims.stripe_subscription_id IS 'Stripe subscription ID for billing';
COMMENT ON COLUMN restaurant_claims.subscription_status IS 'Status: none, trialing, active, past_due, canceled, unpaid';
COMMENT ON COLUMN restaurant_claims.trial_start_date IS 'When the 14-day trial started';
COMMENT ON COLUMN restaurant_claims.trial_end_date IS 'When the 14-day trial ends';
COMMENT ON COLUMN restaurant_claims.subscription_reminder_dismissed_at IS 'When user dismissed the subscribe reminder';
COMMENT ON COLUMN restaurant_claims.subscription_created_at IS 'When subscription was first created';

-- RLS policies for subscription fields (inherits from restaurant_claims policies)
-- Restaurant owners can read their own subscription data
-- Updates to subscription fields should only come from server-side (webhooks)

-- Create a function to check if restaurant can post campaigns
CREATE OR REPLACE FUNCTION can_restaurant_post_campaign(p_restaurant_claim_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  claim_record RECORD;
BEGIN
  SELECT subscription_status, trial_end_date
  INTO claim_record
  FROM restaurant_claims
  WHERE id = p_restaurant_claim_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Allow if in trial period
  IF claim_record.subscription_status = 'trialing' AND claim_record.trial_end_date > NOW() THEN
    RETURN TRUE;
  END IF;

  -- Allow if subscription is active
  IF claim_record.subscription_status = 'active' THEN
    RETURN TRUE;
  END IF;

  -- Block if past_due, canceled, unpaid, or no subscription
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_restaurant_post_campaign IS 'TRO-137: Check if restaurant can post campaigns based on subscription status';

GRANT EXECUTE ON FUNCTION can_restaurant_post_campaign TO authenticated;
