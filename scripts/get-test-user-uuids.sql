-- ================================================================
-- Quick Query: Get All Test User UUIDs (@bypass.com)
-- ================================================================
-- Run this in Supabase SQL Editor to get all test user UUIDs
-- ================================================================

SELECT 
  au.id as uuid,
  au.email,
  COALESCE(pu.account_type, 'unknown') as account_type
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE 'test-%@bypass.com'
ORDER BY 
  CASE 
    WHEN pu.account_type = 'consumer' THEN 1
    WHEN pu.account_type = 'creator' THEN 2
    WHEN pu.account_type = 'business' THEN 3
    ELSE 4
  END,
  au.email;

-- ================================================================
-- Alternative: Just get UUIDs and emails (copy-paste friendly)
-- ================================================================

SELECT 
  au.id,
  au.email
FROM auth.users au
WHERE au.email LIKE 'test-%@bypass.com'
ORDER BY au.email;
