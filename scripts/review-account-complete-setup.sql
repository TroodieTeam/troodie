-- Complete Setup for Apple Review Account with Pre-populated Data
-- This creates everything the review account needs to test the app
-- UUID: a15d68b9-65c2-4782-907e-bfd11de0f612

DO $$
DECLARE
    review_user_id UUID := 'a15d68b9-65c2-4782-907e-bfd11de0f612';
    board_saves_id UUID;
    board_favorites_id UUID;
    board_want_id UUID;
    sample_restaurant_1 UUID := gen_random_uuid();
    sample_restaurant_2 UUID := gen_random_uuid();
    sample_restaurant_3 UUID := gen_random_uuid();
BEGIN
    -- Ensure auth user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = review_user_id) THEN
        RAISE NOTICE 'WARNING: Auth user does not exist. Please create it in Supabase Dashboard first.';
        RAISE NOTICE 'Email: review@troodieapp.com';
        RAISE NOTICE 'UUID: %', review_user_id;
    END IF;
    
    -- Create or update user profile
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
        'Official App Store Review Account - Testing all features',
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
    
    -- Delete existing boards for clean slate
    DELETE FROM public.board_restaurants WHERE board_id IN (
        SELECT id FROM public.boards WHERE user_id = review_user_id
    );
    DELETE FROM public.boards WHERE user_id = review_user_id;
    
    -- Create "Your Saves" board
    INSERT INTO public.boards (
        user_id,
        title,
        description,
        type,
        is_private,
        allow_comments,
        allow_saves,
        restaurant_count,
        member_count,
        created_at,
        updated_at
    ) VALUES (
        review_user_id,
        'Your Saves',
        'Quick saves for restaurants',
        'standard',
        false,
        true,
        true,
        0,
        0,
        NOW() - INTERVAL '30 days',
        NOW()
    ) RETURNING id INTO board_saves_id;
    
    -- Create "Favorites" board
    INSERT INTO public.boards (
        user_id,
        title,
        description,
        type,
        is_private,
        allow_comments,
        allow_saves,
        restaurant_count,
        member_count,
        created_at,
        updated_at
    ) VALUES (
        review_user_id,
        'Favorites',
        'My all-time favorite restaurants',
        'standard',
        false,
        true,
        true,
        0,
        0,
        NOW() - INTERVAL '20 days',
        NOW()
    ) RETURNING id INTO board_favorites_id;
    
    -- Create "Want to Try" board
    INSERT INTO public.boards (
        user_id,
        title,
        description,
        type,
        is_private,
        allow_comments,
        allow_saves,
        restaurant_count,
        member_count,
        created_at,
        updated_at
    ) VALUES (
        review_user_id,
        'Want to Try',
        'Restaurants on my wishlist',
        'standard',
        false,
        true,
        true,
        0,
        0,
        NOW() - INTERVAL '15 days',
        NOW()
    ) RETURNING id INTO board_want_id;
    
    -- Update user's default board
    UPDATE public.users 
    SET default_board_id = board_saves_id
    WHERE id = review_user_id;
    
    -- Add sample restaurants to boards
    -- Note: These are dummy UUIDs - in production these would be real restaurant IDs
    
    -- Add to Your Saves
    INSERT INTO public.board_restaurants (
        board_id,
        restaurant_id,
        added_by,
        position,
        notes,
        rating,
        added_at
    ) VALUES 
    (board_saves_id, sample_restaurant_1, review_user_id, 0, 'Great pasta!', 5, NOW() - INTERVAL '5 days'),
    (board_saves_id, sample_restaurant_2, review_user_id, 1, 'Best brunch spot', 4, NOW() - INTERVAL '3 days'),
    (board_saves_id, sample_restaurant_3, review_user_id, 2, 'Amazing sushi', 5, NOW() - INTERVAL '1 day');
    
    -- Add to Favorites
    INSERT INTO public.board_restaurants (
        board_id,
        restaurant_id,
        added_by,
        position,
        notes,
        rating,
        added_at
    ) VALUES 
    (board_favorites_id, sample_restaurant_1, review_user_id, 0, 'Never disappoints!', 5, NOW() - INTERVAL '10 days');
    
    -- Add to Want to Try
    INSERT INTO public.board_restaurants (
        board_id,
        restaurant_id,
        added_by,
        position,
        notes,
        rating,
        added_at
    ) VALUES 
    (board_want_id, sample_restaurant_2, review_user_id, 0, 'Heard great things', NULL, NOW() - INTERVAL '7 days'),
    (board_want_id, sample_restaurant_3, review_user_id, 1, 'Recommended by friends', NULL, NOW() - INTERVAL '2 days');
    
    -- Update restaurant counts
    UPDATE public.boards 
    SET restaurant_count = 3 
    WHERE id = board_saves_id;
    
    UPDATE public.boards 
    SET restaurant_count = 1 
    WHERE id = board_favorites_id;
    
    UPDATE public.boards 
    SET restaurant_count = 2 
    WHERE id = board_want_id;
    
    -- Create sample posts
    INSERT INTO public.posts (
        user_id,
        caption,
        privacy,
        created_at
    ) VALUES
    (review_user_id, 'Just had an amazing dinner at this hidden gem! The pasta was incredible 🍝', 'public', NOW() - INTERVAL '7 days'),
    (review_user_id, 'Brunch vibes on point today! Perfect eggs benedict ☀️', 'public', NOW() - INTERVAL '3 days'),
    (review_user_id, 'Testing the Troodie app - loving all the features!', 'public', NOW() - INTERVAL '1 hour')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ Apple Review Account Setup Complete!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Account Details:';
    RAISE NOTICE '  Email: review@troodieapp.com';
    RAISE NOTICE '  OTP Code: 000000';
    RAISE NOTICE '  User ID: %', review_user_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Pre-created Boards:';
    RAISE NOTICE '  - Your Saves (3 restaurants)';
    RAISE NOTICE '  - Favorites (1 restaurant)';
    RAISE NOTICE '  - Want to Try (2 restaurants)';
    RAISE NOTICE '';
    RAISE NOTICE 'Sample Content:';
    RAISE NOTICE '  - 3 posts created';
    RAISE NOTICE '  - 6 restaurant saves across boards';
    RAISE NOTICE '';
    RAISE NOTICE 'The review account can now:';
    RAISE NOTICE '  ✓ Browse existing saves';
    RAISE NOTICE '  ✓ View their boards';
    RAISE NOTICE '  ✓ Test all app features';
    RAISE NOTICE '  ✓ Delete account if needed';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: Saving new restaurants may not work due to';
    RAISE NOTICE 'mock session limitations, but all existing data';
    RAISE NOTICE 'can be viewed and tested.';
    RAISE NOTICE '================================================';
END $$;

-- Verify the setup
SELECT 
    'Review Account Summary' as info,
    u.id,
    u.email,
    u.username,
    COUNT(DISTINCT b.id) as board_count,
    COUNT(DISTINCT br.id) as saved_restaurants,
    COUNT(DISTINCT p.id) as post_count
FROM public.users u
LEFT JOIN public.boards b ON b.user_id = u.id
LEFT JOIN public.board_restaurants br ON br.board_id = b.id
LEFT JOIN public.posts p ON p.user_id = u.id
WHERE u.id = 'a15d68b9-65c2-4782-907e-bfd11de0f612'
GROUP BY u.id, u.email, u.username;