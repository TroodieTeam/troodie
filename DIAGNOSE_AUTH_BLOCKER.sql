-- ========================================
-- COMPREHENSIVE AUTH USER CREATION DIAGNOSTIC
-- Run this in Supabase SQL Editor to find what's blocking auth user creation
-- ========================================

-- 1. Check if there are ANY triggers on auth schema tables
SELECT
    'AUTH SCHEMA TRIGGERS' as diagnostic,
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'auth'
AND t.tgname NOT LIKE 'RI_%'
AND t.tgname NOT LIKE 'pg_%'
ORDER BY c.relname, t.tgname;

-- 2. Check auth.users table structure
SELECT
    'AUTH.USERS COLUMNS' as diagnostic,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'auth'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. Check for any CHECK constraints on auth.users
SELECT
    'AUTH.USERS CHECK CONSTRAINTS' as diagnostic,
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'auth.users'::regclass
AND contype = 'c';

-- 4. Check if RLS is enabled on auth.users (it shouldn't be)
SELECT
    'AUTH.USERS RLS STATUS' as diagnostic,
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE oid = 'auth.users'::regclass;

-- 5. Check auth configuration
SELECT
    'AUTH CONFIGURATION' as diagnostic,
    *
FROM auth.config
LIMIT 1;

-- 6. Try to manually insert a test auth user (THIS WILL SHOW THE ACTUAL ERROR)
DO $$
DECLARE
    test_user_id uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    test_email text := 'testdiagnostic@bypass.com';
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ATTEMPTING TO INSERT TEST AUTH USER';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Email: %', test_email;
    RAISE NOTICE 'ID: %', test_user_id;
    RAISE NOTICE '';

    -- Try to insert directly
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        aud,
        role,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        '00000000-0000-0000-0000-000000000000',
        test_email,
        crypt('TestPassword123', gen_salt('bf')),
        NOW(),
        'authenticated',
        'authenticated',
        NOW(),
        NOW()
    );

    RAISE NOTICE 'SUCCESS! Test user inserted successfully';
    RAISE NOTICE 'This means auth user creation should work';

    -- Clean up
    DELETE FROM auth.users WHERE id = test_user_id;
    RAISE NOTICE 'Test user cleaned up';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ERROR INSERTING TEST AUTH USER';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Error Code: %', SQLSTATE;
    RAISE NOTICE 'Error Message: %', SQLERRM;
    RAISE NOTICE '';
    RAISE NOTICE 'This is the error blocking auth user creation!';
    RAISE NOTICE '========================================';
END $$;

-- 7. Check for database hooks/webhooks
SELECT
    'DATABASE WEBHOOKS' as diagnostic,
    *
FROM supabase_functions.hooks
WHERE table_name LIKE '%user%'
OR schema_name = 'auth';

-- 8. Check for any policies that might interfere
SELECT
    'AUTH RELATED POLICIES' as diagnostic,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE schemaname = 'auth'
OR (schemaname = 'public' AND tablename = 'users')
ORDER BY schemaname, tablename, policyname;

-- 9. Final summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNOSTIC COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Review the output above to find what is blocking auth user creation.';
    RAISE NOTICE 'The most likely causes are:';
    RAISE NOTICE '1. A trigger on auth.users that fails';
    RAISE NOTICE '2. A CHECK constraint that rejects the data';
    RAISE NOTICE '3. RLS enabled on auth.users (should be disabled)';
    RAISE NOTICE '4. A database hook/webhook that fails';
    RAISE NOTICE '';
    RAISE NOTICE 'Look for the "ERROR INSERTING TEST AUTH USER" section above';
    RAISE NOTICE 'to see the exact error message.';
    RAISE NOTICE '========================================';
END $$;
