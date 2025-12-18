# Migration Duplicate Key Error Fix

## Problem

When running migrations with `--include-all`, Supabase CLI may attempt to insert migration records into `supabase_migrations.schema_migrations` that already exist, causing:

```
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" (SQLSTATE 23505)
Key (version)=(006) already exists.
```

## Root Cause

This happens when:
1. A migration was already applied and tracked in the database
2. Supabase CLI tries to insert it again when using `--include-all` flag
3. The migration tracking table has a unique constraint on the version column

## Solution

The migration script (`scripts/apply-creator-marketplace-migrations.js`) now handles this error gracefully:

1. **Detects the duplicate key error** (23505) on `schema_migrations` table
2. **Prompts the user** to confirm if the migration was already applied
3. **Continues with remaining migrations** if confirmed
4. **Provides clear guidance** on how to proceed

## How It Works

When the error is detected:

1. Script identifies it's a migration tracking conflict (not a real migration failure)
2. Asks user: "Is the migration already applied and tracked?"
3. If yes:
   - Treats as success
   - Attempts to continue with remaining migrations using `supabase db push --linked` (without --include-all)
4. If no:
   - Provides instructions to resolve the conflict manually

## Manual Resolution

If you encounter this error and need to resolve it manually:

### Option 1: Verify Migration Status
1. Go to Supabase Dashboard → Database → Migrations
2. Check if the migration version (e.g., "006") is listed
3. If it is, the migration was already applied successfully
4. You can safely ignore the error or mark it as resolved

### Option 2: Skip Already-Applied Migrations
1. Check which migrations are already tracked in `supabase_migrations.schema_migrations`
2. Remove those migration files temporarily (or rename them)
3. Run migrations again
4. Restore the files afterward

### Option 3: Reset Migration Tracking (⚠️ Use with Caution)
```sql
-- Only if you're sure the migration was already applied
-- This removes the tracking record but doesn't affect the actual database objects
DELETE FROM supabase_migrations.schema_migrations WHERE version = '006';
```

**⚠️ Warning:** Only use Option 3 if you're absolutely certain the migration was already applied and all objects exist correctly.

## Prevention

To prevent this issue in the future:

1. **Always check migration status** before running migrations
2. **Use `supabase migration list`** to see which migrations are tracked
3. **Don't manually insert migration records** into `schema_migrations` table
4. **Use the automated script** which handles these edge cases

## Related Files

- `scripts/apply-creator-marketplace-migrations.js` - Main migration script with error handling
- `docs/MIGRATION_IDEMPOTENCY_FIXES.md` - Idempotency fixes for migration files
- `docs/CREATOR_MARKETPLACE_MIGRATION_STEPS.md` - Migration execution guide
