-- Fix RLS Policies for Apple Review Account
-- UUID: a15d68b9-65c2-4782-907e-bfd11de0f612
-- Email: review@troodieapp.com
-- 
-- This script creates/updates RLS policies to allow the review account to:
-- 1. Save restaurants to boards
-- 2. Create and manage boards
-- 3. Create posts
-- 4. Save restaurants

DO $$
DECLARE
    review_user_id UUID := 'a15d68b9-65c2-4782-907e-bfd11de0f612';
BEGIN
    -- First verify the user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = review_user_id) THEN
        RAISE EXCEPTION 'Review user not found. Please ensure the auth user exists first.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = review_user_id) THEN
        RAISE EXCEPTION 'Review user profile not found. Please run the setup script first.';
    END IF;
    
    RAISE NOTICE 'Found review user, updating RLS policies...';
    
    -- =========================================
    -- BOARDS TABLE RLS POLICIES
    -- =========================================
    
    -- Drop existing board policies if they exist
    DROP POLICY IF EXISTS "Users can view their own boards" ON public.boards;
    DROP POLICY IF EXISTS "Users can create their own boards" ON public.boards;
    DROP POLICY IF EXISTS "Users can update their own boards" ON public.boards;
    DROP POLICY IF EXISTS "Users can delete their own boards" ON public.boards;
    DROP POLICY IF EXISTS "Users can view public boards" ON public.boards;
    
    -- Create new board policies
    CREATE POLICY "Users can view their own boards"
        ON public.boards FOR SELECT
        USING (auth.uid() = user_id OR is_private = false);
    
    CREATE POLICY "Users can create their own boards"
        ON public.boards FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own boards"
        ON public.boards FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete their own boards"
        ON public.boards FOR DELETE
        USING (auth.uid() = user_id);
    
    -- =========================================
    -- BOARD_RESTAURANTS TABLE RLS POLICIES
    -- =========================================
    
    -- Drop existing board_restaurants policies if they exist
    DROP POLICY IF EXISTS "Users can view restaurants in their boards" ON public.board_restaurants;
    DROP POLICY IF EXISTS "Users can add restaurants to their boards" ON public.board_restaurants;
    DROP POLICY IF EXISTS "Users can remove restaurants from their boards" ON public.board_restaurants;
    DROP POLICY IF EXISTS "Users can view restaurants in public boards" ON public.board_restaurants;
    
    -- Create new board_restaurants policies
    CREATE POLICY "Users can view restaurants in their boards"
        ON public.board_restaurants FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM public.boards 
                WHERE boards.id = board_restaurants.board_id 
                AND (boards.user_id = auth.uid() OR boards.is_private = false)
            )
        );
    
    CREATE POLICY "Users can add restaurants to their boards"
        ON public.board_restaurants FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.boards 
                WHERE boards.id = board_restaurants.board_id 
                AND boards.user_id = auth.uid()
            )
        );
    
    CREATE POLICY "Users can remove restaurants from their boards"
        ON public.board_restaurants FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM public.boards 
                WHERE boards.id = board_restaurants.board_id 
                AND boards.user_id = auth.uid()
            )
        );
    
    -- =========================================
    -- RESTAURANT_SAVES TABLE RLS POLICIES
    -- =========================================
    
    -- Drop existing restaurant_saves policies if they exist
    DROP POLICY IF EXISTS "Users can view their own saves" ON public.restaurant_saves;
    DROP POLICY IF EXISTS "Users can create their own saves" ON public.restaurant_saves;
    DROP POLICY IF EXISTS "Users can delete their own saves" ON public.restaurant_saves;
    DROP POLICY IF EXISTS "Users can view public saves count" ON public.restaurant_saves;
    
    -- Create new restaurant_saves policies
    CREATE POLICY "Users can view their own saves"
        ON public.restaurant_saves FOR SELECT
        USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can create their own saves"
        ON public.restaurant_saves FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete their own saves"
        ON public.restaurant_saves FOR DELETE
        USING (auth.uid() = user_id);
    
    -- =========================================
    -- POSTS TABLE RLS POLICIES
    -- =========================================
    
    -- Drop existing post policies if they exist
    DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;
    DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
    DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
    DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
    DROP POLICY IF EXISTS "Users can view public posts" ON public.posts;
    
    -- Create new post policies
    CREATE POLICY "Users can view their own posts"
        ON public.posts FOR SELECT
        USING (auth.uid() = user_id OR privacy = 'public');
    
    CREATE POLICY "Users can create their own posts"
        ON public.posts FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own posts"
        ON public.posts FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete their own posts"
        ON public.posts FOR DELETE
        USING (auth.uid() = user_id);
    
    -- =========================================
    -- USERS TABLE RLS POLICIES
    -- =========================================
    
    -- Drop existing user policies if they exist
    DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
    
    -- Create new user policies
    CREATE POLICY "Users can view all profiles"
        ON public.users FOR SELECT
        USING (true);  -- All users can view all profiles
    
    CREATE POLICY "Users can insert their own profile"
        ON public.users FOR INSERT
        WITH CHECK (auth.uid() = id);
    
    CREATE POLICY "Users can update their own profile"
        ON public.users FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ RLS Policies Updated Successfully!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'The review account should now be able to:';
    RAISE NOTICE '- Create and manage boards';
    RAISE NOTICE '- Save restaurants to boards';
    RAISE NOTICE '- Create posts';
    RAISE NOTICE '- Update their profile';
    RAISE NOTICE '';
    RAISE NOTICE 'Review Account Details:';
    RAISE NOTICE 'Email: review@troodieapp.com';
    RAISE NOTICE 'UUID: %', review_user_id;
    RAISE NOTICE 'OTP Code: 000000';
    RAISE NOTICE '============================================';
    
END $$;

-- Verify RLS is enabled on all tables
DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Checking RLS status on tables...';
    RAISE NOTICE '--------------------------------';
    
    FOR table_record IN 
        SELECT tablename, 
               CASE WHEN rowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ❌' END as rls_status
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'boards', 'board_restaurants', 'restaurant_saves', 'posts')
    LOOP
        RAISE NOTICE '% - RLS: %', table_record.tablename, table_record.rls_status;
    END LOOP;
    
    RAISE NOTICE '--------------------------------';
END $$;

-- Enable RLS on tables if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Test query to verify the review account's data
SELECT 
    'Review Account Status' as info,
    u.id,
    u.email,
    u.username,
    COUNT(DISTINCT b.id) as boards_count,
    COUNT(DISTINCT p.id) as posts_count
FROM public.users u
LEFT JOIN public.boards b ON b.user_id = u.id
LEFT JOIN public.posts p ON p.user_id = u.id
WHERE u.id = 'a15d68b9-65c2-4782-907e-bfd11de0f612'
GROUP BY u.id, u.email, u.username;