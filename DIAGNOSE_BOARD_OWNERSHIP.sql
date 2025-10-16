-- Diagnostic query to check board ownership and auth
-- Replace the UUIDs with the actual values from your logs

-- Check the board details
SELECT
    id,
    user_id,
    title,
    type,
    is_private,
    created_at
FROM boards
WHERE id = 'dedd26da-a217-41b0-a354-5faf9ab02e03';

-- Check if the user exists
SELECT
    id,
    email,
    created_at
FROM auth.users
WHERE id = 'a377b2e8-830c-4c06-8494-44254ceb3b91';

-- Check if the user has a profile
SELECT
    id,
    email,
    name,
    username
FROM users
WHERE id = 'a377b2e8-830c-4c06-8494-44254ceb3b91';

-- Check current RLS policies on board_restaurants
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
WHERE tablename = 'board_restaurants'
ORDER BY policyname;

-- Try to see what auth.uid() would return (this shows current session)
SELECT auth.uid() as current_auth_uid;
