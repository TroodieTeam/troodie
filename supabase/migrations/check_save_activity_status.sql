-- Diagnostic Query: Check Save Activity Status
-- Run this in Supabase SQL Editor to diagnose why saves aren't showing in activity feed

-- 1. Check total saves in database
SELECT
  'Total Saves' as check_type,
  COUNT(*) as count
FROM restaurant_saves;

-- 2. Check saves by privacy level
SELECT
  'Saves by Privacy' as check_type,
  privacy,
  COUNT(*) as count
FROM restaurant_saves
GROUP BY privacy
ORDER BY count DESC;

-- 3. Check if saves are in activity_feed view
SELECT
  'Saves in Activity Feed' as check_type,
  COUNT(*) as count
FROM activity_feed
WHERE activity_type = 'save';

-- 4. Sample public saves (if any)
SELECT
  'Sample Public Saves' as check_type,
  rs.id,
  u.name as user_name,
  r.name as restaurant_name,
  rs.privacy,
  rs.created_at
FROM restaurant_saves rs
JOIN users u ON rs.user_id = u.id
JOIN restaurants r ON rs.restaurant_id = r.id
WHERE rs.privacy = 'public'
ORDER BY rs.created_at DESC
LIMIT 5;

-- 5. Sample private saves (to see what's being filtered out)
SELECT
  'Sample Private Saves' as check_type,
  rs.id,
  u.name as user_name,
  r.name as restaurant_name,
  rs.privacy,
  rs.created_at
FROM restaurant_saves rs
JOIN users u ON rs.user_id = u.id
JOIN restaurants r ON rs.restaurant_id = r.id
WHERE rs.privacy != 'public'
ORDER BY rs.created_at DESC
LIMIT 5;

-- 6. Check if restaurant_saves table has the required columns
SELECT
  'Restaurant Saves Columns' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'restaurant_saves'
AND column_name IN ('privacy', 'personal_rating', 'notes', 'photos')
ORDER BY column_name;
