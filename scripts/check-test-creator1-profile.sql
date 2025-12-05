-- ================================================================
-- Diagnostic Query: Check test-creator1 Profile Status
-- ================================================================
-- Run this to see what's in the database for test-creator1
-- ================================================================

-- 1. Check if user exists in auth.users
SELECT 
  'auth.users' as source,
  id,
  email,
  raw_user_meta_data->>'name' as name_from_metadata,
  raw_user_meta_data->>'account_type' as account_type_from_metadata,
  created_at
FROM auth.users
WHERE email = 'test-creator1@bypass.com'
   OR id = '4a797077-116e-4a3a-bc43-a71ae18963d8'::uuid;

-- 2. Check if user exists in public.users
SELECT 
  'public.users' as source,
  id,
  email,
  name,
  username,
  account_type,
  created_at
FROM public.users
WHERE email = 'test-creator1@bypass.com'
   OR id = '4a797077-116e-4a3a-bc43-a71ae18963d8'::uuid;

-- 3. Check if creator_profiles record exists
SELECT 
  'creator_profiles' as source,
  id as profile_id,
  user_id,
  display_name,
  bio,
  location,
  specialties,
  food_specialties,
  availability_status,
  open_to_collabs,
  verification_status,
  portfolio_uploaded,
  total_followers,
  troodie_engagement_rate,
  created_at,
  updated_at
FROM creator_profiles
WHERE user_id = '4a797077-116e-4a3a-bc43-a71ae18963d8'::uuid;

-- 4. Combined view - everything together
SELECT 
  'COMBINED VIEW' as source,
  au.id as auth_user_id,
  au.email as auth_email,
  pu.id as public_user_id,
  pu.name as public_name,
  pu.username as public_username,
  pu.account_type as public_account_type,
  cp.id as creator_profile_id,
  cp.display_name as creator_display_name,
  cp.availability_status,
  cp.open_to_collabs,
  CASE 
    WHEN au.id IS NULL THEN '❌ Not in auth.users'
    WHEN pu.id IS NULL THEN '⚠️ Not in public.users'
    WHEN cp.id IS NULL THEN '⚠️ No creator_profiles record'
    ELSE '✅ All records exist'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
LEFT JOIN creator_profiles cp ON cp.user_id = au.id
WHERE au.email = 'test-creator1@bypass.com'
   OR au.id = '4a797077-116e-4a3a-bc43-a71ae18963d8'::uuid;

-- 5. Check portfolio items if profile exists
-- Only selecting columns that definitely exist in base schema
SELECT 
  'portfolio_items' as source,
  cpi.id,
  cpi.creator_profile_id,
  cpi.image_url,
  cpi.display_order,
  cpi.created_at
FROM creator_portfolio_items cpi
JOIN creator_profiles cp ON cp.id = cpi.creator_profile_id
WHERE cp.user_id = '4a797077-116e-4a3a-bc43-a71ae18963d8'::uuid
ORDER BY cpi.display_order;
