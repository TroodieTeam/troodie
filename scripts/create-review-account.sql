-- Script to create Apple App Store Review test account
-- Run this in Supabase SQL Editor with admin/service role access
-- Email: review@troodieapp.com
-- OTP Code: 000000 (handled by app code)

-- Step 1: Create the auth user using Supabase admin function
SELECT auth.admin_create_user(
    email := 'review@troodieapp.com',
    email_confirm := true,
    phone := NULL,
    phone_confirm := false,
    user_metadata := jsonb_build_object(
        'display_name', 'App Reviewer',
        'is_review_account', true
    )
);

-- Step 2: Get the user ID
DO $$
DECLARE
    review_user_id UUID;
BEGIN
    -- Get the user ID we just created
    SELECT id INTO review_user_id
    FROM auth.users
    WHERE email = 'review@troodieapp.com'
    LIMIT 1;
    
    IF review_user_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create review account';
    END IF;
    
    -- Step 3: Create the user profile
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
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        bio = EXCLUDED.bio,
        onboarding_completed = EXCLUDED.onboarding_completed;
    
    -- Step 4: Add sample boards
    INSERT INTO public.boards (
        user_id,
        name,
        description,
        is_public,
        created_at
    ) VALUES 
    (
        review_user_id,
        'Favorite Restaurants',
        'My top restaurant picks for any occasion',
        true,
        NOW()
    ),
    (
        review_user_id,
        'Date Night Spots',
        'Romantic restaurants perfect for special evenings',
        true,
        NOW() - INTERVAL '1 day'
    ),
    (
        review_user_id,
        'Quick Bites',
        'Great places for a quick lunch or casual meal',
        true,
        NOW() - INTERVAL '2 days'
    )
    ON CONFLICT DO NOTHING;
    
    -- Step 5: Add sample restaurant saves
    -- Using placeholder Google Place IDs - these would be real in production
    INSERT INTO public.restaurant_saves (
        user_id,
        google_place_id,
        status,
        notes,
        created_at
    ) VALUES
    (
        review_user_id,
        'ChIJN1t_tDeuEmsRUsoyG83frY4',
        'want_to_try',
        'Heard amazing things about their brunch menu',
        NOW() - INTERVAL '3 hours'
    ),
    (
        review_user_id,
        'ChIJrTLr-GyuEmsRBfy61i59si0',
        'been_there',
        'Best pizza in town! The margherita was perfect.',
        NOW() - INTERVAL '1 day'
    ),
    (
        review_user_id,
        'ChIJ3S-JXmauEmsRUcIaWtf4MzE',
        'been_there',
        'Great ambiance and the seafood pasta was incredible',
        NOW() - INTERVAL '2 days'
    ),
    (
        review_user_id,
        'ChIJLfySpTOuEmsRsc_JfJtljdc',
        'want_to_try',
        'New sushi place everyone is talking about',
        NOW() - INTERVAL '4 days'
    ),
    (
        review_user_id,
        'ChIJq6qq6jauEmsRJAf7FjrKnXI',
        'been_there',
        'Perfect coffee and pastries for breakfast',
        NOW() - INTERVAL '5 days'
    )
    ON CONFLICT DO NOTHING;
    
    -- Step 6: Create sample posts
    INSERT INTO public.posts (
        user_id,
        caption,
        privacy,
        created_at
    ) VALUES
    (
        review_user_id,
        'Just discovered this hidden gem downtown! The chef''s special was absolutely divine. Can''t wait to go back! 🍽️✨',
        'public',
        NOW() - INTERVAL '6 hours'
    ),
    (
        review_user_id,
        'Weekend brunch vibes at my new favorite spot. The eggs benedict were perfection! Who else is a brunch enthusiast? 🥞☕',
        'public',
        NOW() - INTERVAL '2 days'
    ),
    (
        review_user_id,
        'Date night success! Found the perfect romantic restaurant with amazing views and even better food. Highly recommend! 💕🍷',
        'public',
        NOW() - INTERVAL '4 days'
    )
    ON CONFLICT DO NOTHING;
    
    -- Step 7: Follow some random users (if they exist)
    INSERT INTO public.user_relationships (
        follower_id,
        following_id,
        created_at
    )
    SELECT 
        review_user_id,
        u.id,
        NOW() - (random() * INTERVAL '7 days')
    FROM public.users u
    WHERE u.id != review_user_id
    AND u.email != 'review@troodieapp.com'
    LIMIT 5
    ON CONFLICT DO NOTHING;
    
    -- Step 8: Join a community (if any exist)
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
        NOW() - INTERVAL '3 days'
    FROM public.communities c
    LIMIT 2
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Successfully created App Review account: review@troodieapp.com';
    RAISE NOTICE 'User ID: %', review_user_id;
    RAISE NOTICE 'The account can login with OTP code: 000000';
    
END $$;

-- Verify the account was created
SELECT 
    u.id,
    u.email,
    u.username,
    u.display_name,
    u.onboarding_completed,
    (SELECT COUNT(*) FROM public.boards WHERE user_id = u.id) as board_count,
    (SELECT COUNT(*) FROM public.restaurant_saves WHERE user_id = u.id) as save_count,
    (SELECT COUNT(*) FROM public.posts WHERE user_id = u.id) as post_count
FROM public.users u
WHERE u.email = 'review@troodieapp.com';