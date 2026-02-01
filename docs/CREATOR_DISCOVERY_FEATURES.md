# Creator Discovery Features - TRO-144 & TRO-145

**Branch:** `feature/creator-marketplace-enhancements`
**Date:** 2026-01-31

---

## Overview

This document covers two related features that enhance the creator discovery experience for business users:

| Ticket | Feature | Description |
|--------|---------|-------------|
| TRO-144 | Creator Stats Fields | Extended profile fields for social stats, persona, and compensation preferences |
| TRO-145 | Browse Creators Filters | Advanced filtering and sorting UI for browsing creators |

---

## Feature: TRO-144 - Creator Stats Fields

### Summary
Extends the `creator_profiles` table with additional fields to support richer creator profiles and better filtering capabilities.

### New Database Columns

| Column | Type | Description |
|--------|------|-------------|
| `primary_city` | VARCHAR(100) | Creator's primary operating city |
| `instagram_handle` | VARCHAR(100) | Instagram username (without @) |
| `instagram_engagement_rate` | DECIMAL(5,2) | Engagement rate as percentage |
| `instagram_last_post_date` | DATE | Most recent Instagram post date |
| `tiktok_handle` | VARCHAR(100) | TikTok username (without @) |
| `tiktok_engagement_rate` | DECIMAL(5,2) | Engagement rate as percentage |
| `tiktok_last_post_date` | DATE | Most recent TikTok post date |
| `persona` | VARCHAR(100) | Troodie persona from onboarding quiz |
| `preferred_compensation` | TEXT[] | Array of compensation types |
| `past_restaurant_collabs` | TEXT | Free text description of past collabs |
| `social_stats_verified` | BOOLEAN | Admin verification flag |
| `social_stats_verified_at` | TIMESTAMPTZ | Verification timestamp |

### Compensation Type Values
- `free` - Free collaborations
- `compensated_meals` - Comped meals only
- `pay_under_150` - Under $150
- `pay_150_500` - $150-$500
- `pay_over_500` - $500+

### Files Changed

**Service Layer:**
- `services/creatorDiscoveryService.ts` - Extended `CreatorProfile` interface with 13 new fields, added `updateCreatorStats()` function

**UI:**
- `app/creator/profile/edit.tsx` - Added social stats section (Instagram/TikTok handles, followers, engagement) and compensation preferences section
- `app/creator/[id]/index.tsx` - Added persona display under username, social stats display section

---

## Feature: TRO-145 - Browse Creators Filters

### Summary
Adds advanced filtering and sorting capabilities to the Browse Creators screen for business users.

### Filter Options

| Filter | Options |
|--------|---------|
| **Follower Buckets** | All, Under 5K, 5K-20K, 20K+ |
| **Compensation** | Free, Comp Meals, Under $150, $150-500, $500+ (multi-select) |
| **City** | Dropdown of cities with active creators |
| **Sort By** | Default (engagement), Recently Active, Followers High, Followers Low |

### UI Behavior
- Filter modal opens via funnel icon in header
- Local filter state allows users to configure before applying
- "Apply Filters" button commits changes and closes modal
- "Clear All Filters" resets to default state
- Active filter count indicator on filter button

### Files Changed

**Database:**
- `supabase/migrations/20260126_enhanced_get_creators.sql` - Enhanced `get_creators()` function with new parameters

**Service Layer:**
- `services/creatorDiscoveryService.ts` - Extended `CreatorFilters` interface, added `getFollowerRange()` helper, updated `getCreators()` to pass new params

**UI:**
- `app/(tabs)/business/creators/browse.tsx` - Full filter UI implementation with follower buckets, compensation multi-select, city dropdown, sort options

---

## Migrations Required for Production

### Migration Order
Run these migrations in timestamp order. Both use `IF NOT EXISTS` for safety.

### 1. TRO-144: Creator Stats Fields
**File:** `supabase/migrations/20260126_creator_stats_fields.sql`

```sql
-- Migration: Add creator stats fields for TRO-144
-- Description: Adds extended profile fields for creator discovery and filtering

-- Add primary city for location-based filtering
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS primary_city VARCHAR(100);

-- Add Instagram fields
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(100);

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS instagram_engagement_rate DECIMAL(5,2);

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS instagram_last_post_date DATE;

-- Add TikTok fields
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS tiktok_handle VARCHAR(100);

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS tiktok_engagement_rate DECIMAL(5,2);

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS tiktok_last_post_date DATE;

-- Add persona field (from onboarding quiz)
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS persona VARCHAR(100);

-- Add preferred compensation array
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS preferred_compensation TEXT[] DEFAULT '{}';

-- Add past collaborations free text field
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS past_restaurant_collabs TEXT;

-- Add verification fields for admin verification
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS social_stats_verified BOOLEAN DEFAULT false;

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS social_stats_verified_at TIMESTAMPTZ;

-- Create index for city-based filtering
CREATE INDEX IF NOT EXISTS idx_creator_profiles_primary_city
ON creator_profiles(primary_city)
WHERE primary_city IS NOT NULL;

-- Create index for compensation filtering
CREATE INDEX IF NOT EXISTS idx_creator_profiles_compensation
ON creator_profiles USING GIN(preferred_compensation);

-- Add comment for documentation
COMMENT ON COLUMN creator_profiles.primary_city IS 'Creator''s primary operating city for location-based matching';
COMMENT ON COLUMN creator_profiles.instagram_handle IS 'Instagram username without @';
COMMENT ON COLUMN creator_profiles.instagram_engagement_rate IS 'Instagram engagement rate as percentage (0.00-100.00)';
COMMENT ON COLUMN creator_profiles.instagram_last_post_date IS 'Date of most recent Instagram post';
COMMENT ON COLUMN creator_profiles.tiktok_handle IS 'TikTok username without @';
COMMENT ON COLUMN creator_profiles.tiktok_engagement_rate IS 'TikTok engagement rate as percentage (0.00-100.00)';
COMMENT ON COLUMN creator_profiles.tiktok_last_post_date IS 'Date of most recent TikTok post';
COMMENT ON COLUMN creator_profiles.persona IS 'Creator persona from Troodie onboarding quiz';
COMMENT ON COLUMN creator_profiles.preferred_compensation IS 'Array of compensation types: free, compensated_meals, pay_under_150, pay_150_500, pay_over_500';
COMMENT ON COLUMN creator_profiles.past_restaurant_collabs IS 'Free text description of past restaurant collaborations';
COMMENT ON COLUMN creator_profiles.social_stats_verified IS 'Whether admin has verified the social stats';
COMMENT ON COLUMN creator_profiles.social_stats_verified_at IS 'Timestamp when social stats were verified';
```

### 2. TRO-145: Enhanced get_creators() Function
**File:** `supabase/migrations/20260126_enhanced_get_creators.sql`

```sql
-- ============================================================================
-- TRO-145: Enhanced get_creators() function with advanced filtering and sorting
-- ============================================================================
-- Adds:
-- - Follower count range filtering (min/max for bucket support)
-- - Preferred compensation filtering
-- - Sort options: recently_active, followers_high, followers_low
-- - Returns new fields: preferred_compensation, instagram_handle, tiktok_handle, primary_city
-- Date: 2026-01-26
-- ============================================================================

-- Drop existing function first since we're changing parameters and return type
DROP FUNCTION IF EXISTS get_creators(text,integer,numeric,text[],integer,integer);

CREATE OR REPLACE FUNCTION get_creators(
  p_city TEXT DEFAULT NULL,
  p_min_followers INTEGER DEFAULT NULL,
  p_max_followers INTEGER DEFAULT NULL,           -- NEW: for bucket filtering
  p_min_engagement DECIMAL DEFAULT NULL,
  p_compensation_types TEXT[] DEFAULT NULL,        -- NEW: filter by compensation
  p_sort_by TEXT DEFAULT 'engagement',             -- NEW: sort option
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
  availability_status TEXT,
  specialties TEXT[],
  sample_posts JSON,
  -- TRO-144: New fields
  primary_city TEXT,
  instagram_handle TEXT,
  instagram_followers INTEGER,
  tiktok_handle TEXT,
  tiktok_followers INTEGER,
  preferred_compensation TEXT[],
  last_active_at TIMESTAMPTZ  -- For recently active sorting
) AS $$
DECLARE
  is_current_user_test BOOLEAN;
BEGIN
  -- Check if current user is a test user
  is_current_user_test := current_user_is_test();

  RETURN QUERY
  SELECT
    cp.id,
    cp.user_id,
    COALESCE(cp.display_name, u.name, u.username)::TEXT as display_name,
    cp.bio::TEXT,
    cp.location::TEXT,
    u.avatar_url::TEXT,
    cp.total_followers,
    cp.troodie_engagement_rate,
    cp.open_to_collabs,
    cp.availability_status::TEXT,
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
    ) as sample_posts,
    -- TRO-144: New fields
    cp.primary_city::TEXT,
    cp.instagram_handle::TEXT,
    cp.instagram_followers,
    cp.tiktok_handle::TEXT,
    cp.tiktok_followers,
    cp.preferred_compensation,
    u.updated_at as last_active_at  -- Use updated_at as proxy for last active
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE cp.open_to_collabs = true
    AND u.account_type = 'creator'
    AND (cp.availability_status = 'available' OR cp.availability_status = 'busy')
    -- TEST USER ISOLATION
    AND (
      is_current_user_test = true
      OR u.is_test_account IS NOT TRUE
    )
    -- City filter (check both location and primary_city)
    AND (p_city IS NULL
         OR LOWER(cp.location) LIKE LOWER('%' || p_city || '%')
         OR LOWER(cp.primary_city) LIKE LOWER('%' || p_city || '%'))
    -- Follower range filter
    AND (p_min_followers IS NULL OR cp.total_followers >= p_min_followers)
    AND (p_max_followers IS NULL OR cp.total_followers <= p_max_followers)
    -- Engagement filter
    AND (p_min_engagement IS NULL OR cp.troodie_engagement_rate >= p_min_engagement)
    -- Compensation filter (match any of the provided types)
    AND (p_compensation_types IS NULL
         OR p_compensation_types = '{}'::TEXT[]
         OR cp.preferred_compensation && p_compensation_types)
  ORDER BY
    CASE p_sort_by
      WHEN 'recentlyActive' THEN 1
      WHEN 'followersHigh' THEN 2
      WHEN 'followersLow' THEN 3
      ELSE 4  -- Default: engagement-based
    END,
    CASE WHEN p_sort_by = 'recentlyActive' THEN u.updated_at END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'followersHigh' THEN cp.total_followers END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'followersLow' THEN cp.total_followers END ASC NULLS LAST,
    -- Default sorting (when not using specific sort)
    CASE WHEN p_sort_by NOT IN ('recentlyActive', 'followersHigh', 'followersLow') THEN cp.featured_at END DESC NULLS LAST,
    CASE WHEN p_sort_by NOT IN ('recentlyActive', 'followersHigh', 'followersLow') THEN cp.troodie_engagement_rate END DESC,
    CASE WHEN p_sort_by NOT IN ('recentlyActive', 'followersHigh', 'followersLow') THEN cp.total_followers END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_creators IS
'TRO-145: Enhanced creator discovery with advanced filtering and sorting.
Filters: city, follower range (for buckets), compensation types.
Sort options: recentlyActive, followersHigh, followersLow, or default engagement-based.
Returns extended creator info including social handles and compensation preferences.';

GRANT EXECUTE ON FUNCTION get_creators TO authenticated;
```

---

## Manual Testing Procedures

### TRO-144: Creator Profile Edit

**Test 1: Social Stats**
1. Log in as a creator account
2. Navigate to Profile > Edit
3. Scroll to "Social Stats" section
4. Enter Instagram handle, followers, engagement rate
5. Enter TikTok handle, followers, engagement rate
6. Save profile
7. Reload and verify values persisted

**Test 2: Compensation Preferences**
1. On edit screen, scroll to "Compensation & Collabs"
2. Tap multiple compensation chips (should turn orange when selected)
3. Enter past collaborations text
4. Save profile
5. Reload and verify selections persisted

**Test 3: Persona Display**
1. View a creator profile
2. Verify persona appears below username (if set)
3. Persona should be styled in orange italic text

### TRO-145: Browse Creators Filters

**Test 1: Follower Bucket Filter**
1. Log in as business account
2. Navigate to Creators > Browse
3. Tap filter button (funnel icon)
4. Select "Under 5K" followers
5. Tap "Apply Filters" - modal should close
6. Verify results show creators with <5K followers

**Test 2: Compensation Filter**
1. In filter panel, tap "Free" compensation
2. Tap "Apply Filters"
3. Verify creators accepting free collabs shown
4. Open filters, add "$150-500" to selection
5. Apply and verify OR logic works

**Test 3: Sort Functionality**
1. Select "Recently Active" sort
2. Apply and verify most recently active creators at top
3. Select "Followers: High to Low"
4. Verify ordering by follower count descending

**Test 4: Combined Filters + Clear**
1. Apply: City = "Los Angeles", Followers = "5K-20K", Sort = "Recently Active"
2. Verify filtered results
3. Tap "Clear All Filters"
4. Verify all filters reset

---

## Production Deployment Checklist

### Pre-Deployment
- [ ] Run migrations in order on staging database
- [ ] Verify columns exist: `SELECT column_name FROM information_schema.columns WHERE table_name = 'creator_profiles';`
- [ ] Verify function exists: `SELECT proname FROM pg_proc WHERE proname = 'get_creators';`
- [ ] Run lint check: `npm run lint`
- [ ] Run type check: `npm run typecheck`

### Deployment Steps
1. Deploy database migrations (in order)
2. Deploy application code
3. Verify creator profile edit works
4. Verify browse creators filters work

### Post-Deployment Verification
- [ ] Creator can edit social stats
- [ ] Creator can set compensation preferences
- [ ] Persona displays on creator profile
- [ ] Business user can filter creators by follower count
- [ ] Business user can filter by compensation type
- [ ] Business user can filter by city
- [ ] Sort options work correctly
- [ ] Filter modal closes after applying filters

---

## Known Limitations

- No infinite scroll on browse creators (shows max 50 results)
- City filter is case-insensitive substring match
- No engagement rate validation (0-100%) in UI
- `instagram_last_post_date` and `tiktok_last_post_date` not user-editable

---

## Related Commits

```
925cdbf feat(TRO-144): add database migration for creator stats fields
d4db529 feat(TRO-144): extend creatorDiscoveryService with new profile fields
521c04d feat(TRO-144): add social stats section to creator profile edit
cd4c398 feat(TRO-144): add compensation preferences and past collabs to profile edit
84253d9 feat(TRO-145): enhance get_creators() with advanced filtering and sorting
a064865 feat(TRO-145): update getCreators() to use enhanced filter parameters
02995d1 feat(TRO-145): add filter and sort UI to browse creators screen
```
