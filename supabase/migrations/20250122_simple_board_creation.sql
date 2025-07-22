-- Migration: Simple board creation function
-- Description: Create a simple board creation function that doesn't use board_members
-- Author: Claude
-- Date: 2025-01-22

-- Create a simple board creation function that doesn't use board_members
CREATE OR REPLACE FUNCTION create_simple_board(
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
  -- Just create the board, don't worry about board_members for now
  INSERT INTO boards (user_id, title, description, type, category, location, is_private, allow_comments, allow_saves, price)
  VALUES (p_user_id, p_title, p_description, p_type, p_category, p_location, p_is_private, p_allow_comments, p_allow_saves, p_price)
  RETURNING id INTO v_board_id;
  
  RETURN v_board_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_simple_board error: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_simple_board TO authenticated; 