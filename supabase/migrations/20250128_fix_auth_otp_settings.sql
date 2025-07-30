-- Ensure auth settings allow OTP signups
-- This updates the auth configuration to allow email OTP signups

-- First, check current auth settings
DO $$
BEGIN
  RAISE NOTICE 'Checking auth.config settings...';
END $$;

-- Update auth config to ensure email auth is enabled
-- Note: These settings are typically managed through Supabase dashboard
-- but we'll document the required settings here

/*
Required Supabase Dashboard Settings:
1. Authentication > Providers > Email
   - Enable Email Provider: ON
   - Confirm email: OFF (for OTP flow)
   - Enable email signup: ON
   - Enable email login: ON

2. Authentication > Email Templates
   - Make sure OTP/Magic Link template is active

3. Authentication > URL Configuration  
   - Remove any redirect URLs if using OTP-only flow

4. Project Settings > Auth
   - Enable sign ups: ON
   - Auto-confirm users: ON (for OTP flow)
*/

-- Create a helper function to check if user exists in auth.users
CREATE OR REPLACE FUNCTION public.check_auth_user_exists(check_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = lower(check_email)
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_auth_user_exists(text) TO anon, authenticated;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Auth OTP settings migration complete.';
  RAISE NOTICE 'IMPORTANT: Check Supabase Dashboard settings:';
  RAISE NOTICE '1. Email Provider must be enabled';
  RAISE NOTICE '2. Sign ups must be enabled';
  RAISE NOTICE '3. Auto-confirm users should be ON for OTP flow';
END $$;