-- Migration: Fix restaurant_saves table - add board_id column
-- Date: 2025-01-30
-- Description: Add board_id column to restaurant_saves table to support board-based saves

-- Add board_id column to restaurant_saves table
ALTER TABLE public.restaurant_saves 
ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE;

-- Create index for board_id
CREATE INDEX IF NOT EXISTS idx_restaurant_saves_board_id ON public.restaurant_saves(board_id);

-- Create composite unique constraint to prevent duplicate saves in same board
ALTER TABLE public.restaurant_saves 
DROP CONSTRAINT IF EXISTS restaurant_saves_unique_user_restaurant_board;

ALTER TABLE public.restaurant_saves 
ADD CONSTRAINT restaurant_saves_unique_user_restaurant_board 
UNIQUE (user_id, restaurant_id, board_id);

-- Update any existing saves to use user's default board
-- First, ensure all users have a default board
DO $$
DECLARE
    user_record RECORD;
    default_board_id UUID;
BEGIN
    -- Loop through all users who have saves but no board_id set
    FOR user_record IN 
        SELECT DISTINCT u.id as user_id
        FROM public.users u
        INNER JOIN public.restaurant_saves rs ON rs.user_id = u.id
        WHERE rs.board_id IS NULL
    LOOP
        -- Get or create default board for this user
        default_board_id := public.get_or_create_default_board(user_record.user_id);
        
        -- Update all saves without board_id for this user
        UPDATE public.restaurant_saves
        SET board_id = default_board_id
        WHERE user_id = user_record.user_id
          AND board_id IS NULL;
    END LOOP;
END $$;

-- Make board_id NOT NULL after migration
ALTER TABLE public.restaurant_saves 
ALTER COLUMN board_id SET NOT NULL;

-- Update RLS policies for restaurant_saves
DROP POLICY IF EXISTS "Users can manage their own saves" ON public.restaurant_saves;

CREATE POLICY "Users can view their own saves"
ON public.restaurant_saves
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saves"
ON public.restaurant_saves
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
        SELECT 1 FROM public.board_members 
        WHERE board_id = restaurant_saves.board_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own saves"
ON public.restaurant_saves
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saves"
ON public.restaurant_saves
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.restaurant_saves TO authenticated;