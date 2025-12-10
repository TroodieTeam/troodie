-- =============================================
-- Payment System Migration
-- Date: 2025-12-10
-- Description: Add payment tables for Stripe Connect Express integration
-- =============================================

-- =============================================
-- STRIPE ACCOUNTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS stripe_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('business', 'creator')),
  stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_account_status VARCHAR(50) DEFAULT 'pending',
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_link TEXT,
  onboarding_link_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_account_type UNIQUE (user_id, account_type)
);

CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user ON stripe_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_stripe_id ON stripe_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_type ON stripe_accounts(account_type);

-- =============================================
-- CAMPAIGN PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS campaign_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES auth.users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  
  -- Stripe payment details
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  
  -- Payment amounts (in cents)
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  creator_payout_cents INTEGER NOT NULL, -- Total amount available for creators
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'refunded',
    'partially_refunded'
  )),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_campaign_payments_campaign ON campaign_payments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_payments_business ON campaign_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_campaign_payments_status ON campaign_payments(status);
CREATE INDEX IF NOT EXISTS idx_campaign_payments_stripe_intent ON campaign_payments(stripe_payment_intent_id);

-- =============================================
-- PAYMENT TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id),
  deliverable_id UUID REFERENCES campaign_deliverables(id),
  creator_id UUID REFERENCES creator_profiles(id),
  business_id UUID REFERENCES auth.users(id),
  
  -- Stripe IDs
  stripe_payment_intent_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  stripe_refund_id VARCHAR(255),
  
  -- Transaction amounts (in cents)
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  creator_amount_cents INTEGER NOT NULL,
  
  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
    'payment',
    'payout',
    'refund',
    'fee'
  )),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
  )),
  
  -- Currency
  currency VARCHAR(3) DEFAULT 'usd',
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_campaign ON payment_transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_deliverable ON payment_transactions(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_creator ON payment_transactions(creator_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_business ON payment_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_transfer ON payment_transactions(stripe_transfer_id);

-- =============================================
-- UPDATE CAMPAIGNS TABLE
-- =============================================
DO $$
BEGIN
  -- Add payment_status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='campaigns' AND column_name='payment_status') THEN
    ALTER TABLE campaigns ADD COLUMN payment_status VARCHAR(50) DEFAULT 'unpaid' CHECK (payment_status IN (
      'unpaid',
      'pending',
      'processing',
      'paid',
      'failed',
      'refunded'
    ));
  END IF;

  -- Add payment_intent_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='campaigns' AND column_name='payment_intent_id') THEN
    ALTER TABLE campaigns ADD COLUMN payment_intent_id VARCHAR(255);
  END IF;

  -- Add paid_at timestamp if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='campaigns' AND column_name='paid_at') THEN
    ALTER TABLE campaigns ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_campaigns_payment_status ON campaigns(payment_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_payment_intent ON campaigns(payment_intent_id);

-- =============================================
-- UPDATE BUSINESS_PROFILES TABLE
-- =============================================
DO $$
BEGIN
  -- Add stripe_account_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='business_profiles' AND column_name='stripe_account_id') THEN
    ALTER TABLE business_profiles ADD COLUMN stripe_account_id VARCHAR(255);
  END IF;

  -- Add stripe_onboarding_completed if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='business_profiles' AND column_name='stripe_onboarding_completed') THEN
    ALTER TABLE business_profiles ADD COLUMN stripe_onboarding_completed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own stripe accounts" ON stripe_accounts;
DROP POLICY IF EXISTS "Users can create their own stripe accounts" ON stripe_accounts;
DROP POLICY IF EXISTS "Users can update their own stripe accounts" ON stripe_accounts;

DROP POLICY IF EXISTS "Businesses can view their own campaign payments" ON campaign_payments;
DROP POLICY IF EXISTS "Admins can view all campaign payments" ON campaign_payments;

DROP POLICY IF EXISTS "Users can view their own payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Admins can view all payment transactions" ON payment_transactions;

-- Stripe Accounts Policies
CREATE POLICY "Users can view their own stripe accounts" ON stripe_accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own stripe accounts" ON stripe_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stripe accounts" ON stripe_accounts
  FOR UPDATE USING (user_id = auth.uid());

-- Campaign Payments Policies
CREATE POLICY "Businesses can view their own campaign payments" ON campaign_payments
  FOR SELECT USING (business_id = auth.uid());

CREATE POLICY "Admins can view all campaign payments" ON campaign_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND account_type = 'admin'
    )
  );

-- Payment Transactions Policies
CREATE POLICY "Users can view their own payment transactions" ON payment_transactions
  FOR SELECT USING (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
    OR business_id = auth.uid()
  );

CREATE POLICY "Admins can view all payment transactions" ON payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND account_type = 'admin'
    )
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to calculate platform fee
CREATE OR REPLACE FUNCTION calculate_platform_fee(amount_cents INTEGER, fee_percent INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
BEGIN
  RETURN ROUND(amount_cents * fee_percent / 100.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate creator payout amount
CREATE OR REPLACE FUNCTION calculate_creator_payout(amount_cents INTEGER, fee_percent INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
BEGIN
  RETURN amount_cents - calculate_platform_fee(amount_cents, fee_percent);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update campaign payment status
CREATE OR REPLACE FUNCTION update_campaign_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign payment_status based on payment status
  IF NEW.status = 'succeeded' THEN
    UPDATE campaigns
    SET payment_status = 'paid',
        paid_at = NEW.paid_at,
        updated_at = NOW()
    WHERE id = NEW.campaign_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE campaigns
    SET payment_status = 'failed',
        updated_at = NOW()
    WHERE id = NEW.campaign_id;
  ELSIF NEW.status = 'refunded' OR NEW.status = 'partially_refunded' THEN
    UPDATE campaigns
    SET payment_status = 'refunded',
        updated_at = NOW()
    WHERE id = NEW.campaign_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for campaign payment status updates
DROP TRIGGER IF EXISTS update_campaign_payment_status_trigger ON campaign_payments;
CREATE TRIGGER update_campaign_payment_status_trigger
AFTER INSERT OR UPDATE OF status ON campaign_payments
FOR EACH ROW
EXECUTE FUNCTION update_campaign_payment_status();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE stripe_accounts IS 'Stores Stripe Connect Express account IDs for businesses and creators';
COMMENT ON TABLE campaign_payments IS 'Tracks business payments for campaigns (escrow model)';
COMMENT ON TABLE payment_transactions IS 'Detailed transaction log for all payments, payouts, and fees';

COMMENT ON COLUMN campaign_payments.creator_payout_cents IS 'Total amount available for creator payouts (after platform fee)';
COMMENT ON COLUMN payment_transactions.transaction_type IS 'Type of transaction: payment (business pays), payout (creator receives), refund, fee';
COMMENT ON COLUMN payment_transactions.creator_amount_cents IS 'Amount creator receives (after platform fee deduction)';
