# Production Schema Queries - 2025-12-06

## Fixed Functions Query (Handles Aggregate Functions)

The original functions query failed because `st_3dextent` is an aggregate function. Use this corrected version:

```sql
SELECT 
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  CASE 
    WHEN p.prokind = 'a' THEN 'aggregate'
    WHEN p.prokind = 'w' THEN 'window'
    WHEN p.prokind = 'f' THEN 'function'
    WHEN p.prokind = 'p' THEN 'procedure'
    ELSE 'other'
  END AS function_type,
  pg_get_function_result(p.oid) AS return_type,
  CASE 
    WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
    WHEN p.provolatile = 's' THEN 'STABLE'
    WHEN p.provolatile = 'v' THEN 'VOLATILE'
  END AS volatility,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND n.nspname NOT LIKE 'pg_%'
ORDER BY n.nspname, p.proname;
```

**Note:** This query excludes aggregate functions from the definition output since `pg_get_functiondef()` fails on aggregates. If you need aggregate function definitions, query `pg_aggregate` separately.

## Alternative: Get Function Definitions (Excluding Aggregates)

If you need the actual SQL definitions:

```sql
SELECT 
  n.nspname AS schema,
  p.proname AS function_name,
  CASE 
    WHEN p.prokind = 'a' THEN NULL  -- Skip definition for aggregates
    ELSE pg_get_functiondef(p.oid)
  END AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND n.nspname NOT LIKE 'pg_%'
ORDER BY n.nspname, p.proname;
```

## Fix for Migration: Location Column Issue

The migration `20250113_create_creator_tables.sql` tries to INSERT into `campaigns` with a `location` column, but production doesn't have it. 

**Check if location column exists:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'campaigns' 
  AND column_name = 'location';
```

**✅ FIXED:** The migration `20250113_create_creator_tables.sql` has been updated to automatically add the `location` column if it doesn't exist before the INSERT statement. The fix uses a `DO $$` block to check and add the column conditionally.

**Manual fix (if needed):**
```sql
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS location VARCHAR(255);
```
