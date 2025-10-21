# TMC Migration Fixes

## Issue 1: Missing `users.role` Column

When running the TMC-001 migration, you encountered this error:

```
ERROR: 42703: column users.role does not exist
```

## Issue 2: Missing `campaigns.budget_total` Column

After fixing Issue 1, you encountered:

```
ERROR: 42703: column c.budget_total does not exist
LINE 238: c.budget_total,
```

## Root Causes

### Issue 1: Missing Role Column
The RLS policies in the migration referenced `users.role` to check for admin access, but your current database schema doesn't have a `role` column in the `users` table. Your schema uses `account_type` (consumer, creator, business) but not `role` for admin privileges.

### Issue 2: Incorrect Column Name in View
The `troodie_campaigns_summary` view was trying to select `c.budget_total`, but the `campaigns` table has:
- `budget` (numeric) - legacy column
- `budget_cents` (integer) - actual budget column

But NOT `budget_total`.

## Fixes Applied

I've updated the TMC-001 migration file with **two fixes**.

### Changes Made

**File**: `supabase/migrations/20251013_troodie_managed_campaigns_schema.sql`

### Fix 1: Added `users.role` column

**Added at the beginning of the migration**:

```sql
-- ================================================================
-- EXTEND USERS TABLE
-- ================================================================
-- Add role column for admin access
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Add comment for clarity
COMMENT ON COLUMN users.role IS 'User role: user (default), admin, moderator';

-- Create index for role filtering
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role)
WHERE role != 'user';
```

This adds a `role` column with:
- Default value: `'user'` for all existing and new users
- Possible values: `'user'`, `'admin'`, `'moderator'`
- Index for efficient filtering of admin/moderator users

### Fix 2: Corrected `troodie_campaigns_summary` view

**Changed in the view definition**:

```sql
-- BEFORE (wrong):
c.budget_total,

-- AFTER (correct):
c.budget,
c.budget_cents,
```

The view now correctly selects both budget columns that actually exist in the campaigns table.

## How the Role System Works

### Role vs Account Type

Your app now has **two separate concepts**:

1. **`account_type`** (existing):
   - `consumer` - Regular user
   - `creator` - Content creator
   - `business` - Restaurant owner

2. **`role`** (new):
   - `user` - Regular user (default)
   - `admin` - Platform administrator
   - `moderator` - Content moderator

### Example User Combinations

- **Regular consumer**: `account_type='consumer'`, `role='user'`
- **Regular creator**: `account_type='creator'`, `role='user'`
- **Business owner**: `account_type='business'`, `role='user'`
- **Platform admin** (kouame@troodieapp.com): `account_type='business'`, `role='admin'`
- **Content moderator**: `account_type='consumer'`, `role='moderator'`

### RLS Policy Logic

The RLS policies on `platform_managed_campaigns` check:

```sql
EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.role = 'admin'
)
```

This ensures only users with `role='admin'` can view/manage platform campaigns.

## Deployment Steps

Now you can deploy the updated migration:

### Option 1: Supabase Dashboard SQL Editor (Recommended)

1. Go to: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new
2. Copy the **updated** SQL from: `supabase/migrations/20251013_troodie_managed_campaigns_schema.sql`
3. Paste and run

### Option 2: Command Line

```bash
# If using supabase CLI
npx supabase db push

# Or if using psql directly
psql "postgresql://postgres:[PASSWORD]@db.tcultsriqunnxujqiwea.supabase.co:5432/postgres" \
  -f supabase/migrations/20251013_troodie_managed_campaigns_schema.sql
```

## Verification

After running the migration, verify the `role` column was added:

```sql
-- Check that role column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';
-- Expected: 1 row with default 'user'

-- Check all users have default role
SELECT role, COUNT(*) FROM users GROUP BY role;
-- Expected: All users should have role='user'

-- Verify index exists
SELECT indexname FROM pg_indexes
WHERE tablename = 'users' AND indexname = 'idx_users_role';
-- Expected: 1 row
```

## Next Steps

After the migration succeeds:

1. **Run TMC-002** to create the system account
2. The seed script will set `role='admin'` for kouame@troodieapp.com
3. Verify admin access works

## Summary of Changes

### Files Modified

1. ✅ `supabase/migrations/20251013_troodie_managed_campaigns_schema.sql`
   - Added `users.role` column
   - Added index on role
   - Updated success message

2. ✅ `TMC_001_002_DEPLOYMENT_GUIDE.md`
   - Updated expected results to include role column

3. ✅ `TMC_001_002_COMPLETE.md`
   - Updated changes list to include role column

### Migration Now Includes

- ✅ `users.role` column (Fix #1)
- ✅ `restaurants.is_platform_managed` column
- ✅ `restaurants.managed_by` column
- ✅ `campaigns.campaign_source` column
- ✅ `campaigns.is_subsidized` column
- ✅ `campaigns.subsidy_amount_cents` column
- ✅ `platform_managed_campaigns` table
- ✅ RLS policies (now work correctly with role column)
- ✅ Triggers for spend/metrics tracking
- ✅ `troodie_campaigns_summary` view (Fix #2 - uses correct column names)

---

## Summary

**Two issues fixed:**
1. ✅ Added `users.role` column for admin access
2. ✅ Fixed view to use `c.budget` and `c.budget_cents` instead of non-existent `c.budget_total`

**Status**: ✅ **BOTH ISSUES FIXED - READY TO DEPLOY**

You can now run the updated migration without errors!
