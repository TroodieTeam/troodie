# Restaurant Onboarding UX Fixes Technical Specification

> Status: APPROVED
> Created: 2026-02-22
> Source: TRO-160, TRO-161, TRO-163, TRO-169
> Feature: restaurant-onboarding-ux-fixes

## Overview

Bundle of four tightly coupled UX fixes for the restaurant claim onboarding flow. After a restaurant owner submits a claim, the app currently shows confusing options (re-entry into claim flow, creator upgrade prompts, broken dashboard link, beta passcode gate). These fixes clean up post-submission UX so restaurant owners see clear, consistent state.

## Problem Statement

Restaurant owners who complete the claim submission encounter multiple UX issues:
1. **TRO-161**: More tab still shows "Become a Creator" and "Claim Your Restaurant" even after submitting a claim, prompting re-entry into completed flows
2. **TRO-160**: Claim Submitted screen previously showed a "View Business Dashboard" button that led to a circular error loop (now confirmed removed in current code — the pending step only has "Back to More")
3. **TRO-163**: The "Claim My Restaurant" entry in More tab requires beta passcode `TROODIE2025`, but the "Promote My Restaurant" onboarding flow doesn't. The passcode should be removed entirely since claims are manually approved
4. **TRO-169**: The X button on the Beta Access Gate screen may not work — a restaurant owner reported being stuck on the screen

## User Stories

- As a restaurant owner who has submitted a claim, I want the More tab to reflect my pending status so I'm not confused by irrelevant options
- As a restaurant owner, I want to skip the beta passcode when claiming my restaurant since claims are manually approved anyway
- As a user on the Beta Access screen, I want the X button to reliably close the modal and return me to the previous screen

## User Experience

### Screens & Views

| Screen | Change | Files |
|--------|--------|-------|
| More Tab | Hide "Become a Creator" and replace "Claim Your Restaurant" with "Claim Status" when user has pending claim | `app/(tabs)/more.tsx` |
| Beta Access Gate | Remove entirely from claim flow (TRO-163); verify X button works (TRO-169) | `app/business/claim.tsx`, `components/BetaAccessGate.tsx` |
| Claim Submitted (pending step) | No change needed — current code already only shows "Back to More" (TRO-160 already resolved) |

### User Flows

1. **User has NO claim submitted (consumer)**
   - More tab → "Grow with Troodie" section shows "Become a Creator" and "Claim Your Restaurant"
   - Tapping "Claim Your Restaurant" → goes directly to claim search step (no beta gate)

2. **User has PENDING claim**
   - More tab → "Grow with Troodie" section hides "Become a Creator" and replaces "Claim Your Restaurant" with "Claim Status" showing subtitle "Your claim is under review"
   - Tapping "Claim Status" → navigates to the Claim Submitted screen via query param (reuses existing pending step in claim.tsx — Q2 Answer: Option A)

3. **User has APPROVED claim (isBusiness = true)**
   - More tab → "Grow with Troodie" section is empty/hidden (current behavior, already works via `!isBusiness` check)
   - Business Tools section shows dashboard etc. (current behavior, works)

### States

| State | Visual | Trigger |
|-------|--------|---------|
| No claim | Shows "Become a Creator" + "Claim Your Restaurant" | `!isCreator` and `!isBusiness` and no pending claim |
| Pending claim | Shows "Claim Status" with "[Restaurant Name] — under review" subtitle (Q4 Answer: Option A) | User has pending claim in `restaurant_claims` |
| Approved claim | Shows Business Tools, hides growth section | `isBusiness === true` |

## Technical Design

### Database Schema

No schema changes needed. The `restaurant_claims` table already has `status` field with values `pending`, `verified`, `rejected`, `expired`.

### Services

| Service | File | Changes | Description |
|---------|------|---------|-------------|
| restaurantClaimService | `services/restaurantClaimService.ts` | Add `hasPendingClaim()` method | Quick check if current user has any pending claims |

#### New Method: `hasPendingClaim()`

```typescript
async hasPendingClaim(): Promise<{ hasPending: boolean; claimId?: string; restaurantName?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { hasPending: false };

  const { data: claim } = await supabase
    .from('restaurant_claims')
    .select('id, restaurant:restaurants(name)')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .limit(1)
    .single();

  if (claim) {
    return { hasPending: true, claimId: claim.id, restaurantName: claim.restaurant?.name };
  }
  return { hasPending: false };
}
```

### File Changes

#### 1. `app/(tabs)/more.tsx` — Conditional growth items

**Current code** (lines 419-446):
```typescript
const growthItems: MenuItem[] = useMemo(() => {
  const items: MenuItem[] = [];
  if (!isCreator) {
    items.push({ id: 'become-creator', ... });
  }
  if (!isBusiness) {
    items.push({ id: 'claim-restaurant', ... });
  }
  return items;
}, [isCreator, isBusiness, router]);
```

**Changes:**
- Add state for `hasPendingClaim` + `pendingClaimRestaurantName`
- On screen focus, call `restaurantClaimService.hasPendingClaim()`
- If pending claim exists:
  - Hide "Become a Creator" (user is mid-business-onboarding)
  - Replace "Claim Your Restaurant" with "Claim Status" item that navigates to a claim status view
- If no pending claim and `!isBusiness`: show items as normal

#### 2. `app/business/claim.tsx` — Remove beta gate

**Current code** (lines 39-40, 52-59, 263-274):
```typescript
const [showBetaGate, setShowBetaGate] = useState(true);
const [hasAccess, setHasAccess] = useState(false);
// ...
if (!hasAccess) {
  return <BetaAccessGate ... />;
}
```

**Changes:**
- Remove `showBetaGate` and `hasAccess` state
- Remove the `BetaAccessGate` conditional render
- Remove the `handleBetaAccessGranted` and `handleBetaAccessClose` functions
- The claim flow starts directly at the search step
- Remove import of `BetaAccessGate`

#### 3. `app/creator/onboarding.tsx` — Also remove beta gate (Q1 Answer: Option B)

**Decision**: Beta gate removed from BOTH claim and creator flows since both are manually approved.

**Changes:**
- Remove `BetaAccessGate` from creator onboarding flow
- Creator flow starts directly at the onboarding content
- Remove import of `BetaAccessGate`
- Keep `BetaAccessGate` component in codebase for potential future use (Q5 answer)

#### 4. `components/BetaAccessGate.tsx` — Verify X button (TRO-169)

The X button code looks correct (lines 96-102):
```typescript
<TouchableOpacity
  style={styles.closeButton}
  onPress={handleClose}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
  <X size={24} color={DS.colors.textDark} />
</TouchableOpacity>
```

**Investigation needed:** The `handleClose` calls `onClose()` which in `claim.tsx` calls `router.push('/(tabs)/more')`. The modal uses `presentationStyle="pageSheet"` — the issue may be that the modal's `onClose` runs before the router push completes, or the modal doesn't properly dismiss on some iOS versions.

**Fix:** Ensure `handleClose` dismisses the modal state before routing, and add a small delay if needed. Also verify the `onRequestClose` (Android back button) works. Keep the component itself intact for potential future use.

### Navigation Changes

- New route consideration: When user taps "Claim Status" from More tab with pending claim, navigate to `/business/claim` but skip to the `pending` step directly. This can be done via a query param: `router.push('/business/claim?status=pending')`.

## Security

No security changes. Existing RLS policies on `restaurant_claims` already restrict users to viewing only their own claims.

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| User has rejected claim (not pending) | Show "Claim Your Restaurant" normally | Only hide when status is `pending` |
| User has multiple claims (different restaurants) | Show "Claim Status" if ANY claim is pending | `hasPendingClaim()` checks for any pending claim |
| App is offline | Growth items show normal state | Pending check fails gracefully, defaults to showing normal items |
| User submitted claim in current session | Growth items update on tab focus | `useFocusEffect` triggers re-check |

## Error Handling

| Error Condition | User Message | Recovery Action |
|-----------------|--------------|-----------------|
| Failed to check pending claim | None (show default items) | Silently fall back to showing "Claim Your Restaurant" |
| Navigation from "Claim Status" fails | None | Standard Expo Router error handling |

## Implementation Phases

### Phase 1: Remove Beta Gate from Both Flows + Fix X Button (TRO-163, TRO-169)
**Goal**: Remove passcode requirement from both claim and creator flows, verify X button

#### Tasks
- [ ] **Task 1.1**: Remove BetaAccessGate from `app/business/claim.tsx`
  - Files: `app/business/claim.tsx`
  - Acceptance: Claim flow starts at search step, no passcode prompt
- [ ] **Task 1.2**: Remove BetaAccessGate from `app/creator/onboarding.tsx`
  - Files: `app/creator/onboarding.tsx`
  - Acceptance: Creator onboarding starts directly, no passcode prompt
- [ ] **Task 1.3**: Verify and fix X button on BetaAccessGate component (keep component for future use)
  - Files: `components/BetaAccessGate.tsx`
  - Acceptance: X button reliably closes modal — component preserved but unused

### Phase 2: Conditional Growth Items (TRO-161)
**Goal**: Hide/replace growth items based on claim status

#### Tasks
- [ ] **Task 2.1**: Add `hasPendingClaim()` to `restaurantClaimService.ts`
  - Files: `services/restaurantClaimService.ts`
  - Acceptance: Method returns correct pending status for current user
- [ ] **Task 2.2**: Update More tab growth items with pending claim awareness
  - Files: `app/(tabs)/more.tsx`
  - Acceptance: Pending claim hides "Become a Creator", replaces "Claim Your Restaurant" with "Claim Status"
- [ ] **Task 2.3**: Handle "Claim Status" navigation to show pending confirmation
  - Files: `app/business/claim.tsx`
  - Acceptance: Navigating with pending status shows the "Claim Submitted" screen

### Phase 3: Verify TRO-160
**Goal**: Confirm "View Business Dashboard" is not shown

#### Tasks
- [ ] **Task 3.1**: Verify current claim.tsx pending step has no dashboard button
  - Files: `app/business/claim.tsx`
  - Acceptance: Pending step only shows "Back to More" — already confirmed in code review

## Testing Requirements

### Unit Tests
- [ ] `hasPendingClaim()` returns `{ hasPending: true }` when user has pending claim
- [ ] `hasPendingClaim()` returns `{ hasPending: false }` when no pending claims
- [ ] `hasPendingClaim()` returns `{ hasPending: false }` when claim is rejected/expired

### E2E Tests (Maestro)
- [ ] Claim flow starts at search step (no beta gate)
- [ ] After submitting claim, More tab shows "Claim Status" instead of "Claim Your Restaurant"
- [ ] Tapping "Claim Status" shows pending confirmation screen

### Manual Testing
- [ ] Submit a claim, go to More tab — verify "Become a Creator" hidden
- [ ] Submit a claim, go to More tab — verify "Claim Status" shown with correct subtitle
- [ ] Tap "Claim Status" — verify pending screen shown
- [ ] If still using Beta Gate elsewhere, verify X button works on iOS

## Acceptance Criteria

- [ ] Claim flow no longer requires beta passcode `TROODIE2025`
- [ ] After claim submission, "Become a Creator" is hidden on More tab
- [ ] After claim submission, "Claim Your Restaurant" is replaced with "Claim Status"
- [ ] "Claim Status" tap shows the pending confirmation screen
- [ ] X button on Beta Access Gate (if still used for creator flow) reliably closes and navigates back
- [ ] No "View Business Dashboard" button on claim submitted screen (already confirmed)
- [ ] Once claim is approved and user becomes business, normal business tools appear
