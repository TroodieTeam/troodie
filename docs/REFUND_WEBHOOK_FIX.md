# Refund Webhook Handler Fix

## Problem Summary

A restaurant started two campaigns and paid for them. One campaign had issues, so the payment statuses were manually updated in the database (two incomplete transactions). However, there was a payout back to the card even though **no creator had applied for the campaign**.

## Root Cause

The "payout" was actually a **refund**, not a creator payout. Here's what happened:

1. **Payment intents were created** but never completed (status: "incomplete")
2. **Stripe automatically refunded** the incomplete payment intents (or they expired/were canceled)
3. **The webhook didn't handle refund events**, so the database wasn't updated
4. **The refund appeared as a "payout"** in Stripe Dashboard, causing confusion

### Why No Creator Payout Should Have Happened

Payouts to creators are **only** triggered when:
- A deliverable is approved (`approveDeliverable()` → `processDeliverablePayout()`)
- The deliverable has `status = 'approved'` or `'auto_approved'`
- The campaign payment has `status = 'succeeded'`
- The creator has completed Stripe onboarding

Since no creator applied, no deliverables existed, so no payout should have occurred.

## Solution

Added webhook handlers for refund and cancellation events:

### 1. `payment_intent.canceled` Handler
- Updates `campaign_payments.status` → `'failed'`
- Updates `campaigns.payment_status` → `'unpaid'`
- Sends notification to business

### 2. `charge.refunded` Handler
- Updates `campaign_payments.status` → `'refunded'` or `'partially_refunded'`
- Updates `campaigns.payment_status` → `'refunded'`
- Creates `payment_transactions` record with `transaction_type = 'refund'`
- Sends notification to business

### 3. `refund.created` Handler
- Updates payment and campaign statuses
- Creates/updates refund transaction records
- Handles both full and partial refunds

## Files Changed

- `supabase/functions/stripe-webhook/index.ts`
  - Added `handlePaymentIntentCanceled()` function
  - Added `handleChargeRefunded()` function
  - Added `handleRefundCreated()` function
  - Added webhook event handlers for:
    - `payment_intent.canceled`
    - `charge.refunded`
    - `refund.created`

## Testing Recommendations

1. **Test canceled payment intent:**
   - Create a payment intent
   - Cancel it via Stripe Dashboard or API
   - Verify webhook updates database correctly

2. **Test refund:**
   - Create a successful payment
   - Issue a refund via Stripe Dashboard
   - Verify webhook creates refund transaction record

3. **Test partial refund:**
   - Create a successful payment
   - Issue a partial refund
   - Verify status is `'partially_refunded'`

## Prevention

Going forward, the system will:
- ✅ Automatically update database when refunds occur
- ✅ Track refund transactions in `payment_transactions` table
- ✅ Notify businesses when refunds are issued
- ✅ Properly distinguish between refunds (money back to business) and payouts (money to creators)

## Related Documentation

- [Payment Flow Analysis](./PAYMENT_FLOW_ANALYSIS.md)
- [Payout Invocation Trace](./PAYOUT_INVOCATION_TRACE.md)
- [Payment vs Payout Clarification](./PAYMENT_VS_PAYOUT_CLARIFICATION.md)

