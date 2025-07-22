-- Migration: Fix board_members table structure
-- Description: Check and fix board_members table if user_id column is missing
-- Author: Claude
-- Date: 2025-01-22

-- Check if board_members table exists and has the correct structure
DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'board_members') THEN
    -- Check if user_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_members' AND column_name = 'user_id') THEN
      -- Add user_id column if it doesn't exist
      ALTER TABLE board_members ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
      
      -- Update existing rows if needed (this is a fallback, shouldn't be needed)
      UPDATE board_members SET user_id = auth.uid() WHERE user_id IS NULL;
      
      -- Make user_id NOT NULL
      ALTER TABLE board_members ALTER COLUMN user_id SET NOT NULL;
      
      -- Add unique constraint if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'board_members' AND constraint_name = 'board_members_board_id_user_id_key') THEN
        ALTER TABLE board_members ADD CONSTRAINT board_members_board_id_user_id_key UNIQUE (board_id, user_id);
      END IF;
      
      RAISE NOTICE 'Added user_id column to board_members table';
    ELSE
      RAISE NOTICE 'board_members table already has user_id column';
    END IF;
  ELSE
    RAISE NOTICE 'board_members table does not exist, will be created by other migrations';
  END IF;
END $$;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);

-- Drop any problematic policies and recreate them
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname, schemaname, tablename FROM pg_policies WHERE tablename = 'board_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Recreate board_members policies with correct column references
CREATE POLICY "Anyone can view board members for public boards" ON board_members
  FOR SELECT USING (
    board_id IN (SELECT id FROM boards WHERE is_private = false)
  );

CREATE POLICY "Users can view board members for their own boards" ON board_members
  FOR SELECT USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view their own board memberships" ON board_members
  FOR SELECT USING (user_id = auth.uid());

-- Allow any authenticated user to insert board members (controlled by application logic)
CREATE POLICY "Allow board member insertion" ON board_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow board owners to update members
CREATE POLICY "Allow member updates by board owners" ON board_members
  FOR UPDATE USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );

-- Allow board owners to remove members
CREATE POLICY "Allow member removal by board owners" ON board_members
  FOR DELETE USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  ); 