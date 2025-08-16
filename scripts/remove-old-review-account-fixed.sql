-- Remove existing review@troodieapp.com account and all related data
-- Fixed version that matches your actual database schema

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
        
        -- Delete in order of dependencies
        
        -- 1. Delete post_likes
        DELETE FROM public.post_likes WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % post likes', deleted_count;
        END IF;
        
        -- 2. Delete post_comments
        DELETE FROM public.post_comments WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % post comments', deleted_count;
        END IF;
        
        -- 3. Delete post_saves
        DELETE FROM public.post_saves WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % post saves', deleted_count;
        END IF;
        
        -- 4. Delete post_communities
        DELETE FROM public.post_communities WHERE added_by = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % post community links', deleted_count;
        END IF;
        
        -- 5. Delete posts
        DELETE FROM public.posts WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % posts', deleted_count;
        END IF;
        
        -- 6. Delete comments on saves
        DELETE FROM public.comments WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % comments', deleted_count;
        END IF;
        
        -- 7. Delete save_interactions
        DELETE FROM public.save_interactions WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % save interactions', deleted_count;
        END IF;
        
        -- 8. Delete save_boards
        DELETE FROM public.save_boards WHERE save_id IN (
            SELECT id FROM public.restaurant_saves WHERE user_id = old_review_user_id
        );
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % save board links', deleted_count;
        END IF;
        
        -- 9. Delete restaurant_saves
        DELETE FROM public.restaurant_saves WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % restaurant saves', deleted_count;
        END IF;
        
        -- 10. Delete board_restaurants
        DELETE FROM public.board_restaurants WHERE board_id IN (
            SELECT id FROM public.boards WHERE user_id = old_review_user_id
        ) OR added_by = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % board restaurant entries', deleted_count;
        END IF;
        
        -- 11. Delete board_members
        DELETE FROM public.board_members WHERE board_id IN (
            SELECT id FROM public.boards WHERE user_id = old_review_user_id
        ) OR user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % board member entries', deleted_count;
        END IF;
        
        -- 12. Delete board_collaborators
        DELETE FROM public.board_collaborators WHERE board_id IN (
            SELECT id FROM public.boards WHERE user_id = old_review_user_id
        ) OR user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % board collaborator entries', deleted_count;
        END IF;
        
        -- 13. Delete boards (must update users.default_board_id first)
        UPDATE public.users SET default_board_id = NULL WHERE default_board_id IN (
            SELECT id FROM public.boards WHERE user_id = old_review_user_id
        );
        DELETE FROM public.boards WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % boards', deleted_count;
        END IF;
        
        -- 14. Delete user_relationships (follows)
        DELETE FROM public.user_relationships WHERE follower_id = old_review_user_id OR following_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % follow relationships', deleted_count;
        END IF;
        
        -- 15. Delete notifications
        DELETE FROM public.notifications WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % notifications', deleted_count;
        END IF;
        
        -- 16. Delete blocked_users
        DELETE FROM public.blocked_users WHERE blocker_id = old_review_user_id OR blocked_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % blocked user entries', deleted_count;
        END IF;
        
        -- 17. Delete community memberships
        DELETE FROM public.community_members WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted % community memberships', deleted_count;
        END IF;
        
        -- 18. Delete user preferences
        DELETE FROM public.user_preferences WHERE user_id = old_review_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE '  - Deleted user preferences', deleted_count;
        END IF;
        
        -- 19. Delete from public.users
        DELETE FROM public.users WHERE id = old_review_user_id;
        RAISE NOTICE '  - Deleted user profile';
        
        -- 20. Try to delete from auth.users (may need admin privileges)
        BEGIN
            DELETE FROM auth.users WHERE id = old_review_user_id;
            RAISE NOTICE '  - Deleted auth user';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  - Could not delete auth user (may need admin privileges)';
            RAISE NOTICE '    You may need to delete it manually from Supabase Dashboard';
        END;
    END IF;
    
    -- Also check auth.users table directly for the email
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