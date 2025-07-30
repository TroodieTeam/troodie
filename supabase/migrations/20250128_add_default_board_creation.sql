-- Add default board creation for new users
-- This ensures every user gets a "Quick Saves" board when their profile is created

-- Update the ensure_user_profile function to also create a default board
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  p_user_id uuid,
  p_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_board_id uuid;
  v_existing_board_id uuid;
BEGIN
  -- First, create or update the user profile
  INSERT INTO users (id, email, created_at, updated_at)
  VALUES (p_user_id, p_email, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET 
    email = COALESCE(EXCLUDED.email, users.email),
    updated_at = NOW();
  
  -- Check if user already has a default board
  SELECT default_board_id INTO v_existing_board_id
  FROM users
  WHERE id = p_user_id;
  
  -- If no default board exists, create one
  IF v_existing_board_id IS NULL THEN
    -- Generate a new UUID for the board
    v_default_board_id := gen_random_uuid();
    
    -- Create the default "Quick Saves" board
    INSERT INTO boards (
      id,
      user_id,
      title,
      description,
      type,
      is_private,
      created_at,
      updated_at
    ) VALUES (
      v_default_board_id,
      p_user_id,
      'Quick Saves',
      'Your personal collection of saved restaurants',
      'free',
      false,
      NOW(),
      NOW()
    );
    
    -- Add the user as owner of their default board
    INSERT INTO board_members (
      board_id,
      user_id,
      role,
      joined_at
    ) VALUES (
      v_default_board_id,
      p_user_id,
      'owner',
      NOW()
    ) ON CONFLICT (board_id, user_id) DO NOTHING;
    
    -- Update the user's default_board_id and has_created_board flag
    UPDATE users 
    SET 
      default_board_id = v_default_board_id,
      has_created_board = true,
      updated_at = NOW()
    WHERE id = p_user_id;
    
    RAISE LOG 'Created default board % for user %', v_default_board_id, p_user_id;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail
    RAISE LOG 'Error in ensure_user_profile: %', SQLERRM;
END;
$$;

-- Create a function to retroactively create default boards for existing users
CREATE OR REPLACE FUNCTION public.create_default_boards_for_existing_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  v_board_id uuid;
  v_created_count integer := 0;
BEGIN
  -- Find all users without a default board
  FOR user_record IN 
    SELECT id, email
    FROM users
    WHERE default_board_id IS NULL
  LOOP
    -- Generate board ID
    v_board_id := gen_random_uuid();
    
    -- Create board
    INSERT INTO boards (
      id,
      user_id,
      title,
      description,
      type,
      is_private,
      created_at,
      updated_at
    ) VALUES (
      v_board_id,
      user_record.id,
      'Quick Saves',
      'Your personal collection of saved restaurants',
      'free',
      false,
      NOW(),
      NOW()
    );
    
    -- Add as owner
    INSERT INTO board_members (
      board_id,
      user_id,
      role,
      joined_at
    ) VALUES (
      v_board_id,
      user_record.id,
      'owner',
      NOW()
    ) ON CONFLICT (board_id, user_id) DO NOTHING;
    
    -- Update user
    UPDATE users 
    SET 
      default_board_id = v_board_id,
      has_created_board = true,
      updated_at = NOW()
    WHERE id = user_record.id;
    
    v_created_count := v_created_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Created % default boards for existing users', v_created_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_default_boards_for_existing_users() TO authenticated;

-- Run the function to create boards for any existing users
SELECT public.create_default_boards_for_existing_users();

-- Seed external content sources if they don't exist
INSERT INTO public.external_content_sources (name, domain, icon_url, is_supported) VALUES
('TikTok', 'tiktok.com', null, true),
('Instagram', 'instagram.com', null, true),
('YouTube', 'youtube.com', null, true),
('Twitter', 'twitter.com', null, true),
('Articles', null, null, true),
('Other', null, null, true)
ON CONFLICT (name) DO NOTHING;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'DEFAULT BOARD CREATION ADDED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '1. Updated ensure_user_profile to create Quick Saves board';
  RAISE NOTICE '2. Created function for existing users';
  RAISE NOTICE '3. All new users will get a default board automatically';
  RAISE NOTICE '4. Seeded external content sources';
  RAISE NOTICE '==============================================';
END $$;