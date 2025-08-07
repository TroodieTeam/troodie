-- Check jack_black's latest post and manually test cross-posting

-- 1. Get jack_black's user ID and latest post
SELECT 
  'JACK_BLACK_INFO' as section,
  u.id as user_id,
  p.id as latest_post_id,
  p.caption,
  p.post_type,
  p.created_at
FROM users u
JOIN posts p ON u.id = p.user_id
WHERE u.username = 'jack_black'
ORDER BY p.created_at DESC
LIMIT 1;

-- 2. Check what communities exist that jack_black could post to
SELECT 
  'AVAILABLE_COMMUNITIES' as section,
  c.id as community_id,
  c.name,
  c.type,
  c.member_count,
  CASE WHEN cm.user_id IS NOT NULL THEN 'MEMBER' ELSE 'NOT_MEMBER' END as membership_status
FROM communities c
LEFT JOIN community_members cm ON c.id = cm.community_id 
  AND cm.user_id = (SELECT id FROM users WHERE username = 'jack_black')
  AND cm.status = 'active'
ORDER BY c.created_at DESC;

-- 3. Test the cross_post_to_communities function manually
-- This will test with jack_black's latest post and first available community
SELECT 
  'MANUAL_CROSS_POST_TEST' as section,
  cross_post_to_communities(
    (SELECT p.id FROM posts p JOIN users u ON p.user_id = u.id WHERE u.username = 'jack_black' ORDER BY p.created_at DESC LIMIT 1),
    ARRAY[(SELECT c.id FROM communities c LIMIT 1)],
    (SELECT id FROM users WHERE username = 'jack_black')
  );

-- 4. After manual test, check if it created a record
SELECT 
  'POST_MANUAL_TEST_CHECK' as section,
  COUNT(*) as cross_posts_after_manual_test
FROM post_communities;