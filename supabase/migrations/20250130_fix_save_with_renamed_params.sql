-- Fix save function by using different parameter names to avoid ambiguity
-- Date: 2025-01-30

-- Drop existing functions
DROP FUNCTION IF EXISTS public.save_restaurant_instant(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.save_restaurant_simple(UUID, UUID, UUID);

-- Create save function with renamed parameters to avoid conflicts
CREATE OR REPLACE FUNCTION public.save_restaurant_instant(
  input_user_id UUID,
  input_restaurant_id UUID,
  input_board_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_board_id UUID;
  v_save_id UUID;
  v_board_title TEXT;
  v_is_default BOOLEAN;
BEGIN
  -- Get the board ID to use
  IF input_board_id IS NULL THEN
    -- Get or create default board
    v_board_id := public.get_or_create_default_board(input_user_id);
  ELSE
    v_board_id := input_board_id;
  END IF;
  
  -- Check if this restaurant is already saved to this board
  SELECT id INTO v_save_id
  FROM public.restaurant_saves
  WHERE user_id = input_user_id
    AND restaurant_id = input_restaurant_id
    AND board_id = v_board_id
  LIMIT 1;
  
  -- If not already saved, create the save
  IF v_save_id IS NULL THEN
    -- Insert the save
    INSERT INTO public.restaurant_saves (
      user_id,
      restaurant_id,
      board_id,
      created_at
    ) VALUES (
      input_user_id,
      input_restaurant_id,
      v_board_id,
      NOW()
    )
    RETURNING id INTO v_save_id;
    
    -- Update board restaurant count
    UPDATE public.boards
    SET restaurant_count = restaurant_count + 1
    WHERE id = v_board_id;
  END IF;
  
  -- Get board information for response
  SELECT 
    b.title,
    (b.id = u.default_board_id)
  INTO 
    v_board_title,
    v_is_default
  FROM public.boards b
  CROSS JOIN public.users u
  WHERE b.id = v_board_id
    AND u.id = input_user_id;
  
  -- Return the result
  RETURN json_build_object(
    'save_id', v_save_id,
    'board_id', v_board_id,
    'board_title', v_board_title,
    'is_default_board', COALESCE(v_is_default, false)
  );
END;
$$;

-- Alternative: Create a wrapper function that uses the exact parameter names expected by the RPC call
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
  result JSON;
BEGIN
  -- Use a subquery approach to avoid ambiguity
  WITH save_operation AS (
    INSERT INTO public.restaurant_saves (user_id, restaurant_id, board_id, created_at)
    SELECT 
      p_user_id,
      p_restaurant_id,
      COALESCE(p_board_id, public.get_or_create_default_board(p_user_id)),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 
      FROM public.restaurant_saves rs
      WHERE rs.user_id = p_user_id
        AND rs.restaurant_id = p_restaurant_id
        AND rs.board_id = COALESCE(p_board_id, public.get_or_create_default_board(p_user_id))
    )
    RETURNING id, board_id
  ),
  existing_save AS (
    SELECT id, board_id
    FROM public.restaurant_saves rs
    WHERE rs.user_id = p_user_id
      AND rs.restaurant_id = p_restaurant_id
      AND rs.board_id = COALESCE(p_board_id, public.get_or_create_default_board(p_user_id))
  ),
  final_save AS (
    SELECT * FROM save_operation
    UNION ALL
    SELECT * FROM existing_save
    LIMIT 1
  ),
  board_info AS (
    SELECT 
      fs.id as save_id,
      fs.board_id,
      b.title as board_title,
      (b.id = u.default_board_id) as is_default_board
    FROM final_save fs
    JOIN public.boards b ON b.id = fs.board_id
    CROSS JOIN public.users u
    WHERE u.id = p_user_id
  )
  SELECT json_build_object(
    'save_id', save_id,
    'board_id', board_id,
    'board_title', board_title,
    'is_default_board', COALESCE(is_default_board, false)
  ) INTO result
  FROM board_info;
  
  -- Update board count if we inserted a new save
  IF EXISTS (SELECT 1 FROM save_operation) THEN
    UPDATE public.boards
    SET restaurant_count = restaurant_count + 1
    WHERE id = (SELECT board_id FROM save_operation LIMIT 1);
  END IF;
  
  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.save_restaurant_instant(UUID, UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.save_restaurant_instant IS 'Save a restaurant to a board with conflict-free parameter handling';