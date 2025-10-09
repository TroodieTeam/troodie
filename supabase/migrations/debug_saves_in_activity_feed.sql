-- Debug: Why aren't saves showing in activity feed?
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if restaurant_saves table exists and has data
SELECT
  'Total restaurant_saves' as check_name,
  COUNT(*) as count
FROM restaurant_saves;

-- 2. Check privacy distribution
SELECT
  'Saves by privacy' as check_name,
  privacy,
  COUNT(*) as count
FROM restaurant_saves
GROUP BY privacy
ORDER BY count DESC;

-- 3. Check if any PUBLIC saves exist
SELECT
  'Public saves' as check_name,
  COUNT(*) as count
FROM restaurant_saves
WHERE privacy = 'public';

-- 4. Check activity_feed view for save activity type
SELECT
  'Saves in activity_feed view' as check_name,
  COUNT(*) as count
FROM activity_feed
WHERE activity_type = 'save';

-- 5. Sample some restaurant_saves to see structure
SELECT
  'Sample saves (any privacy)' as check_name,
  rs.id,
  rs.privacy,
  u.name as user_name,
  r.name as restaurant_name,
  rs.created_at
FROM restaurant_saves rs
LEFT JOIN users u ON rs.user_id = u.id
LEFT JOIN restaurants r ON rs.restaurant_id = r.id
ORDER BY rs.created_at DESC
LIMIT 5;

-- 6. Test the get_activity_feed function
SELECT
  'Test get_activity_feed() function' as check_name,
  activity_type,
  actor_name,
  target_name,
  created_at
FROM get_activity_feed(NULL, 'all', 50, 0, NULL)
WHERE activity_type = 'save'
LIMIT 5;

-- 7. Check if activity_feed view includes restaurant_saves query
SELECT
  'Check view definition' as check_name,
  pg_get_viewdef('activity_feed', true) LIKE '%restaurant_saves%' as includes_saves;
