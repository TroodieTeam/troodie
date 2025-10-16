-- ========================================
-- Setup Bypass Accounts with Password Auth
-- This allows testing with fake emails (@bypass.com)
-- ========================================

-- PREREQUISITE: Disable email confirmation in Supabase Dashboard
-- Go to: Settings → Auth → Email → Set "Confirm email" to DISABLED

-- Step 1: Enable password auth provider if not already enabled
-- (You may need to do this in Dashboard: Settings → Auth → Providers → Email)

-- Step 2: Create auth users for all bypass accounts with passwords
DO $$
DECLARE
    bypass_account RECORD;
    accounts_created INTEGER := 0;
    accounts_skipped INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CREATING BYPASS AUTH ACCOUNTS';
    RAISE NOTICE '========================================';

    FOR bypass_account IN
        SELECT id, email
        FROM users
        WHERE email LIKE '%@bypass.com'
        ORDER BY email
    LOOP
        -- Check if auth user already exists
        IF EXISTS (SELECT 1 FROM auth.users WHERE id = bypass_account.id) THEN
            RAISE NOTICE '✓ Auth user already exists: % (updating password)', bypass_account.email;

            -- Update password for existing user
            UPDATE auth.users
            SET
                encrypted_password = crypt('BypassPassword123', gen_salt('bf')),
                email_confirmed_at = NOW(),
                updated_at = NOW()
            WHERE id = bypass_account.id;

            accounts_skipped := accounts_skipped + 1;
        ELSE
            RAISE NOTICE '✓ Creating auth user: %', bypass_account.email;

            -- Create new auth user
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
                bypass_account.id,
                '00000000-0000-0000-0000-000000000000',
                bypass_account.email,
                crypt('BypassPassword123', gen_salt('bf')),
                NOW(), -- Email already confirmed
                'authenticated',
                'authenticated',
                NOW(),
                NOW(),
                '',
                '',
                '',
                ''
            );

            accounts_created := accounts_created + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Accounts created: %', accounts_created;
    RAISE NOTICE 'Accounts updated: %', accounts_skipped;
    RAISE NOTICE 'Total processed: %', accounts_created + accounts_skipped;
    RAISE NOTICE '';
    RAISE NOTICE 'Password for all accounts: BypassPassword123';
    RAISE NOTICE 'OTP code in app: 000000 (triggers password auth)';
    RAISE NOTICE '========================================';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR OCCURRED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE '';
    RAISE NOTICE 'Common causes:';
    RAISE NOTICE '1. Email confirmation not disabled in Supabase Dashboard';
    RAISE NOTICE '2. Database trigger still blocking auth.users INSERT';
    RAISE NOTICE '3. RLS policy blocking the operation';
    RAISE NOTICE '';
    RAISE NOTICE 'Fix: Go to Supabase Dashboard → Settings → Auth';
    RAISE NOTICE 'Set "Confirm email" to DISABLED';
    RAISE NOTICE '========================================';
END $$;

-- Step 3: Verify the setup
SELECT
    '========================================' as separator;

SELECT
    'VERIFICATION' as check_type,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    encrypted_password IS NOT NULL as has_password,
    created_at
FROM auth.users
WHERE email LIKE '%@bypass.com'
ORDER BY email;

SELECT
    '========================================' as separator;

-- Step 4: Test one account
DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Testing password authentication...';
    RAISE NOTICE '';

    -- The app will use signInWithPassword in authService
    -- This is just for verification

    SELECT
        email,
        encrypted_password IS NOT NULL as has_password,
        email_confirmed_at IS NOT NULL as is_confirmed
    INTO test_result
    FROM auth.users
    WHERE email = 'consumer2@bypass.com';

    IF FOUND THEN
        RAISE NOTICE '✅ Test account ready: consumer2@bypass.com';
        RAISE NOTICE '   Has password: %', test_result.has_password;
        RAISE NOTICE '   Email confirmed: %', test_result.is_confirmed;
    ELSE
        RAISE NOTICE '❌ Test account not found';
    END IF;
END $$;
