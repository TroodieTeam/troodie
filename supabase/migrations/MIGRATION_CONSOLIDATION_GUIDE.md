# Migration Consolidation Guide

## Current State
- **Total migrations**: 108 files
- **Issue**: Too many small migrations, hotfixes, and debug files
- **Impact**: Slow setup for new environments, difficult to track schema state

## Best Practices for Migration Consolidation

### 1. When to Consolidate
- ✅ **Before major releases** (like v1.0)
- ✅ **When setting up fresh environments** (staging, new dev)
- ✅ **After accumulating 50+ migrations**
- ❌ **Never** on production databases with data
- ❌ **Never** if other developers are using the current migrations

### 2. Consolidation Strategy

#### Option A: Full Schema Snapshot (Recommended for v1.0)
Best for: Clean slate, production deployment

**Steps:**
1. Export current schema from production
2. Create single consolidated migration
3. Archive old migrations
4. Use consolidated schema for new environments

#### Option B: Squash Related Migrations
Best for: Ongoing development, keeping history

**Steps:**
1. Group related migrations by feature
2. Merge fixes into base migrations
3. Remove debug/temp migrations
4. Keep consolidation reversible

### 3. Migration Categories (Current State)

#### Core Schema (Keep)
- `001_initial_schema.sql` - Base tables
- `003_row_level_security.sql` - Security policies
- `004_utility_functions.sql` - Helper functions

#### Feature Migrations (Consolidate by feature)
- **Boards System**: 12 migrations → 1 consolidated
- **Posts System**: 15 migrations → 1 consolidated
- **Communities**: 10 migrations → 1 consolidated
- **Notifications**: 8 migrations → 1 consolidated
- **Creator/Business**: 6 migrations → 1 consolidated
- **Storage/Media**: 8 migrations → 1 consolidated

#### Hotfixes/Debug (Remove)
- Test data files (create_test_*.sql)
- Debug files (debug_*.sql)
- Duplicate HOTFIX files
- Temporary bypass files

## Recommended Approach for Production

### Phase 1: Create Consolidated Schema (Now)
```bash
# Export current production schema
pg_dump --schema-only --no-owner --no-privileges \
  -h db.tcultsriqunnxujqiwea.supabase.co \
  -U postgres \
  -d postgres > supabase/consolidated_schema_v1.0.sql
```

### Phase 2: Clean for Fresh Installs
Create a new migrations folder structure:
```
supabase/
├── migrations/
│   ├── 00000000000000_consolidated_schema_v1.0.sql  # Full schema
│   └── [future migrations go here]
└── migrations_archive/
    └── [all 108 old migrations moved here]
```

### Phase 3: Document Migration State
Create `MIGRATION_MANIFEST.md` tracking:
- What was consolidated
- When it was consolidated
- Hash of production schema
- Rollback plan

## Implementation Script

I'll create a script to automate this consolidation.

## Important Notes

### ⚠️ Critical Warnings
1. **Never consolidate on existing production databases**
   - Consolidation is for NEW environments only
   - Production continues using existing migrations

2. **Keep old migrations archived**
   - Don't delete them
   - You may need them for debugging
   - Git history must be preserved

3. **Test consolidated schema**
   - Test on fresh database
   - Verify all features work
   - Check all RLS policies
   - Validate all functions

### ✅ Safe Consolidation Checklist
- [ ] Production schema exported
- [ ] Consolidated schema tested on fresh DB
- [ ] All RLS policies verified
- [ ] All functions/triggers work
- [ ] Storage buckets configured
- [ ] Old migrations archived (not deleted)
- [ ] Documentation updated
- [ ] Team notified of changes

## File Cleanup Recommendations

### Remove Immediately (No Data Impact)
```bash
# Test/debug files that should not be in migrations/
rm create_test_board_invitation.sql
rm debug_board_invitations.sql
rm HOTFIX_board_invitations_table_name.sql  # Duplicate
```

### Consolidate These Groups
1. **Board Invitations** (5 files → 1)
   - 20251001_critical_fixes.sql (board_invitations table)
   - 20251008_fix_board_invitations_rls.sql
   - 20251008_fix_board_invitations_rls_v2.sql
   - 20251008_hotfix_board_invitations_table_name.sql
   - 20251008_temp_bypass_notifications_rls.sql

2. **Notifications** (8 files → 1)
   - All fix_notification* files

3. **Posts Schema** (15 files → 1)
   - All posts-related migrations

## Next Steps

1. Review this consolidation guide
2. Decide: Full consolidation or selective cleanup?
3. Run consolidation script (I'll create this)
4. Test consolidated schema
5. Archive old migrations
6. Update documentation
