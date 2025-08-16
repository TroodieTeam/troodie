-- Update Review Account Email and Username
-- Changes kouamendri1@gmail.com to review@troodieapp.com
-- UUID: 175b77a2-4a54-4239-b0ce-9d1351bbb6d0

-- IMPORTANT: Run these queries in order in Supabase SQL Editor

-- Step 1: Update the auth.users table (Supabase authentication)
UPDATE auth.users 
SET 
  email = 'review@troodieapp.com',
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{email}',
    '"review@troodieapp.com"'
  ),
  updated_at = now()
WHERE id = '175b77a2-4a54-4239-b0ce-9d1351bbb6d0';

-- Step 2: Update the public.users table (your app's user profile)
UPDATE public.users 
SET 
  email = 'review@troodieapp.com',
  username = 'apple_reviewer',  -- Change username to something appropriate
  name = 'Apple Reviewer',      -- Update display name if needed
  bio = 'Official Apple App Store Review Account',
  updated_at = now()
WHERE id = '175b77a2-4a54-4239-b0ce-9d1351bbb6d0';

-- Step 3: Verify the changes
SELECT 
  'Auth User' as table_name,
  id,
  email,
  updated_at
FROM auth.users
WHERE id = '175b77a2-4a54-4239-b0ce-9d1351bbb6d0'

UNION ALL

SELECT 
  'Public User' as table_name,
  id,
  email,
  updated_at::timestamptz
FROM public.users
WHERE id = '175b77a2-4a54-4239-b0ce-9d1351bbb6d0';

-- Step 4: Display results
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Review Account Updated!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'New credentials:';
    RAISE NOTICE '  Email: review@troodieapp.com';
    RAISE NOTICE '  Username: apple_reviewer';
    RAISE NOTICE '  Password: ReviewPass000000';
    RAISE NOTICE '  OTP Code: 000000';
    RAISE NOTICE '  UUID: 175b77a2-4a54-4239-b0ce-9d1351bbb6d0';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Update your code files!';
    RAISE NOTICE '  - authService.ts: Change email check';
    RAISE NOTICE '  - AuthContext.tsx: Update email reference';
    RAISE NOTICE '============================================';
END $$;