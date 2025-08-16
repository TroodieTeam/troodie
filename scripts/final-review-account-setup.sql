-- Final Setup for Apple Review Account
-- UUID: a15d68b9-65c2-4782-907e-bfd11de0f612
-- Email: review@troodieapp.com
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    review_user_id UUID := 'a15d68b9-65c2-4782-907e-bfd11de0f612';
    new_board_id UUID;
BEGIN
    -- Verify the auth user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = review_user_id) THEN
        RAISE EXCEPTION 'Auth user not found with ID: %', review_user_id;
    END IF;
    
    RAISE NOTICE 'Found auth user with ID: %', review_user_id;
    
    -- Create or update the user profile
    INSERT INTO public.users (
        id,
        email,
        username,
        name,
        bio,
        profile_completion,
        created_at,
        updated_at
    ) VALUES (
        review_user_id,
        'review@troodieapp.com',
        'app_reviewer',
        'App Reviewer',
        'Official App Store Review Account',
        100,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        name = EXCLUDED.name,
        bio = EXCLUDED.bio,
        profile_completion = 100,
        updated_at = NOW();
    
    RAISE NOTICE 'User profile created/updated';
    
    -- Create a default board
    INSERT INTO public.boards (
        user_id,
        title,
        description,
        is_private,
        created_at
    ) VALUES 
    (review_user_id, 'My Saves', 'Default board for saves', false, NOW())
    ON CONFLICT DO NOTHING
    RETURNING id INTO new_board_id;
    
    -- If board was created, update user with default board
    IF new_board_id IS NOT NULL THEN
        UPDATE public.users 
        SET default_board_id = new_board_id
        WHERE id = review_user_id;
        RAISE NOTICE 'Default board created with ID: %', new_board_id;
    ELSE
        -- Board already exists, get its ID
        SELECT id INTO new_board_id
        FROM public.boards
        WHERE user_id = review_user_id
        AND title = 'My Saves'
        LIMIT 1;
        
        IF new_board_id IS NOT NULL THEN
            UPDATE public.users 
            SET default_board_id = new_board_id
            WHERE id = review_user_id;
            RAISE NOTICE 'Using existing board with ID: %', new_board_id;
        END IF;
    END IF;
    
    -- Create additional boards
    INSERT INTO public.boards (
        user_id,
        title,
        description,
        is_private,
        created_at
    ) VALUES 
    (review_user_id, 'Want to Try', 'Restaurants to visit', false, NOW()),
    (review_user_id, 'Favorites', 'My favorite spots', false, NOW())
    ON CONFLICT DO NOTHING;
    
    -- Create a welcome post
    INSERT INTO public.posts (
        user_id,
        caption,
        privacy,
        created_at
    ) VALUES
    (review_user_id, 'Welcome to Troodie! Excited to explore great restaurants 🍝', 'public', NOW())
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '✅ Apple Review Account Setup Complete!';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'User ID: %', review_user_id;
    RAISE NOTICE 'Email: review@troodieapp.com';
    RAISE NOTICE 'OTP Code: 000000 (app bypass active)';
    RAISE NOTICE 'Default Board: %', new_board_id;
    RAISE NOTICE '=============================================';
    
END $$;

-- Verify the setup
SELECT 
    u.id as user_uuid,
    u.email,
    u.username,
    u.name as display_name,
    u.profile_completion,
    u.default_board_id,
    COUNT(DISTINCT b.id) as boards_count,
    COUNT(DISTINCT p.id) as posts_count
FROM public.users u
LEFT JOIN public.boards b ON b.user_id = u.id
LEFT JOIN public.posts p ON p.user_id = u.id
WHERE u.id = 'a15d68b9-65c2-4782-907e-bfd11de0f612'
GROUP BY u.id, u.email, u.username, u.name, u.profile_completion, u.default_board_id;