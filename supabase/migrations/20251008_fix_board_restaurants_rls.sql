-- Fix board_restaurants RLS policies
-- Issue: Policies reference non-existent 'user_id' column, should use 'added_by'
-- Date: 2025-10-08

-- Step 1: Drop all existing policies on board_restaurants
DROP POLICY IF EXISTS "Anyone can view restaurants in public boards" ON board_restaurants;
DROP POLICY IF EXISTS "Users can view restaurants in their own boards" ON board_restaurants;
DROP POLICY IF EXISTS "Users can view restaurants in boards they're members of" ON board_restaurants;
DROP POLICY IF EXISTS "Users can add restaurants to their own boards" ON board_restaurants;
DROP POLICY IF EXISTS "Users can add restaurants to boards they're members of" ON board_restaurants;
DROP POLICY IF EXISTS "Users can update their own restaurant entries" ON board_restaurants;
DROP POLICY IF EXISTS "Board owners can update restaurants in their boards" ON board_restaurants;
DROP POLICY IF EXISTS "Board owners can delete restaurants" ON board_restaurants;
DROP POLICY IF EXISTS "Board owners can remove restaurants from their boards" ON board_restaurants;
DROP POLICY IF EXISTS "Anyone can view board restaurants for public boards" ON board_restaurants;
DROP POLICY IF EXISTS "Board members can view board restaurants" ON board_restaurants;
DROP POLICY IF EXISTS "Board members can add restaurants" ON board_restaurants;

-- Step 2: Create clean, working policies

-- SELECT: Anyone can view restaurants in public boards
CREATE POLICY "view_public_board_restaurants" ON board_restaurants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_restaurants.board_id
      AND boards.is_private = false
    )
  );

-- SELECT: Users can view restaurants in their own boards
CREATE POLICY "view_own_board_restaurants" ON board_restaurants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_restaurants.board_id
      AND boards.user_id = auth.uid()
    )
  );

-- SELECT: Users can view restaurants in boards they're members of
CREATE POLICY "view_member_board_restaurants" ON board_restaurants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM board_members
      WHERE board_members.board_id = board_restaurants.board_id
      AND board_members.user_id = auth.uid()
    )
  );

-- INSERT: Users can add restaurants to their own boards
CREATE POLICY "add_to_own_boards" ON board_restaurants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_restaurants.board_id
      AND boards.user_id = auth.uid()
    )
  );

-- INSERT: Board members can add restaurants to boards they're members of
CREATE POLICY "members_can_add_restaurants" ON board_restaurants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM board_members
      WHERE board_members.board_id = board_restaurants.board_id
      AND board_members.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update restaurant entries they added
CREATE POLICY "update_own_entries" ON board_restaurants
  FOR UPDATE
  USING (added_by = auth.uid());

-- UPDATE: Board owners can update any restaurant in their boards
CREATE POLICY "owners_can_update" ON board_restaurants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_restaurants.board_id
      AND boards.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete restaurant entries they added
CREATE POLICY "delete_own_entries" ON board_restaurants
  FOR DELETE
  USING (added_by = auth.uid());

-- DELETE: Board owners can delete any restaurant from their boards
CREATE POLICY "owners_can_delete" ON board_restaurants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_restaurants.board_id
      AND boards.user_id = auth.uid()
    )
  );

-- Step 3: Verify RLS is enabled
ALTER TABLE board_restaurants ENABLE ROW LEVEL SECURITY;

-- Step 4: Add helpful comment
COMMENT ON TABLE board_restaurants IS 'Links restaurants to boards with proper RLS - users can add to boards they own or are members of';
