-- Create Apple Review Account with the correct UUID
-- This UUID matches what the app uses: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
--
-- Run this in Supabase SQL Editor to create the review user

DO $$
DECLARE
    review_user_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    new_board_id UUID;
BEGIN
    -- Check if user already exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = review_user_id) THEN
        -- Create auth user with the specific UUID
        -- Note: This requires admin access. You may need to use Supabase Dashboard instead
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role
        ) VALUES (
            review_user_id,
            'review@troodieapp.com',
            crypt('dummy_password_never_used', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"display_name": "App Reviewer"}'::jsonb,
            'authenticated',
            'authenticated'
        );
        
        RAISE NOTICE 'Created auth user with ID: %', review_user_id;
    ELSE
        RAISE NOTICE 'Auth user already exists with ID: %', review_user_id;
    END IF;
    
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
        id,
        user_id,
        title,
        description,
        is_private,
        created_at
    ) VALUES 
    (gen_random_uuid(), review_user_id, 'My Saves', 'Default board for saves', false, NOW())
    RETURNING id INTO new_board_id;
    
    -- Update user with default board
    UPDATE public.users 
    SET default_board_id = new_board_id
    WHERE id = review_user_id;
    
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
    
    -- Create a sample post
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
    RAISE NOTICE 'OTP Code: 000000 (handled by app bypass)';
    RAISE NOTICE 'Default Board ID: %', new_board_id;
    RAISE NOTICE '=============================================';
    
END $$;

-- Verify the account was created
SELECT 
    u.id,
    u.email,
    u.username,
    u.name,
    u.profile_completion,
    u.default_board_id,
    COUNT(DISTINCT b.id) as boards_count,
    COUNT(DISTINCT p.id) as posts_count
FROM public.users u
LEFT JOIN public.boards b ON b.user_id = u.id
LEFT JOIN public.posts p ON p.user_id = u.id
WHERE u.id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
GROUP BY u.id, u.email, u.username, u.name, u.profile_completion, u.default_board_id;