-- Migration: Quick Saves Board System
-- Description: Implements default Quick Saves board for all users
-- Author: Claude
-- Date: 2025-01-25

-- 1. Add default_board_id to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS default_board_id UUID REFERENCES boards(id);

-- 2. Create function to ensure Quick Saves board exists
CREATE OR REPLACE FUNCTION ensure_quick_saves_board(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_board_id uuid;
BEGIN
  -- Check if Quick Saves board exists
  SELECT id INTO v_board_id 
  FROM boards 
  WHERE user_id = p_user_id AND title = 'Quick Saves' AND type = 'free';
  
  -- Create if doesn't exist
  IF v_board_id IS NULL THEN
    INSERT INTO boards (user_id, title, description, type, is_private, allow_comments, allow_saves)
    VALUES (
      p_user_id, 
      'Quick Saves', 
      'Your default collection of saved restaurants', 
      'free',
      true,  -- Quick Saves board is private by default
      false, -- No comments on Quick Saves
      false  -- Others can't save from Quick Saves
    )
    RETURNING id INTO v_board_id;
    
    -- Add user as owner in board_members
    INSERT INTO board_members (board_id, user_id, role)
    VALUES (v_board_id, p_user_id, 'owner')
    ON CONFLICT (board_id, user_id) DO NOTHING;
  END IF;
  
  -- Update user's default board
  UPDATE users SET default_board_id = v_board_id WHERE id = p_user_id;
  
  RETURN v_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to get or create user's Quick Saves board
CREATE OR REPLACE FUNCTION get_quick_saves_board(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_board_id uuid;
BEGIN
  -- Get user's default board
  SELECT default_board_id INTO v_board_id FROM users WHERE id = p_user_id;
  
  -- If no default board, ensure Quick Saves exists
  IF v_board_id IS NULL THEN
    v_board_id := ensure_quick_saves_board(p_user_id);
  END IF;
  
  RETURN v_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Modify the create_default_board trigger to create Quick Saves board
DROP TRIGGER IF EXISTS create_default_board_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_default_board();

CREATE OR REPLACE FUNCTION create_quick_saves_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_board_id uuid;
BEGIN
  -- Create user record in users table if not exists
  INSERT INTO users (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create Quick Saves board
  v_board_id := ensure_quick_saves_board(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to create Quick Saves board when a new user is created
CREATE TRIGGER create_quick_saves_on_signup_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_quick_saves_on_signup();

-- 5. Create or update existing users with Quick Saves boards
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM users WHERE default_board_id IS NULL
  LOOP
    PERFORM ensure_quick_saves_board(r.id);
  END LOOP;
END $$;

-- 6. Create view for Quick Saves boards
CREATE OR REPLACE VIEW quick_saves_boards AS
SELECT 
  b.*,
  br.restaurant_count as saved_restaurants_count
FROM boards b
LEFT JOIN (
  SELECT board_id, COUNT(*) as restaurant_count
  FROM board_restaurants
  GROUP BY board_id
) br ON b.id = br.board_id
WHERE b.title = 'Quick Saves' AND b.type = 'free';

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION ensure_quick_saves_board TO authenticated;
GRANT EXECUTE ON FUNCTION get_quick_saves_board TO authenticated;
GRANT SELECT ON quick_saves_boards TO authenticated;

-- 8. Add RLS policy for Quick Saves visibility (users can only see their own)
CREATE POLICY "Users can only view their own Quick Saves board" ON boards
  FOR SELECT
  USING (
    title = 'Quick Saves' AND user_id = auth.uid()
  );