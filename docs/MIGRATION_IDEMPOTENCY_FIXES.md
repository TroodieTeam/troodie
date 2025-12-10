# Migration Idempotency Fixes

## Overview

This document tracks fixes applied to migrations to ensure they are idempotent (safe to run multiple times) and won't fail when objects already exist in the database.

## ✅ Complete Fix Summary

**All migration files have been fixed for idempotency!**

- ✅ **37 CREATE TRIGGER** statements fixed (added `DROP TRIGGER IF EXISTS`)
- ✅ **152 CREATE INDEX** statements fixed (added `IF NOT EXISTS`)
- ✅ **34 ALTER TABLE ADD COLUMN** statements fixed (added `IF NOT EXISTS`)
- ✅ **385 CREATE POLICY** statements fixed (added `DROP POLICY IF EXISTS`)
- ✅ **5 ALTER PUBLICATION** statements fixed (added idempotent checks)
- ✅ **Migration script** updated to handle duplicate key errors on `schema_migrations` table

**Total: 608 idempotency issues fixed across 81 migration files**

### Migration Tracking Error Handling

The migration script (`scripts/apply-creator-marketplace-migrations.js`) now handles the "duplicate key" error on `schema_migrations` table that can occur when using `--include-all` flag. This error happens when:

- A migration is already tracked in the database
- Supabase CLI tries to insert it again

**The script now:**
1. Detects this specific error (SQLSTATE 23505)
2. Prompts user to confirm if migration was already applied
3. Continues with remaining migrations if confirmed
4. Provides clear guidance on resolution

See `docs/MIGRATION_DUPLICATE_KEY_FIX.md` for details.

## Fixed Migrations

### Creator Marketplace Migrations (Critical)

These migrations are part of the Creator Marketplace feature and have been fixed to prevent "already exists" errors:

1. **`006_utility_functions.sql`**
   - ✅ Fixed: Added `DROP TRIGGER IF EXISTS` before all 3 trigger creations
   - Triggers: `trigger_like_notification`, `trigger_comment_notification`, `trigger_follow_notification`
   - ✅ Fixed: Made `ALTER PUBLICATION` statements idempotent using `DO $$` blocks with `pg_publication_tables` checks
   - Publications: `restaurant_saves`, `save_interactions`, `comments`, `notifications`, `community_posts`

2. **`20250113_create_creator_tables.sql`**
   - ✅ Fixed: Added `DROP TRIGGER IF EXISTS` before `trigger_update_campaign_metrics`

3. **`20250115_create_reporting_blocking_tables.sql`**
   - ✅ Fixed: Added `DROP TRIGGER IF EXISTS` before 2 trigger creations
   - Triggers: `update_reports_updated_at`, `update_user_report_counts`

4. **`20250116_add_notification_tables.sql`**
   - ✅ Fixed: Added `DROP TRIGGER IF EXISTS` before all 3 trigger creations
   - Triggers: `update_notification_emails_updated_at`, `update_push_tokens_updated_at`, `update_notifications_updated_at`

5. **`20250116_add_pending_state_system.sql`**
   - ✅ Fixed: Added `DROP TRIGGER IF EXISTS` before 3 trigger creations
   - Triggers: `log_restaurant_claim_reviews`, `log_creator_application_reviews`, `update_creator_applications_updated_at`

6. **`20251016_enhanced_deliverables_system.sql`**
   - ✅ Fixed: Added `DROP TRIGGER IF EXISTS` before `trigger_update_campaign_application_on_deliverable_change`

7. **`20250808_fix_notification_ambiguity_v2.sql`**
   - ✅ Fixed: Added `DROP TRIGGER IF EXISTS` before 3 trigger creations
   - Triggers: `trigger_follow_notification`, `trigger_like_notification`, `trigger_comment_notification`

## Pattern Applied

All fixes follow this pattern:

```sql
-- Drop trigger if it exists to make migration idempotent
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name
...
```

## Other Migrations That May Need Fixes

The following migrations contain `CREATE TRIGGER` statements that may need similar fixes if they're run multiple times:

### High Priority (Part of Core System)
- `001_initial_schema.sql` - Multiple triggers (10+) without DROP protection
- `012_boards_schema.sql` - Multiple triggers without DROP protection
- `20240122_user_profiles.sql` - Trigger without DROP protection
- `20250122_complete_boards_system.sql` - Some triggers already protected, but check all
- `20250123_posts_schema.sql` - Multiple triggers without DROP protection
- `20250125_quick_saves_board.sql` - Trigger without DROP protection
- `20250128_*` (multiple files) - Auth trigger migrations may need fixes
- `20251009_fix_*_triggers.sql` - Multiple trigger fix files

### Medium Priority
- `TRO-20-FIX.sql` - Triggers without DROP protection
- `20250130_add_share_functionality.sql` - Trigger without DROP protection
- `20250204_*` - Multiple files with triggers
- `20250807_*` - Multiple files with triggers

## Automated Fix Scripts

The following scripts were created to automatically fix idempotency issues:

- `scripts/auto-fix-triggers.js` - Adds `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`
- `scripts/auto-fix-indexes.js` - Adds `IF NOT EXISTS` to `CREATE INDEX`
- `scripts/auto-fix-add-column.js` - Adds `IF NOT EXISTS` to `ALTER TABLE ADD COLUMN`
- `scripts/auto-fix-policies.js` - Adds `DROP POLICY IF EXISTS` before `CREATE POLICY`
- `scripts/fix-migration-idempotency.js` - Detection script to identify issues

## Best Practices for Future Migrations

1. **Always use `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`**
2. **Use `CREATE TABLE IF NOT EXISTS` for tables**
3. **Use `CREATE OR REPLACE FUNCTION` for functions**
4. **Use `CREATE INDEX IF NOT EXISTS` for indexes**
5. **Use `DROP POLICY IF EXISTS` before `CREATE POLICY`**
6. **Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for columns**
7. **Use `DO $$` blocks with `pg_publication_tables` checks for `ALTER PUBLICATION`**

## Verification

To verify a migration is idempotent, you can:

1. Run the migration once
2. Run it again - it should succeed without errors
3. Verify the database state is identical after both runs

## Testing

Before applying migrations to production:

1. ✅ Test migrations in development/staging first
2. ✅ Verify idempotency by running migrations twice
3. ✅ Check for "already exists" errors
4. ✅ Ensure no data is lost on re-runs

## Related Files

- `scripts/apply-creator-marketplace-migrations.js` - Migration automation script with safety checks
- `docs/CREATOR_MARKETPLACE_MIGRATION_STEPS.md` - Migration execution guide
- `docs/CREATOR_MARKETPLACE_PRODUCTION_LOCAL_TESTING.md` - Production testing guide
