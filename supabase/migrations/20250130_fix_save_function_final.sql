-- Final fix for save_restaurant function - eliminate all ambiguity
-- Date: 2025-01-30

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS public.save_restaurant_instant(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.save_restaurant_simple(UUID, UUID, UUID);

-- Create a clean, unambiguous save function
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
  v_is_default BOOLEAN;
BEGIN
  -- Get the board ID to use
  IF p_board_id IS NULL THEN
    -- Get or create default board
    v_board_id := public.get_or_create_default_board(p_user_id);
  ELSE
    v_board_id := p_board_id;
  END IF;
  
  -- Check if this restaurant is already saved to this board
  SELECT id INTO v_save_id
  FROM public.restaurant_saves
  WHERE user_id = p_user_id
    AND restaurant_id = p_restaurant_id
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
    AND u.id = p_user_id;
  
  -- Return the result
  RETURN json_build_object(
    'save_id', v_save_id,
    'board_id', v_board_id,
    'board_title', v_board_title,
    'is_default_board', COALESCE(v_is_default, false)
  );
END;
$$;

-- Create unsave function with clean implementation
DROP FUNCTION IF EXISTS public.unsave_restaurant(UUID, UUID);

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
  -- Delete all saves of this restaurant by the user and update board counts
  WITH deleted_saves AS (
    DELETE FROM public.restaurant_saves
    WHERE user_id = p_user_id
      AND restaurant_id = p_restaurant_id
    RETURNING board_id
  ),
  board_updates AS (
    SELECT board_id, COUNT(*) as cnt
    FROM deleted_saves
    GROUP BY board_id
  )
  UPDATE public.boards b
  SET restaurant_count = GREATEST(0, b.restaurant_count - bu.cnt)
  FROM board_updates bu
  WHERE b.id = bu.board_id;
  
  -- Get the count of deleted saves
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count > 0;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.save_restaurant_instant(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsave_restaurant(UUID, UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.save_restaurant_instant IS 'Save a restaurant to a board (default board if none specified). Returns save details.';
COMMENT ON FUNCTION public.unsave_restaurant IS 'Remove all saves of a restaurant by a user. Returns true if any saves were removed.';