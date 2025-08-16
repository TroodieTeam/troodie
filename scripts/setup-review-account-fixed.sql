-- Fixed script to set up Apple Review Account
-- This script matches the actual database schema
-- 
-- INSTRUCTIONS:
-- 1. First, create the user in Supabase Dashboard:
--    - Go to Authentication > Users
--    - Click "Invite User" or "Create User"
--    - Enter email: review@troodieapp.com
--    - User will be created with a magic link (we won't use it)
--
-- 2. Then run this SQL script in the SQL Editor

-- Get the user ID that was created via dashboard
DO $$
DECLARE
    review_user_id UUID;
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
    
    -- Create or update the user profile with the correct column names
    INSERT INTO public.users (
        id,
        email,
        username,
        name,  -- Using 'name' instead of 'display_name'
        bio,
        profile_completion,  -- This column exists in the schema
        created_at,
        updated_at
    ) VALUES (
        review_user_id,
        'review@troodieapp.com',
        'app_reviewer',
        'App Reviewer',  -- This goes in the 'name' column
        'Official App Store Review Account',
        100,  -- Set profile completion to 100%
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
    
    -- Add sample data for testing
    
    -- Create boards
    INSERT INTO public.boards (
        user_id,
        name,
        description,
        is_public,
        created_at
    ) VALUES 
    (review_user_id, 'My Favorites', 'Top restaurant picks', true, NOW()),
    (review_user_id, 'Date Nights', 'Romantic dinner spots', true, NOW() - INTERVAL '1 day'),
    (review_user_id, 'Brunch Spots', 'Best brunch in town', true, NOW() - INTERVAL '2 days')
    ON CONFLICT DO NOTHING;
    
    -- Add sample restaurant saves (using placeholder Google Place IDs)
    -- These should be real place IDs from Google Places API in production
    INSERT INTO public.restaurant_saves (
        user_id,
        google_place_id,
        status,
        notes,
        created_at
    ) VALUES
    (review_user_id, 'ChIJN1t_tDeuEmsRUsoyG83frY4', 'been_there', 'Amazing pasta!', NOW()),
    (review_user_id, 'ChIJrTLr-GyuEmsRBfy61i59si0', 'want_to_try', 'Heard great things', NOW() - INTERVAL '1 day'),
    (review_user_id, 'ChIJ3S-JXmauEmsRUcIaWtf4MzE', 'been_there', 'Perfect for dates', NOW() - INTERVAL '2 days'),
    (review_user_id, 'ChIJLfySpTOuEmsRsc_JfJtljdc', 'want_to_try', 'New opening', NOW() - INTERVAL '3 days'),
    (review_user_id, 'ChIJq6qq6jauEmsRJAf7FjrKnXI', 'been_there', 'Best brunch ever', NOW() - INTERVAL '4 days')
    ON CONFLICT DO NOTHING;
    
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
    RAISE NOTICE '✅ Setup complete!';
    RAISE NOTICE 'Email: review@troodieapp.com';
    RAISE NOTICE 'OTP Code: 000000 (handled by app)';
    
END $$;

-- Show the created account details
SELECT 
    u.id,
    u.email,
    u.username,
    u.name as display_name,
    u.profile_completion,
    COUNT(DISTINCT b.id) as boards,
    COUNT(DISTINCT rs.id) as saves,
    COUNT(DISTINCT p.id) as posts
FROM public.users u
LEFT JOIN public.boards b ON b.user_id = u.id
LEFT JOIN public.restaurant_saves rs ON rs.user_id = u.id
LEFT JOIN public.posts p ON p.user_id = u.id
WHERE u.email = 'review@troodieapp.com'
GROUP BY u.id, u.email, u.username, u.name, u.profile_completion;