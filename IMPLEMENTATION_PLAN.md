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

- [x] **Task 1.1**: Modify `approveDeliverable()` to check all deliverables approved before payout
- [x] **Task 1.2**: Add duplicate payout guard in `processDeliverablePayout()`
- [x] **Task 1.3**: Update `triggerAutoApproval()` to group by application and only payout when all approved
- [x] **Task 1.4**: Verify `bulkApproveDeliverables()` works correctly with new logic

### Phase 2: Payment Amount Cleanup

- [x] **Task 2.1**: Only set `payment_amount_cents` on the trigger deliverable

### Phase 3: Testing Artifacts

- [x] **Task 3.1**: Create manual test script
- [x] **Task 3.2**: Create verification SQL, reset SQL, and audit SQL

## Validation Commands

```bash
npm run typecheck
npm run lint
npm test
```
