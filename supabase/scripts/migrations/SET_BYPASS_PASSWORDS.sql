-- Set passwords for all @bypass.com test accounts
-- This allows them to use real Supabase authentication instead of mock sessions
-- Run this in Supabase SQL Editor

-- The password for all bypass accounts will be: BypassTestPassword000000

-- Update passwords for all @bypass.com accounts in auth.users
-- Note: We need to use the auth.users table and set encrypted_password

-- Get all @bypass.com user IDs
DO $$
DECLARE
    bypass_user RECORD;
    hashed_password TEXT;
BEGIN
    -- The hashed version of 'BypassTestPassword000000' using bcrypt
    -- You'll need to generate this using bcrypt with cost factor 10
    -- For now, we'll use Supabase's built-in function if available

    FOR bypass_user IN
        SELECT id, email
        FROM auth.users
        WHERE email LIKE '%@bypass.com'
    LOOP
        -- Update each user to have a password
        -- Using a direct UPDATE on auth.users
        -- Note: confirmed_at is a generated column, so we don't update it directly
        UPDATE auth.users
        SET
            encrypted_password = crypt('BypassTestPassword000000', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE id = bypass_user.id;

        RAISE NOTICE 'Updated password for: %', bypass_user.email;
    END LOOP;
END $$;

SELECT 'Passwords set for all @bypass.com accounts' as message;

-- Verify the update
SELECT
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    encrypted_password IS NOT NULL as has_password,
    created_at
FROM auth.users
WHERE email LIKE '%@bypass.com'
ORDER BY email;
