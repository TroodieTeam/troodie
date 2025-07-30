-- Email Authentication Configuration
-- This migration configures settings for email OTP authentication

-- Update auth settings for email OTP
UPDATE auth.config
SET 
  -- Set OTP expiry to 60 minutes (3600 seconds)
  otp_exp = 3600,
  -- Enable email confirmation for new users
  mailer_autoconfirm = false,
  -- Enable secure email change (requires re-authentication)
  secure_email_change_enabled = true,
  -- Enable OTP for email verification
  enable_signup = true,
  -- Set minimum password length (for future use)
  minimum_password_length = 6
WHERE id = 'default';

-- Ensure email templates are properly configured
-- Note: Email templates must be configured through the Supabase Dashboard UI
-- Go to Authentication > Email Templates and configure:
-- 1. Magic Link template
-- 2. OTP template
-- 3. Email Change template
-- 4. Confirmation template

-- Create a function to clean up expired OTP tokens
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

-- Add indexes for better performance on auth queries
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON auth.users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_flow_state_created_at ON auth.flow_state (created_at);

-- Add comment for documentation
COMMENT ON FUNCTION auth.clean_expired_tokens() IS 'Cleans up expired authentication tokens to maintain database performance';