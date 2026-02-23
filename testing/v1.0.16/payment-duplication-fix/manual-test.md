# Manual Test Script: Payment Duplication Fix

> Feature: payment-duplication-fix
> Date: 2026-02-18

## Prerequisites

- Business account (restaurant owner)
- Creator account with Stripe onboarding
- Active campaign with 3 deliverables

## Scenario 1: Individual Approval (Happy Path)

1. Approve deliverable 1 of 3 -> NO payout, log shows "Not all deliverables approved"
2. Approve deliverable 2 of 3 -> NO payout
3. Approve deliverable 3 of 3 -> PAYOUT triggered, exactly once

## Scenario 2: Bulk Approval

1. Bulk approve all 3 -> exactly 1 payout triggered

## Scenario 3: Single Deliverable

1. Approve 1/1 -> payout triggers immediately

## Scenario 4: Partial Rejection

1. Approve 1, Reject 2, Approve 3 -> NO payout
2. Creator resubmits 2, Approve resubmitted -> PAYOUT triggers

## Scenario 5: Duplicate Guard

1. All approved, payout processing
2. Manual processDeliverablePayout call -> blocked by guard

## Verification SQL

```sql
SELECT id, status, payment_amount_cents, payment_status
FROM campaign_deliverables
WHERE campaign_application_id = '<id>'
ORDER BY created_at;
```
