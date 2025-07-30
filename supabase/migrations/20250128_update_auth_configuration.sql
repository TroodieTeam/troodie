-- Update auth configuration for email passwordless authentication
-- Based on Supabase email passwordless documentation

-- Note: Most auth settings need to be configured in the Supabase Dashboard
-- This migration documents the required settings and creates helper functions

/*
REQUIRED SUPABASE DASHBOARD CONFIGURATION:

1. Authentication > Providers > Email
   ✓ Enable Email Provider: ON
   ✓ Confirm email: OFF (for OTP flow without email confirmation)
   ✓ Enable email signup: ON
   ✓ Enable email login: ON

2. Authentication > Email Templates > OTP
   ✓ Subject: "Your Troodie verification code"
   ✓ Content must include: {{ .Token }}
   
   Example template:
   ```
   Hi,
   
   Your verification code is: {{ .Token }}
   
   This code will expire in 1 hour.
   
   Thanks,
   The Troodie Team
   ```

3. Project Settings > Auth
   ✓ Enable sign ups: ON
   ✓ Auto-confirm users: ON (for passwordless flow)
   ✓ Minimum password length: Not applicable for passwordless

4. Authentication > Rate Limits
   ✓ OTP requests: 1 per 60 seconds (default)
   ✓ OTP validity: 3600 seconds (1 hour default)
*/

-- Create a function to check auth configuration
CREATE OR REPLACE FUNCTION public.check_auth_configuration()
RETURNS TABLE (
  setting_name text,
  current_value text,
  expected_value text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if email provider is enabled
  RETURN QUERY
  SELECT 
    'email_provider_enabled'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM auth.flow_state 
        WHERE auth_method = 'email'
      ) THEN 'true'
      ELSE 'false'
    END::text,
    'true'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM auth.flow_state 
        WHERE auth_method = 'email'
      ) THEN 'OK'
      ELSE 'NEEDS CONFIGURATION'
    END::text;

  -- Note: Most settings cannot be checked via SQL and must be verified in dashboard
  RETURN QUERY
  SELECT 
    'dashboard_configuration'::text,
    'manual_check_required'::text,
    'see_migration_comments'::text,
    'CHECK DASHBOARD'::text;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_auth_configuration() TO authenticated;

-- Create indexes for better auth performance
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (lower(email));

-- Add helpful comments
COMMENT ON FUNCTION public.check_auth_configuration() IS 
'Checks auth configuration for email passwordless flow. Most settings must be configured in Supabase Dashboard.';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'EMAIL PASSWORDLESS AUTH CONFIGURATION';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Complete these steps in Supabase Dashboard:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Go to Authentication > Providers > Email';
  RAISE NOTICE '   - Enable Email Provider: ON';
  RAISE NOTICE '   - Confirm email: OFF';
  RAISE NOTICE '   - Enable email signup: ON';
  RAISE NOTICE '';
  RAISE NOTICE '2. Go to Authentication > Email Templates';
  RAISE NOTICE '   - Ensure OTP template includes {{ .Token }}';
  RAISE NOTICE '';
  RAISE NOTICE '3. Go to Project Settings > Auth';
  RAISE NOTICE '   - Enable sign ups: ON';
  RAISE NOTICE '   - Auto-confirm users: ON';
  RAISE NOTICE '';
  RAISE NOTICE 'To verify configuration, run:';
  RAISE NOTICE 'SELECT * FROM public.check_auth_configuration();';
  RAISE NOTICE '==============================================';
END $$;