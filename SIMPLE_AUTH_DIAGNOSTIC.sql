-- ========================================
-- SIMPLE AUTH USER CREATION DIAGNOSTIC
-- Run this in Supabase SQL Editor
-- ========================================

-- 1. Check for triggers on auth.users
SELECT
    'TRIGGERS ON auth.users' as check_type,
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'auth.users'::regclass
AND t.tgname NOT LIKE 'RI_%'
AND t.tgname NOT LIKE 'pg_%';

-- 2. Check if RLS is enabled on auth.users
SELECT
    'RLS STATUS' as check_type,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE oid = 'auth.users'::regclass;

-- 3. THE KEY TEST: Try to insert a test auth user
-- This will show the exact error
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    test_email text := 'diagnostic_test@bypass.com';
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TESTING AUTH USER INSERT';
    RAISE NOTICE '========================================';

    -- Try direct insert
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        aud,
        role,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    ) VALUES (
        test_user_id,
        '00000000-0000-0000-0000-000000000000',
        test_email,
        crypt('TestPassword123', gen_salt('bf')),
        NOW(),
        'authenticated',
        'authenticated',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );

    RAISE NOTICE '✅ SUCCESS! Auth user inserted successfully';

    -- Clean up
    DELETE FROM auth.users WHERE id = test_user_id;
    RAISE NOTICE 'Test user cleaned up';
    RAISE NOTICE '';
    RAISE NOTICE 'Auth user creation works! The issue must be elsewhere.';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR INSERTING AUTH USER';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    RAISE NOTICE 'ERROR: %', SQLERRM;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'This is the error blocking auth user creation!';
END $$;
