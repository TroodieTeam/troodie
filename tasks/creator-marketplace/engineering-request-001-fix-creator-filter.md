# Engineering Request #001: Fix Creator Discovery Filter

**Priority:** 🔴 P0 - Critical  
**Severity:** Critical  
**Feature:** CM-9 (Browse Creators)  
**Estimated Effort:** 1 hour  
**Status:** Not Started

---

## Problem Statement

The `get_creators()` database function currently does NOT filter by `account_type = 'creator'`. It only checks `open_to_collabs = true`, which could potentially include any user who has a `creator_profiles` record, even if they are not actually a creator account type.

**Impact:**
- Business owners may see and contact users who are not actually creators
- Leads to confusion and poor UX
- Data integrity issue that could cause downstream problems

---

## Current Implementation

**Location:** `supabase/migrations/20250122_creator_profiles_discovery.sql:126`

**Current Code:**
```sql
WHERE cp.open_to_collabs = true
```

The function joins `creator_profiles` with `users` but doesn't filter by `account_type`.

---

## Technical Requirements

### Database Changes

1. **Update `get_creators()` function** to include `account_type` filter
2. **Ensure proper join** with `users` table to access `account_type` field
3. **Maintain backward compatibility** - function signature should not change

### Required Fix

**File:** `supabase/migrations/20250122_creator_profiles_discovery.sql` (or create new migration)

**Change Required:**
```sql
WHERE cp.open_to_collabs = true
  AND u.account_type = 'creator'
```

**Full Function Context:**
The function already joins `users` table:
```sql
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE cp.open_to_collabs = true
  AND u.account_type = 'creator'  -- ADD THIS LINE
```

---

## Implementation Details

### Migration File

Create new migration: `supabase/migrations/20250122_fix_get_creators_account_type.sql`

```sql
-- ============================================================================
-- Fix get_creators() function to filter by account_type
-- ============================================================================
-- Issue: Function was not filtering by account_type = 'creator'
-- Impact: Non-creator users could appear in browse creators results
-- Date: 2025-01-22
-- ============================================================================

CREATE OR REPLACE FUNCTION get_creators(
  p_city TEXT DEFAULT NULL,
  p_min_followers INTEGER DEFAULT NULL,
  p_min_engagement DECIMAL DEFAULT NULL,
  p_collab_types TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  bio TEXT,
  location TEXT,
  avatar_url TEXT,
  total_followers INTEGER,
  troodie_engagement_rate DECIMAL,
  open_to_collabs BOOLEAN,
  specialties TEXT[],
  sample_posts JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.user_id,
    COALESCE(cp.display_name, u.name, u.username) as display_name,
    cp.bio,
    cp.location,
    u.avatar_url,
    cp.total_followers,
    cp.troodie_engagement_rate,
    cp.open_to_collabs,
    cp.specialties,
    (
      SELECT COALESCE(json_agg(sample ORDER BY sample.rank), '[]'::json)
      FROM (
        SELECT 
          post_id, 
          caption, 
          image_url, 
          likes_count, 
          restaurant_name, 
          rank
        FROM creator_sample_posts
        WHERE creator_profile_id = cp.id AND rank <= 3
      ) sample
    ) as sample_posts
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE cp.open_to_collabs = true
    AND u.account_type = 'creator'  -- FIX: Add account_type filter
    AND (p_city IS NULL OR LOWER(cp.location) LIKE LOWER('%' || p_city || '%'))
    AND (p_min_followers IS NULL OR cp.total_followers >= p_min_followers)
    AND (p_min_engagement IS NULL OR cp.troodie_engagement_rate >= p_min_engagement)
    AND (p_collab_types IS NULL OR cp.collab_types && p_collab_types)
  ORDER BY
    cp.featured_at DESC NULLS LAST,
    cp.troodie_engagement_rate DESC,
    cp.total_followers DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_creators IS
'Returns filtered list of creators open to collaborations with sample posts. Only includes users with account_type = ''creator''.';
```

---

## Testing Requirements

### Unit Tests

1. **Test that non-creator users are excluded:**
   ```sql
   -- Create test user with account_type = 'business'
   -- Create creator_profiles record for that user
   -- Call get_creators()
   -- Verify user does NOT appear in results
   ```

2. **Test that creator users are included:**
   ```sql
   -- Create test user with account_type = 'creator'
   -- Create creator_profiles record with open_to_collabs = true
   -- Call get_creators()
   -- Verify user DOES appear in results
   ```

3. **Test that existing filters still work:**
   - City filter
   - Min followers filter
   - Min engagement filter
   - Collab types filter

### Integration Tests

1. **Test Browse Creators screen:**
   - Verify only creators appear in list
   - Verify business users do not appear
   - Verify filters still work correctly

2. **Test edge cases:**
   - User with `account_type = NULL` should not appear
   - User with `account_type = ''` should not appear
   - User with `open_to_collabs = false` should not appear (even if creator)

---

## Acceptance Criteria

- [ ] Migration file created and tested
- [ ] `get_creators()` function updated with `account_type` filter
- [ ] Function signature unchanged (backward compatible)
- [ ] All existing tests pass
- [ ] New tests verify non-creator users are excluded
- [ ] Browse Creators screen only shows actual creators
- [ ] No performance regression (function execution time)
- [ ] Migration applied to development database
- [ ] Migration ready for production deployment

---

## Rollback Plan

If issues arise, rollback migration:

```sql
-- Restore original function without account_type filter
CREATE OR REPLACE FUNCTION get_creators(...)
-- (original implementation)
```

---

## Related Files

- `supabase/migrations/20250122_creator_profiles_discovery.sql` - Original function
- `services/creatorDiscoveryService.ts` - Service that calls this function
- `app/(tabs)/business/creators/browse.tsx` - UI that uses this data

---

## Notes

- This is a data integrity fix, not a feature addition
- Should be deployed immediately before production launch
- Low risk change - only adds a filter condition
- No UI changes required

