-- Quick diagnostic to check bypass account status
-- Run this first to see what's actually in the database

-- Check auth.users
SELECT
    'AUTH.USERS TABLE' as table_name,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    encrypted_password IS NOT NULL as has_password,
    length(encrypted_password) as password_length,
    created_at
FROM auth.users
WHERE email = 'consumer2@bypass.com';

-- Check public.users
SELECT
    'PUBLIC.USERS TABLE' as table_name,
    id,
    email,
    name,
    username,
    created_at
FROM users
WHERE email = 'consumer2@bypass.com';

-- If account doesn't exist in auth.users, we need to create it there
-- Check total bypass accounts
SELECT
    'TOTAL BYPASS ACCOUNTS' as info,
    COUNT(*) FILTER (WHERE email LIKE '%@bypass.com') as total_in_public_users
FROM users;

SELECT
    'TOTAL IN AUTH' as info,
    COUNT(*) FILTER (WHERE email LIKE '%@bypass.com') as total_in_auth_users
FROM auth.users;
