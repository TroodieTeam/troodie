# TRO-145: Browse Creators - Filter & Sort Enhancements

## Overview

Enhance the existing Browse Creators screen (`/business/creators/browse.tsx`) with additional filtering and sorting capabilities for restaurant business users.

## Current State

The browse creators screen already exists at `/app/(tabs)/business/creators/browse.tsx` with:
- Search by name
- Portfolio display
- Basic filtering via `creatorDiscoveryService.ts`
- Entry points from dashboard and creators management

## Jobs To Be Done

- Restaurant owners can filter creators by city
- Restaurant owners can filter by follower count buckets (<5K, 5-20K, 20K+)
- Restaurant owners can filter by preferred compensation type
- Restaurant owners can sort results by recently active (last login)
- Restaurant owners can sort results by follower count

## Acceptance Criteria

### Filtering

- [ ] City filter: Dropdown/searchable field with cities from existing creators
- [ ] Follower count filter: Segmented control or chips with options:
  - All
  - Under 5K
  - 5K - 20K
  - 20K+
- [ ] Preferred compensation filter (multi-select chips):
  - Free (no comp)
  - Compensated meals
  - Pay-per-post
- [ ] Filters persist during session (React state)
- [ ] "Clear filters" button when any filter is active
- [ ] Filter results update automatically on selection

### Sorting

- [ ] Sort dropdown/selector with options:
  - Recently Active (default)
  - Follower Count (High to Low)
  - Follower Count (Low to High)
- [ ] Recently active = sorted by `last_login_at` from users table (descending)
- [ ] Sort persists during session

### Database Changes

- [ ] Add `last_login_at` tracking to users table (if not exists)
- [ ] Update `get_creators()` function to support:
  - Follower count range filtering (min/max)
  - Preferred compensation array filtering
  - Sorting by last_login_at
  - Sorting by total_followers

### Service Changes

- [ ] Update `CreatorFilters` interface in `creatorDiscoveryService.ts`:
  ```typescript
  interface CreatorFilters {
    city?: string;
    followerBucket?: 'under5k' | '5k-20k' | '20kplus';
    preferredCompensation?: string[];
    sortBy?: 'recentlyActive' | 'followersHigh' | 'followersLow';
  }
  ```
- [ ] Update `getCreators()` to pass new filter parameters

### UI Components

- [ ] Filter bar component (collapsible or always visible)
- [ ] City selector (dropdown with search)
- [ ] Follower bucket selector (chips/segmented)
- [ ] Compensation multi-select
- [ ] Sort dropdown

## Technical Constraints

- Use existing design patterns from the app
- Maintain compatibility with existing `creatorDiscoveryService.ts`
- Ensure RLS policies allow business users to view creator data
- Keep UI performant with pagination (already supports 50 at a time)

## Files to Modify

1. `services/creatorDiscoveryService.ts` - Add filter/sort parameters
2. `app/(tabs)/business/creators/browse.tsx` - Add filter UI
3. `supabase/migrations/XXXXXX_browse_creators_filters.sql` - Database function updates
4. `lib/supabase.ts` - Type updates if needed

## Out of Scope

- Saving filter presets
- Push notifications for new creators matching filters
- Map view of creators
