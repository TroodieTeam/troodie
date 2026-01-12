-- ============================================================================
-- TRO-136: Restaurant Payment Onboarding
-- Add payment method fields to business_profiles for campaign payments
-- ============================================================================

-- Add stripe_customer_id for storing the Stripe Customer (for payment methods)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add default_payment_method_id for the saved card
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS default_payment_method_id VARCHAR(255);

-- Add last4 digits of saved card for display purposes
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS payment_method_last4 VARCHAR(4);

-- Add card brand for display purposes (visa, mastercard, amex, etc.)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS payment_method_brand VARCHAR(20);

-- Add payment_setup_completed flag
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS payment_setup_completed BOOLEAN DEFAULT false;

-- Create index for stripe_customer_id lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_stripe_customer
ON business_profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN business_profiles.stripe_customer_id IS 
  'Stripe Customer ID for this business - used for saving payment methods';

COMMENT ON COLUMN business_profiles.default_payment_method_id IS 
  'Default Stripe Payment Method ID for campaign payments';

COMMENT ON COLUMN business_profiles.payment_method_last4 IS 
  'Last 4 digits of the saved payment method for display';

COMMENT ON COLUMN business_profiles.payment_method_brand IS 
  'Card brand (visa, mastercard, amex, etc.) for display';

COMMENT ON COLUMN business_profiles.payment_setup_completed IS 
  'Whether the business has completed payment setup during onboarding';

-- ============================================================================
-- ROLLBACK (if needed):
-- ALTER TABLE business_profiles DROP COLUMN IF EXISTS stripe_customer_id;
-- ALTER TABLE business_profiles DROP COLUMN IF EXISTS default_payment_method_id;
-- ALTER TABLE business_profiles DROP COLUMN IF EXISTS payment_method_last4;
-- ALTER TABLE business_profiles DROP COLUMN IF EXISTS payment_method_brand;
-- ALTER TABLE business_profiles DROP COLUMN IF EXISTS payment_setup_completed;
-- ============================================================================
