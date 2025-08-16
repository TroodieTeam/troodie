-- Simple script to set up Apple Review Account
-- This script assumes you've already created the auth user via Supabase Dashboard
-- 
-- INSTRUCTIONS:
-- 1. First, create the user in Supabase Dashboard:
--    - Go to Authentication > Users
--    - Click "Invite User" 
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
    
    -- Create or update the user profile
    INSERT INTO public.users (
        id,
        email,
        username,
        display_name,
        bio,
        onboarding_completed,
        created_at
    ) VALUES (
        review_user_id,
        'review@troodieapp.com',
        'app_reviewer',
        'App Reviewer',
        'Official App Store Review Account',
        true,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        bio = EXCLUDED.bio,
        onboarding_completed = true;
    
    RAISE NOTICE 'Profile created/updated successfully';
    
    -- Add sample data for testing
    
    -- Create boards
    INSERT INTO public.boards (
        user_id,
        name,
        description,
        is_public
    ) VALUES 
    (review_user_id, 'My Favorites', 'Top restaurant picks', true),
    (review_user_id, 'Date Nights', 'Romantic dinner spots', true),
    (review_user_id, 'Brunch Spots', 'Best brunch in town', true)
    ON CONFLICT DO NOTHING;
    
    -- Add sample restaurant saves (using dummy place IDs)
    INSERT INTO public.restaurant_saves (
        user_id,
        google_place_id,
        status,
        notes
    ) VALUES
    (review_user_id, 'place_id_001', 'been_there', 'Amazing pasta!'),
    (review_user_id, 'place_id_002', 'want_to_try', 'Heard great things'),
    (review_user_id, 'place_id_003', 'been_there', 'Perfect for dates'),
    (review_user_id, 'place_id_004', 'want_to_try', 'New opening'),
    (review_user_id, 'place_id_005', 'been_there', 'Best brunch ever')
    ON CONFLICT DO NOTHING;
    
    -- Create sample posts
    INSERT INTO public.posts (
        user_id,
        caption,
        privacy
    ) VALUES
    (review_user_id, 'Just tried this amazing new restaurant! The food was incredible 🍝', 'public'),
    (review_user_id, 'Perfect spot for date night. Highly recommend! 💕', 'public'),
    (review_user_id, 'Brunch game strong at this place! 🥞☕', 'public')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Sample data added successfully';
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
    u.display_name,
    u.onboarding_completed,
    COUNT(DISTINCT b.id) as boards,
    COUNT(DISTINCT rs.id) as saves,
    COUNT(DISTINCT p.id) as posts
FROM public.users u
LEFT JOIN public.boards b ON b.user_id = u.id
LEFT JOIN public.restaurant_saves rs ON rs.user_id = u.id
LEFT JOIN public.posts p ON p.user_id = u.id
WHERE u.email = 'review@troodieapp.com'
GROUP BY u.id, u.email, u.username, u.display_name, u.onboarding_completed;