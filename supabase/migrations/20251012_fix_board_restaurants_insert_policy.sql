-- Fix board_restaurants INSERT policy for authenticated users
-- Issue: Users cannot add restaurants to their own boards
-- Date: 2025-10-12

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "add_to_own_boards" ON board_restaurants;
DROP POLICY IF EXISTS "members_can_add_restaurants" ON board_restaurants;

-- Recreate INSERT policy with simpler logic that checks board ownership
CREATE POLICY "authenticated_users_can_add_to_own_boards" ON board_restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User owns the board
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_id
      AND boards.user_id = auth.uid()
    )
    OR
    -- User is a member of the board
    EXISTS (
      SELECT 1 FROM board_members
      WHERE board_members.board_id = board_restaurants.board_id
      AND board_members.user_id = auth.uid()
    )
  );

-- Also ensure UPDATE and DELETE policies work for authenticated users
DROP POLICY IF EXISTS "update_own_entries" ON board_restaurants;
DROP POLICY IF EXISTS "owners_can_update" ON board_restaurants;
DROP POLICY IF EXISTS "delete_own_entries" ON board_restaurants;
DROP POLICY IF EXISTS "owners_can_delete" ON board_restaurants;

-- UPDATE: Users can update entries they added or if they own the board
CREATE POLICY "authenticated_users_can_update" ON board_restaurants
  FOR UPDATE
  TO authenticated
  USING (
    added_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_id
      AND boards.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete entries they added or if they own the board
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "authenticated_users_can_delete" ON board_restaurants;
CREATE POLICY "authenticated_users_can_delete" ON board_restaurants
  FOR DELETE
  TO authenticated
  USING (
    added_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_id
      AND boards.user_id = auth.uid()
    )
  );

-- Verify RLS is enabled
ALTER TABLE board_restaurants ENABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE board_restaurants IS 'RLS policies allow authenticated users to manage restaurants in boards they own or are members of';
