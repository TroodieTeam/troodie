# Payment Duplication Fix Technical Specification

> Status: APPROVED
> Created: 2026-02-17
> Source: Raw ticket — Payment Duplication Bug
> Feature: payment-duplication-fix

## Overview

Fix a critical payment bug where each deliverable approval triggers a separate full-amount payout ($35 x 3 = $105 instead of $35 total). Payment should trigger only once per campaign application when ALL deliverables are approved, not per individual deliverable.

## Stakeholder Decisions

- Q1: Option A — Pay only when ALL deliverables approved (rejected must be resubmitted)
- Q2: Option B — Run audit query for historical overpayments, manual refund review
- Q3: Option C — Both progress indicator UI and toast notification
- Q4: Typical campaigns have 3 deliverables

## Problem Statement

When a restaurant approves individual deliverables (e.g., IG Reel, TikTok, Troodie post) for a single campaign, each approval independently triggers `processDeliverablePayout()` with the full campaign payout amount. A creator with 3 deliverables receives 300% overpayment. This is a financial bug that directly impacts business costs.

**Root cause**: `deliverableReviewService.ts:147-162` — `approveDeliverable()` calls `processDeliverablePayout()` unconditionally for every approval. The payment amount is set from `campaign_payments.creator_payout_cents` (the full per-creator amount), not divided across deliverables.

## User Stories

- As a business owner, I want to pay the agreed campaign rate once per creator, not per deliverable, so that I'm not overcharged.
- As a creator, I want to receive payment once all my deliverables are approved, so I'm paid fairly and correctly.

## Technical Design

### Current Flow (Broken)

```
Approve IG Reel     → payment_amount_cents = $35 → processDeliverablePayout() → $35 transfer
Approve TikTok      → payment_amount_cents = $35 → processDeliverablePayout() → $35 transfer
Approve Troodie     → payment_amount_cents = $35 → processDeliverablePayout() → $35 transfer
                                                                       Total: $105 (BUG)
```

### Fixed Flow

```
Approve IG Reel     → status: approved → check: all approved? NO  → skip payout
Approve TikTok      → status: approved → check: all approved? NO  → skip payout
Approve Troodie     → status: approved → check: all approved? YES → processDeliverablePayout() → $35 transfer
                                                                       Total: $35 (CORRECT)
```

### Changes Required

#### 1. `services/deliverableReviewService.ts` — `approveDeliverable()`

**Current** (lines 141-162): Calls `processDeliverablePayout()` after every approval.

**Fix**: After approving a deliverable, check if ALL deliverables for this `campaign_application_id` are now approved. Only trigger payout when the last deliverable is approved.

```typescript
// After updating deliverable status to 'approved'...

// Check if ALL deliverables for this application are now approved
const { data: allDeliverables, error: allDelError } = await supabase
  .from('campaign_deliverables')
  .select('id, status')
  .eq('campaign_application_id', data.campaign_application_id);

if (allDelError) {
  console.error('[DeliverableReview] Error checking all deliverables:', allDelError);
}

const allApproved = allDeliverables?.every(
  d => ['approved', 'auto_approved'].includes(d.status)
) ?? false;

if (allApproved && allDeliverables && allDeliverables.length > 0) {
  // ALL deliverables approved — trigger single payout
  console.log('[DeliverableReview] All deliverables approved — triggering payout');
  try {
    const payoutResult = await processDeliverablePayout(params.deliverable_id);
    // ... existing error handling
  } catch (payoutError) {
    // ... existing catch
  }
} else {
  console.log('[DeliverableReview] Not all deliverables approved yet — skipping payout', {
    approved: allDeliverables?.filter(d => ['approved', 'auto_approved'].includes(d.status)).length,
    total: allDeliverables?.length,
  });
}
```

#### 2. `services/deliverableReviewService.ts` — `approveDeliverable()` payment amount

**Current** (lines 68-110): Sets `payment_amount_cents` on each deliverable to the full campaign payout.

**Fix**: Only set `payment_amount_cents` on the "trigger" deliverable (the last one approved), and set it to the full per-creator amount (NOT divided). The other deliverables keep `payment_amount_cents = 0` or null since they won't trigger payout.

#### 3. `services/payoutService.ts` — `processDeliverablePayout()`

Add a guard to prevent duplicate payouts for the same campaign application:

```typescript
// Check if any deliverable for this application already has a completed or processing payment
const { data: existingPayouts } = await supabase
  .from('campaign_deliverables')
  .select('id, payment_status')
  .eq('campaign_application_id', deliverableData.campaign_application_id)
  .in('payment_status', ['processing', 'completed']);

if (existingPayouts && existingPayouts.length > 0) {
  console.log('[PayoutService] Skipping — payout already processing/completed for this application');
  return { success: false, error: 'Payout already initiated for this campaign application' };
}
```

#### 4. Auto-approval handler — `triggerAutoApproval()`

**Current** (lines 458-470): Processes payout for each auto-approved deliverable individually.

**Fix**: After auto-approving deliverables, group by `campaign_application_id` and only trigger payout for applications where ALL deliverables are now approved.

### Database Changes

No schema changes required. The existing `payment_status` and `payment_amount_cents` fields on `campaign_deliverables` are sufficient.

### Services

| Service | File | Methods | Description |
|---------|------|---------|-------------|
| DeliverableReviewService | `services/deliverableReviewService.ts` | `approveDeliverable`, `bulkApproveDeliverables`, `triggerAutoApproval` | Add all-approved check before payout |
| PayoutService | `services/payoutService.ts` | `processDeliverablePayout` | Add duplicate payout guard |

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| Only 1 deliverable in campaign | Payout triggers on that single approval | allApproved check passes immediately |
| Bulk approve all deliverables | Payout triggers once on last iteration | `bulkApproveDeliverables` calls `approveDeliverable` sequentially; last one triggers |
| Some deliverables rejected | Payout never triggers (not all approved) | Rejected deliverables must be resubmitted and re-approved; payout only triggers when ALL are approved (Stakeholder Decision Q1: Option A) |
| Auto-approval of last deliverable | Payout triggers via auto-approval flow | Update `triggerAutoApproval` to check per-application |
| Deliverable re-submitted after rejection | Previous approved count maintained | Re-check all-approved after new approval |
| Concurrent approvals (race condition) | Only one payout processes | Duplicate guard in `processDeliverablePayout` prevents double pay |

## Error Handling

| Error Condition | User Message | Recovery Action |
|-----------------|--------------|-----------------|
| Payout already processing | (Silent — logged only) | Skip duplicate payout |
| All-approved check fails | (Silent — approval still succeeds) | Payout can be manually retried |
| Last deliverable auto-approved but payout fails | Creator notified | Retry via `retryFailedPayout` |

## Implementation Phases

### Phase 1: Fix Payment Trigger Logic (Critical)
**Goal**: Stop per-deliverable payouts, trigger only when all approved.

#### Tasks
- [x] **Task 1.1**: Modify `approveDeliverable()` in `deliverableReviewService.ts` to check all deliverables approved before calling `processDeliverablePayout()`
- [x] **Task 1.2**: Add duplicate payout guard in `processDeliverablePayout()`
- [x] **Task 1.3**: Update `triggerAutoApproval()` to group by application and only payout when all approved
- [x] **Task 1.4**: Update `bulkApproveDeliverables()` to avoid N payouts

### Phase 2: Payment Amount Cleanup
- [x] **Task 2.1**: Only set `payment_amount_cents` on the trigger deliverable, not all deliverables

### Phase 3: Testing Artifacts
- [x] **Task 3.1**: Create manual test script
- [x] **Task 3.2**: Create verification SQL, reset SQL, and audit SQL

## Acceptance Criteria

- [x] Approving individual deliverables does NOT trigger separate payouts
- [x] Single payout triggers only when ALL deliverables for a campaign application are approved
- [x] Payment amount equals the agreed per-creator campaign rate (not multiplied)
- [x] Auto-approval flow also respects the all-approved-before-payout rule
- [x] No duplicate payouts possible even with concurrent operations
