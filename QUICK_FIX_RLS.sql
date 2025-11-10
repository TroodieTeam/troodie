-- QUICK FIX: Run this in Supabase SQL Editor to fix board_restaurants RLS
-- This will allow authenticated users to add restaurants to boards they own

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "add_to_own_boards" ON board_restaurants;
DROP POLICY IF EXISTS "members_can_add_restaurants" ON board_restaurants;
DROP POLICY IF EXISTS "authenticated_users_can_add_to_own_boards" ON board_restaurants;

-- Create new INSERT policy
CREATE POLICY "users_can_add_to_own_boards" ON board_restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User owns the board
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_id
      AND boards.user_id = auth.uid()
    )
  );

-- Verify RLS is enabled
ALTER TABLE board_restaurants ENABLE ROW LEVEL SECURITY;

-- Test the policy (optional - comment out if not needed)
SELECT 'RLS policies updated successfully' as message;
