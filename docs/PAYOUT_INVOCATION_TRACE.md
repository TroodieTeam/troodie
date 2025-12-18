# Payout Invocation Trace Guide

## When `stripe-process-payout` Should Be Invoked

The `stripe-process-payout` Edge Function is automatically invoked when:

1. **Deliverable is approved** → `approveDeliverable()` calls `processDeliverablePayout()`
2. **Manual retry** → Creator clicks "Retry" button in payments UI

## Payout Flow Trace

### Step 1: Approval Triggers Payout
```
approveDeliverable()
  ↓
  Sets payment_amount_cents
  ↓
  Calls processDeliverablePayout()
```

### Step 2: Payout Validation Checks
```
processDeliverablePayout()
  ↓
  ✅ Check: Deliverable exists
  ✅ Check: Deliverable status = 'approved' or 'auto_approved'
  ✅ Check: payment_status != 'completed' (not already paid)
  ✅ Check: Creator has stripe_account_id
  ✅ Check: Creator onboarding_completed = true
  ✅ Check: Campaign payment exists and succeeded
  ✅ Check: payment_amount_cents > 0
  ↓
  ✅ All checks passed → Invoke stripe-process-payout
```

## Common Blockers & Solutions

### Blocker 1: `payment_amount_cents` is NULL/0
**Symptom**: Log shows `❌ Invalid payout amount`
**Solution**: Run `scripts/fix-null-payment-amount.sql` to set the amount, then retry

### Blocker 2: Creator needs Stripe onboarding
**Symptom**: Log shows `⏸️ Blocked - creator needs Stripe account` or `⏸️ Blocked - creator onboarding not completed`
**Solution**: Creator must complete Stripe onboarding first

### Blocker 3: Deliverable not approved
**Symptom**: Log shows `❌ Deliverable not approved`
**Solution**: Approve the deliverable first

### Blocker 4: Campaign payment not succeeded
**Symptom**: Log shows `❌ Campaign payment not found or not completed`
**Solution**: Ensure business has paid for the campaign (`campaign_payments.status = 'succeeded'`)

## Log Trace Examples

### ✅ Successful Flow
```
[DeliverableReview] 🚀 Triggering payout after approval
[PayoutService] 🚀 Starting payout process
[PayoutService] 📋 Deliverable details: { payment_amount_cents: 2500, ... }
[PayoutService] ✅ All checks passed - invoking stripe-process-payout
[PayoutService] ✅ Payout initiated successfully
[DeliverableReview] ✅ Payout initiated successfully
```

### ❌ Blocked by Missing Amount
```
[DeliverableReview] 🚀 Triggering payout after approval
[PayoutService] 🚀 Starting payout process
[PayoutService] 📋 Deliverable details: { payment_amount_cents: null, ... }
[PayoutService] ❌ Invalid payout amount
[DeliverableReview] ❌ Payout failed: Invalid payout amount
```

### ⏸️ Blocked by Onboarding
```
[DeliverableReview] 🚀 Triggering payout after approval
[PayoutService] 🚀 Starting payout process
[PayoutService] 📋 Deliverable details: { has_stripe_account: false, ... }
[PayoutService] ⏸️ Blocked - creator needs Stripe account
[DeliverableReview] ⏸️ Payout deferred - creator needs onboarding
```

## Manual Retry

If payout fails, you can manually retry:

1. **Fix the blocker** (set `payment_amount_cents`, complete onboarding, etc.)
2. **Call from payments UI**: Click "Retry" button
3. **Or call directly**:
   ```typescript
   import { processDeliverablePayout } from '@/services/payoutService';
   await processDeliverablePayout('deliverable-id');
   ```

## Do You Need to Manually Invoke?

**Answer**: Only if:
- `payment_amount_cents` was NULL/0 when approved (fix amount first, then retry)
- Payout failed due to a transient error (retry)
- You want to retry a failed payout

**Otherwise**: Payout is automatically invoked during approval.
