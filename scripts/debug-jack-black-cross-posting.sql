-- Debug SQL query to investigate jack_black's cross-posting issue
-- Run this in Supabase SQL editor to see where the breakdown is happening

-- 1. Find jack_black's user ID and recent posts
SELECT 
  'USER INFO' as section,
  u.id as user_id,
  u.username,
  u.name,
  u.created_at as user_created
FROM users u 
WHERE u.username = 'jack_black'
LIMIT 1;

-- 2. Get jack_black's recent posts (last 10)
SELECT 
  'RECENT POSTS' as section,
  p.id as post_id,
  p.user_id,
  p.restaurant_id,
  p.post_type,
  p.content_type,
  p.caption,
  p.created_at,
  u.username
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE u.username = 'jack_black'
ORDER BY p.created_at DESC
LIMIT 10;

-- 3. Check if any of jack_black's posts are in post_communities table
SELECT 
  'POST COMMUNITIES CHECK' as section,
  pc.id as pc_id,
  pc.post_id,
  pc.community_id,
  pc.added_by,
  pc.added_at,
  p.caption as post_caption,
  c.name as community_name,
  u.username as added_by_username
FROM post_communities pc
JOIN posts p ON pc.post_id = p.id
JOIN communities c ON pc.community_id = c.id
JOIN users u ON pc.added_by = u.id
WHERE p.user_id = (SELECT id FROM users WHERE username = 'jack_black')
ORDER BY pc.added_at DESC;

-- 4. Check communities that jack_black is a member of
SELECT 
  'COMMUNITY MEMBERSHIPS' as section,
  c.id as community_id,
  c.name as community_name,
  c.type as community_type,
  cm.role as user_role,
  cm.status as membership_status,
  cm.joined_at
FROM community_members cm
JOIN communities c ON cm.community_id = c.id
JOIN users u ON cm.user_id = u.id
WHERE u.username = 'jack_black'
ORDER BY cm.joined_at DESC;

-- 5. Get the most recent post by jack_black and check cross-posting details
WITH latest_post AS (
  SELECT p.id as post_id
  FROM posts p
  JOIN users u ON p.user_id = u.id
  WHERE u.username = 'jack_black'
  ORDER BY p.created_at DESC
  LIMIT 1
)
SELECT 
  'LATEST POST CROSS-POST CHECK' as section,
  lp.post_id,
  pc.community_id,
  c.name as community_name,
  pc.added_at,
  pc.added_by,
  u.username as added_by_username
FROM latest_post lp
LEFT JOIN post_communities pc ON lp.post_id = pc.post_id
LEFT JOIN communities c ON pc.community_id = c.id
LEFT JOIN users u ON pc.added_by = u.id;

-- 6. Check if there are ANY records in post_communities table (to verify table exists and has data)
SELECT 
  'POST_COMMUNITIES TABLE STATUS' as section,
  COUNT(*) as total_records,
  COUNT(DISTINCT post_id) as unique_posts,
  COUNT(DISTINCT community_id) as unique_communities,
  MIN(added_at) as earliest_entry,
  MAX(added_at) as latest_entry
FROM post_communities;

-- 7. Sample some recent post_communities records for context
SELECT 
  'RECENT POST_COMMUNITIES SAMPLE' as section,
  pc.id,
  pc.post_id,
  pc.community_id,
  pc.added_by,
  pc.added_at,
  p.caption as post_caption,
  c.name as community_name,
  u.username as poster_username,
  u2.username as added_by_username
FROM post_communities pc
JOIN posts p ON pc.post_id = p.id
JOIN communities c ON pc.community_id = c.id
JOIN users u ON p.user_id = u.id
JOIN users u2 ON pc.added_by = u2.id
ORDER BY pc.added_at DESC
LIMIT 5;

-- 8. Check for any failed RLS policies by looking at communities jack_black can access
SELECT 
  'ACCESSIBLE COMMUNITIES' as section,
  c.id as community_id,
  c.name as community_name,
  c.type,
  c.member_count,
  CASE 
    WHEN cm.user_id IS NOT NULL THEN 'MEMBER'
    WHEN c.type = 'public' THEN 'PUBLIC_ACCESS'
    ELSE 'NO_ACCESS'
  END as access_status
FROM communities c
LEFT JOIN community_members cm ON c.id = cm.community_id 
  AND cm.user_id = (SELECT id FROM users WHERE username = 'jack_black')
  AND cm.status = 'active'
ORDER BY c.created_at DESC
LIMIT 10;

-- 9. Check if cross_post_to_communities function exists
SELECT 
  'FUNCTION CHECK' as section,
  routine_name,
  routine_type,
  data_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines
WHERE routine_name = 'cross_post_to_communities'
AND routine_schema = 'public';

-- 10. Test cross_post_to_communities function with jack_black's latest post (if function exists)
-- This would need to be run separately if the function exists:
-- SELECT * FROM cross_post_to_communities(
--   (SELECT p.id FROM posts p JOIN users u ON p.user_id = u.id WHERE u.username = 'jack_black' ORDER BY p.created_at DESC LIMIT 1),
--   ARRAY[(SELECT c.id FROM communities c LIMIT 1)],
--   (SELECT id FROM users WHERE username = 'jack_black')
-- );