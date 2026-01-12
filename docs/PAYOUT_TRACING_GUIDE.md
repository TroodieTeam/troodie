# Payout Tracing Guide: Restaurant Payment → Platform Payout

## The Problem

When a restaurant pays for a campaign, the money goes:
1. **Restaurant** → **Troodie Platform** (via Stripe Payment Intent)
2. **Troodie Platform** → **Stripe Balance** (held by Stripe)
3. **Stripe Balance** → **Bank Account** (automatic payout after 3-4 days)

The issue: Money is being automatically paid out from Stripe's balance back to a bank account, even though it should stay in Stripe's balance until creators are paid.

## Understanding Stripe Payouts

### Types of Payouts

1. **Platform Payout (`po_*`)** - Money from Stripe's balance to YOUR bank account
   - This is what you're seeing: `po_1SgwlQDt5lHC2XM0bmCpoeu6`
   - Stripe automatically pays out funds according to your payout schedule
   - **Problem**: This shouldn't happen automatically - funds should stay in Stripe until creators are paid

2. **Creator Transfer (`tr_*`)** - Money from platform to creator's connected account
   - This is what SHOULD happen when deliverables are approved
   - Created by `stripe-process-payout` Edge Function
   - **This is NOT happening** because no creators applied

## Root Cause Analysis

The payout `po_1SgwlQDt5lHC2XM0bmCpoeu6` includes:
- $45.00 from "Festive Cocktails Tour" campaign
- $35.00 from "Holiday Latte Crawl" campaign
- Total: $80.00 gross, $77.07 net (after Stripe fees)

**Why this happened:**
1. Stripe has an **automatic payout schedule** configured
2. When funds accumulate in Stripe's balance, they're automatically paid out
3. This is Stripe's default behavior for standard accounts

**Why this is a problem:**
- Funds should stay in Stripe until creators are paid
- Once paid out, you can't easily transfer to creators
- You'd need to manually transfer funds back or use different payment methods

## Solution: Tracking & Prevention

### Step 1: Run Migration

Apply the migration to add payout tracking:

```bash
# Run the migration
psql $DATABASE_URL -f supabase/migrations/add_payout_tracking.sql
```

This adds:
- `stripe_payout_id` column to `payment_transactions`
- `platform_payout` transaction type
- Indexes for fast lookups

### Step 2: Deploy Updated Webhook

The webhook now handles:
- `payout.created` - Logs when Stripe creates a payout
- `payout.paid` - Logs when payout completes
- `payout.failed` - Logs failed payouts
- `payout.canceled` - Logs canceled payouts

### Step 3: Trace Existing Payout

Run the diagnostic query:

```bash
# Update the IDs in the script first
psql $DATABASE_URL -f scripts/trace-payout-flow.sql
```

This will show:
- Payment records
- Platform payout records
- All transactions
- Timeline of events
- Summary comparison

### Step 4: Check Stripe Dashboard

1. **Go to Stripe Dashboard → Settings → Payouts**
   - Check your payout schedule
   - See if automatic payouts are enabled
   - Note the schedule (daily, weekly, manual)

2. **Go to Stripe Dashboard → Payouts → `po_1SgwlQDt5lHC2XM0bmCpoeu6`**
   - See which charges are included
   - Check destination bank account
   - Verify this is going to YOUR account, not the restaurant's

3. **Go to Stripe Dashboard → Balance**
   - Check current balance
   - See pending payouts
   - Review balance history

## Prevention Strategies

### Option 1: Disable Automatic Payouts (Recommended)

**For Standard Accounts:**
- Go to Stripe Dashboard → Settings → Payouts
- Change schedule to "Manual"
- Only initiate payouts when you want to withdraw platform fees

**For Connect Accounts:**
- Use "Manual" payout schedule
- Only pay out after creators are paid

### Option 2: Use Stripe Connect (Better Architecture)

**Recommended Setup:**
- Use Stripe Connect Express accounts for creators
- Use Direct Charges (charges go directly to creator, you take platform fee)
- Or use Destination Charges (charges go to you, you transfer to creator)

**Benefits:**
- Better fund flow control
- Automatic tax handling
- Better compliance

### Option 3: Reserve Funds

**Using Stripe Reserve:**
- Set up reserve rules to hold funds
- Funds stay in Stripe until released
- Good for new accounts or high-risk scenarios

## Monitoring & Alerts

### Check Webhook Logs

```bash
# View webhook logs in Supabase Dashboard
# Edge Functions → stripe-webhook → Logs
# Look for payout events
```

### Database Queries

**Check for unexpected payouts:**
```sql
SELECT 
  pt.stripe_payout_id,
  pt.amount_cents / 100.0 as amount_dollars,
  pt.created_at,
  pt.completed_at,
  pt.metadata->>'destination' as destination
FROM payment_transactions pt
WHERE pt.transaction_type = 'platform_payout'
  AND pt.created_at > NOW() - INTERVAL '7 days'
ORDER BY pt.created_at DESC;
```

**Check payment vs payout balance:**
```sql
SELECT 
  SUM(CASE WHEN transaction_type = 'payment' THEN amount_cents ELSE 0 END) / 100.0 as total_payments,
  SUM(CASE WHEN transaction_type = 'platform_payout' THEN amount_cents ELSE 0 END) / 100.0 as total_payouts,
  SUM(CASE WHEN transaction_type = 'payout' THEN amount_cents ELSE 0 END) / 100.0 as total_creator_payouts,
  (SUM(CASE WHEN transaction_type = 'payment' THEN amount_cents ELSE 0 END) - 
   SUM(CASE WHEN transaction_type = 'platform_payout' THEN amount_cents ELSE 0 END) -
   SUM(CASE WHEN transaction_type = 'payout' THEN amount_cents ELSE 0 END)) / 100.0 as net_balance
FROM payment_transactions
WHERE created_at > NOW() - INTERVAL '30 days';
```

## Next Steps

1. ✅ **Apply migration** - Add payout tracking
2. ✅ **Deploy webhook** - Handle payout events
3. ✅ **Run diagnostic** - Trace existing payout
4. ⚠️ **Check Stripe settings** - Disable automatic payouts if needed
5. ⚠️ **Review architecture** - Consider Stripe Connect for better fund flow

## Related Documentation

- [Refund Webhook Fix](./REFUND_WEBHOOK_FIX.md)
- [Payout vs Refund Investigation](./PAYOUT_VS_REFUND_INVESTIGATION.md)
- [Payment Flow Analysis](./PAYMENT_FLOW_ANALYSIS.md)

