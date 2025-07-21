-- Email Authentication Configuration
-- This migration configures settings for email OTP authentication

-- Note: Email templates must be configured through the Supabase Dashboard UI
-- See /docs/supabase-email-templates.md for template configuration

-- Update auth settings for email OTP
-- These settings control OTP behavior
UPDATE auth.config
SET 
  -- Set OTP expiry to 60 minutes (3600 seconds)
  otp_exp = 3600,
  -- Disable email confirmation requirement (we verify via OTP instead)
  mailer_autoconfirm = false,
  -- Enable secure email change (requires re-authentication)
  secure_email_change_enabled = true
WHERE id = 'default';

-- Create a function to clean up expired OTP tokens (optional)
-- This helps keep the auth tables clean
CREATE OR REPLACE FUNCTION auth.clean_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired tokens older than 24 hours
  DELETE FROM auth.flow_state
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Delete expired refresh tokens
  DELETE FROM auth.refresh_tokens
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND revoked = true;
END;
$$;

-- Optional: Create a scheduled job to clean up tokens
-- Note: This requires pg_cron extension which may need to be enabled
-- SELECT cron.schedule('cleanup-expired-tokens', '0 3 * * *', 'SELECT auth.clean_expired_tokens();');

-- Add indexes for better performance on auth queries
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON auth.users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_flow_state_created_at ON auth.flow_state (created_at);

-- Add comment for documentation
COMMENT ON FUNCTION auth.clean_expired_tokens() IS 'Cleans up expired authentication tokens to maintain database performance';