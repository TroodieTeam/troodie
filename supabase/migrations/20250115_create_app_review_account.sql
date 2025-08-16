-- Migration to create Apple App Store Review test account
-- This account bypasses OTP with email: review@troodieapp.com and code: 000000

-- Create the auth user first (requires admin access)
-- Note: This needs to be run with service role or directly in Supabase dashboard
DO $$
DECLARE
    review_user_id UUID;
BEGIN
    -- Check if the review account already exists
    SELECT id INTO review_user_id
    FROM auth.users
    WHERE email = 'review@troodieapp.com';
    
    IF review_user_id IS NULL THEN
        -- Create a new UUID for the review user
        review_user_id := gen_random_uuid();
        
        -- Insert into auth.users table
        -- Note: In production Supabase, you might need to use auth.admin functions
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_sent_at,
            confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            review_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'review@troodieapp.com',
            -- This is a dummy password hash - the account uses OTP bypass
            crypt('dummy_password_never_used', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            jsonb_build_object(
                'provider', 'email',
                'providers', ARRAY['email']::text[]
            ),
            jsonb_build_object(
                'display_name', 'App Reviewer',
                'is_review_account', true
            ),
            NOW(),
            NOW()
        );
        
        -- Insert identity record
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            review_user_id,
            jsonb_build_object(
                'sub', review_user_id::text,
                'email', 'review@troodieapp.com',
                'email_verified', true
            ),
            'email',
            NOW(),
            NOW(),
            NOW()
        );
    END IF;
    
    -- Now create or update the user profile
    INSERT INTO public.users (
        id,
        email,
        username,
        display_name,
        bio,
        onboarding_completed,
        created_at
    ) VALUES (
        COALESCE(review_user_id, (SELECT id FROM auth.users WHERE email = 'review@troodieapp.com')),
        'review@troodieapp.com',
        'app_reviewer',
        'App Reviewer',
        'Official App Store Review Account - Test account for Apple review process',
        true,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        bio = EXCLUDED.bio,
        onboarding_completed = EXCLUDED.onboarding_completed;
    
    -- Add some sample data for the review account
    -- Get the user ID (in case it already existed)
    SELECT id INTO review_user_id
    FROM public.users
    WHERE email = 'review@troodieapp.com';
    
    -- Create a sample board
    INSERT INTO public.boards (
        id,
        user_id,
        name,
        description,
        is_public,
        created_at
    ) VALUES (
        gen_random_uuid(),
        review_user_id,
        'Favorite Restaurants',
        'My top restaurant picks',
        true,
        NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- Add some sample restaurant saves (using example Google Place IDs)
    -- These are placeholder IDs - replace with actual restaurant place IDs from your app
    INSERT INTO public.restaurant_saves (
        id,
        user_id,
        google_place_id,
        status,
        notes,
        created_at
    ) 
    SELECT 
        gen_random_uuid(),
        review_user_id,
        place_id,
        status,
        notes,
        NOW()
    FROM (VALUES
        ('ChIJN1t_tDeuEmsRUsoyG83frY4', 'want_to_try', 'Heard great things about this place'),
        ('ChIJrTLr-GyuEmsRBfy61i59si0', 'been_there', 'Amazing food and atmosphere!'),
        ('ChIJ3S-JXmauEmsRUcIaWtf4MzE', 'been_there', 'Perfect for special occasions')
    ) AS sample_saves(place_id, status, notes)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.restaurant_saves 
        WHERE user_id = review_user_id 
        AND google_place_id = sample_saves.place_id
    );
    
    -- Create a sample post
    INSERT INTO public.posts (
        id,
        user_id,
        caption,
        privacy,
        created_at
    )
    SELECT
        gen_random_uuid(),
        review_user_id,
        'Just discovered this amazing restaurant! The pasta was incredible and the service was top-notch. Highly recommend for date night! 🍝✨',
        'public',
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM public.posts
        WHERE user_id = review_user_id
        LIMIT 1
    );
    
    -- Add the review account to a sample community (if communities exist)
    INSERT INTO public.community_members (
        id,
        community_id,
        user_id,
        role,
        joined_at
    )
    SELECT
        gen_random_uuid(),
        c.id,
        review_user_id,
        'member',
        NOW()
    FROM public.communities c
    WHERE c.name LIKE '%Food%' OR c.name LIKE '%Foodie%'
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'App Review account created/updated successfully with email: review@troodieapp.com';
END $$;

-- Grant necessary permissions for the review account
-- This ensures the account can perform all necessary actions during review
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add a comment to document this special account
COMMENT ON COLUMN public.users.email IS 'Email address of the user. review@troodieapp.com is reserved for App Store Review testing.';

-- Create a function to check if this is the review account (useful for special handling)
CREATE OR REPLACE FUNCTION public.is_review_account(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN LOWER(user_email) = 'review@troodieapp.com';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a helper function to bypass OTP for review account
-- This can be called from your Edge Functions if needed
CREATE OR REPLACE FUNCTION public.verify_review_account(
    p_email TEXT,
    p_token TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    user_id UUID,
    message TEXT
) AS $$
BEGIN
    -- Check if this is the review account with the special token
    IF LOWER(p_email) = 'review@troodieapp.com' AND p_token = '000000' THEN
        RETURN QUERY
        SELECT 
            true AS success,
            u.id AS user_id,
            'Review account authenticated' AS message
        FROM public.users u
        WHERE u.email = 'review@troodieapp.com';
    ELSE
        RETURN QUERY
        SELECT 
            false AS success,
            NULL::UUID AS user_id,
            'Invalid credentials' AS message;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.verify_review_account TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_review_account TO anon, authenticated;