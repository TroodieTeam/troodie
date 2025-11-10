-- Check for any triggers, constraints, or policies that might block auth.users creation
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check for triggers on auth.users
SELECT
    'TRIGGERS ON auth.users' as check_type,
    tgname as trigger_name,
    proname as function_name,
    tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'auth.users'::regclass
AND tgname NOT LIKE 'RI_%'
AND tgname NOT LIKE 'pg_%';

-- 2. Check for constraints on auth.users
SELECT
    'CONSTRAINTS ON auth.users' as check_type,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'auth.users'::regclass;

-- 3. Check for RLS policies on auth.users (shouldn't have any, but check anyway)
SELECT
    'RLS POLICIES ON auth.users' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'auth' AND tablename = 'users';

-- 4. Check if RLS is enabled on auth.users (it shouldn't be)
SELECT
    'RLS STATUS ON auth.users' as check_type,
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE oid = 'auth.users'::regclass;

-- 5. Check for database webhooks or event triggers
SELECT
    'DATABASE WEBHOOKS' as check_type,
    *
FROM supabase_functions.hooks
WHERE table_name = 'users' OR table_name = 'auth.users';

-- 6. List all functions that might be triggered on user creation
SELECT
    'FUNCTIONS RELATED TO USER CREATION' as check_type,
    n.nspname as schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname ILIKE '%user%'
AND p.proname ILIKE '%new%'
AND n.nspname IN ('public', 'auth');

-- 7. Check Supabase auth configuration
SELECT
    'AUTH CONFIGURATION' as check_type,
    *
FROM auth.config;
