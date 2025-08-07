-- Check if post_communities table exists and has data
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

-- Check RLS policies on post_communities
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'post_communities';