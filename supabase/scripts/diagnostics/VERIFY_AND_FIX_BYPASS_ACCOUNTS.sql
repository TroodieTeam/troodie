-- Comprehensive script to verify and fix @bypass.com test accounts
-- Run this in Supabase SQL Editor

-- STEP 1: Check if accounts exist in auth.users
SELECT
    'STEP 1: Existing bypass accounts in auth.users' as step;

SELECT
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    encrypted_password IS NOT NULL as has_password,
    created_at,
    updated_at
FROM auth.users
WHERE email LIKE '%@bypass.com'
ORDER BY email;

-- STEP 2: Check if accounts exist in public.users
SELECT
    'STEP 2: Existing bypass accounts in public.users' as step;

SELECT
    id,
    email,
    name,
    username,
    created_at
FROM users
WHERE email LIKE '%@bypass.com'
ORDER BY email;

-- STEP 3: For accounts that exist, set their password
-- Note: This uses the pgcrypto extension for password hashing
SELECT
    'STEP 3: Setting passwords for existing accounts' as step;

DO $$
DECLARE
    bypass_user RECORD;
    accounts_updated INTEGER := 0;
BEGIN
    FOR bypass_user IN
        SELECT id, email
        FROM auth.users
        WHERE email LIKE '%@bypass.com'
    LOOP
        -- Set password and confirm email
        UPDATE auth.users
        SET
            encrypted_password = crypt('BypassTestPassword000000', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = bypass_user.id;

        accounts_updated := accounts_updated + 1;
        RAISE NOTICE 'Updated password for: % (ID: %)', bypass_user.email, bypass_user.id;
    END LOOP;

    RAISE NOTICE 'Total accounts updated: %', accounts_updated;
END $$;

-- STEP 4: Verify the updates
SELECT
    'STEP 4: Verification - accounts should now have passwords' as step;

SELECT
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    encrypted_password IS NOT NULL as has_password,
    length(encrypted_password) as password_hash_length,
    updated_at
FROM auth.users
WHERE email LIKE '%@bypass.com'
ORDER BY email;

-- STEP 5: Final summary
SELECT
    'STEP 5: Summary' as step;

SELECT
    COUNT(*) as total_bypass_accounts,
    COUNT(CASE WHEN encrypted_password IS NOT NULL THEN 1 END) as accounts_with_password,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as accounts_confirmed
FROM auth.users
WHERE email LIKE '%@bypass.com';
