-- Create special functions for Apple Review Account
-- These functions bypass RLS for the review account only
-- UUID: a15d68b9-65c2-4782-907e-bfd11de0f612

-- Function to save restaurant for review account
CREATE OR REPLACE FUNCTION public.review_account_save_restaurant(
    p_board_id UUID,
    p_restaurant_id TEXT,
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
    
    -- Insert the restaurant
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
        p_restaurant_id,
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

-- Function to create board for review account
CREATE OR REPLACE FUNCTION public.review_account_create_board(
    p_title TEXT,
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
    
    -- Create the board
    INSERT INTO public.boards (
        user_id,
        title,
        description,
        is_private,
        created_at
    ) VALUES (
        review_user_id,
        p_title,
        p_description,
        p_is_private,
        NOW()
    )
    RETURNING id INTO new_board_id;
    
    RETURN new_board_id;
END;
$$;

-- Function to get boards for review account
CREATE OR REPLACE FUNCTION public.review_account_get_boards()
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    is_private BOOLEAN,
    restaurant_count INTEGER,
    created_at TIMESTAMPTZ
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
        b.title,
        b.description,
        b.is_private,
        b.restaurant_count,
        b.created_at
    FROM public.boards b
    WHERE b.user_id = review_user_id
    ORDER BY b.created_at DESC;
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
    RAISE NOTICE '✅ Review Account Functions Created!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created functions:';
    RAISE NOTICE '- review_account_save_restaurant()';
    RAISE NOTICE '- review_account_create_board()';
    RAISE NOTICE '- review_account_get_boards()';
    RAISE NOTICE '';
    RAISE NOTICE 'These functions bypass RLS for the review account only.';
    RAISE NOTICE '============================================';
END $$;