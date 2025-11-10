-- Email Authentication Configuration
-- This migration configures settings for email OTP authentication

-- Note: Auth configuration is now managed through Supabase Dashboard
-- Go to Authentication > Settings and configure:
-- 1. Enable email signup
-- 2. Set OTP expiry time
-- 3. Configure email templates
-- 4. Set password requirements

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