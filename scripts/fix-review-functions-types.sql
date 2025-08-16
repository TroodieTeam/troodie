-- Fix type mismatches in review account functions
-- UUID: a15d68b9-65c2-4782-907e-bfd11de0f612

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.review_account_save_restaurant;
DROP FUNCTION IF EXISTS public.review_account_get_boards;
DROP FUNCTION IF EXISTS public.review_account_create_board;

-- Recreate function to save restaurant with correct types
CREATE OR REPLACE FUNCTION public.review_account_save_restaurant(
    p_board_id UUID,
    p_restaurant_id TEXT,  -- Keep as TEXT since it comes from the app as string
    p_notes TEXT DEFAULT NULL,
    p_rating INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    review_user_id UUID := 'a15d68b9-65c2-4782-907e-bfd11de0f612';
    next_position INTEGER;
BEGIN
    -- Only allow for review account
    IF auth.uid() != review_user_id AND 
       (auth.uid() IS NULL AND current_setting('request.jwt.claims', true)::json->>'email' != 'review@troodieapp.com') THEN
        RAISE EXCEPTION 'This function is only for the review account';
    END IF;
    
    -- Get next position
    SELECT COALESCE(MAX(position), -1) + 1 INTO next_position
    FROM public.board_restaurants
    WHERE board_id = p_board_id;
    
    -- Insert the restaurant (cast TEXT to UUID)
    INSERT INTO public.board_restaurants (
        board_id,
        restaurant_id,
        added_by,
        position,
        notes,
        rating,
        added_at
    ) VALUES (
        p_board_id,
        p_restaurant_id::UUID,  -- Cast to UUID here
        review_user_id,
        next_position,
        p_notes,
        p_rating,
        NOW()
    )
    ON CONFLICT (board_id, restaurant_id) DO NOTHING;
    
    -- Update board restaurant count
    UPDATE public.boards
    SET restaurant_count = (
        SELECT COUNT(*) FROM public.board_restaurants 
        WHERE board_id = p_board_id
    )
    WHERE id = p_board_id;
END;
$$;

-- Recreate function to get boards with correct column types
CREATE OR REPLACE FUNCTION public.review_account_get_boards()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title VARCHAR(255),  -- Changed from TEXT to VARCHAR(255)
    description TEXT,
    type VARCHAR(50),
    category VARCHAR(50),
    location VARCHAR(255),
    cover_image_url TEXT,
    is_private BOOLEAN,
    allow_comments BOOLEAN,
    allow_saves BOOLEAN,
    price INTEGER,
    restaurant_count INTEGER,
    member_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ,
    default_board_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    review_user_id UUID := 'a15d68b9-65c2-4782-907e-bfd11de0f612';
BEGIN
    -- Only allow for review account
    IF auth.uid() != review_user_id AND 
       (auth.uid() IS NULL AND current_setting('request.jwt.claims', true)::json->>'email' != 'review@troodieapp.com') THEN
        RAISE EXCEPTION 'This function is only for the review account';
    END IF;
    
    RETURN QUERY
    SELECT 
        b.id,
        b.user_id,
        b.title,
        b.description,
        b.type,
        b.category,
        b.location,
        b.cover_image_url,
        b.is_private,
        b.allow_comments,
        b.allow_saves,
        b.price,
        b.restaurant_count,
        b.member_count,
        b.created_at,
        b.updated_at,
        b.last_activity,
        u.default_board_id
    FROM public.boards b
    LEFT JOIN public.users u ON u.id = b.user_id
    WHERE b.user_id = review_user_id
    ORDER BY b.created_at DESC;
END;
$$;

-- Recreate function to create board with correct types
CREATE OR REPLACE FUNCTION public.review_account_create_board(
    p_title VARCHAR(255),  -- Changed to match column type
    p_description TEXT DEFAULT NULL,
    p_is_private BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    review_user_id UUID := 'a15d68b9-65c2-4782-907e-bfd11de0f612';
    new_board_id UUID;
BEGIN
    -- Only allow for review account
    IF auth.uid() != review_user_id AND 
       (auth.uid() IS NULL AND current_setting('request.jwt.claims', true)::json->>'email' != 'review@troodieapp.com') THEN
        RAISE EXCEPTION 'This function is only for the review account';
    END IF;
    
    -- Create the board with default values for required columns
    INSERT INTO public.boards (
        user_id,
        title,
        description,
        is_private,
        type,
        allow_comments,
        allow_saves,
        restaurant_count,
        member_count,
        created_at,
        updated_at
    ) VALUES (
        review_user_id,
        p_title,
        p_description,
        p_is_private,
        'standard',  -- default type
        true,        -- allow_comments default
        true,        -- allow_saves default
        0,           -- restaurant_count default
        0,           -- member_count default
        NOW(),
        NOW()
    )
    RETURNING id INTO new_board_id;
    
    RETURN new_board_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.review_account_save_restaurant TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_account_create_board TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_account_get_boards TO authenticated;

-- Also grant to anon for the mock session
GRANT EXECUTE ON FUNCTION public.review_account_save_restaurant TO anon;
GRANT EXECUTE ON FUNCTION public.review_account_create_board TO anon;
GRANT EXECUTE ON FUNCTION public.review_account_get_boards TO anon;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Review Account Functions Fixed!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Fixed type mismatches:';
    RAISE NOTICE '- title: VARCHAR(255) instead of TEXT';
    RAISE NOTICE '- restaurant_id: Casting TEXT to UUID';
    RAISE NOTICE '- Added all required columns to get_boards';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions updated:';
    RAISE NOTICE '- review_account_save_restaurant()';
    RAISE NOTICE '- review_account_create_board()';
    RAISE NOTICE '- review_account_get_boards()';
    RAISE NOTICE '============================================';
END $$;