-- ============================================================================
-- Sync Auth Users to Public Users Table
-- ============================================================================
-- This script checks which auth.users entries don't have corresponding
-- public.users entries and creates them.
-- 
-- Use case: When test accounts are created in auth.users but the trigger
-- didn't fire or was disabled, they need to be manually synced.
-- ============================================================================

-- ============================================================================
-- STEP 1: Check which auth users are missing from public.users
-- ============================================================================
-- Run this first to see which users need to be synced

SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  CASE WHEN pu.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as public_user_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE '%@bypass.com' OR au.email LIKE '%@troodie.test'
ORDER BY au.email;

-- ============================================================================
-- STEP 2: Insert missing users into public.users
-- ============================================================================
-- This will create public.users entries for auth users that don't have them
-- It uses ON CONFLICT to avoid errors if a user already exists

INSERT INTO public.users (id, email, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.created_at, NOW()),
  COALESCE(au.updated_at, NOW())
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL  -- Only users that don't exist in public.users
  AND (au.email LIKE '%@bypass.com' OR au.email LIKE '%@troodie.test')
ON CONFLICT (id) DO NOTHING;  -- Skip if somehow already exists

-- ============================================================================
-- STEP 3: Verify sync completed
-- ============================================================================
-- Run this after STEP 2 to confirm all users are synced

SELECT 
  au.id,
  au.email,
  pu.id as public_user_id,
  pu.email as public_user_email,
  CASE WHEN pu.id IS NOT NULL THEN '✅ SYNCED' ELSE '❌ MISSING' END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE '%@bypass.com' OR au.email LIKE '%@troodie.test'
ORDER BY au.email;

-- ============================================================================
-- STEP 4: Set account_type based on email pattern (optional)
-- ============================================================================
-- If account_type needs to be set based on email pattern

UPDATE public.users
SET account_type = CASE
  WHEN email LIKE '%consumer%@bypass.com' OR email LIKE '%consumer%@troodie.test' THEN 'consumer'
  WHEN email LIKE '%creator%@bypass.com' OR email LIKE '%creator%@troodie.test' THEN 'creator'
  WHEN email LIKE '%business%@bypass.com' OR email LIKE '%business%@troodie.test' THEN 'business'
  ELSE 'consumer'  -- Default fallback
END,
updated_at = NOW()
WHERE (email LIKE '%@bypass.com' OR email LIKE '%@troodie.test')
  AND (account_type IS NULL OR account_type = 'consumer');

-- ============================================================================
-- STEP 5: Verify account types were set correctly
-- ============================================================================

SELECT 
  id,
  email,
  account_type,
  is_test_account,
  created_at
FROM public.users
WHERE email LIKE '%@bypass.com' OR email LIKE '%@troodie.test'
ORDER BY account_type, email;

-- ============================================================================
-- SPECIFIC UIDs FROM SCREENSHOT (if needed)
-- ============================================================================
-- If you want to sync specific UIDs from your screenshot:

-- INSERT INTO public.users (id, email, created_at, updated_at, account_type)
-- VALUES
--   ('08f478e2-45b9-4ab2-a068-8276beb851c3', 'prod-creator3@bypass.com', NOW(), NOW(), 'creator'),
--   ('0e281bb7-6867-40b4-afff-4e82608cc34d', 'prod-business2@bypass.com', NOW(), NOW(), 'business'),
--   ('2621c5c4-a6de-42e5-8f1d-b73039646403', 'prod-consumer2@bypass.com', NOW(), NOW(), 'consumer'),
--   ('348be0b5-eef5-41be-8728-84c4d09d2bf2', 'prod-creator1@bypass.com', NOW(), NOW(), 'creator'),
--   ('6740e5be-c1ca-444c-b100-6122c3dd8273', 'prod-creator2@bypass.com', NOW(), NOW(), 'creator'),
--   ('b22f710c-c15a-4ee1-bce4-061902b954cc', 'prod-consumer1@bypass.com', NOW(), NOW(), 'consumer'),
--   ('cfd8cdb5-a227-42bd-8040-cd4fb965b58e', 'prod-business1@bypass.com', NOW(), NOW(), 'business')
-- ON CONFLICT (id) DO UPDATE SET
--   email = EXCLUDED.email,
--   account_type = EXCLUDED.account_type,
--   updated_at = NOW();
