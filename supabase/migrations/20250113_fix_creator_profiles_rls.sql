-- ================================================================
-- Fix RLS Policies for Creator Profiles
-- ================================================================
-- This migration ensures users can create and manage their own creator profiles
-- ================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all creator profiles" ON creator_profiles;
DROP POLICY IF EXISTS "Users can create their own creator profile" ON creator_profiles;
DROP POLICY IF EXISTS "Users can update their own creator profile" ON creator_profiles;
DROP POLICY IF EXISTS "Users can delete their own creator profile" ON creator_profiles;

-- Make sure RLS is enabled
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can view creator profiles (public data)
CREATE POLICY "Anyone can view creator profiles"
  ON creator_profiles
  FOR SELECT
  USING (true);

-- Policy 2: Authenticated users can create their own creator profile
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can create their own creator profile" ON creator_profiles;
CREATE POLICY "Users can create their own creator profile"
  ON creator_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own creator profile
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can update their own creator profile" ON creator_profiles;
CREATE POLICY "Users can update their own creator profile"
  ON creator_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own creator profile
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can delete their own creator profile" ON creator_profiles;
CREATE POLICY "Users can delete their own creator profile"
  ON creator_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- Fix RLS Policies for Creator Portfolio Items
-- ================================================================
-- Note: This table may not exist yet if migrations are run out of order
-- Only apply policies if the table exists

DO $$
BEGIN
  -- Check if creator_portfolio_items table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'creator_portfolio_items'
  ) THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Anyone can view portfolio items" ON creator_portfolio_items;
    DROP POLICY IF EXISTS "Creator can manage their portfolio items" ON creator_portfolio_items;
    DROP POLICY IF EXISTS "Creators can insert their portfolio items" ON creator_portfolio_items;
    DROP POLICY IF EXISTS "Creators can update their portfolio items" ON creator_portfolio_items;
    DROP POLICY IF EXISTS "Creators can delete their portfolio items" ON creator_portfolio_items;

    -- Make sure RLS is enabled
    ALTER TABLE creator_portfolio_items ENABLE ROW LEVEL SECURITY;

    -- Policy 1: Anyone can view portfolio items
    CREATE POLICY "Anyone can view portfolio items"
      ON creator_portfolio_items
      FOR SELECT
      USING (true);

    -- Policy 2: Creators can insert portfolio items for their own profile
    CREATE POLICY "Creators can insert their portfolio items"
      ON creator_portfolio_items
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM creator_profiles
          WHERE creator_profiles.id = creator_portfolio_items.creator_profile_id
          AND creator_profiles.user_id = auth.uid()
        )
      );

    -- Policy 3: Creators can update their own portfolio items
    CREATE POLICY "Creators can update their portfolio items"
      ON creator_portfolio_items
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM creator_profiles
          WHERE creator_profiles.id = creator_portfolio_items.creator_profile_id
          AND creator_profiles.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM creator_profiles
          WHERE creator_profiles.id = creator_portfolio_items.creator_profile_id
          AND creator_profiles.user_id = auth.uid()
        )
      );

    -- Policy 4: Creators can delete their own portfolio items
    CREATE POLICY "Creators can delete their portfolio items"
      ON creator_portfolio_items
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM creator_profiles
          WHERE creator_profiles.id = creator_portfolio_items.creator_profile_id
          AND creator_profiles.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ================================================================
-- Verify the policies are working
-- ================================================================
DO $$
DECLARE
  portfolio_table_exists BOOLEAN;
BEGIN
  -- Check if creator_portfolio_items table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'creator_portfolio_items'
  ) INTO portfolio_table_exists;

  RAISE NOTICE 'RLS policies for creator_profiles have been updated';
  IF portfolio_table_exists THEN
    RAISE NOTICE 'RLS policies for creator_portfolio_items have been updated';
  ELSE
    RAISE NOTICE 'Note: creator_portfolio_items table does not exist yet - policies will be applied when table is created';
  END IF;
  RAISE NOTICE 'Users can now:';
  RAISE NOTICE '  - Create their own creator profile';
  RAISE NOTICE '  - Update their own creator profile';
  RAISE NOTICE '  - View all creator profiles';
  IF portfolio_table_exists THEN
    RAISE NOTICE '  - Manage their own portfolio items';
  END IF;
END $$;