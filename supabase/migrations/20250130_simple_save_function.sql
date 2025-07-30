-- Simplest possible save function to avoid all ambiguity
-- Date: 2025-01-30

-- Drop existing functions
DROP FUNCTION IF EXISTS public.save_restaurant_instant(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.save_restaurant_simple(UUID, UUID, UUID);

-- Create the simplest possible save function
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
  final_board_id UUID;
  new_save_id UUID;
  board_name TEXT;
  is_default BOOLEAN;
BEGIN
  -- Determine which board to use
  IF p_board_id IS NULL THEN
    final_board_id := public.get_or_create_default_board(p_user_id);
  ELSE
    final_board_id := p_board_id;
  END IF;
  
  -- Try to insert (will fail silently if already exists due to unique constraint)
  BEGIN
    INSERT INTO public.restaurant_saves (user_id, restaurant_id, board_id, created_at)
    VALUES (p_user_id, p_restaurant_id, final_board_id, NOW())
    RETURNING id INTO new_save_id;
    
    -- If insert succeeded, update board count
    UPDATE public.boards
    SET restaurant_count = restaurant_count + 1
    WHERE id = final_board_id;
  EXCEPTION
    WHEN unique_violation THEN
      -- Already saved, just get the existing ID
      SELECT id INTO new_save_id
      FROM public.restaurant_saves
      WHERE user_id = p_user_id
        AND restaurant_id = p_restaurant_id
        AND board_id = final_board_id;
  END;
  
  -- Get board details
  SELECT title INTO board_name FROM public.boards WHERE id = final_board_id;
  SELECT (default_board_id = final_board_id) INTO is_default FROM public.users WHERE id = p_user_id;
  
  -- Return result
  RETURN json_build_object(
    'save_id', new_save_id,
    'board_id', final_board_id,
    'board_title', board_name,
    'is_default_board', COALESCE(is_default, false)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.save_restaurant_instant(UUID, UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.save_restaurant_instant IS 'Simple save function that avoids all ambiguity issues';