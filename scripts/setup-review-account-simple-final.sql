-- Simple Setup for Apple Review Account
-- 
-- STEP 1: Create the auth user in Supabase Dashboard FIRST
-- ========================================================
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Add user" > "Create new user"
-- 3. Enter email: review@troodieapp.com
-- 4. Enter any password (won't be used)
-- 5. Check "Auto Confirm Email"
-- 6. Click "Create user"
-- 7. Copy the User UID that was created
--
-- STEP 2: Run this SQL with the User UID from Step 1
-- ====================================================
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from Step 1

DO $$
DECLARE
    -- IMPORTANT: Replace this with the actual User UID from Supabase Dashboard
    review_user_id UUID;
    new_board_id UUID;
BEGIN
    -- First, try to find the user that was created in Dashboard
    SELECT id INTO review_user_id
    FROM auth.users
    WHERE email = 'review@troodieapp.com'
    LIMIT 1;
    
    IF review_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found! Please create review@troodieapp.com in Authentication > Users first';
    END IF;
    
    RAISE NOTICE 'Found auth user with ID: %', review_user_id;
    
    -- Create the user profile
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
        is_private
    ) VALUES 
    (review_user_id, 'Want to Try', 'Restaurants to visit', false),
    (review_user_id, 'Favorites', 'My favorite spots', false)
    ON CONFLICT DO NOTHING;
    
    -- Create a welcome post
    INSERT INTO public.posts (
        user_id,
        caption,
        privacy
    ) VALUES
    (review_user_id, 'Welcome to Troodie! 🍝', 'public')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '✅ Apple Review Account Setup Complete!';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'User ID: %', review_user_id;
    RAISE NOTICE 'Email: review@troodieapp.com';
    RAISE NOTICE 'OTP Code: 000000 (app bypass)';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Update AuthContext.tsx with this UUID:';
    RAISE NOTICE 'const REVIEW_USER_UUID = ''%''', review_user_id;
    RAISE NOTICE '=============================================';
    
END $$;

-- Show the account details
SELECT 
    u.id as user_uuid,
    u.email,
    u.username,
    u.name,
    u.default_board_id,
    COUNT(DISTINCT b.id) as boards_count
FROM public.users u
LEFT JOIN public.boards b ON b.user_id = u.id
WHERE u.email = 'review@troodieapp.com'
GROUP BY u.id, u.email, u.username, u.name, u.default_board_id;