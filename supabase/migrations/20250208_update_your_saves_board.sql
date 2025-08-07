-- Migration: Update Quick Saves to Your Saves
-- Description: Updates all references from "Quick Saves" to "Your Saves" for consistency
-- Author: Claude
-- Date: 2025-02-08

-- 1. Update existing "Quick Saves" boards to "Your Saves"
UPDATE boards 
SET title = 'Your Saves',
    updated_at = NOW()
WHERE title = 'Quick Saves' AND type = 'free';

-- 2. Update the ensure_quick_saves_board function to use "Your Saves"
CREATE OR REPLACE FUNCTION ensure_quick_saves_board(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_board_id uuid;
BEGIN
  -- Check if Your Saves board exists (check both names for compatibility)
  SELECT id INTO v_board_id 
  FROM boards 
  WHERE user_id = p_user_id 
    AND title IN ('Your Saves', 'Quick Saves') 
    AND type = 'free'
  LIMIT 1;
  
  -- Create if doesn't exist
  IF v_board_id IS NULL THEN
    INSERT INTO boards (user_id, title, description, type, is_private, allow_comments, allow_saves)
    VALUES (
      p_user_id, 
      'Your Saves',  -- Changed from 'Quick Saves' to 'Your Saves'
      'Your default collection of saved restaurants', 
      'free',
      true,  -- Your Saves board is private by default
      false, -- No comments on Your Saves
      false  -- Others can't save from Your Saves
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

-- 3. Update the get_quick_saves_board function
CREATE OR REPLACE FUNCTION get_quick_saves_board(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_board_id uuid;
BEGIN
  -- Get user's default board
  SELECT default_board_id INTO v_board_id FROM users WHERE id = p_user_id;
  
  -- If no default board, ensure Your Saves exists
  IF v_board_id IS NULL THEN
    v_board_id := ensure_quick_saves_board(p_user_id);
  END IF;
  
  RETURN v_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the trigger function to create "Your Saves" on signup
CREATE OR REPLACE FUNCTION create_quick_saves_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_board_id uuid;
BEGIN
  -- Create user record in users table if not exists
  INSERT INTO users (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create Your Saves board (using the updated function)
  v_board_id := ensure_quick_saves_board(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update the view to use "Your Saves"
DROP VIEW IF EXISTS quick_saves_boards;
CREATE OR REPLACE VIEW your_saves_boards AS
SELECT 
  b.*,
  br.restaurant_count as saved_restaurants_count
FROM boards b
LEFT JOIN (
  SELECT board_id, COUNT(*) as restaurant_count
  FROM board_restaurants
  GROUP BY board_id
) br ON b.id = br.board_id
WHERE b.title IN ('Your Saves', 'Quick Saves') AND b.type = 'free';

-- Grant permissions on the new view
GRANT SELECT ON your_saves_boards TO authenticated;

-- 6. Update RLS policy to use "Your Saves"
DROP POLICY IF EXISTS "Users can only view their own Quick Saves board" ON boards;

CREATE POLICY "Users can only view their own Your Saves board" ON boards
  FOR SELECT
  USING (
    title IN ('Your Saves', 'Quick Saves') AND user_id = auth.uid()
  );

-- 7. Create Your Saves boards for existing users who don't have one
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT u.id 
    FROM users u
    LEFT JOIN boards b ON u.id = b.user_id 
      AND b.title IN ('Your Saves', 'Quick Saves') 
      AND b.type = 'free'
    WHERE b.id IS NULL
  LOOP
    PERFORM ensure_quick_saves_board(r.id);
  END LOOP;
END $$;

-- 8. Add a comment for documentation
COMMENT ON FUNCTION ensure_quick_saves_board IS 'Ensures that a user has a Your Saves board, creating one if necessary. This is the default board for saving restaurants.';