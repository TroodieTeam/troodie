-- Migration: Add payout tracking to payment_transactions
-- This allows us to track Stripe platform payouts (po_*) separately from creator transfers (tr_*)

-- Add stripe_payout_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_transactions' 
    AND column_name = 'stripe_payout_id'
  ) THEN
    ALTER TABLE payment_transactions 
    ADD COLUMN stripe_payout_id VARCHAR(255);
    
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_payout_id 
    ON payment_transactions(stripe_payout_id);
  END IF;
END $$;

-- Add 'platform_payout' to transaction_type enum if it doesn't exist
DO $$
BEGIN
  -- Check if platform_payout is already in the constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%transaction_type%'
    AND check_clause LIKE '%platform_payout%'
  ) THEN
    -- Drop and recreate the constraint with platform_payout
    ALTER TABLE payment_transactions 
    DROP CONSTRAINT IF EXISTS payment_transactions_transaction_type_check;
    
    ALTER TABLE payment_transactions 
    ADD CONSTRAINT payment_transactions_transaction_type_check 
    CHECK (transaction_type IN (
      'payment',
      'payout',
      'refund',
      'fee',
      'platform_payout'
    ));
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN payment_transactions.stripe_payout_id IS 'Stripe payout ID (po_*) for platform payouts from Stripe balance to bank account';
COMMENT ON COLUMN payment_transactions.transaction_type IS 'Type: payment (business pays), payout (creator receives), refund, fee, platform_payout (Stripe balance payout)';

