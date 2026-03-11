# Claim Approval Refresh Technical Specification

> Status: APPROVED
> Created: 2026-02-22
> Source: TRO-162
> Feature: claim-approval-refresh

## Overview

After an admin approves a restaurant claim, the owner's app does not reflect the new business account status until they perform a full logout/login. This spec adds automatic session refresh on app foreground so that claim approval (and any other account type changes) are reflected without manual intervention.

## Problem Statement

When a restaurant claim is approved by an admin, the `users.account_type` is updated to `business` and `restaurant_claims.status` is set to `verified` in the database. However, the app's `AuthContext` only loads the user profile on initial login — there is no mechanism to re-fetch the profile when the app returns to the foreground. This means:

1. Closing and reopening the app does NOT trigger a refresh (no `AppState` listener)
2. Only a full logout/login forces `refreshAuth()` → `loadUserProfile()` → `loadAccountInfo()`
3. During live demos with restaurant owners, this creates a confusing experience

**Root cause**: `AuthContext.tsx` has no `AppState` listener. The `onAuthStateChange` listener only handles `TOKEN_REFRESHED` and `SIGNED_OUT` — it does not reload the profile on foreground resume.

## User Stories

- As a restaurant owner whose claim was just approved, I want my app to automatically show the Business Dashboard when I next open the app, without needing to logout and login

## User Experience

### User Flows

1. **Claim Approved While App Backgrounded**
   - Admin approves claim → `users.account_type` updated to `business`
   - User opens app (app comes to foreground)
   - App detects foreground event → calls `refreshAccountInfo()`
   - More tab now shows Business Tools section
   - User sees business dashboard immediately

2. **Claim Approved While App Active (Real-time)**
   - Admin approves claim
   - Real-time subscription on `users` table fires
   - Account info refreshes automatically
   - More tab updates in real-time

### States

| State | Visual | Trigger |
|-------|--------|---------|
| Before approval | "Claim Status" in More tab | Pending claim exists |
| After approval (foreground refresh) | Business Tools section appears | `account_type` changed to `business` |
| After approval (real-time) | Business Tools section appears | Real-time event on `users` table |

## Technical Design

### Approach: AppState Listener + Real-time Subscription (Q1 Answer: Option B — Both)

Both approaches will be implemented:
1. **AppState Foreground Refresh** — catches approval when user re-opens app
2. **Real-time Subscription on `users` table** — provides instant in-app updates while app is active

Throttle interval: **30 seconds** for AppState refresh (Q2 Answer: Option A).
Refresh scope: **Account info only** — `loadAccountInfo()`, not full profile (Q3 Answer: Option A).

### Implementation: Option A (AppState Listener)

#### File: `contexts/AuthContext.tsx`

**Add import:**
```typescript
import { AppState, AppStateStatus } from 'react-native'
```

**Add AppState listener in the AuthProvider:**
```typescript
// Inside AuthProvider, after the existing useEffect for initAuth:

useEffect(() => {
  let lastRefresh = Date.now();
  const REFRESH_THROTTLE_MS = 30_000; // Don't refresh more than once per 30s

  const handleAppStateChange = async (nextState: AppStateStatus) => {
    if (nextState === 'active' && user?.id) {
      const now = Date.now();
      if (now - lastRefresh > REFRESH_THROTTLE_MS) {
        lastRefresh = now;
        console.log('[AuthContext] App foregrounded, refreshing account info');
        await loadAccountInfo(user.id);
      }
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}, [user?.id]);
```

**Key design decisions:**
- **Throttle at 30s**: Prevents excessive API calls if user rapidly switches between apps
- **Only refreshes `loadAccountInfo()`**: Not the full `refreshAuth()` which re-validates the session. Account info is the lightweight check needed
- **Depends on `user?.id`**: Only runs when authenticated

### Implementation: Option B (Real-time — future enhancement)

#### File: `contexts/AuthContext.tsx`

```typescript
useEffect(() => {
  if (!user?.id) return;

  const channel = supabase
    .channel(`user-account-${user.id}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'users',
      filter: `id=eq.${user.id}`,
    }, async (payload) => {
      console.log('[AuthContext] User record updated:', payload.new);
      if (payload.new.account_type !== accountInfo?.account_type) {
        await loadAccountInfo(user.id);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id]);
```

**Note:** This requires the `users` table to have Supabase Realtime enabled (publication). Need to verify this is configured.

### Services

No new services needed. Existing `accountService.getUserAccountInfo()` and `restaurantTeamService.getMyRestaurants()` are sufficient.

### Navigation Changes

None. The More tab already dynamically renders based on `isBusiness` from `useAccountType()`. Once `accountInfo` updates, the UI re-renders automatically.

## Security

No security changes. The `loadAccountInfo` function queries the user's own profile via RLS-protected tables.

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| App foregrounded rapidly (multiple times in 30s) | Only refreshes once per 30s window | Throttle prevents excessive API calls |
| User not authenticated | No refresh attempted | Guard on `user?.id` |
| Network offline when foregrounding | Refresh fails silently | Existing error handling in `loadAccountInfo` |
| Claim rejected (not approved) | No visual change needed | Account type stays the same, growth items stay |
| Multiple app foreground events while claim still pending | Refresh runs, no state change | `loadAccountInfo` returns same data |

## Error Handling

| Error Condition | User Message | Recovery Action |
|-----------------|--------------|-----------------|
| Failed to refresh account info on foreground | None (silent) | User can pull-to-refresh or logout/login as fallback |
| Real-time subscription drops (Option B) | None (silent) | AppState listener (Option A) serves as fallback |

## Implementation Phases

### Phase 1: AppState Foreground Refresh (MVP)
**Goal**: Account info refreshes when app comes to foreground

#### Tasks
- [ ] **Task 1.1**: Add `AppState` listener to `AuthContext.tsx`
  - Files: `contexts/AuthContext.tsx`
  - Acceptance: Opening app after claim approval shows business tools without logout/login
- [ ] **Task 1.2**: Add throttle to prevent excessive refreshes
  - Files: `contexts/AuthContext.tsx`
  - Acceptance: Rapid app switching doesn't cause multiple API calls

### Phase 2: Real-time Subscription (Included — Q1 Answer: Option B)
**Goal**: Instant in-app update when claim is approved while app is active

**Depends on**: Phase 1

#### Tasks
- [ ] **Task 2.1**: Verify `users` table has Supabase Realtime enabled
  - Files: Supabase dashboard / migration
  - Acceptance: Realtime publication includes `users` table
- [ ] **Task 2.2**: Add real-time subscription for user account changes
  - Files: `contexts/AuthContext.tsx`
  - Acceptance: Account type change reflected in UI within seconds while app is active

### Phase 3: Push Notification on Approval (Deferred — ER-001 status unknown)
**Goal**: Notify user that their claim was approved

**Depends on**: ER-001 (notification RLS audit — currently blocking push notifications for claim approval in `adminReviewService.ts` lines 324-343)

#### Tasks
- [ ] **Task 3.1**: Re-enable notification dispatch in `adminReviewService.approveRestaurantClaim()`
  - Files: `services/adminReviewService.ts`
  - Acceptance: Push notification sent when claim approved
- [ ] **Task 3.2**: Handle notification tap to navigate to business dashboard
  - Files: `hooks/usePushNotifications.ts`, notification handler
  - Acceptance: Tapping notification opens Business Dashboard

## Testing Requirements

### Unit Tests
- [ ] `AuthContext` calls `loadAccountInfo` when `AppState` changes to `active`
- [ ] Throttle prevents multiple refreshes within 30s window

### E2E Tests (Maestro)
- [ ] Manual test: Approve claim via admin, background/foreground app, verify Business Dashboard appears

### Manual Testing
- [ ] Submit claim from test account
- [ ] Approve claim via admin review queue
- [ ] Background the app, then foreground it
- [ ] Verify More tab shows Business Tools without logout
- [ ] Verify rapid app switching doesn't cause issues

## Acceptance Criteria

- [ ] After claim approval, foregrounding the app reflects business account status
- [ ] No logout/login required to see approval
- [ ] Refresh is throttled to prevent excessive API calls (max once per 30s)
- [ ] No visual flicker or loading state during background refresh
- [ ] Existing functionality (login, logout, token refresh) unchanged
