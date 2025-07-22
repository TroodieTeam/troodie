-- Test script for notifications migration
-- This script tests the notifications system functionality

-- Test 1: Check if tables exist
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables 
WHERE table_name IN ('notifications', 'notification_preferences', 'push_tokens')
AND table_schema = 'public';

-- Test 2: Check notifications table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 3: Check if functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name IN (
  'get_unread_notification_count',
  'mark_notifications_as_read',
  'create_notification',
  'insert_default_notification_preferences'
)
AND routine_schema = 'public';

-- Test 4: Check if RLS policies exist
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
WHERE tablename IN ('notifications', 'notification_preferences', 'push_tokens')
AND schemaname = 'public';

-- Test 5: Check if indexes exist
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('notifications', 'notification_preferences', 'push_tokens')
AND schemaname = 'public';

-- Test 6: Test notification creation function
-- Note: This requires a valid user_id
-- SELECT create_notification(
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'test',
--   'Test Notification',
--   'This is a test notification',
--   '{"test": "data"}'::jsonb,
--   'test-id',
--   'test-type'
-- ); 