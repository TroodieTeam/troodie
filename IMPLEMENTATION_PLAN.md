# Implementation Plan: Payment Duplication Fix

> Generated from spec: `specs/features/payment-duplication-fix/spec.md`
> Created: 2026-02-18

## Overview

Fix a critical payment bug where each deliverable approval triggers a separate full-amount payout ($35 x 3 = $105 instead of $35 total). Payment should trigger only once per campaign application when ALL deliverables are approved.

## Progress Tracking

See `PROGRESS.md` for current task status.

## Phases

### Phase 1: Fix Payment Trigger Logic (Critical)

**Goal**: Stop per-deliverable payouts, trigger only when all approved.

#### Tasks

- [ ] **Task 1.1**: Modify `approveDeliverable()` to check all deliverables approved before payout
  - Description: After approving a deliverable, query all deliverables for the same `campaign_application_id`. Only call `processDeliverablePayout()` when every deliverable has status 'approved' or 'auto_approved'.
  - Files: `services/deliverableReviewService.ts`
  - Tests: Typecheck, lint
  - Acceptance: Approving 1 of 3 deliverables does NOT trigger payout

- [ ] **Task 1.2**: Add duplicate payout guard in `processDeliverablePayout()`
  - Description: Before processing a payout, check if any deliverable for the same `campaign_application_id` already has `payment_status` of 'processing' or 'completed'. If so, skip the payout.
  - Files: `services/payoutService.ts`
  - Tests: Typecheck, lint
  - Acceptance: If any deliverable in the same application already has processing/completed payment, skip

- [ ] **Task 1.3**: Update `triggerAutoApproval()` to group by application and only payout when all approved
  - Description: After auto-approving deliverables, group results by `campaign_application_id`. For each application, check if ALL deliverables are now approved before triggering payout.
  - Files: `services/deliverableReviewService.ts`
  - Tests: Typecheck, lint
  - Acceptance: Auto-approving 1 of 3 does not trigger payout

- [ ] **Task 1.4**: Verify `bulkApproveDeliverables()` works correctly with new logic
  - Description: `bulkApproveDeliverables()` calls `approveDeliverable()` sequentially, so Task 1.1 fix handles it. Verify no changes needed.
  - Files: `services/deliverableReviewService.ts`
  - Tests: Typecheck, lint
  - Acceptance: Bulk approving 3 deliverables triggers exactly 1 payout

### Phase 2: Payment Amount Cleanup

**Goal**: Ensure payment amount is correctly assigned only to the trigger deliverable.

#### Tasks

- [ ] **Task 2.1**: Only set `payment_amount_cents` on the trigger deliverable
  - Description: When not all deliverables are approved yet, skip setting `payment_amount_cents`. Only set it on the last-approved deliverable that triggers the payout.
  - Files: `services/deliverableReviewService.ts`
  - Tests: Typecheck, lint
  - Acceptance: Only the last-approved deliverable has `payment_amount_cents` set

### Phase 3: Testing Artifacts

**Goal**: Create testing and verification artifacts.

#### Tasks

- [ ] **Task 3.1**: Create manual test script
  - Description: Write manual test scenarios for payment duplication fix
  - Files: `testing/manual/payment-duplication-fix-manual-test.md`
  - Tests: N/A
  - Acceptance: Comprehensive test scenarios

- [ ] **Task 3.2**: Create verification SQL, reset SQL, and audit SQL
  - Description: Write SQL scripts for verifying the fix and auditing historical overpayments
  - Files: `testing/sql/payment-duplication-fix-verify.sql`, `testing/sql/payment-duplication-fix-reset.sql`, `testing/sql/payment-duplication-audit.sql`
  - Tests: N/A
  - Acceptance: SQL scripts exist and are syntactically valid

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

- The `campaign_application_id` field exists on `campaign_deliverables` and links all deliverables for a single creator's campaign application
- The `auto_approve_overdue_deliverables` SQL function returns `campaign_application_id` in its result set
- `bulkApproveDeliverables()` calls `approveDeliverable()` sequentially, so the all-approved check naturally handles bulk approval
- The `approveDeliverable()` select query currently does not include `campaign_application_id` — needs to be added
