-- Simple RLS fix for Apple Review Account
-- This adds explicit checks for the review account UUID in all RLS policies
-- UUID: a15d68b9-65c2-4782-907e-bfd11de0f612

-- First, ensure the review account exists in users table
DO $$
DECLARE
    review_user_id UUID := 'a15d68b9-65c2-4782-907e-bfd11de0f612';
BEGIN
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
    
    RAISE NOTICE 'Review account profile ensured';
END $$;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own boards" ON public.boards;
DROP POLICY IF EXISTS "Users can create their own boards" ON public.boards;
DROP POLICY IF EXISTS "Users can update their own boards" ON public.boards;
DROP POLICY IF EXISTS "Users can delete their own boards" ON public.boards;
DROP POLICY IF EXISTS "Users can view public boards" ON public.boards;

DROP POLICY IF EXISTS "Users can view restaurants in their boards" ON public.board_restaurants;
DROP POLICY IF EXISTS "Users can add restaurants to their boards" ON public.board_restaurants;
DROP POLICY IF EXISTS "Users can remove restaurants from their boards" ON public.board_restaurants;
DROP POLICY IF EXISTS "Users can view restaurants in public boards" ON public.board_restaurants;

-- BOARDS TABLE - Simple policies that work with null auth.uid()
CREATE POLICY "Anyone can view public boards"
    ON public.boards FOR SELECT
    USING (is_private = false OR user_id = 'a15d68b9-65c2-4782-907e-bfd11de0f612');

CREATE POLICY "Users can view their own boards"
    ON public.boards FOR SELECT
    USING (auth.uid() = user_id OR user_id = 'a15d68b9-65c2-4782-907e-bfd11de0f612');

CREATE POLICY "Users can create boards"
    ON public.boards FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id = 'a15d68b9-65c2-4782-907e-bfd11de0f612');

CREATE POLICY "Users can update their boards"
    ON public.boards FOR UPDATE
    USING (auth.uid() = user_id OR user_id = 'a15d68b9-65c2-4782-907e-bfd11de0f612')
    WITH CHECK (auth.uid() = user_id OR user_id = 'a15d68b9-65c2-4782-907e-bfd11de0f612');

CREATE POLICY "Users can delete their boards"
    ON public.boards FOR DELETE
    USING (auth.uid() = user_id OR user_id = 'a15d68b9-65c2-4782-907e-bfd11de0f612');

-- BOARD_RESTAURANTS TABLE - Simple policies
CREATE POLICY "Anyone can view board restaurants"
    ON public.board_restaurants FOR SELECT
    USING (true);  -- Let board privacy control access

CREATE POLICY "Users can add to their boards"
    ON public.board_restaurants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.boards 
            WHERE boards.id = board_restaurants.board_id 
            AND (boards.user_id = auth.uid() OR boards.user_id = 'a15d68b9-65c2-4782-907e-bfd11de0f612')
        )
        OR added_by = 'a15d68b9-65c2-4782-907e-bfd11de0f612'
    );

CREATE POLICY "Users can remove from their boards"
    ON public.board_restaurants FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.boards 
            WHERE boards.id = board_restaurants.board_id 
            AND (boards.user_id = auth.uid() OR boards.user_id = 'a15d68b9-65c2-4782-907e-bfd11de0f612')
        )
        OR added_by = 'a15d68b9-65c2-4782-907e-bfd11de0f612'
    );

-- Enable RLS on tables
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_restaurants ENABLE ROW LEVEL SECURITY;

-- Create a simple test to verify
DO $$
DECLARE
    review_user_id UUID := 'a15d68b9-65c2-4782-907e-bfd11de0f612';
    board_count INTEGER;
    can_insert BOOLEAN;
BEGIN
    -- Check if review account has boards
    SELECT COUNT(*) INTO board_count
    FROM public.boards
    WHERE user_id = review_user_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Simple RLS Policies Applied!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Review account UUID: %', review_user_id;
    RAISE NOTICE 'Existing boards: %', board_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Policies now explicitly allow the review account';
    RAISE NOTICE 'to bypass auth checks by checking for its UUID.';
    RAISE NOTICE '============================================';
END $$;