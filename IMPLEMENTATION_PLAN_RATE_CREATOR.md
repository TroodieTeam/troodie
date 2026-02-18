# Implementation Plan: Rate Creator Timing Fix

> Generated from spec: `specs/features/rate-creator-timing-fix/spec.md`
> Created: 2026-02-18

## Overview

Fix the "Rate Creator" button appearing immediately after accepting a creator's application. The button should only appear after ALL deliverables are approved and posted. Also remove the per-deliverable "Rate Creator" button (Q1: Option A) and add status indicators (Q2: Option A).

## Progress Tracking

See `PROGRESS_RATE_CREATOR.md` for current task status.

## Phases

### Phase 1: Fix Button Visibility (MVP)

**Goal**: "Rate Creator" only appears when all deliverables are approved.

#### Tasks

- [ ] **Task 1.1**: Add deliverable status fields to CampaignApplication type
  - Description: Add `total_deliverables`, `approved_deliverables`, `all_deliverables_approved` optional fields to the `CampaignApplication` interface in `types/campaign.ts`
  - Files: `types/campaign.ts`
  - Tests: TypeScript compilation
  - Acceptance: Type compiles with new optional fields

- [ ] **Task 1.2**: Enrich application data with deliverable status in useCampaignDetail hook
  - Description: After loading applications in `useCampaignDetail.ts`, query `campaign_deliverables` for each application to compute deliverable counts and set `all_deliverables_approved`
  - Files: `hooks/useCampaignDetail.ts`
  - Tests: TypeScript compilation
  - Acceptance: Each application object has deliverable counts populated

- [ ] **Task 1.3**: Update ApplicationsList to gate "Rate Creator" on all_deliverables_approved
  - Description: Change condition from `app.status === 'accepted' && !app.rating` to also require `app.all_deliverables_approved`. Add status labels for accepted-but-incomplete applications (Q2: Option A).
  - Files: `components/campaigns/detail/ApplicationsList.tsx`
  - Tests: TypeScript compilation
  - Acceptance: "Rate Creator" hidden for accepted apps with incomplete deliverables; status text shown instead

- [ ] **Task 1.4**: Remove "Rate Creator" button from DeliverableCard
  - Description: Per Q1 decision (Option A), remove the "Rate Creator" button from DeliverableCard entirely. Rating is per-application, not per-deliverable. Also remove the `onRateCreator` prop.
  - Files: `components/campaigns/detail/DeliverableCard.tsx`
  - Tests: TypeScript compilation
  - Acceptance: No "Rate Creator" button on any deliverable card

- [ ] **Task 1.5**: Update DeliverablesList and campaign detail screen to remove onRateCreator
  - Description: Since DeliverableCard no longer has `onRateCreator`, update DeliverablesList to remove the prop, and update campaign detail screen to stop passing it.
  - Files: `components/campaigns/detail/DeliverablesList.tsx`, `app/(tabs)/business/campaigns/[id].tsx`
  - Tests: TypeScript compilation
  - Acceptance: All references to onRateCreator in deliverables chain removed

### Phase 2: Update Application Detail Screen

**Goal**: Add deliverable progress and "Rate Creator" to the application detail screen (Q3).
**Depends on**: Phase 1

#### Tasks

- [ ] **Task 2.1**: Replace mock data with real data and add deliverable progress + Rate Creator button
  - Description: Load real application data with deliverable counts from Supabase. Show deliverable progress for accepted applications. Show "Rate Creator" button when all deliverables are approved.
  - Files: `app/(tabs)/business/applications/[id].tsx`
  - Tests: TypeScript compilation
  - Acceptance: Application detail shows real data with deliverable progress; "Rate Creator" appears only when all deliverables approved

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

- `ratingService.ts` already has server-side validation (defense in depth) - no changes needed
- The `canRateApplication()` function in ratingService.ts is correct; we're fixing the UI to match
- `DeliverableCard` currently accepts `onRateCreator` as optional prop - removing it is safe
- Application detail screen currently uses all mock data - Q3 says update it with real data
