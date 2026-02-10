# Implementation Plan: Campaign Acceptance RLS Fix

> Generated from spec: `specs/features/campaign-acceptance-rls-fix/spec.md`
> Created: 2026-02-09

## Overview

Fix two critical bugs (TRO-148, TRO-149) where admin RLS policies on `campaign_applications` and `campaign_deliverables` tables use hardcoded UUIDs instead of the `users.role = 'admin'` pattern, preventing admins from accepting applications and approving deliverables.

## Progress Tracking

See `PROGRESS.md` for current task status.

## Phases

### Phase 1: Fix RLS Policies (Critical)

**Goal**: Unblock admin acceptance workflow for both applications and deliverables

#### Tasks

- [ ] **Task 1.1**: Create RLS migration
  - Description: Create `supabase/migrations/20260209_fix_campaign_acceptance_rls.sql` that replaces hardcoded UUID admin policies with `users.role = 'admin'` pattern on both `campaign_applications` and `campaign_deliverables` tables. Also tightens business owner policy by removing legacy `OR creator_id` clause. Ensures admin role is set for both dev and prod admin accounts.
  - Files: NEW `supabase/migrations/20260209_fix_campaign_acceptance_rls.sql`
  - Tests: SQL syntax review, verify policies reference correct tables/columns
  - Acceptance: Migration file exists with correct SQL; policies use `users.role = 'admin'` pattern

### Phase 2: Improve Error Handling

**Goal**: Better debugging and user-facing error messages

#### Tasks

- [ ] **Task 2.1**: Update `handleApplicationAction` error handling
  - Description: In `hooks/useCampaignActions.ts`, update the catch block in `handleApplicationAction()` to log the actual Supabase error and show a more descriptive message to the user
  - Files: `hooks/useCampaignActions.ts`
  - Tests: `npm run typecheck`, `npm run lint`
  - Acceptance: Console shows actual Supabase error; user sees descriptive message

- [ ] **Task 2.2**: Update `handleDeliverableStatusChange` error handling
  - Description: In `hooks/useCampaignActions.ts`, update the catch block in `handleDeliverableStatusChange()` to log the actual Supabase error
  - Files: `hooks/useCampaignActions.ts`
  - Tests: `npm run typecheck`, `npm run lint`
  - Acceptance: Console shows actual Supabase error; user sees descriptive message

## Validation Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm test
```

## Notes

- Task 2.3 from spec (column name verification) is confirmed as no-op — `reviewer_id` is correct
- The `campaign_deliverables_new` table cleanup is out of scope (Q4 default)
- Migration must be safe to run in both dev and prod (uses IF EXISTS for drops, safe UPDATEs)
