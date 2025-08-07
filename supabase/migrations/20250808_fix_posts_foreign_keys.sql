-- Fix missing foreign key constraints for posts table
-- This will resolve the PGRST200 error when fetching posts with user data

-- Check current foreign key constraints on posts table
DO $$
BEGIN
  RAISE NOTICE 'Checking existing foreign key constraints on posts table...';
END $$;

-- Add missing foreign key constraint for posts.user_id -> users.id if it doesn't exist
DO $$
BEGIN
  -- Check if posts_user_id_fkey constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'posts_user_id_fkey' 
    AND table_name = 'posts'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE posts
    ADD CONSTRAINT posts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added posts_user_id_fkey constraint';
  ELSE
    RAISE NOTICE 'posts_user_id_fkey constraint already exists';
  END IF;

  -- Check if posts_restaurant_id_fkey constraint exists (should already exist from previous migration)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'posts_restaurant_id_fkey' 
    AND table_name = 'posts'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE posts
    ADD CONSTRAINT posts_restaurant_id_fkey 
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added posts_restaurant_id_fkey constraint';
  ELSE
    RAISE NOTICE 'posts_restaurant_id_fkey constraint already exists';
  END IF;
END $$;

-- Refresh the schema cache to make sure Supabase recognizes the relationships
NOTIFY pgrst, 'reload schema';

-- Verify the constraints were added
SELECT 
  'CONSTRAINT_CHECK' as section,
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
AND tc.table_name = 'posts'
ORDER BY tc.constraint_name;

-- Final status
DO $$
BEGIN
  RAISE NOTICE 'Foreign key constraints setup completed for posts table';
  RAISE NOTICE 'This should resolve PGRST200 errors when fetching posts with user data';
END $$;