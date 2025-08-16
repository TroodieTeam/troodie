-- Setup password for Apple Review Account
-- This allows the review account to use password authentication
-- while all other users continue using OTP

-- The review account UUID
DO $$
DECLARE
    review_user_id UUID := '175b77a2-4a54-4239-b0ce-9d1351bbb6d0';
BEGIN
    -- Update the user to enable password authentication
    -- Note: You'll need to run this through Supabase Dashboard SQL Editor
    -- or use the Supabase Admin API to set the password
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Review Account Password Setup';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'To set a password for the review account:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '2. Find user: kouamendri1@gmail.com';
    RAISE NOTICE '3. Click the three dots menu > Reset password';
    RAISE NOTICE '4. Set password to: ReviewPass000000';
    RAISE NOTICE '';
    RAISE NOTICE 'OR use the Supabase Admin API:';
    RAISE NOTICE '';
    RAISE NOTICE 'await supabase.auth.admin.updateUserById(';
    RAISE NOTICE '  ''175b77a2-4a54-4239-b0ce-9d1351bbb6d0'',';
    RAISE NOTICE '  { password: ''ReviewPass000000'' }';
    RAISE NOTICE ')';
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
END $$;