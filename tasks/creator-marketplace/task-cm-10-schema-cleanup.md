# Task CM-10: Creator Profile Schema Cleanup

**Priority:** 🟡 P2 - Medium
**Severity:** Low
**Feature:** Database Schema
**Estimated Effort:** 2-3 hours
**Status:** Not Started
**Related Audit:** `.tasks/creator-marketplace-audit-findings.md` - Section 5

---

## Problem Statement

The `creator_profiles` table contains several columns that were added speculatively but are not used anywhere in the UI. These columns add confusion to the schema and could mislead future developers into thinking they need to populate them.

After deep analysis from both creator and business perspectives, we've determined that 3 columns should be removed as they provide no value.

---

## Columns to Remove

### 1. `persona` (VARCHAR(100))

**What it was:** A text label like "Food Critic", "Lifestyle Blogger"

**Why Remove:**
- Redundant with `bio` + `specialties[]`
- Too subjective and inconsistent across users
- Adds onboarding friction without differentiation
- Businesses care about metrics and content, not self-assigned labels

### 2. `collab_types` (TEXT[])

**What it was:** Array like `["sponsored_posts", "reviews", "takeovers", "events"]`

**Why Remove:**
- Already handled at application time when creator selects deliverables
- Profile-level is hypothetical ("I *could* do events")
- Application-level is concrete ("I *will* create 2 Instagram Reels")
- Most food creators do similar things anyway

### 3. `preferred_compensation` (TEXT[])

**What it was:** Array like `["cash", "free_meal", "gift_card"]`

**Why Remove:**
- Compensation is campaign-specific, not profile-specific
- A creator might accept free meal for small local spot but want cash for chains
- Already handled via campaign `budget_cents` + creator's `proposed_rate_cents`
- Would create race-to-the-bottom dynamic if used for filtering

---

## Columns to Keep

### For Future Implementation

| Column | Purpose | Future Use |
|--------|---------|------------|
| `featured_at` | When creator was featured | "Creator Spotlight" feature |
| `search_rank` | Manual ranking override | Admin curation tool |

These can remain in the schema for future features but should not be exposed in UI yet.

---

## Technical Requirements

### Migration File

Create: `supabase/migrations/YYYYMMDD_cleanup_creator_profiles_columns.sql`

```sql
-- ============================================================================
-- Cleanup unused creator_profiles columns
-- ============================================================================
-- Removes columns that were added speculatively but provide no value
-- See: .tasks/creator-marketplace-audit-findings.md Section 5
-- Date: YYYY-MM-DD
-- ============================================================================

-- Drop unused columns
ALTER TABLE creator_profiles
DROP COLUMN IF EXISTS persona,
DROP COLUMN IF EXISTS collab_types,
DROP COLUMN IF EXISTS preferred_compensation;

-- Add comment explaining remaining future columns
COMMENT ON COLUMN creator_profiles.featured_at IS
'Reserved for future "Creator Spotlight" feature - not currently used';

COMMENT ON COLUMN creator_profiles.search_rank IS
'Reserved for future admin curation tool - not currently used';
```

---

## Pre-Migration Checklist

Before running migration, verify no code references these columns:

```bash
# Search for column usage
grep -r "persona" --include="*.ts" --include="*.tsx" services/ app/ components/
grep -r "collab_types" --include="*.ts" --include="*.tsx" services/ app/ components/
grep -r "preferred_compensation" --include="*.ts" --include="*.tsx" services/ app/ components/
```

**Expected Result:** No matches in application code. Only migration files should reference these.

---

## Testing Requirements

1. **Pre-migration:**
   - Run search to confirm no code dependencies
   - Backup production data (if any exists in these columns)

2. **Post-migration:**
   - Verify `creator_profiles` table still works
   - Test creator onboarding flow
   - Test creator profile edit
   - Test browse creators
   - Verify no TypeScript errors

---

## Acceptance Criteria

- [ ] Migration file created
- [ ] Verified no code references these columns
- [ ] Migration tested on development database
- [ ] Creator onboarding still works
- [ ] Creator profile edit still works
- [ ] Browse creators still works
- [ ] No TypeScript errors
- [ ] Migration ready for production

---

## Rollback Plan

If issues arise:

```sql
-- Restore columns
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS persona VARCHAR(100),
ADD COLUMN IF NOT EXISTS collab_types TEXT[],
ADD COLUMN IF NOT EXISTS preferred_compensation TEXT[];
```

---

## Related Files

- `supabase/migrations/20250122_creator_profiles_discovery.sql` - Original schema
- `services/creatorDiscoveryService.ts` - Service layer
- `app/creator/profile/edit.tsx` - Edit profile UI
- `components/creator/CreatorOnboardingV1.tsx` - Onboarding UI

---

## Notes

- This is a cleanup task, not a feature
- Low risk - removing unused columns
- Should be done before adding new schema features
- Future columns (`featured_at`, `search_rank`) deliberately kept for planned features
