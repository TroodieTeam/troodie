# Creator Marketplace - Production Migration Steps

## Quick Reference: Run All Migrations

### Automated Method (Recommended)

**Using Supabase CLI:**

```bash
# 1. Install Supabase CLI (if not already installed)
brew install supabase/tap/supabase

# 2. Login to Supabase
supabase login

# 3. Link to production project
supabase link --project-ref YOUR_PROJECT_REF

# 4. Apply all migrations automatically
supabase db push --linked
```

**Or use the automated script:**

```bash
# Run the migration automation script
npm run prod:migrate:cm -- --project-ref YOUR_PROJECT_REF

# Or directly:
node scripts/apply-creator-marketplace-migrations.js --project-ref YOUR_PROJECT_REF

# Dry-run to see what would be applied:
node scripts/apply-creator-marketplace-migrations.js --dry-run
```

**Note:** Supabase CLI applies migrations in timestamp order (filename order), so ensure your migration files follow the naming convention: `YYYYMMDD_description.sql`

### Manual Method (Alternative)

If you prefer manual control or CLI isn't available, copy and run each migration file in **Supabase SQL Editor (Production)** in the exact order listed below.

---

## Pre-Flight Checklist

### ⚠️ CRITICAL: Backup Production First

**MANDATORY:** Create a backup before running any migrations!

```bash
# Option 1: Supabase Dashboard (Recommended)
# 1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/settings/database
# 2. Click "Create Backup"
# 3. Wait for backup to complete

# Option 2: Point-in-Time Recovery (if available on your plan)
# Check Supabase Dashboard → Database → Backups
```

**The automated script will verify backup before proceeding.**

### Pre-Flight Checklist

- [ ] **MANDATORY:** Backup production database (see above)
- [ ] Note current timestamp: `SELECT NOW();`
- [ ] Record data counts: `SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM posts;` etc.
- [ ] Verify you're in the PRODUCTION Supabase project
- [ ] Verify migrations use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` (script checks this)

---

## Migration Execution Order

### Phase 1: Foundation Tables (If Not Already Deployed)

Check if these exist first:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('creator_profiles', 'campaigns', 'campaign_applications');
```

If missing, run in order:

| # | File | Purpose |
|---|------|---------|
| 1 | `20250113_create_creator_tables.sql` | Core creator tables | done
| 2 | `20250113_fix_creator_profiles_rls.sql` | RLS policies | done
| 3 | `20250911000001_add_account_type_system.sql` | Account type system | done
| 4 | `20250911000002_add_creator_onboarding_tables.sql` | Portfolio & claims | done
| 5 | `20250913_creator_marketplace_business.sql` | Business tables | done
| 6 | `20250913_creator_marketplace_business_fixed.sql` | Fixes | done

### Phase 2: Campaign & Deliverables System

| # | File | Purpose |
|---|------|---------|
| 7 | `20251013_campaign_deliverables_schema.sql` | Deliverable tracking | done
| 8 | `20251013_campaign_deliverables_schema_fixed.sql` | Schema fixes | done
| 9 | `20251013_troodie_managed_campaigns_schema.sql` | Platform campaigns | done
| 10 | `20251016_enhanced_deliverables_system.sql` | Enhanced workflow |
| 11 | `20250116_add_pending_state_system.sql` | Review workflow |
| 12 | `20250116_fix_campaign_deliverables_rls.sql` | RLS fixes |
| 13 | `20251020_fix_campaign_applications_update_policy.sql` | Policy fixes |

### Phase 3: Creator Discovery (CM-9)

| # | File | Purpose |
|---|------|---------|
| 14 | `20250122_creator_profiles_discovery.sql` | Discovery features, get_creators() |
| 15 | `20250122_fix_get_creators_type_mismatch.sql` | Type mismatch fix |
| 16 | `20250122_fix_get_creators_account_type.sql` | **CRITICAL**: account_type filter |
| 17 | `20250122_cleanup_creator_profiles_columns.sql` | Schema cleanup |
| 18 | `20250122_add_creator_ratings.sql` | Rating system |

### Phase 4: Additional Features

| # | File | Purpose |
|---|------|---------|
| 19 | `20250122_add_draft_status_to_campaigns.sql` | Draft campaigns |
| 20 | `20250122_campaign_invitations.sql` | Invitation system |
| 21 | `20250122_restaurant_analytics.sql` | Analytics |
| 22 | `20250122_restaurant_editable_fields.sql` | Editable fields |
| 23 | `20250122_add_portfolio_video_support.sql` | Video support |
| 24 | `20250122_update_portfolio_function_for_videos.sql` | Video functions |
| 25 | `20250122_schedule_auto_approval_cron.sql` | Auto-approval cron |

### Phase 5: Atomic Creator Upgrade

| # | File | Purpose |
|---|------|---------|
| 26 | `20251201_atomic_creator_upgrade.sql` | Atomic onboarding |
| 27 | `20251201_portfolio_storage_bucket.sql` | Storage bucket |

### Phase 6: Test User Isolation (NEW - CRITICAL)

| # | File | Purpose |
|---|------|---------|
| 28 | `20250205_production_test_user_isolation.sql` | **Isolates test users from production** |

---

## Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your **PRODUCTION** project
3. Navigate to **SQL Editor**

### Step 2: Run Each Migration

For each migration file:

1. Open the file from `supabase/migrations/`
2. Copy the entire contents
3. Paste into SQL Editor
4. Click **Run**
5. Verify no errors in output
6. Check the "Results" tab shows success

### Step 3: Verify Each Phase

After Phase 1-2:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN (
  'creator_profiles', 'campaigns', 'campaign_applications',
  'campaign_deliverables', 'business_profiles'
);
-- Should return 5 rows
```

After Phase 3:
```sql
SELECT proname FROM pg_proc WHERE proname = 'get_creators';
-- Should return 1 row
```

After Phase 6:
```sql
SELECT proname FROM pg_proc
WHERE proname IN ('is_test_email', 'is_test_user', 'current_user_is_test');
-- Should return 3 rows
```

---

## Post-Migration: Set Up Production Test Users

After all migrations complete, run the production test users setup:

### Automated Method

```bash
npm run prod:setup:test-users

# Or directly:
node scripts/setup-production-test-users.js
```

### Manual Method

1. Open `data/test-data/prod/01-production-test-users-setup.sql`
2. Copy contents to SQL Editor
3. Run the query
4. Verify output shows accounts created

### Test Account Credentials

| Email | Type | OTP |
|-------|------|-----|
| `prod-consumer1@bypass.com` | Consumer | `000000` |
| `prod-creator1@bypass.com` | Creator | `000000` |
| `prod-business1@bypass.com` | Business | `000000` |

---

## Verification Checklist

After all migrations:

- [ ] Tables exist: `creator_profiles`, `campaigns`, `campaign_applications`
- [ ] Function exists: `get_creators()`
- [ ] Function exists: `is_test_email()`
- [ ] Column exists: `users.is_test_account`
- [ ] Test users created with `is_test_account = true`
- [ ] Production users don't see test creators in browse

```sql
-- Final verification query
SELECT
  (SELECT COUNT(*) FROM creator_profiles) as creator_profiles,
  (SELECT COUNT(*) FROM campaigns) as campaigns,
  (SELECT COUNT(*) FROM users WHERE is_test_account = true) as test_users,
  (SELECT COUNT(*) FROM users WHERE is_test_account IS NOT TRUE) as prod_users;
```

---

## Rollback (If Needed)

If something goes wrong with the test isolation migration:

```sql
-- Remove test account column
ALTER TABLE users DROP COLUMN IF EXISTS is_test_account;

-- Drop helper functions
DROP FUNCTION IF EXISTS is_test_email CASCADE;
DROP FUNCTION IF EXISTS is_test_user CASCADE;
DROP FUNCTION IF EXISTS current_user_is_test CASCADE;

-- Restore original get_creators (from 20250122_fix_get_creators_account_type.sql)
```

---

## File Locations

All migration files are in:
```
/Users/kndri/projects/troodie/supabase/migrations/
```

Production test data setup:
```
/Users/kndri/projects/troodie/data/test-data/prod/01-production-test-users-setup.sql
```

---

## Support

- Deployment Guide: `docs/CREATOR_MARKETPLACE_PRODUCTION_DEPLOYMENT.md`
- Testing Checklist: `docs/CREATOR_MARKETPLACE_PRODUCTION_TESTING_CHECKLIST.md`
- Test Data README: `data/test-data/prod/README.md`
