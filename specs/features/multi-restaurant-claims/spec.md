# Multi-Restaurant Claims Technical Specification

> Status: APPROVED
> Created: 2026-02-22
> Source: TRO-170
> Feature: multi-restaurant-claims

## Overview

Allow restaurant owners to claim and manage multiple restaurant locations from a single account. Currently, the `business_profiles` table has a `UNIQUE(user_id)` constraint that limits one business profile per user. The multi-restaurant infrastructure (team system, restaurant switcher, RestaurantContext) already exists for team members — this feature extends the same pattern to owners.

## Problem Statement

Restaurant owners with multiple locations (e.g., Tyler owns PIE.ZAA Charlotte and PIE.ZAA Asheville) must create separate accounts with different emails to claim each location. This is a significant friction point:

- Tyler (PIE.ZAA Charlotte owner) cannot claim PIE.ZAA Asheville from the same account
- Team members (non-owners) already support multi-location access via `restaurant_team_members`
- The Business Dashboard already has a restaurant switcher (`RestaurantSwitcher.tsx`) that shows when `restaurants.length > 1`
- `RestaurantContext` already manages multi-restaurant state with `switchRestaurant()`

**The core blocker**: `business_profiles.user_id` has a `UNIQUE` constraint preventing multiple profiles per user.

## User Stories

- As a restaurant owner with multiple locations, I want to claim additional restaurants from the same account so I don't need separate accounts per location
- As a multi-location owner, I want to switch between my restaurants in the Business Dashboard to manage each independently
- As a multi-location owner, I want all my claimed restaurants accessible from one login

## User Experience

### Screens & Views

| Screen | Purpose | Entry Points | Account Types |
|--------|---------|--------------|---------------|
| Business Dashboard | Shows restaurant switcher when >1 restaurant | More tab → Business Dashboard | Business |
| Claim Another Location | New claim flow for additional restaurants | Business Dashboard → "Claim Another Location" | Business (approved) |
| Restaurant Switcher | Toggle between managed restaurants | Dashboard header | Business |

### User Flows

1. **First Claim (existing flow, unchanged)**
   - Consumer account → More tab → "Claim Your Restaurant" → submit claim → pending review → approved → becomes business account

2. **Claim Additional Location (new flow)**
   - Business Dashboard → "Claim Another Location" button
   - Same claim flow (search restaurant → enter contact info → submit)
   - Claim submitted as pending, existing business status maintained
   - Once approved, new restaurant appears in restaurant switcher

3. **Switch Between Locations**
   - Business Dashboard → RestaurantSwitcher dropdown (already built)
   - Select different restaurant → all dashboard data (campaigns, analytics, team) updates to selected restaurant

### Components

- [x] `RestaurantSwitcher` — already exists at `components/business/RestaurantSwitcher.tsx`, shows when `restaurants.length > 1`
- [ ] "Claim Another Location" button — new CTA in Business Dashboard, only visible after first claim is approved

### States

| State | Visual | Trigger |
|-------|--------|---------|
| Single restaurant (owner) | No switcher shown, dashboard shows single restaurant | `restaurants.length === 1` |
| Multiple restaurants (owner) | Switcher shown in dashboard header | `restaurants.length > 1` |
| Additional claim pending | New restaurant not yet in switcher, pending card shown in dashboard (Q5 Answer: Option A) | Claim submitted but not approved |

## Technical Design

### Database Schema

#### Schema Changes

**Table: `business_profiles`**

Current constraint:
```sql
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE
```

**Change**: Replace `UNIQUE(user_id)` with `UNIQUE(user_id, restaurant_id)` to allow one profile per user per restaurant.

```sql
-- Migration: Allow multiple business profiles per user
ALTER TABLE business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_key;
ALTER TABLE business_profiles ADD CONSTRAINT business_profiles_user_restaurant_unique UNIQUE(user_id, restaurant_id);
```

**Table: `restaurant_claims`**

Current constraint: `UNIQUE(restaurant_id, user_id)` — one claim per user per restaurant. This is fine for multi-restaurant since each claim targets a different restaurant.

No changes needed.

#### RLS Policy Updates

Current `business_profiles` RLS policies reference `user_id` directly. Since we're keeping the `user_id` column, existing RLS works:

```sql
-- Existing: Users can view their own business profiles
CREATE POLICY "Users can view own business_profiles" ON business_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

This will now return multiple rows for multi-restaurant owners — callers need to handle arrays.

### Services

| Service | File | Changes | Description |
|---------|------|---------|-------------|
| restaurantClaimService | `services/restaurantClaimService.ts` | Update `submitRestaurantClaim()` to work for existing business users | Allow claim submission when user already has `account_type = 'business'` |
| accountService | `services/accountService.ts` | Update `getUserAccountInfo()` to handle multiple business profiles | Return array of business profiles instead of single |
| restaurantTeamService | `services/restaurantTeamService.ts` | No changes | `getMyRestaurants()` already returns all restaurants (owned + team) |

### Key Service Changes

#### `restaurantClaimService.submitRestaurantClaim()`

Current flow creates a `business_profiles` record during claim submission. For multi-restaurant, it needs to:
1. Check if user already has a business profile (existing business user)
2. If yes, create a new `business_profiles` row for the new restaurant (now allowed by schema change)
3. If no (first claim), keep existing behavior

#### `accountService.getUserAccountInfo()`

Needs to return the "primary" business profile for backward compatibility while supporting multiple profiles. Primary profile determined by `RestaurantContext.currentRestaurant`, with fallback to first approved (Q4 Answer: Option B). Maximum 10 restaurants per owner (Q6 Answer).

### Hooks

| Hook | File | Purpose | Dependencies |
|------|------|---------|--------------|
| useRestaurant | `contexts/RestaurantContext.tsx` | Already manages multi-restaurant state | restaurantTeamService |

No new hooks needed. `RestaurantContext` already handles multi-restaurant via `getMyRestaurants()`.

### Navigation Changes

- Add "Claim Another Location" button in Quick Actions section of Business Dashboard (Q2 Answer: Option A) (links to `/business/claim`)
- The claim flow (`app/business/claim.tsx`) needs to work for already-business users (currently it's designed for consumer → business transition)

### Integration Points

- **Business Dashboard** (`app/(tabs)/business/dashboard.tsx`): Already filters by `currentRestaurantId` — multi-restaurant works out of the box once restaurants appear in the context
- **Campaign creation** (`app/(tabs)/business/campaigns/create.tsx`): May filter by `owner_id` instead of `restaurant_id` — needs verification
- **Restaurant Settings** (`app/(tabs)/business/settings.tsx`): Already uses `currentRestaurant` from context

## Security

### Access Control

| Action | Consumer | Creator | Business | Unauthenticated |
|--------|----------|---------|----------|-----------------|
| Submit first claim | Yes | Yes | N/A | No |
| Submit additional claim | N/A | N/A | Yes | No |
| View restaurant switcher | No | No | Yes (if >1) | No |
| Switch restaurants | No | No | Yes | No |

### Data Protection

- Each `business_profiles` row is protected by RLS (`user_id = auth.uid()`)
- Restaurant data filtered by `restaurant_id` in all queries
- No cross-restaurant data leakage possible with existing RLS

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| User claims same restaurant twice | Blocked by existing `UNIQUE(restaurant_id, user_id)` on `restaurant_claims` | No change needed |
| First claim pending, user tries to claim another | Blocked — must have at least one approved claim first (Q1 Answer: Option A) | "Claim Another Location" only visible in Business Dashboard, which requires approved claim |
| Claim approved while viewing different restaurant | New restaurant appears in switcher on next refresh | RestaurantContext refresh needed |
| All claims rejected | User stays consumer (first) or stays business for remaining restaurants | Account type only downgrades if ALL restaurants removed |
| Admin revokes one of multiple restaurants | Restaurant removed from switcher, dashboard switches to remaining | Need to handle this edge case |

## Error Handling

| Error Condition | User Message | Recovery Action |
|-----------------|--------------|-----------------|
| Schema migration fails | N/A (deployment issue) | Roll back migration |
| Duplicate claim attempt | "You already have a claim for this restaurant" | Existing check in `canClaimRestaurant()` |
| Business profile creation fails (new restaurant) | "Failed to submit claim. Please try again." | Retry |

## Implementation Phases

### Phase 1: Schema Migration (Foundation)
**Goal**: Remove the UNIQUE constraint blocker

#### Tasks
- [ ] **Task 1.1**: Create migration to change `business_profiles` constraint
  - Files: `supabase/migrations/[timestamp]_allow_multi_restaurant_profiles.sql`
  - Acceptance: `UNIQUE(user_id)` replaced with `UNIQUE(user_id, restaurant_id)`
- [ ] **Task 1.2**: Verify RLS policies still work with multiple profiles
  - Files: RLS policy review
  - Acceptance: User can read all their own business profiles

### Phase 2: Service Updates
**Goal**: Services handle multiple business profiles correctly

**Depends on**: Phase 1

#### Tasks
- [ ] **Task 2.1**: Update `accountService.getUserAccountInfo()` to handle multiple profiles
  - Files: `services/accountService.ts`
  - Acceptance: Returns primary business profile + count of total profiles
- [ ] **Task 2.2**: Update `restaurantClaimService.submitRestaurantClaim()` for existing business users
  - Files: `services/restaurantClaimService.ts`
  - Acceptance: Business users can submit additional claims without error
- [ ] **Task 2.3**: Update `adminReviewService.approveRestaurantClaim()` for multi-restaurant
  - Files: `services/adminReviewService.ts`
  - Acceptance: Approving additional claim creates new business profile, doesn't change account_type (already business)

### Phase 3: UI — Claim Another Location
**Goal**: Business users can initiate additional claims from the dashboard

**Depends on**: Phase 2

#### Tasks
- [ ] **Task 3.1**: Add "Claim Another Location" button to Business Dashboard
  - Files: `app/(tabs)/business/dashboard.tsx`
  - Acceptance: Button visible for approved business users, navigates to claim flow
- [ ] **Task 3.2**: Update claim flow to work for existing business users
  - Files: `app/business/claim.tsx`
  - Acceptance: Business users can complete claim flow without beta gate or account type confusion
- [ ] **Task 3.3**: Verify restaurant switcher works with newly approved restaurants
  - Files: `components/business/RestaurantSwitcher.tsx`, `contexts/RestaurantContext.tsx`
  - Acceptance: After second claim approved, switcher appears and works

### Phase 4: Campaign & Analytics Multi-Restaurant (Verification)
**Goal**: Verify all dashboard features correctly scope to selected restaurant

**Depends on**: Phase 3

#### Tasks
- [ ] **Task 4.1**: Verify campaign list filters by `restaurant_id` (not just `owner_id`)
  - Files: `app/(tabs)/business/campaigns/index.tsx`
  - Acceptance: Switching restaurant shows only that restaurant's campaigns
- [ ] **Task 4.2**: Verify campaign creation uses `currentRestaurantId`
  - Files: `app/(tabs)/business/campaigns/create.tsx`
  - Acceptance: New campaign created for currently selected restaurant
- [ ] **Task 4.3**: Verify restaurant analytics scopes correctly
  - Files: `app/(tabs)/business/analytics.tsx`
  - Acceptance: Analytics show data for selected restaurant only

## Testing Requirements

### Unit Tests
- [ ] `submitRestaurantClaim()` succeeds for user with existing business profile
- [ ] `getUserAccountInfo()` returns correct data with multiple business profiles
- [ ] `canClaimRestaurant()` allows claims for different restaurants
- [ ] `canClaimRestaurant()` blocks duplicate claims for same restaurant

### E2E Tests (Maestro)
- [ ] Full flow: Business user claims second restaurant → appears in switcher after approval
- [ ] Restaurant switcher changes dashboard data correctly

### Manual Testing
- [ ] Create business user with one approved restaurant
- [ ] Submit claim for second restaurant from Business Dashboard
- [ ] Approve second claim via admin
- [ ] Verify both restaurants appear in switcher
- [ ] Verify campaigns, analytics, settings scope to selected restaurant

## Acceptance Criteria

- [ ] `business_profiles` allows multiple entries per user (one per restaurant)
- [ ] Existing single-restaurant business users unaffected by schema change
- [ ] Business Dashboard shows "Claim Another Location" for approved users
- [ ] Additional claims can be submitted and approved
- [ ] Restaurant switcher appears when user has >1 restaurant
- [ ] All dashboard features (campaigns, analytics, settings) scope to selected restaurant
- [ ] No regression in first-claim flow for new users
