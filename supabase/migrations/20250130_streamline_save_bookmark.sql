-- Migration: Streamline Save/Bookmark Process
-- Date: 2025-01-30
-- Description: Add default board support for instant saves

-- Add default_board_id to users table if not exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS default_board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL;

-- Create function to get or create default board
CREATE OR REPLACE FUNCTION public.get_or_create_default_board(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_board_id UUID;
  v_existing_board_id UUID;
BEGIN
  -- Check if user already has a default board
  SELECT default_board_id INTO v_board_id 
  FROM public.users 
  WHERE id = p_user_id;
  
  -- If user has a default board, verify it still exists
  IF v_board_id IS NOT NULL THEN
    SELECT id INTO v_existing_board_id
    FROM public.boards
    WHERE id = v_board_id
      AND user_id = p_user_id
      AND is_active = true;
    
    -- If board exists and is active, return it
    IF v_existing_board_id IS NOT NULL THEN
      RETURN v_existing_board_id;
    END IF;
  END IF;
  
  -- Check if user already has a "Quick Saves" board
  SELECT id INTO v_board_id
  FROM public.boards
  WHERE user_id = p_user_id
    AND title = 'Quick Saves'
    AND is_active = true
  LIMIT 1;
  
  -- If no existing Quick Saves board, create one
  IF v_board_id IS NULL THEN
    INSERT INTO public.boards (
      user_id,
      title,
      description,
      type,
      is_private,
      is_active,
      allow_comments,
      allow_saves
    ) VALUES (
      p_user_id,
      'Quick Saves',
      'Your quick saves collection',
      'free',
      false,
      true,
      true,
      true
    )
    RETURNING id INTO v_board_id;
    
    -- Add the user as owner of the board
    INSERT INTO public.board_members (
      board_id,
      user_id,
      role,
      joined_at
    ) VALUES (
      v_board_id,
      p_user_id,
      'owner',
      NOW()
    );
  END IF;
  
  -- Update user's default board
  UPDATE public.users 
  SET default_board_id = v_board_id 
  WHERE id = p_user_id;
  
  RETURN v_board_id;
END;
$$;

-- Create function to save restaurant with optional board
CREATE OR REPLACE FUNCTION public.save_restaurant_instant(
  p_user_id UUID,
  p_restaurant_id UUID,
  p_board_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_board_id UUID;
  v_save_id UUID;
  v_board_title TEXT;
BEGIN
  -- If no board specified, use default board
  IF p_board_id IS NULL THEN
    v_board_id := public.get_or_create_default_board(p_user_id);
  ELSE
    v_board_id := p_board_id;
  END IF;
  
  -- Check if already saved to this board
  SELECT id INTO v_save_id
  FROM public.restaurant_saves
  WHERE user_id = p_user_id
    AND restaurant_id = p_restaurant_id
    AND board_id = v_board_id;
  
  -- If not already saved, create the save
  IF v_save_id IS NULL THEN
    INSERT INTO public.restaurant_saves (
      user_id,
      restaurant_id,
      board_id,
      created_at
    ) VALUES (
      p_user_id,
      p_restaurant_id,
      v_board_id,
      NOW()
    )
    RETURNING id INTO v_save_id;
    
    -- Update board restaurant count
    UPDATE public.boards
    SET restaurant_count = restaurant_count + 1
    WHERE id = v_board_id;
  END IF;
  
  -- Get board title for response
  SELECT title INTO v_board_title
  FROM public.boards
  WHERE id = v_board_id;
  
  RETURN json_build_object(
    'save_id', v_save_id,
    'board_id', v_board_id,
    'board_title', v_board_title,
    'is_default_board', v_board_id = (SELECT default_board_id FROM public.users WHERE id = p_user_id)
  );
END;
$$;

-- Create function to remove restaurant save
CREATE OR REPLACE FUNCTION public.unsave_restaurant(
  p_user_id UUID,
  p_restaurant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  -- Delete all saves of this restaurant by the user
  WITH deleted AS (
    DELETE FROM public.restaurant_saves
    WHERE user_id = p_user_id
      AND restaurant_id = p_restaurant_id
    RETURNING board_id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  -- Update board counts
  UPDATE public.boards b
  SET restaurant_count = GREATEST(0, restaurant_count - sub.count)
  FROM (
    SELECT board_id, COUNT(*) as count
    FROM public.restaurant_saves
    WHERE user_id = p_user_id
      AND restaurant_id = p_restaurant_id
    GROUP BY board_id
  ) sub
  WHERE b.id = sub.board_id;
  
  RETURN v_deleted_count > 0;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_default_board(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_restaurant_instant(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsave_restaurant(UUID, UUID) TO authenticated;

-- Create RLS policy for default board access
CREATE POLICY "Users can access their default board"
ON public.boards
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id 
  AND id IN (
    SELECT default_board_id 
    FROM public.users 
    WHERE id = auth.uid()
  )
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_default_board ON public.users(default_board_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_saves_user_restaurant ON public.restaurant_saves(user_id, restaurant_id);