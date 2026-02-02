-- TEMPORARY FIX: Allow all authenticated users to insert into board_restaurants
-- This will help us diagnose if the issue is with auth or with the ownership check
-- We'll tighten this back up once we verify everything works

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "add_to_own_boards" ON board_restaurants;
DROP POLICY IF EXISTS "members_can_add_restaurants" ON board_restaurants;
DROP POLICY IF EXISTS "authenticated_users_can_add_to_own_boards" ON board_restaurants;
DROP POLICY IF EXISTS "users_can_add_to_own_boards" ON board_restaurants;

-- TEMPORARY: Allow all authenticated users to insert
-- This is just for testing - we'll add proper checks later
CREATE POLICY "temp_allow_authenticated_inserts" ON board_restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also update UPDATE and DELETE policies to be permissive temporarily
DROP POLICY IF EXISTS "update_own_entries" ON board_restaurants;
DROP POLICY IF EXISTS "owners_can_update" ON board_restaurants;
DROP POLICY IF EXISTS "authenticated_users_can_update" ON board_restaurants;
DROP POLICY IF EXISTS "delete_own_entries" ON board_restaurants;
DROP POLICY IF EXISTS "owners_can_delete" ON board_restaurants;
DROP POLICY IF EXISTS "authenticated_users_can_delete" ON board_restaurants;

CREATE POLICY "temp_allow_authenticated_updates" ON board_restaurants
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "temp_allow_authenticated_deletes" ON board_restaurants
  FOR DELETE
  TO authenticated
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE board_restaurants ENABLE ROW LEVEL SECURITY;

SELECT 'Temporary permissive RLS policies applied - all authenticated users can now modify board_restaurants' as message;
