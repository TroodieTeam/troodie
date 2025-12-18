# How to Verify Campaign Payment Status

This guide shows you how to verify if a user was charged when creating a campaign.

## Payment Flow Overview

1. **Campaign Created** → Campaign record created with `status: 'active'` and `payment_status: 'unpaid'`
2. **Payment Intent Created** → `stripe-create-payment-intent` Edge Function creates Stripe Payment Intent
3. **Payment Processed** → User completes payment via Stripe Checkout/Payment Sheet
4. **Webhook Updates** → Stripe webhook updates `campaign_payments` and `campaigns` tables

## Verification Methods

### Method 1: Check Campaign Payment Status (Recommended)

Query the `campaign_payments` table to see if payment was successful:

```sql
-- Check payment status for a specific campaign
SELECT 
  cp.id,
  cp.campaign_id,
  cp.status as payment_status,
  cp.amount_cents / 100.0 as amount_dollars,
  cp.paid_at,
  cp.stripe_payment_intent_id,
  c.title as campaign_title,
  c.payment_status as campaign_payment_status
FROM campaign_payments cp
JOIN campaigns c ON c.id = cp.campaign_id
WHERE cp.campaign_id = 'YOUR_CAMPAIGN_ID'
ORDER BY cp.created_at DESC
LIMIT 1;
```

**Payment Status Values:**
- `pending` - Payment intent created but not yet paid
- `processing` - Payment is being processed
- `succeeded` - ✅ Payment successful (user was charged)
- `failed` - Payment failed
- `refunded` - Payment was refunded

### Method 2: Check Campaign Table

The `campaigns` table has a `payment_status` column that's automatically updated:

```sql
-- Check campaign payment status
SELECT 
  id,
  title,
  payment_status,
  paid_at,
  payment_intent_id,
  status as campaign_status
FROM campaigns
WHERE id = 'YOUR_CAMPAIGN_ID';
```

**Campaign Payment Status Values:**
- `unpaid` - No payment yet
- `pending` - Payment intent created
- `paid` - ✅ Payment successful (user was charged)
- `failed` - Payment failed
- `refunded` - Payment was refunded

### Method 3: Check Payment Transactions

The `payment_transactions` table logs all payment events:

```sql
-- Check all payment transactions for a campaign
SELECT 
  id,
  campaign_id,
  transaction_type,
  status,
  amount_cents / 100.0 as amount_dollars,
  stripe_payment_intent_id,
  completed_at
FROM payment_transactions
WHERE campaign_id = 'YOUR_CAMPAIGN_ID'
  AND transaction_type = 'payment'
ORDER BY created_at DESC;
```

### Method 4: Check Stripe Dashboard

1. Go to https://dashboard.stripe.com/payments
2. Search for the `stripe_payment_intent_id` from `campaign_payments` table
3. Check the payment status in Stripe

## Quick Verification Query

Run this query to get a complete payment overview:

```sql
-- Complete payment verification for a campaign
SELECT 
  c.id as campaign_id,
  c.title,
  c.payment_status as campaign_payment_status,
  c.paid_at as campaign_paid_at,
  cp.id as payment_id,
  cp.status as payment_record_status,
  cp.amount_cents / 100.0 as amount_paid,
  cp.paid_at as payment_paid_at,
  cp.stripe_payment_intent_id,
  pt.id as transaction_id,
  pt.status as transaction_status,
  pt.completed_at as transaction_completed_at,
  CASE 
    WHEN cp.status = 'succeeded' AND c.payment_status = 'paid' THEN '✅ CHARGED'
    WHEN cp.status = 'pending' THEN '⏳ PENDING'
    WHEN cp.status = 'failed' THEN '❌ FAILED'
    ELSE '❓ UNKNOWN'
  END as verification_status
FROM campaigns c
LEFT JOIN campaign_payments cp ON cp.campaign_id = c.id
LEFT JOIN payment_transactions pt ON pt.campaign_id = c.id AND pt.transaction_type = 'payment'
WHERE c.id = 'YOUR_CAMPAIGN_ID'
ORDER BY cp.created_at DESC, pt.created_at DESC
LIMIT 1;
```

## Using the Payment Service (Code)

You can use the `getCampaignPaymentStatus` function for programmatic verification:

```typescript
import { getCampaignPaymentStatus } from '@/services/paymentService';

const paymentInfo = await getCampaignPaymentStatus(campaignId);
console.log('Payment Info:', paymentInfo);

// Returns:
// {
//   payment: { status: 'succeeded', amount_cents: 50000, paid_at: '...', ... },
//   campaign: { payment_status: 'paid', paid_at: '...', ... },
//   transaction: { status: 'completed', ... },
//   verificationStatus: 'charged',  // 'charged' | 'pending' | 'failed' | 'not_found'
//   isCharged: true,  // Boolean indicating if user was charged
//   error: null
// }

// Quick check:
if (paymentInfo.isCharged) {
  console.log('✅ User was charged:', paymentInfo.payment?.amount_cents / 100, 'dollars');
} else {
  console.log('❌ Payment not completed yet');
}
```

## Common Scenarios

### ✅ Payment Successful
- `campaign_payments.status` = `'succeeded'`
- `campaigns.payment_status` = `'paid'`
- `campaigns.paid_at` is set
- `payment_transactions.status` = `'completed'`

### ⏳ Payment Pending
- `campaign_payments.status` = `'pending'`
- `campaigns.payment_status` = `'pending'` or `'unpaid'`
- `campaigns.paid_at` is NULL

### ❌ Payment Failed
- `campaign_payments.status` = `'failed'`
- `campaigns.payment_status` = `'failed'`
- `campaigns.paid_at` is NULL

## Troubleshooting

If payment status is unclear:

1. **Check Stripe Dashboard** - Verify the Payment Intent status directly
2. **Check Webhook Logs** - See if webhook processed the payment event
3. **Check Edge Function Logs** - See if `stripe-create-payment-intent` was called
4. **Verify Campaign Creation** - Ensure campaign was created with payment intent

## Notes

- Payment is processed **after** campaign creation (not during)
- The webhook (`stripe-webhook`) updates payment status automatically
- Payment status updates are near real-time (within seconds of payment completion)
- If webhook fails, you may need to manually refresh or check Stripe directly
