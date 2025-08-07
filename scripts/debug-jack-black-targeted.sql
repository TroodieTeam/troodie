-- Targeted debug for jack_black - step by step investigation

-- Step 1: Does jack_black user exist?
SELECT 'Step 1: User Existence' as debug_step, COUNT(*) as user_count
FROM users 
WHERE username = 'jack_black';

-- Step 2: Show all users with similar names (in case of case sensitivity or typo)
SELECT 'Step 2: Similar Usernames' as debug_step, username, name, id
FROM users 
WHERE username ILIKE '%jack%' OR name ILIKE '%jack%'
ORDER BY username;

-- Step 3: Check total posts in system
SELECT 'Step 3: Total Posts' as debug_step, COUNT(*) as total_posts
FROM posts;

-- Step 4: Check recent posts by any user
SELECT 'Step 4: Recent Posts (Any User)' as debug_step, 
       p.id, p.caption, u.username, p.created_at
FROM posts p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT 5;

-- Step 5: Check if post_communities table exists and has any data
SELECT 'Step 5: Post Communities Table' as debug_step, COUNT(*) as total_cross_posts
FROM post_communities;

-- Step 6: Check communities table
SELECT 'Step 6: Communities Available' as debug_step, COUNT(*) as total_communities
FROM communities;

-- Step 7: Show recent communities
SELECT 'Step 7: Recent Communities' as debug_step, 
       c.id, c.name, c.type, c.member_count
FROM communities c
ORDER BY c.created_at DESC
LIMIT 5;

-- Step 8: Check if there are any community members at all
SELECT 'Step 8: Community Members' as debug_step, COUNT(*) as total_memberships
FROM community_members;