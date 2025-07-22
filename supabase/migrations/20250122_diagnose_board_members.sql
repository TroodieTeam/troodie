-- Migration: Diagnose board_members table structure
-- Description: Check the actual structure of board_members table
-- Author: Claude
-- Date: 2025-01-22

-- Check table structure
DO $$
DECLARE
    col record;
BEGIN
    RAISE NOTICE 'Checking board_members table structure...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'board_members') THEN
        RAISE NOTICE 'board_members table exists';
        
        FOR col IN SELECT column_name, data_type, is_nullable 
                   FROM information_schema.columns 
                   WHERE table_name = 'board_members' 
                   ORDER BY ordinal_position
        LOOP
            RAISE NOTICE 'Column: %, Type: %, Nullable: %', col.column_name, col.data_type, col.is_nullable;
        END LOOP;
    ELSE
        RAISE NOTICE 'board_members table does not exist';
    END IF;
END $$;

-- Check if there are any columns that might be the user reference
DO $$
DECLARE
    col record;
BEGIN
    RAISE NOTICE 'Looking for user reference columns...';
    
    FOR col IN SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'board_members' 
                AND column_name LIKE '%user%' OR column_name LIKE '%member%'
    LOOP
        RAISE NOTICE 'Potential user column: % (type: %)', col.column_name, col.data_type;
    END LOOP;
END $$; 