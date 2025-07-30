-- Debug and fix all ambiguous column references
-- Date: 2025-01-30

-- First, let's check what triggers exist on restaurant_saves
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'restaurant_saves';

-- Check if there's a restaurant_id column in multiple related tables
SELECT 
    table_name,
    column_name
FROM information_schema.columns
WHERE column_name = 'restaurant_id'
    AND table_schema = 'public'
ORDER BY table_name;

-- Drop any existing triggers that might be causing issues
DROP TRIGGER IF EXISTS update_board_counts_on_save ON public.restaurant_saves;
DROP TRIGGER IF EXISTS update_board_counts_on_delete ON public.restaurant_saves;

-- Recreate the save function with even more explicit qualification
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
    SELECT public.get_or_create_default_board(p_user_id) INTO v_board_id;
  ELSE
    v_board_id := p_board_id;
  END IF;
  
  -- Check if already saved to this board
  SELECT rs.id INTO v_save_id
  FROM public.restaurant_saves AS rs
  WHERE rs.user_id = p_user_id
    AND rs.restaurant_id = p_restaurant_id
    AND rs.board_id = v_board_id;
  
  -- If not already saved, create the save
  IF v_save_id IS NULL THEN
    INSERT INTO public.restaurant_saves AS rs (
      rs.user_id,
      rs.restaurant_id,
      rs.board_id,
      rs.created_at
    ) VALUES (
      p_user_id,
      p_restaurant_id,
      v_board_id,
      NOW()
    )
    RETURNING rs.id INTO v_save_id;
    
    -- Update board restaurant count
    UPDATE public.boards AS b
    SET b.restaurant_count = b.restaurant_count + 1
    WHERE b.id = v_board_id;
  END IF;
  
  -- Get board title for response
  SELECT b.title INTO v_board_title
  FROM public.boards AS b
  WHERE b.id = v_board_id;
  
  RETURN json_build_object(
    'save_id', v_save_id,
    'board_id', v_board_id,
    'board_title', v_board_title,
    'is_default_board', v_board_id = (SELECT u.default_board_id FROM public.users AS u WHERE u.id = p_user_id)
  );
EXCEPTION
  WHEN ambiguous_column THEN
    RAISE EXCEPTION 'Ambiguous column error in save_restaurant_instant: %', SQLERRM;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in save_restaurant_instant: %', SQLERRM;
END;
$$;

-- Alternative approach: Create a simpler version without ambiguity
DROP FUNCTION IF EXISTS public.save_restaurant_simple(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.save_restaurant_simple(
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
  -- If no board specified, use default board
  IF p_board_id IS NULL THEN
    -- Get or create default board
    WITH user_board AS (
      SELECT u.default_board_id 
      FROM public.users u 
      WHERE u.id = p_user_id
    )
    SELECT COALESCE(
      (SELECT default_board_id FROM user_board),
      public.get_or_create_default_board(p_user_id)
    ) INTO v_board_id;
  ELSE
    v_board_id := p_board_id;
  END IF;
  
  -- Try to insert, ignore if already exists
  BEGIN
    INSERT INTO public.restaurant_saves (user_id, restaurant_id, board_id, created_at)
    VALUES (p_user_id, p_restaurant_id, v_board_id, NOW())
    RETURNING id INTO v_save_id;
    
    -- If insert succeeded, update board count
    UPDATE public.boards 
    SET restaurant_count = restaurant_count + 1
    WHERE id = v_board_id;
  EXCEPTION
    WHEN unique_violation THEN
      -- Already saved, just get the existing ID
      SELECT id INTO v_save_id
      FROM public.restaurant_saves
      WHERE user_id = p_user_id
        AND restaurant_id = p_restaurant_id
        AND board_id = v_board_id;
  END;
  
  -- Get board info
  SELECT title INTO v_board_title FROM public.boards WHERE id = v_board_id;
  SELECT (default_board_id = v_board_id) INTO v_is_default FROM public.users WHERE id = p_user_id;
  
  RETURN json_build_object(
    'save_id', v_save_id,
    'board_id', v_board_id,
    'board_title', v_board_title,
    'is_default_board', v_is_default
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.save_restaurant_instant(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_restaurant_simple(UUID, UUID, UUID) TO authenticated;