-- Verification script to check database schema integrity
-- Run this to verify the schema fixes worked correctly

-- 1. Check posts.restaurant_id data type
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND column_name IN ('id', 'restaurant_id', 'user_id');

-- 2. Check foreign key constraints on posts table
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'posts';

-- 3. Check post_communities table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'post_communities' 
ORDER BY ordinal_position;

-- 4. Check foreign key constraints on post_communities table
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'post_communities';

-- 5. Check unique constraints on post_communities
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE' 
AND tc.table_name = 'post_communities';

-- 6. Check indexes on post_communities
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'post_communities'
ORDER BY indexname;

-- 7. Check for any data in post_communities
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT post_id) as unique_posts,
  COUNT(DISTINCT community_id) as unique_communities,
  MIN(added_at) as earliest_cross_post,
  MAX(added_at) as latest_cross_post
FROM post_communities;

-- 8. Sample of recent post_communities data
SELECT 
  pc.id,
  pc.post_id,
  pc.community_id,
  pc.added_by,
  pc.added_at,
  p.caption,
  c.name as community_name
FROM post_communities pc
LEFT JOIN posts p ON p.id = pc.post_id
LEFT JOIN communities c ON c.id = pc.community_id
ORDER BY pc.added_at DESC
LIMIT 10;

-- 9. Check RLS policies on post_communities
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'post_communities'
ORDER BY policyname;

-- 10. Verify cross_post_to_communities function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'cross_post_to_communities'
AND routine_schema = 'public';