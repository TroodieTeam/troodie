-- Working script for Apple Review Account
-- Fixed variable naming conflict
-- 
-- INSTRUCTIONS:
-- 1. First, create the user in Supabase Dashboard:
--    - Go to Authentication > Users
--    - Click "Invite User" or "Create User"
--    - Enter email: review@troodieapp.com
--
-- 2. Then run this SQL script in the SQL Editor

DO $$
DECLARE
    review_user_id UUID;
    new_board_id UUID;  -- Renamed to avoid conflict with column name
BEGIN
    -- Find the auth user
    SELECT id INTO review_user_id
    FROM auth.users
    WHERE email = 'review@troodieapp.com'
    LIMIT 1;
    
    IF review_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found! Please create review@troodieapp.com in Authentication > Users first';
    END IF;
    
    RAISE NOTICE 'Found review user with ID: %', review_user_id;
    
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
    
    RAISE NOTICE 'Profile created/updated successfully';
    
    -- Create a default board and get its ID
    INSERT INTO public.boards (
        id,
        user_id,
        title,
        description,
        is_private,
        created_at
    ) VALUES 
    (gen_random_uuid(), review_user_id, 'My Favorites', 'Top restaurant picks', false, NOW())
    RETURNING id INTO new_board_id;
    
    RAISE NOTICE 'Default board created with ID: %', new_board_id;
    
    -- Create additional boards
    INSERT INTO public.boards (
        user_id,
        title,
        description,
        is_private,
        created_at
    ) VALUES 
    (review_user_id, 'Date Nights', 'Romantic dinner spots', false, NOW() - INTERVAL '1 day'),
    (review_user_id, 'Brunch Spots', 'Best brunch in town', false, NOW() - INTERVAL '2 days')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Additional boards created';
    
    -- Update user with default board ID
    UPDATE public.users 
    SET default_board_id = new_board_id  -- Using the renamed variable
    WHERE id = review_user_id;
    
    RAISE NOTICE 'User default board set';
    
    -- Create some sample restaurants (if they don't exist)
    INSERT INTO public.restaurants (
        id,
        google_place_id,
        name,
        address,
        city,
        cuisine_types,
        price_range,
        data_source,
        created_at
    ) VALUES
    (gen_random_uuid(), 'ChIJN1t_tDeuEmsRUsoyG83frY4', 'Sample Italian Restaurant', '123 Main St', 'New York', ARRAY['Italian'], '$$', 'seed', NOW()),
    (gen_random_uuid(), 'ChIJrTLr-GyuEmsRBfy61i59si0', 'Sample Sushi Place', '456 Oak Ave', 'New York', ARRAY['Japanese', 'Sushi'], '$$$', 'seed', NOW()),
    (gen_random_uuid(), 'ChIJ3S-JXmauEmsRUcIaWtf4MzE', 'Sample Brunch Cafe', '789 Park Blvd', 'New York', ARRAY['American', 'Brunch'], '$$', 'seed', NOW())
    ON CONFLICT (google_place_id) DO NOTHING;
    
    -- Add restaurant saves to the default board
    INSERT INTO public.restaurant_saves (
        user_id,
        restaurant_id,
        board_id,
        notes,
        traffic_light_rating,
        created_at
    )
    SELECT 
        review_user_id,
        r.id,
        new_board_id,  -- Using the renamed variable
        CASE 
            WHEN r.name LIKE '%Italian%' THEN 'Amazing pasta! Must try again'
            WHEN r.name LIKE '%Sushi%' THEN 'Best sushi in town'
            ELSE 'Great atmosphere and food'
        END,
        CASE 
            WHEN r.name LIKE '%Italian%' THEN 'green'
            WHEN r.name LIKE '%Sushi%' THEN 'green'
            ELSE 'yellow'
        END,
        NOW() - (random() * INTERVAL '7 days')
    FROM public.restaurants r
    WHERE r.google_place_id IN (
        'ChIJN1t_tDeuEmsRUsoyG83frY4',
        'ChIJrTLr-GyuEmsRBfy61i59si0',
        'ChIJ3S-JXmauEmsRUcIaWtf4MzE'
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Restaurant saves created';
    
    -- Create sample posts
    INSERT INTO public.posts (
        user_id,
        caption,
        privacy,
        created_at
    ) VALUES
    (review_user_id, 'Just tried this amazing new restaurant! The food was incredible 🍝', 'public', NOW()),
    (review_user_id, 'Perfect spot for date night. Highly recommend! 💕', 'public', NOW() - INTERVAL '2 days'),
    (review_user_id, 'Brunch game strong at this place! 🥞☕', 'public', NOW() - INTERVAL '4 days')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Posts created';
    
    -- Follow some users if they exist
    INSERT INTO public.user_relationships (
        follower_id,
        following_id,
        created_at
    )
    SELECT 
        review_user_id,
        u.id,
        NOW()
    FROM public.users u
    WHERE u.id != review_user_id
    AND u.email != 'review@troodieapp.com'
    AND u.email IS NOT NULL
    LIMIT 3
    ON CONFLICT DO NOTHING;
    
    -- Join communities if they exist
    INSERT INTO public.community_members (
        community_id,
        user_id,
        role,
        joined_at
    )
    SELECT
        c.id,
        review_user_id,
        'member',
        NOW()
    FROM public.communities c
    LIMIT 2
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '✅ Apple Review Account Setup Complete!';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Email: review@troodieapp.com';
    RAISE NOTICE 'OTP Code: 000000 (handled by app bypass)';
    RAISE NOTICE 'Default Board ID: %', new_board_id;
    RAISE NOTICE '=============================================';
    
END $$;

-- Show the created account details
SELECT 
    u.id,
    u.email,
    u.username,
    u.name as display_name,
    u.profile_completion,
    u.default_board_id,
    COUNT(DISTINCT b.id) as boards_count,
    COUNT(DISTINCT rs.id) as saves_count,
    COUNT(DISTINCT p.id) as posts_count
FROM public.users u
LEFT JOIN public.boards b ON b.user_id = u.id
LEFT JOIN public.restaurant_saves rs ON rs.user_id = u.id
LEFT JOIN public.posts p ON p.user_id = u.id
WHERE u.email = 'review@troodieapp.com'
GROUP BY u.id, u.email, u.username, u.name, u.profile_completion, u.default_board_id;