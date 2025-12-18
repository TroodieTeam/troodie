-- ================================================================
-- Step 3: Create Default Boards for All Users
-- ================================================================
-- Creates a default "Quick Saves" board for each test user
-- Links boards to users via users.default_board_id
-- ================================================================

DO $$
DECLARE
  user_record RECORD;
  new_board_id UUID;
  board_count INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT id FROM public.users WHERE email LIKE 'test-%@troodieapp.com'
  LOOP
    -- Check if user already has a default board
    IF NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = user_record.id AND default_board_id IS NOT NULL
    ) THEN
      new_board_id := gen_random_uuid();
      
      -- Create the board (trigger will automatically add owner to board_members)
      INSERT INTO public.boards (
        id,
        user_id,
        title,
        description,
        type,
        is_private,
        is_active,
        allow_comments,
        allow_saves,
        created_at,
        updated_at
      )
      VALUES (
        new_board_id,
        user_record.id,
        'Quick Saves',
        'Default board for quick saves',
        'free',
        false,
        true,
        true,
        true,
        NOW(),
        NOW()
      ) ON CONFLICT DO NOTHING;
      
      -- Update user's default_board_id
      UPDATE public.users
      SET default_board_id = new_board_id,
          updated_at = NOW()
      WHERE id = user_record.id;
      
      board_count := board_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Step 3 Complete: Created % default boards', board_count;
END $$;

