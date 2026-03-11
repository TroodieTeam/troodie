# Hide Communities for Business Accounts Technical Specification

> Status: APPROVED
> Created: 2026-02-22
> Source: TRO-168
> Feature: hide-communities-business

## Overview

Hide community-related UI elements for restaurant owner (business) accounts. Communities are a consumer/creator-facing social feature that doesn't apply to business accounts. Restaurant owners seeing empty community sections creates confusion during onboarding.

## Problem Statement

Restaurant owner accounts see community-related UI elements (community cards on the Home screen, community options in the Add screen) but communities don't have content relevant to business users. This creates a poor first impression during restaurant onboarding when owners land on an empty communities section.

The long-term vision for communities and business accounts is TBD (potential home page redesign, switch account functionality for owners who also want to use socially). For now, hiding communities for business accounts is the right move.

## User Stories

- As a restaurant owner, I want my app experience focused on business tools so I'm not distracted by irrelevant social features like communities

## User Experience

### Screens & Views

| Screen | Purpose | Change | Account Types Affected |
|--------|---------|--------|------------------------|
| Home (`(tabs)/index.tsx`) | Main feed | Hide community-related sections/cards for business users | All business (Q1 Answer: Option A) |
| Add (`(tabs)/add.tsx`) | Content creation hub | Hide "Communities" option for business users | All business |
| Explore (`(tabs)/explore.tsx`) | Search/discovery | Hide community content from explore results for business users (Q2 Answer: Option B) | All business |

### User Flows

1. **Business user opens Home tab**
   - Communities section/cards not shown
   - Rest of feed (posts, restaurants, boards) shown normally

2. **Business user opens Add screen**
   - "Communities" option hidden
   - Other add options (post, restaurant, board) shown normally

## Technical Design

### No Database Changes

No schema or migration changes needed. This is a pure UI change based on `account_type`.

### File Changes

#### 1. `app/(tabs)/index.tsx` — Hide communities for business

**Current code** (line 134-141):
```typescript
const [boards, posts, communitiesData] = await Promise.all([
  // ...
  communityService.getUserCommunities(user.id)
]);
const hasJoined = (communitiesData.joined?.length > 0) || (communitiesData.created?.length > 0);
```

**Changes:**
- Skip `communityService.getUserCommunities()` call for business users
- Hide community-related UI sections for business users
- Use `useAccountType()` hook to check `isBusiness`

#### 2. `app/(tabs)/add.tsx` — Hide communities option for business

**Current code** (around line 327-341):
```typescript
{
  description: 'Share your restaurant experiences with the community',
  // ...
  onClick: () => router.push('/add/communities'),
}
```

**Changes:**
- Conditionally exclude the communities option when `isBusiness === true`

### Hooks

| Hook | File | Purpose | Dependencies |
|------|------|---------|--------------|
| useAccountType | `hooks/useAccountType.ts` | Check `isBusiness` | AuthContext |

Already exists, no changes needed.

### Navigation Changes

None. The community screens (`/add/communities`, `/add/community-detail`, etc.) remain accessible via deep links but aren't surfaced in the UI for business users.

## Security

No security changes. Communities data access is unchanged — the UI simply doesn't render the options.

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| User upgrades from consumer to business | Communities disappear from their UI | `isBusiness` check re-evaluates on account type change |
| Business user tries to deep link to community page | Page loads normally | No navigation blocking, just UI hiding |
| User with pending claim (not yet business) | Communities still shown | Only hide when `isBusiness === true` |

## Error Handling

No new error handling needed. This is a conditional render change.

## Implementation Phases

### Phase 1: Hide Communities (Single Phase)
**Goal**: Business accounts don't see community UI

#### Tasks
- [ ] **Task 1.1**: Hide communities section on Home screen for business users
  - Files: `app/(tabs)/index.tsx`
  - Acceptance: Business users don't see community cards/section on Home
- [ ] **Task 1.2**: Hide communities option in Add screen for business users
  - Files: `app/(tabs)/add.tsx`
  - Acceptance: Business users don't see "Communities" option when adding content
- [ ] **Task 1.3**: Hide community content from Explore tab for business users (Q2 Answer: Option B)
  - Files: `app/(tabs)/explore.tsx`
  - Acceptance: Business users don't see community results in Explore
- [ ] **Task 1.4**: Skip communities API call for business users (performance)
  - Files: `app/(tabs)/index.tsx`
  - Acceptance: No unnecessary `communityService.getUserCommunities()` call for business users

## Testing Requirements

### Unit Tests
- [ ] Home screen renders without communities section when `isBusiness === true`
- [ ] Add screen renders without communities option when `isBusiness === true`

### E2E Tests (Maestro)
- [ ] Business user flow: Home tab shows no communities section
- [ ] Business user flow: Add screen shows no communities option

### Manual Testing
- [ ] Login as business user → Home tab → no communities visible
- [ ] Login as business user → Add screen → no communities option
- [ ] Login as consumer → Home tab → communities visible (regression check)
- [ ] Login as consumer → Add screen → communities option visible (regression check)

## Acceptance Criteria

- [ ] Business accounts do not see community sections on Home screen
- [ ] Business accounts do not see community option on Add screen
- [ ] Consumer and creator accounts still see communities normally (no regression)
- [ ] No unnecessary API calls to community service for business users
