# v1.0.17 Implementation Learnings

> Date: 2026-02-22
> Batch: Restaurant Onboarding Fixes (TRO-160, 161, 162, 163, 168, 169, 170)
> Method: /groom → /approve → parallel agent team with git worktrees

## Pipeline Summary

| Stage | Duration | Notes |
|-------|----------|-------|
| Grooming (7 tickets → 4 specs) | ~15 min | Codebase exploration + spec writing |
| Stakeholder Q&A | Manual | User answered all questions in-file |
| Approval | ~5 min | Incorporated answers, updated specs + status |
| Parallel Implementation | ~10 min | 4 agents in worktrees |
| Merge + Verification | ~3 min | All changes landed cleanly |

**Total tickets**: 7
**Total specs**: 4 (grouped by coupling)
**Total agents**: 4 (parallel)
**Merge conflicts**: 0

---

## What Worked Well

### 1. Ticket Grouping
Grouping 7 tickets into 4 specs by coupling was the right call:
- TRO-160/161/163/169 all touched the claim flow and More tab → one spec
- TRO-162 (auth refresh) was isolated → standalone spec
- TRO-170 (multi-restaurant) was isolated and large → standalone spec
- TRO-168 (communities) was isolated → standalone spec

**Benefit**: Reduced context switching, prevented merge conflicts between agents working on the same files.

### 2. Worktree Isolation
Each agent worked in its own git worktree. Despite agents touching overlapping areas (e.g., both `ux-fixes-agent` and `multi-restaurant-agent` touched `app/business/claim.tsx`), the changes were non-overlapping and merged cleanly.

**Key pattern**: Spec each agent's scope clearly — "do NOT modify X" boundaries prevent conflicts.

### 3. Thorough Codebase Exploration Before Grooming
Running 3 parallel explore agents before writing specs ensured:
- Accurate file references (exact line numbers, function names)
- Discovery of existing infrastructure (RestaurantContext, RestaurantSwitcher already existed for multi-restaurant)
- Identification of the root cause for TRO-162 (no AppState listener, not a Supabase issue)
- Confirmation that TRO-160 was already fixed in current code

### 4. Stakeholder Questions Prevented Rework
Key decisions caught by questions:
- Q1 on UX fixes: User chose Option B (remove beta gate from BOTH flows) — spec initially assumed A (claim only)
- Q1 on refresh: User chose Option B (both AppState + realtime) — spec initially recommended A (AppState only)
- Q3 on multi-restaurant: User chose Option A (include in v1.0.17) — spec recommended deferring
- Q2 on communities: User chose Option B (also hide from Explore) — spec recommended A (Home + Add only)

**Without questions, 4 of 4 specs would have been implemented with wrong scope.**

---

## Issues Encountered

### 1. Pre-existing Lint/Typecheck Errors
The codebase has pre-existing errors:
- `scripts/trigger-payout-for-deliverable.ts` — has TypeScript parse errors
- ESLint import resolver issues — `@typescript-eslint/parser` not found, theme module paths

**Impact**: Made it harder for agents to verify their changes cleanly. They had to mentally filter pre-existing errors.

**Recommendation**: Fix pre-existing errors in a dedicated cleanup task before the next batch.

### 2. `.single()` → `.maybeSingle()` Pattern for Multi-Restaurant
The `multi-restaurant-agent` had to convert several `.single()` Supabase calls to `.maybeSingle()` or `limit(1).maybeSingle()` because the schema change allows multiple `business_profiles` rows per user.

**Pattern to remember**: Any Supabase query that assumes a single business profile per user needs updating when supporting multi-restaurant. Key files:
- `services/accountService.ts`
- `services/adminReviewService.ts`
- `services/restaurantClaimService.ts`
- `app/(tabs)/business/campaigns/create.tsx`

### 3. Campaign Filtering by `owner_id` vs `restaurant_id`
The campaign list (`business/campaigns/index.tsx`) was filtering by `owner_id` instead of `restaurant_id`. For single-restaurant users this was equivalent, but for multi-restaurant it would show all campaigns regardless of selected restaurant.

**Pattern to remember**: All business dashboard queries should filter by `currentRestaurantId` from `RestaurantContext`, not by `owner_id`.

---

## Patterns to Reuse

### 1. Spec Template with Stakeholder Questions
The `/groom` template with Priority Questions (blocking) and Design Tradeoffs (has defaults) is effective. Keep using:
- Priority Questions for scope decisions
- Design Tradeoffs for implementation choices with sensible defaults
- Nice-to-Know for future planning context

### 2. Agent Scope Boundaries
When spawning parallel agents, explicitly state:
- Which files to modify
- Which files NOT to modify
- Which other agents are handling related work

### 3. `useFocusEffect` for Refresh Patterns
The More tab uses `useFocusEffect` to refresh data when the tab comes into focus. This pattern works well for:
- Checking pending claim status
- Refreshing profile data
- Any data that might change while the user is on another tab

### 4. Conditional Feature Rendering Pattern
```typescript
const { isBusiness } = useAccountType();
// Skip API call
const data = isBusiness ? defaultValue : await service.getData();
// Hide UI
{!isBusiness && <CommunitySection />}
```

---

## Edge Cases Found During Implementation

1. **BetaAccessGate X button**: The component's `handleClose` calls `onClose()` which triggers navigation. On some iOS versions with `presentationStyle="pageSheet"`, the modal dismiss animation may interfere with router navigation. The agents kept the component for future use but it should be tested on-device.

2. **`hasPendingClaim()` with `.single()`**: If a user has multiple pending claims (for different restaurants), `.single()` would fail. The implementation uses `.limit(1).single()` to handle this.

3. **Real-time subscription on `users` table**: The `users` table was NOT in the Supabase realtime publication. A migration was created to add it. This needs to be pushed to the remote database.

4. **Campaign create screen payment method**: Was fetching payment method with `.single()` which would fail for multi-restaurant users. Fixed to use `.maybeSingle()`.

---

## Technical Debt Introduced

1. **`BetaAccessGate` component is unused** — kept "for future use" per stakeholder. Consider removing if not used within 2 releases.

2. **`business_profiles` unique constraint migration** — needs manual testing against production data before deploying. Verify no duplicate `(user_id, restaurant_id)` pairs exist.

3. **Realtime publication for `users` table** — may increase Supabase realtime bandwidth. Monitor usage after deploy.

4. **Pre-existing errors in `scripts/trigger-payout-for-deliverable.ts`** — should be fixed to make CI/CD trustworthy.

---

## Recommendations for Next Batch

1. **Fix pre-existing lint/typecheck errors first** — creates a clean baseline for verifying agent changes
2. **Continue grouping related tickets** — the 7→4 grouping saved significant merge complexity
3. **Run explore agents before grooming** — understanding the codebase deeply makes specs accurate and prevents agents from getting stuck
4. **Always include "do NOT modify" boundaries** — prevents agents from accidentally stepping on each other's work
5. **Consider adding a merge verification agent** — a final agent that runs after all others to verify the integrated result
6. **Push migrations separately from code changes** — schema changes should be deployed and verified before app code that depends on them
