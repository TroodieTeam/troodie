# Safe Production Migration Plan (Preserve All Data)

## Goal
Migrate production schema to match development while preserving ALL existing data.

## Step 1: Export Current Production Schema
```sql
-- Get current table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

## Step 2: Compare with Development Schema
- Identify missing tables
- Identify missing columns
- Identify missing indexes
- Identify missing RLS policies

## Step 3: Create Incremental Migrations
- Add missing tables (if any)
- Add missing columns to existing tables
- Add missing indexes
- Add missing RLS policies
- Add missing functions/views

## Step 4: Apply Migrations Safely
- Run each migration individually
- Verify data integrity after each step
- Test RLS policies

## Step 5: Verify Complete Schema Match
- Compare final schema with development
- Test all functionality
- Confirm data preservation

## Safety Measures
- ✅ All operations use `IF NOT EXISTS` or `ADD COLUMN IF NOT EXISTS`
- ✅ No `DROP` statements
- ✅ No `DELETE` statements
- ✅ No `TRUNCATE` statements
- ✅ All changes are additive only

## Expected Outcome
- Production schema matches development exactly
- All existing data preserved
- All RLS policies working
- Ready for TestFlight deployment
