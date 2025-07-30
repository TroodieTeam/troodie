-- Fix ambiguous column references in save/unsave functions
-- Date: 2025-01-30

-- Drop and recreate the save_restaurant_instant function with proper column qualification
DROP FUNCTION IF EXISTS public.save_restaurant_instant(UUID, UUID, UUID);

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
  SELECT rs.id INTO v_save_id
  FROM public.restaurant_saves rs
  WHERE rs.user_id = p_user_id
    AND rs.restaurant_id = p_restaurant_id
    AND rs.board_id = v_board_id;
  
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

-- Drop and recreate the unsave_restaurant function with proper column qualification
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
  v_board_counts RECORD;
BEGIN
  -- Store board counts before deletion
  CREATE TEMP TABLE temp_board_counts AS
  SELECT board_id, COUNT(*) as count
  FROM public.restaurant_saves rs
  WHERE rs.user_id = p_user_id
    AND rs.restaurant_id = p_restaurant_id
  GROUP BY board_id;
  
  -- Delete all saves of this restaurant by the user
  WITH deleted AS (
    DELETE FROM public.restaurant_saves rs
    WHERE rs.user_id = p_user_id
      AND rs.restaurant_id = p_restaurant_id
    RETURNING rs.id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  -- Update board counts
  UPDATE public.boards b
  SET restaurant_count = GREATEST(0, restaurant_count - tbc.count)
  FROM temp_board_counts tbc
  WHERE b.id = tbc.board_id;
  
  -- Clean up temp table
  DROP TABLE temp_board_counts;
  
  RETURN v_deleted_count > 0;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.save_restaurant_instant(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsave_restaurant(UUID, UUID) TO authenticated;