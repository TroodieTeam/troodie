-- ================================================================
-- Step 8: Create User Follow Relationships
-- ================================================================
-- Creates a social graph with user follows
-- Each user follows 3-8 other users
-- ================================================================

DO $$
DECLARE
  all_user_ids UUID[];
  i INTEGER;
  j INTEGER;
  follower_id UUID;
  following_id UUID;
BEGIN
  all_user_ids := ARRAY(
    SELECT id FROM public.users WHERE email LIKE 'test-%@troodieapp.com'
  );

  -- Create follows: each user follows 3-8 other users
  FOR i IN 1..array_length(all_user_ids, 1) LOOP
    follower_id := all_user_ids[i];
    
    FOR j IN 1..(3 + (i % 6)) LOOP
      following_id := all_user_ids[1 + ((i + j) % array_length(all_user_ids, 1))];
      
      -- Don't follow yourself
      IF follower_id != following_id THEN
        INSERT INTO public.user_relationships (id, follower_id, following_id, created_at)
        VALUES (gen_random_uuid(), follower_id, following_id, NOW() - (INTERVAL '1 day' * j))
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ Step 8 Complete: Created user follow relationships';
END $$;

