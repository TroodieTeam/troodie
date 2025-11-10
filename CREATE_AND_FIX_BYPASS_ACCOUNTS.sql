-- Comprehensive script to CREATE and FIX @bypass.com test accounts
-- This script will:
-- 1. Find all @bypass.com accounts in public.users
-- 2. Create corresponding accounts in auth.users if they don't exist
-- 3. Set passwords for all bypass accounts
-- 4. Confirm all emails
--
-- Run this in Supabase SQL Editor

-- STEP 1: Check current state
SELECT 'STEP 1: Current bypass accounts in public.users' as step;

SELECT
    id,
    email,
    name,
    username,
    created_at
FROM users
WHERE email LIKE '%@bypass.com'
ORDER BY email;

SELECT 'STEP 2: Current bypass accounts in auth.users' as step;

SELECT
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    encrypted_password IS NOT NULL as has_password,
    created_at
FROM auth.users
WHERE email LIKE '%@bypass.com'
ORDER BY email;

-- STEP 3: Create missing accounts in auth.users and set passwords for all
SELECT 'STEP 3: Creating missing accounts and setting passwords' as step;

DO $$
DECLARE
    public_user RECORD;
    auth_user_id UUID;
    project_instance_id UUID;
    accounts_created INTEGER := 0;
    accounts_updated INTEGER := 0;
BEGIN
    -- Get the instance_id from any existing auth user
    -- If no users exist, we'll use a default UUID
    SELECT instance_id INTO project_instance_id
    FROM auth.users
    LIMIT 1;

    -- If no users exist, use the default Supabase instance ID
    IF project_instance_id IS NULL THEN
        project_instance_id := '00000000-0000-0000-0000-000000000000';
        RAISE NOTICE 'No existing auth users found, using default instance_id';
    ELSE
        RAISE NOTICE 'Using instance_id from existing users: %', project_instance_id;
    END IF;

    -- Loop through all @bypass.com accounts in public.users
    FOR public_user IN
        SELECT id, email, created_at
        FROM users
        WHERE email LIKE '%@bypass.com'
    LOOP
        -- Check if account exists in auth.users
        SELECT id INTO auth_user_id
        FROM auth.users
        WHERE email = public_user.email;

        IF auth_user_id IS NULL THEN
            -- Account doesn't exist in auth.users, create it
            RAISE NOTICE 'Creating auth account for: % (ID: %)', public_user.email, public_user.id;

            INSERT INTO auth.users (
                id,
                instance_id,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                aud,
                role,
                created_at,
                updated_at,
                confirmation_token,
                recovery_token,
                email_change_token_new,
                email_change
            ) VALUES (
                public_user.id,
                project_instance_id,
                public_user.email,
                crypt('BypassTestPassword000000', gen_salt('bf')),
                NOW(),
                '{"provider":"email","providers":["email"]}',
                '{}',
                'authenticated',
                'authenticated',
                public_user.created_at,
                NOW(),
                '',
                '',
                '',
                ''
            );

            accounts_created := accounts_created + 1;
        ELSE
            -- Account exists, just update password and confirm email
            RAISE NOTICE 'Updating password for existing account: % (ID: %)', public_user.email, auth_user_id;

            UPDATE auth.users
            SET
                encrypted_password = crypt('BypassTestPassword000000', gen_salt('bf')),
                email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
                updated_at = NOW()
            WHERE id = auth_user_id;

            accounts_updated := accounts_updated + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '=== SUMMARY ===';
    RAISE NOTICE 'Accounts created in auth.users: %', accounts_created;
    RAISE NOTICE 'Accounts updated in auth.users: %', accounts_updated;
    RAISE NOTICE 'Total processed: %', accounts_created + accounts_updated;
END $$;

-- STEP 4: Verify all accounts now exist with passwords
SELECT 'STEP 4: Verification - all bypass accounts should now be in auth.users with passwords' as step;

SELECT
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    encrypted_password IS NOT NULL as has_password,
    length(encrypted_password) as password_hash_length,
    created_at,
    updated_at
FROM auth.users
WHERE email LIKE '%@bypass.com'
ORDER BY email;

-- STEP 5: Final summary
SELECT 'STEP 5: Final Summary' as step;

SELECT
    COUNT(*) FILTER (WHERE u.email LIKE '%@bypass.com') as total_in_public_users,
    COUNT(*) FILTER (WHERE au.email LIKE '%@bypass.com') as total_in_auth_users,
    COUNT(*) FILTER (WHERE au.email LIKE '%@bypass.com' AND au.encrypted_password IS NOT NULL) as total_with_passwords,
    COUNT(*) FILTER (WHERE au.email LIKE '%@bypass.com' AND au.email_confirmed_at IS NOT NULL) as total_confirmed
FROM users u
FULL OUTER JOIN auth.users au ON u.email = au.email
WHERE u.email LIKE '%@bypass.com' OR au.email LIKE '%@bypass.com';

-- Expected result: All counts should be equal
-- If total_in_auth_users = total_in_public_users and total_with_passwords = total_in_auth_users, you're good!
