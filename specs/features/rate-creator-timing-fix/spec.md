# Rate Creator Timing Fix Technical Specification

> Status: APPROVED
> Created: 2026-02-17
> Source: Raw ticket — "Rate Creator" Appears Before Work Completed
> Feature: rate-creator-timing-fix

## Overview

Fix the "Rate Creator" button appearing immediately after accepting a creator's application, before the creator has submitted or had any deliverables approved. The button should only appear after ALL deliverables are approved and posted.

## Problem Statement

The "Rate Creator" button in `ApplicationsList.tsx:78` uses the condition `app.status === 'accepted' && !app.rating`, which is satisfied immediately upon accepting an application — before the creator has even visited the restaurant or submitted any content. This creates a confusing UX where the business can attempt to rate a creator who hasn't done any work yet.

The `ratingService.ts:canRateApplication()` function correctly validates that all deliverables must be approved before rating, but the UI doesn't call this function before rendering the button. The service-side guard prevents the actual rating from saving, but the button shouldn't appear at all.

**Affected components**:
1. `components/campaigns/detail/ApplicationsList.tsx:78` — Shows "Rate Creator" when `status === 'accepted' && !app.rating`
2. `components/campaigns/detail/DeliverableCard.tsx:250` — Shows "Rate Creator" when `isApproved && !deliverable.campaign_applications?.rating` (per-deliverable — **to be removed per Q1 decision**)
3. `app/(tabs)/business/applications/[id].tsx` — Application detail screen (**to be updated per Q3 decision**)

## User Stories

- As a business owner, I want to rate a creator only after their work is complete, so I can provide an accurate assessment.
- As a business owner, I don't want to see a "Rate Creator" button before the creator has done anything, because it's confusing.

## Technical Design

### Current Behavior

```
Accept application → status = 'accepted' → "Rate Creator" button appears immediately
                                           (creator hasn't done anything yet)
```

### Fixed Behavior

```
Accept application → status = 'accepted' → Show "Awaiting Content" status
Creator submits deliverables             → Show "Pending Review" status
Restaurant approves ALL deliverables     → "Rate Creator" button appears
```

### Changes Required

#### 1. `components/campaigns/detail/ApplicationsList.tsx`

**Current** (line 78):
```tsx
{app.status === 'accepted' && !app.rating && (
  <TouchableOpacity onPress={() => onOpenRating(app.id)}>
    <Text>Rate Creator</Text>
  </TouchableOpacity>
)}
```

**Fix**: Add deliverable status check. The `CampaignApplication` type needs to include deliverable summary data, or the component needs to call `canRateApplication()`.

**Option A (preferred — data-driven)**: Extend the query that loads applications to include a deliverable count summary, then check in the UI:

```tsx
{app.status === 'accepted' && !app.rating && app.all_deliverables_approved && (
  <TouchableOpacity onPress={() => onOpenRating(app.id)}>
    <Text>Rate Creator</Text>
  </TouchableOpacity>
)}
```

Add a status label when accepted but deliverables not yet complete:
```tsx
{app.status === 'accepted' && !app.rating && !app.all_deliverables_approved && (
  <View>
    <Text>Awaiting deliverables ({app.approved_count}/{app.total_count} approved)</Text>
  </View>
)}
```

#### 2. Campaign Detail Screen — Application Query Enhancement

In `app/(tabs)/business/campaigns/[id].tsx`, the query that loads applications needs to include deliverable status. Add a derived field by querying `campaign_deliverables` grouped by `campaign_application_id`.

```typescript
// After loading applications, enrich with deliverable status
for (const app of applications) {
  const { data: deliverables } = await supabase
    .from('campaign_deliverables')
    .select('id, status')
    .eq('campaign_application_id', app.id);

  const total = deliverables?.length ?? 0;
  const approved = deliverables?.filter(
    d => ['approved', 'auto_approved'].includes(d.status)
  ).length ?? 0;

  app.total_deliverables = total;
  app.approved_deliverables = approved;
  app.all_deliverables_approved = total > 0 && approved === total;
}
```

#### 3. `components/campaigns/detail/DeliverableCard.tsx`

**Current** (line 250): Shows "Rate Creator" per individual approved deliverable.

**Decision (Q1: Option A)**: Remove the "Rate Creator" button from `DeliverableCard.tsx` entirely. Rating is a per-application action, not per-deliverable, so the single button on the application card in `ApplicationsList.tsx` is the correct and only location.

#### 4. `app/(tabs)/business/applications/[id].tsx`

**Decision (Q3)**: Update the application detail screen to show deliverable progress and the "Rate Creator" button (when all deliverables are approved), consistent with the `ApplicationsList.tsx` behavior.

#### 5. `types/campaign.ts` — CampaignApplication Type

Add optional fields for deliverable status:

```typescript
interface CampaignApplication {
  // ... existing fields
  total_deliverables?: number;
  approved_deliverables?: number;
  all_deliverables_approved?: boolean;
}
```

### Services

| Service | File | Methods | Description |
|---------|------|---------|-------------|
| RatingService | `services/ratingService.ts` | `canRateApplication` | Already correct — no changes needed |

### Components

- [ ] `ApplicationsList.tsx` — Add deliverable status check before showing "Rate Creator"; add status labels (Q2: Option A)
- [ ] `DeliverableCard.tsx` — Remove "Rate Creator" button entirely (Q1: Option A)
- [ ] Campaign detail screen — Enrich application data with deliverable status
- [ ] Application detail screen (`app/(tabs)/business/applications/[id].tsx`) — Add deliverable progress and "Rate Creator" (Q3)

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| Application accepted, 0 deliverables submitted | Show "Awaiting Content" | `total_deliverables === 0` |
| 2/3 deliverables approved, 1 pending | Show progress "2/3 approved" | Don't show "Rate Creator" |
| All deliverables auto-approved | Show "Rate Creator" | `auto_approved` counts as approved |
| Application accepted but no deliverables defined for campaign | Show "Rate Creator" after any deliverable approved | Edge case — may need default behavior |
| Creator already rated | Show "Rated X/5" (existing behavior) | No change needed |

## Error Handling

| Error Condition | User Message | Recovery Action |
|-----------------|--------------|-----------------|
| Deliverable status query fails | Fall back to hiding "Rate Creator" | Log error, hide button as safe default |
| Rating attempt on incomplete work | "All deliverables must be approved" | `ratingService.ts` already handles this |

## Implementation Phases

### Phase 1: Fix ApplicationsList Button Visibility (MVP)
**Goal**: "Rate Creator" only appears when all deliverables are approved.

#### Tasks
- [ ] **Task 1.1**: Add `total_deliverables`, `approved_deliverables`, `all_deliverables_approved` to `CampaignApplication` type
  - Files: `types/campaign.ts`
  - Acceptance: Type compiles with new optional fields
- [ ] **Task 1.2**: Enrich application data with deliverable status in campaign detail screen
  - Files: `app/(tabs)/business/campaigns/[id].tsx`
  - Acceptance: Each application object has deliverable counts populated
- [ ] **Task 1.3**: Update `ApplicationsList.tsx` to check `all_deliverables_approved` before showing "Rate Creator"
  - Files: `components/campaigns/detail/ApplicationsList.tsx`
  - Acceptance: "Rate Creator" hidden for accepted apps with 0 or incomplete deliverables
- [ ] **Task 1.4**: Remove "Rate Creator" button from `DeliverableCard.tsx` entirely (Q1: Option A)
  - Files: `components/campaigns/detail/DeliverableCard.tsx`
  - Acceptance: No "Rate Creator" button on any deliverable card; rating is only on the application card
- [ ] **Task 1.5**: Update application detail screen with deliverable progress and "Rate Creator" button (Q3)
  - Files: `app/(tabs)/business/applications/[id].tsx`
  - Acceptance: Application detail shows deliverable progress; "Rate Creator" appears only when all deliverables approved

### Phase 2: Add Status Indicators
**Goal**: Show meaningful status when "Rate Creator" is not yet available.

#### Tasks
- [ ] **Task 2.1**: Add "Awaiting Content" / "X/Y Approved" progress label to `ApplicationsList.tsx`
  - Files: `components/campaigns/detail/ApplicationsList.tsx`
  - Acceptance: Business sees deliverable progress for accepted applications

## Testing Requirements

### Unit Tests
- [ ] "Rate Creator" button not rendered when `all_deliverables_approved` is false
- [ ] "Rate Creator" button rendered when `all_deliverables_approved` is true and `rating` is null
- [ ] "Rated X/5" shown when rating exists (existing behavior preserved)

### Manual Testing
- [ ] Accept application → verify "Rate Creator" does NOT appear
- [ ] Submit 1 of 3 deliverables → verify "Rate Creator" does NOT appear
- [ ] Approve all 3 deliverables → verify "Rate Creator" appears
- [ ] Rate creator → verify "Rated X/5" replaces button

## Acceptance Criteria

- [ ] "Rate Creator" button only visible after ALL deliverables are approved
- [ ] Accepted applications with no/incomplete deliverables show status indicator instead
- [ ] Existing rating display ("Rated X/5") still works
- [ ] `ratingService.ts` server-side guard unchanged (defense in depth)
