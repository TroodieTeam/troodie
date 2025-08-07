-- Check if the cross_post_to_communities function was updated

-- 1. Check function definition
SELECT 
  'FUNCTION_INFO' as section,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'cross_post_to_communities'
AND routine_schema = 'public';

-- 2. Test the function manually to see the exact error
SELECT 
  'MANUAL_TEST' as section,
  cross_post_to_communities(
    (SELECT id FROM posts ORDER BY created_at DESC LIMIT 1),
    ARRAY['d223aeda-a19d-413e-b99d-3e3c5c72c2b6'::UUID],
    (SELECT id FROM users WHERE username = 'jack_black')
  );