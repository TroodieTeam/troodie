-- Remove existing review@troodieapp.com account and all related data
-- This will clean up the old account before we rename kouamendri1 to review

DO $$
DECLARE
    old_review_user_id UUID;
    deleted_count INTEGER := 0;
BEGIN
    -- Find the existing review@troodieapp.com user ID
    SELECT id INTO old_review_user_id
    FROM public.users
    WHERE email = 'review@troodieapp.com'
    LIMIT 1;
    
    IF old_review_user_id IS NULL THEN
        RAISE NOTICE 'No existing user found with email review@troodieapp.com in public.users';
    ELSE
        RAISE NOTICE 'Found existing user with ID: %', old_review_user_id;
        RAISE NOTICE 'Removing all related data...';
        
        -- Delete from all related tables (in order of dependencies)
        
        -- 1. Delete comments
        DELETE FROM public.comments WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % comments', deleted_count;
        END IF;
        
        -- 2. Delete likes
        DELETE FROM public.likes WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % likes', deleted_count;
        END IF;
        
        -- 3. Delete post media
        DELETE FROM public.post_media WHERE post_id IN (
            SELECT id FROM public.posts WHERE user_id = old_review_user_id
        );
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % post media items', deleted_count;
        END IF;
        
        -- 4. Delete posts
        DELETE FROM public.posts WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % posts', deleted_count;
        END IF;
        
        -- 5. Delete board restaurants
        DELETE FROM public.board_restaurants WHERE board_id IN (
            SELECT id FROM public.boards WHERE user_id = old_review_user_id
        );
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % board restaurant entries', deleted_count;
        END IF;
        
        -- 6. Delete board members
        DELETE FROM public.board_members WHERE board_id IN (
            SELECT id FROM public.boards WHERE user_id = old_review_user_id
        );
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % board member entries', deleted_count;
        END IF;
        
        -- 7. Delete boards
        DELETE FROM public.boards WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % boards', deleted_count;
        END IF;
        
        -- 8. Delete restaurant saves
        DELETE FROM public.restaurant_saves WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % restaurant saves', deleted_count;
        END IF;
        
        -- 9. Delete follows (both as follower and following)
        DELETE FROM public.follows WHERE follower_id = old_review_user_id OR following_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % follow relationships', deleted_count;
        END IF;
        
        -- 10. Delete notifications
        DELETE FROM public.notifications WHERE user_id = old_review_user_id OR from_user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % notifications', deleted_count;
        END IF;
        
        -- 11. Delete from public.users
        DELETE FROM public.users WHERE id = old_review_user_id;
        RAISE NOTICE '  - Deleted user profile';
        
        -- 12. Try to delete from auth.users (may need admin privileges)
        BEGIN
            DELETE FROM auth.users WHERE id = old_review_user_id;
            RAISE NOTICE '  - Deleted auth user';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  - Could not delete auth user (may need admin privileges)';
            RAISE NOTICE '    You may need to delete it manually from Supabase Dashboard';
        END;
    END IF;
    
    -- Also check auth.users table
    SELECT id INTO old_review_user_id
    FROM auth.users
    WHERE email = 'review@troodieapp.com'
    LIMIT 1;
    
    IF old_review_user_id IS NOT NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE 'WARNING: Found auth user with email review@troodieapp.com';
        RAISE NOTICE 'User ID: %', old_review_user_id;
        
        BEGIN
            DELETE FROM auth.users WHERE id = old_review_user_id;
            RAISE NOTICE 'Deleted auth user successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not delete auth user. Please delete manually:';
            RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
            RAISE NOTICE '2. Find review@troodieapp.com';
            RAISE NOTICE '3. Delete the user';
        END;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Cleanup Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Old review@troodieapp.com account has been removed.';
    RAISE NOTICE 'You can now update kouamendri1 to use this email.';
    RAISE NOTICE '============================================';
END $$;

-- Verify cleanup
SELECT 
    'public.users' as table_name,
    COUNT(*) as count
FROM public.users
WHERE email = 'review@troodieapp.com'
UNION ALL
SELECT 
    'auth.users' as table_name,
    COUNT(*) as count
FROM auth.users
WHERE email = 'review@troodieapp.com';