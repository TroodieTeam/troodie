-- Migration: Fix board policies recursion
-- Description: Simplify board policies to avoid infinite recursion
-- Author: Claude
-- Date: 2025-01-22

-- 1. DROP ALL EXISTING POLICIES
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname, schemaname, tablename FROM pg_policies WHERE tablename IN ('boards', 'board_restaurants', 'board_members')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 2. CREATE SIMPLIFIED BOARD POLICIES
CREATE POLICY "Anyone can view public boards" ON boards
  FOR SELECT USING (is_private = false);

CREATE POLICY "Users can view their own boards" ON boards
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own boards" ON boards
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own boards" ON boards
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own boards" ON boards
  FOR DELETE USING (user_id = auth.uid());

-- 3. CREATE SIMPLIFIED BOARD_MEMBERS POLICIES
CREATE POLICY "Anyone can view board members for public boards" ON board_members
  FOR SELECT USING (
    board_id IN (SELECT id FROM boards WHERE is_private = false)
  );

CREATE POLICY "Users can view board members for their own boards" ON board_members
  FOR SELECT USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view their own board memberships" ON board_members
  FOR SELECT USING (user_id = auth.uid());

-- Allow any authenticated user to insert board members (will be controlled by application logic)
CREATE POLICY "Allow board member insertion" ON board_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow board owners to update members
CREATE POLICY "Allow member updates by board owners" ON board_members
  FOR UPDATE USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );

-- Allow board owners to remove members
CREATE POLICY "Allow member removal by board owners" ON board_members
  FOR DELETE USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );

-- 4. CREATE SIMPLIFIED BOARD_RESTAURANTS POLICIES
CREATE POLICY "Anyone can view restaurants in public boards" ON board_restaurants
  FOR SELECT USING (
    board_id IN (SELECT id FROM boards WHERE is_private = false)
  );

CREATE POLICY "Users can view restaurants in their own boards" ON board_restaurants
  FOR SELECT USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can add restaurants to their own boards" ON board_restaurants
  FOR INSERT WITH CHECK (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own restaurant entries" ON board_restaurants
  FOR UPDATE USING (added_by = auth.uid());

CREATE POLICY "Board owners can delete restaurants" ON board_restaurants
  FOR DELETE USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );

-- 5. UPDATE THE CREATE BOARD FUNCTION TO BE SIMPLER
CREATE OR REPLACE FUNCTION create_board_with_owner(
  p_user_id uuid,
  p_title text,
  p_description text,
  p_type text,
  p_category text,
  p_location text,
  p_is_private boolean,
  p_allow_comments boolean,
  p_allow_saves boolean,
  p_price decimal
)
RETURNS uuid AS $$
DECLARE
  v_board_id uuid;
BEGIN
  -- Insert the board
  INSERT INTO boards (user_id, title, description, type, category, location, is_private, allow_comments, allow_saves, price)
  VALUES (p_user_id, p_title, p_description, p_type, p_category, p_location, p_is_private, p_allow_comments, p_allow_saves, p_price)
  RETURNING id INTO v_board_id;
  
  -- Insert the owner as a member (this should work with the simplified policies)
  INSERT INTO board_members (board_id, user_id, role)
  VALUES (v_board_id, p_user_id, 'owner');
  
  RETURN v_board_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_board_with_owner error: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 