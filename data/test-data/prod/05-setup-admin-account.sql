-- ============================================================================
-- Admin Account Setup: team@troodieapp.com
-- ============================================================================
-- Purpose: Create admin account with bypass OTP authentication
-- 
-- IMPORTANT: This script creates the public.users record ONLY.
-- You MUST create the auth user in Supabase Dashboard first, then:
-- 1. Run this script with the UUID from auth.users
-- 2. Add the UUID to services/adminReviewService.ts ADMIN_USER_IDS array
--
-- Usage:
-- 1. Create auth user in Supabase Dashboard (see ADMIN_ACCOUNT_SETUP_GUIDE.md)
-- 2. Get the UUID from auth.users
-- 3. Replace CREATED_UUID below with the actual UUID
-- 4. Run this script
-- ============================================================================

-- ============================================================================
-- CONFIGURATION
-- ============================================================================
-- ⚠️ REPLACE THIS WITH THE ACTUAL UUID FROM auth.users
-- Get UUID: SELECT id FROM auth.users WHERE email = 'team@troodieapp.com';
\set ADMIN_UUID 'REPLACE_WITH_ACTUAL_UUID'

DO $$
DECLARE
  v_admin_uuid UUID;
  v_auth_user_exists BOOLEAN;
BEGIN
  -- Get UUID from variable or use placeholder
  v_admin_uuid := :'ADMIN_UUID'::uuid;
  
  -- Check if UUID is placeholder
  IF v_admin_uuid = '00000000-0000-0000-0000-000000000000'::uuid OR 
     v_admin_uuid::text = 'REPLACE_WITH_ACTUAL_UUID' THEN
    RAISE EXCEPTION 'Please replace ADMIN_UUID with the actual UUID from auth.users. Run: SELECT id FROM auth.users WHERE email = ''team@troodieapp.com'';';
  END IF;
  
  -- Verify auth user exists
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = v_admin_uuid AND email = 'team@troodieapp.com'
  ) INTO v_auth_user_exists;
  
  IF NOT v_auth_user_exists THEN
    RAISE EXCEPTION 'Auth user not found. Please create auth user in Supabase Dashboard first. Expected UUID: %', v_admin_uuid;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SETTING UP ADMIN ACCOUNT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email: team@troodieapp.com';
  RAISE NOTICE 'UUID: %', v_admin_uuid;
  RAISE NOTICE '';
  
  -- Create/update public.users record
  INSERT INTO public.users (
    id,
    email,
    name,
    account_type,
    role,
    is_restaurant,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    v_admin_uuid,
    'team@troodieapp.com',
    'Troodie Team Admin',
    'business',
    'user',  -- Admin access is via UUID in adminReviewService.ts, not role field
    false,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    account_type = EXCLUDED.account_type,
    is_verified = true,
    updated_at = NOW();
  
  RAISE NOTICE '✅ Public user record created/updated';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ADMIN ACCOUNT SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Add UUID to adminReviewService.ts:';
  RAISE NOTICE '     File: services/adminReviewService.ts';
  RAISE NOTICE '     Add to ADMIN_USER_IDS array:';
  RAISE NOTICE '     ''%''', v_admin_uuid;
  RAISE NOTICE '';
  RAISE NOTICE '  2. Restart development server';
  RAISE NOTICE '';
  RAISE NOTICE '  3. Test login:';
  RAISE NOTICE '     Email: team@troodieapp.com';
  RAISE NOTICE '     OTP: 000000';
  RAISE NOTICE '';
  RAISE NOTICE '  4. Verify admin access:';
  RAISE NOTICE '     - Check "Admin Tools" appears in More tab';
  RAISE NOTICE '     - Can access admin review queue';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check auth user exists
SELECT 
  '1. Auth User' as check_name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'team@troodieapp.com') 
    THEN '✅ Exists' 
    ELSE '❌ Not Found' 
  END as status,
  (SELECT id FROM auth.users WHERE email = 'team@troodieapp.com') as uuid
UNION ALL

-- Check public user exists
SELECT 
  '2. Public User',
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.users WHERE email = 'team@troodieapp.com') 
    THEN '✅ Exists' 
    ELSE '❌ Not Found' 
  END,
  (SELECT id::text FROM public.users WHERE email = 'team@troodieapp.com')
UNION ALL

-- Check UUIDs match
SELECT 
  '3. UUIDs Match',
  CASE 
    WHEN (SELECT id FROM auth.users WHERE email = 'team@troodieapp.com') = 
         (SELECT id FROM public.users WHERE email = 'team@troodieapp.com')
    THEN '✅ Match' 
    ELSE '❌ Mismatch' 
  END,
  'N/A';

-- Show admin account details
SELECT 
  'Admin Account Details' as info,
  u.id,
  u.email,
  u.name,
  u.account_type,
  u.is_verified,
  CASE 
    WHEN u.id = 'b08d9600-358d-4be9-9552-4607d9f50227' THEN 'Admin 1'
    WHEN u.id = '31744191-f7c0-44a4-8673-10b34ccbb87f' THEN 'Admin 2'
    WHEN u.email = 'team@troodieapp.com' THEN 'Admin 3 (Team)'
    ELSE 'Not Admin'
  END as admin_label
FROM users u
WHERE u.email = 'team@troodieapp.com';
