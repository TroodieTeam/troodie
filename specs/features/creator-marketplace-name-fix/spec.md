# Creator Marketplace Name Fix — Technical Specification

> Status: APPROVED
> Created: 2026-02-09
> Source: Creator Marketplace error - Creator name: When browsing creators, "Creator" is shown instead of their actual name. Bold text should be first name last name, grey text should be username.
> Feature: creator-marketplace-name-fix

## Overview

The Browse Creators screen and creator profile views display "Creator" as a hardcoded fallback instead of the creator's actual name. The desired behavior is: **bold text = first name last name** (from `users.name`) and **grey text = @username**. This fix addresses the fallback chain and ensures the `users.name` field is always used when `display_name` is not set.

## Problem Statement

When a creator has not explicitly set their `display_name` in `creator_profiles`, the Browse Creators screen shows "Creator" as their name. The SQL RPC `get_creators()` already does `COALESCE(cp.display_name, u.name, u.username)`, but if `u.name` is also null/empty, the fallback reaches the client-side "Creator" default. Additionally, the Browse Creators screen fetches `username` separately but doesn't fetch `users.name` as an additional fallback.

**Root cause**: The `display_name` field in `creator_profiles` is null for some creators, AND `users.name` may also be null — resulting in the "Creator" fallback being displayed.

## User Stories

- As a business owner browsing creators, I want to see each creator's real name (first + last) in bold so I can identify who they are
- As a business owner browsing creators, I want to see each creator's @username in grey below their name for recognition
- As a creator, I want my real name displayed on the marketplace so businesses can find and identify me

## User Experience

### Current Behavior
| Field | Shows | Expected |
|-------|-------|----------|
| Bold name | "Creator" (hardcoded fallback) | First name Last name (from `users.name`) |
| Grey text | @username (correct when available) | @username (no change) |

### Desired Behavior (Approved)
| Field | Priority 1 | Priority 2 | Priority 3 | Final Fallback |
|-------|-----------|-----------|-----------|----------------|
| Bold name | `creator_profiles.display_name` | `users.name` | `users.username` | "Unknown Creator" |
| Grey text | `@{users.username}` | — | — | hidden (no grey text shown) |

**Decisions:**
- **Q1**: Use `users.name` as-is (single field, no schema change). No separate first_name/last_name needed.
- **Q2**: When all name fields are null, promote @username to bold text. Only show "Unknown Creator" if username is also null. Hide the grey @username line when username is promoted to bold (to avoid duplication).

### Affected Screens

| Screen | File | What Changes |
|--------|------|-------------|
| Browse Creators | `app/(tabs)/business/creators/browse.tsx` | Name display + username fetch enrichment |
| Creator Profile | `app/creator/[id]/index.tsx` | Name display fallback |
| Creator Card | `components/creator/CreatorCard.tsx` | Name display fallback |

## Technical Design

### Root Cause Analysis

1. **`get_creators()` RPC** (line 57): Already does `COALESCE(cp.display_name, u.name, u.username)::TEXT as display_name` — this is correct
2. **`transformCreator()`** (line 247): Uses `row.display_name || 'Creator'` — if COALESCE returns null (all three fields null), shows "Creator"
3. **Browse Creators enrichment** (lines 369-397): Fetches `username` from `users` table but doesn't fetch `name` — missed opportunity for fallback
4. **`getCreatorProfile()`** (line 460): Better fallback chain: `cp.display_name || cp.users.name || cp.users.username || 'Creator'` — but still falls back to "Creator"

### Fix Strategy

**Phase 1 changes (client-side):**

#### 1. Update `transformCreator()` in `creatorDiscoveryService.ts`
- The RPC already coalesces `display_name` with `u.name` and `u.username`, so by the time it reaches `transformCreator`, `row.display_name` should already contain the best available name
- Change fallback from `'Creator'` to `'Unknown Creator'`

#### 2. Update Browse Creators enrichment in `browse.tsx`
- When fetching user data (line 369-373), also fetch `name` alongside `username`
- Change: `.select('username')` → `.select('username, name')`
- Build displayName fallback chain: `creator.displayName` (from RPC, non-default) → `userData.name` → `userData.username` → `'Unknown Creator'`
- **Per Q2**: When username is promoted to bold (used as displayName), hide the grey @username line to avoid duplication

#### 3. Update `getCreatorProfile()` in `creatorDiscoveryService.ts`
- The fallback chain is already good (`cp.display_name || cp.users.name || cp.users.username || 'Creator'`)
- Update final fallback from `'Creator'` to `'Unknown Creator'`

### Services

| Service | File | Methods | Description |
|---------|------|---------|-------------|
| creatorDiscoveryService | `services/creatorDiscoveryService.ts` | `transformCreator()`, `getCreatorProfile()` | Update fallback "Creator" → better fallback with `users.name` |

### Files to Modify

| File | Change |
|------|--------|
| `services/creatorDiscoveryService.ts:247` | Update `transformCreator` fallback |
| `services/creatorDiscoveryService.ts:460` | Update `getCreatorProfile` fallback |
| `app/(tabs)/business/creators/browse.tsx:371` | Fetch `name` alongside `username` from users table |
| `app/(tabs)/business/creators/browse.tsx:396` | Use `users.name` in displayName fallback chain |

### No Database Changes Required

The SQL RPC `get_creators()` already correctly uses `COALESCE(cp.display_name, u.name, u.username)`. The issue is purely client-side fallback handling when all three DB fields are null, AND the enrichment step not leveraging `users.name`.

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| display_name null, name null, username set | Show username in **bold**, hide grey @username line | Per Q2: promote username to bold, no duplication |
| All name fields null | Show "Unknown Creator" | Final fallback in transformCreator and browse enrichment |
| `display_name` set | Show display_name | No change — already works |
| `display_name` null, `name` set | Show name | RPC COALESCE handles, plus browse enrichment fallback |
| `display_name` null, `name` null, `username` set | Show username | RPC COALESCE handles |
| Username null | Hide username line or show empty | Already handled with `@creator` fallback — update to hide instead |

## Implementation Phases

### Phase 1: Fix Creator Name Display (MVP — single phase)
**Goal**: Creator's real name shown in bold, username in grey, no more "Creator" fallback

#### Tasks
- [ ] **Task 1.1**: Update `transformCreator()` fallback in `creatorDiscoveryService.ts`
  - Files: `services/creatorDiscoveryService.ts:247`
  - Change: `row.display_name || 'Creator'` → `row.display_name || 'Unknown Creator'`
  - Acceptance: No creator card shows "Creator" as a name unless that's their actual display_name

- [ ] **Task 1.2**: Update Browse Creators user data fetch to include `name`
  - Files: `app/(tabs)/business/creators/browse.tsx:371`
  - Change: `.select('username')` → `.select('username, name')`
  - Acceptance: User's `name` field is available during enrichment

- [ ] **Task 1.3**: Update Browse Creators displayName fallback chain
  - Files: `app/(tabs)/business/creators/browse.tsx:393-397`
  - Change: Build proper fallback chain using `userData.name` and `userData.username`
  - When `creator.displayName` is "Unknown Creator" (the default), try `userData.name` → `userData.username` → keep "Unknown Creator"
  - When username is promoted to bold displayName, set username to empty string to avoid showing the same value twice
  - Acceptance: Creators with `users.name` set show their real name; creators with only username show username in bold with no grey duplicate

- [ ] **Task 1.4**: Update `getCreatorProfile()` fallback
  - Files: `services/creatorDiscoveryService.ts:460`
  - Change: Final fallback from `'Creator'` to `'Unknown Creator'`
  - Acceptance: Creator profile screen shows consistent fallback

- [ ] **Task 1.5**: Manual verification
  - Check Browse Creators screen with test accounts
  - Verify creator profile screen
  - Verify CreatorCard component
  - Verify that when username is used as bold name, grey @username line is hidden

## Testing Requirements

### Manual Testing
- [ ] Browse Creators: creator with `display_name` set shows display_name in bold
- [ ] Browse Creators: creator without `display_name` but with `users.name` shows name in bold
- [ ] Browse Creators: creator without `display_name` or `name` shows username in bold
- [ ] Browse Creators: username shows correctly as grey @handle text
- [ ] Creator Profile: same name fallback behavior
- [ ] Avatar placeholder letter matches the displayed name

## Acceptance Criteria

- [ ] No creator card shows "Creator" as bold name (unless that's literally their set display_name)
- [ ] Bold text shows: display_name → users.name → username → "Unknown Creator"
- [ ] Grey text shows: @username (hidden when username was promoted to bold, or when no username)
- [ ] Creator profile screen uses same fallback chain
- [ ] No database migration required
- [ ] No schema changes — `users.name` used as-is (single field)
