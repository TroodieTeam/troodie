# TMC-001 & TMC-002 Deployment Guide

## Overview

This guide walks you through deploying the Troodie-Managed Campaigns feature, specifically:
- **TMC-001**: Database schema migration
- **TMC-002**: System account creation (kouame@troodieapp.com)

---

## Prerequisites

✅ All files are ready:
- ` supabase/migrations/20251013_troodie_managed_campaigns_schema.sql` (TMC-001)
- `supabase/seeds/create_troodie_system_account.sql` (TMC-002)
- `constants/systemAccounts.ts` (updated with kouame@troodieapp.com)

---

## Deployment Steps

### Step 1: Apply TMC-001 Migration (Database Schema)

You have **3 options** to apply the migration. Choose the one that works best for you:

#### Option A: Supabase Dashboard SQL Editor (Recommended)

1. **Open SQL Editor**
   - Go to: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new

2. **Copy Migration SQL**
   - Open: `supabase/migrations/20251013_troodie_managed_campaigns_schema.sql`
   - Copy the entire file contents

3. **Run in Dashboard**
   - Paste the SQL into the SQL Editor
   - Click "Run" or press `Cmd/Ctrl + Enter`
   - Wait for success message

4. **Verify Success**
   - You should see: `✅ TROODIE-MANAGED CAMPAIGNS SCHEMA CREATED SUCCESSFULLY!`
   - Check for any errors in the output

#### Option B: Use Bash Deployment Script

```bash
chmod +x deploy-tmc-001-002.sh
./deploy-tmc-001-002.sh
```

Follow the interactive prompts. This will:
- Verify prerequisites
- Run `supabase db push` (or `npx supabase db push`)
- Guide you through TMC-002

#### Option C: Use psql (If you have DB password)

```bash
psql "postgresql://postgres:[YOUR_PASSWORD]@db.tcultsriqunnxujqiwea.supabase.co:5432/postgres" \
  -f supabase/migrations/20251013_troodie_managed_campaigns_schema.sql
```

Replace `[YOUR_PASSWORD]` with your Supabase database password.

---

### Step 2: Apply TMC-002 Seed (System Account)

After TMC-001 is successfully applied, create the system account:

#### Option A: Supabase Dashboard SQL Editor (Recommended)

1. **Open SQL Editor**
   - Go to: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new

2. **Copy Seed SQL**
   - Open: `supabase/seeds/create_troodie_system_account.sql`
   - Copy the entire file contents

3. **Run in Dashboard**
   - Paste the SQL into the SQL Editor
   - Click "Run"
   - Wait for success notices

4. **Verify Success**
   - You should see notices like:
     - `Created/updated Troodie system user: 00000000-0000-0000-0000-000000000001`
     - `Created/updated Troodie official restaurant: 00000000-0000-0000-0000-000000000002`
     - `✅ TROODIE SYSTEM ACCOUNT CREATED SUCCESSFULLY!`

#### Option B: Use psql

```bash
psql "postgresql://postgres:[YOUR_PASSWORD]@db.tcultsriqunnxujqiwea.supabase.co:5432/postgres" \
  -f supabase/seeds/create_troodie_system_account.sql
```

---

### Step 3: Create Auth User (Manual Step Required)

**IMPORTANT**: The seed script creates the user profile, but you must manually create the auth.users record.

1. **Go to Auth Dashboard**
   - URL: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/auth/users

2. **Create New User**
   - Click "Add User" → "Create new user"
   - **Email**: `kouame@troodieapp.com`
   - **Password**: Set a secure password (save it somewhere safe!)
   - Click "Create user"

3. **Update User ID (Critical!)**

   The user ID **must** be `00000000-0000-0000-0000-000000000001` to match the profile.

   After creating the user, go back to SQL Editor and run:

   ```sql
   -- Update the auth user ID to match our fixed UUID
   UPDATE auth.users
   SET id = '00000000-0000-0000-0000-000000000001'
   WHERE email = 'kouame@troodieapp.com';

   -- Verify it worked
   SELECT id, email, created_at
   FROM auth.users
   WHERE email = 'kouame@troodieapp.com';
   ```

   You should see the ID as `00000000-0000-0000-0000-000000000001`.

---

### Step 4: Verify Deployment

Run these verification queries in the Supabase SQL Editor:

```sql
-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check system user profile
SELECT id, email, username, account_type, role, is_verified, created_at
FROM users
WHERE email = 'kouame@troodieapp.com';
-- Expected: 1 row with role='admin', account_type='business', is_verified=true

-- 2. Check Troodie restaurant
SELECT id, name, is_platform_managed, managed_by, created_at
FROM restaurants
WHERE is_platform_managed = true;
-- Expected: 1 row with name='Troodie Community', managed_by='troodie'

-- 3. Check business profile linkage
SELECT user_id, restaurant_id, position, can_create_campaigns, verified_owner
FROM business_profiles
WHERE user_id = '00000000-0000-0000-0000-000000000001';
-- Expected: 1 row linking user to restaurant

-- 4. Check platform_managed_campaigns table exists
SELECT COUNT(*) as table_exists
FROM information_schema.tables
WHERE table_name = 'platform_managed_campaigns';
-- Expected: 1 (table exists)

-- 5. Check new columns on restaurants table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'restaurants'
AND column_name IN ('is_platform_managed', 'managed_by');
-- Expected: 2 rows

-- 6. Check new columns on campaigns table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'campaigns'
AND column_name IN ('campaign_source', 'is_subsidized', 'subsidy_amount_cents');
-- Expected: 3 rows

-- 7. Check RLS policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'platform_managed_campaigns';
-- Expected: 2 rows (view and manage policies)

-- 8. Check triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_update_platform_spend', 'trigger_update_platform_metrics');
-- Expected: 2 rows

-- 9. Check view exists
SELECT COUNT(*) as view_exists
FROM information_schema.views
WHERE table_name = 'troodie_campaigns_summary';
-- Expected: 1 (view exists)
```

---

## Expected Results

After successful deployment, you should have:

### ✅ Database Schema (TMC-001)
- [x] `users.role` column (for admin access)
- [x] `restaurants.is_platform_managed` column
- [x] `restaurants.managed_by` column
- [x] `campaigns.campaign_source` column (with check constraint)
- [x] `campaigns.is_subsidized` column
- [x] `campaigns.subsidy_amount_cents` column
- [x] `platform_managed_campaigns` table
- [x] RLS policies on `platform_managed_campaigns` (admin-only)
- [x] Triggers for automatic spend/metrics tracking
- [x] `troodie_campaigns_summary` view
- [x] Indexes for performance

### ✅ System Account (TMC-002)
- [x] User profile: `00000000-0000-0000-0000-000000000001`
  - Email: kouame@troodieapp.com
  - Username: troodie_official
  - Role: admin
  - Account type: business
- [x] Restaurant: `00000000-0000-0000-0000-000000000002`
  - Name: Troodie Community
  - is_platform_managed: true
  - managed_by: troodie
- [x] Business profile linking user to restaurant
- [x] Auth user record with matching UUID

---

## Troubleshooting

### Error: "relation already exists"

**Cause**: Columns or tables already exist (possibly from a previous attempt)

**Solution**: The SQL uses `IF NOT EXISTS` and `ON CONFLICT`, so it should be safe to re-run. If errors persist, you can manually drop and recreate:

```sql
-- Only if needed - this will delete data!
DROP TABLE IF EXISTS platform_managed_campaigns CASCADE;
ALTER TABLE restaurants DROP COLUMN IF EXISTS is_platform_managed;
ALTER TABLE restaurants DROP COLUMN IF EXISTS managed_by;
ALTER TABLE campaigns DROP COLUMN IF EXISTS campaign_source;
ALTER TABLE campaigns DROP COLUMN IF EXISTS is_subsidized;
ALTER TABLE campaigns DROP COLUMN IF EXISTS subsidy_amount_cents;

-- Then re-run the migration
```

### Error: "User already exists with different ID"

**Cause**: You created the user before, and it has a different UUID

**Solution**: Either:
1. Delete the existing user and recreate with the correct UUID
2. Update the UUID using the SQL in Step 3

### Error: "Permission denied for table platform_managed_campaigns"

**Cause**: User doesn't have admin role

**Solution**: Verify the user's role:

```sql
SELECT id, email, role FROM users WHERE email = 'kouame@troodieapp.com';
-- Should show role='admin'

-- If not, update it:
UPDATE users SET role = 'admin' WHERE email = 'kouame@troodieapp.com';
```

### Can't access Supabase Dashboard

**Cause**: Need project permissions

**Solution**: Ask project owner to add you as a collaborator:
- Project Settings → Team → Add member

---

## Testing the Deployment

Once deployed, you can test by logging into the app:

1. **Login as Admin**
   - Email: kouame@troodieapp.com
   - Password: (the one you set in Step 3)

2. **Verify Admin Access**
   - Check that user has admin permissions
   - Verify can access admin-only features

3. **Test Campaign Creation** (After TMC-003 UI is built)
   - Create a test platform-managed campaign
   - Verify budget tracking works
   - Check that triggers update spend automatically

---

## Next Steps

After successful deployment:

1. ✅ **TMC-001 Complete**: Database schema ready
2. ✅ **TMC-002 Complete**: System account created
3. ⏭️ **TMC-003**: Build Admin Campaign Creation UI
4. ⏭️ **TMC-004**: Update Creator Campaign Browsing
5. ⏭️ **TMC-005**: Build Budget Analytics Dashboard
6. ⏭️ **TMC-006**: Integrate Deliverables Review
7. ⏭️ **TMC-007**: Testing & Production Deployment

See `IMPLEMENTATION_GUIDE.md` for detailed next steps.

---

## Documentation

- **Full Index**: `TROODIE_MANAGED_CAMPAIGNS_INDEX.md`
- **Implementation Guide**: `IMPLEMENTATION_GUIDE.md`
- **PRD**: `TROODIE_MANAGED_CAMPAIGNS_PRD.md`
- **Testing Guide**: `TROODIE_MANAGED_CAMPAIGNS_MANUAL_TESTING_GUIDE.md`
- **Executive Summary**: `TROODIE_MANAGED_CAMPAIGNS_EXECUTIVE_SUMMARY.md`

---

## Support

If you encounter issues:

1. Check verification queries (Step 4)
2. Review troubleshooting section
3. Check Supabase logs: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/logs
4. Review migration SQL comments for hints

---

**Status**: ✅ Ready to Deploy

**Last Updated**: October 13, 2025

**Admin Email**: kouame@troodieapp.com
