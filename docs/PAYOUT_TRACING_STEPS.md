# Steps to Log and Trace Payout Flow

## Quick Start

### Step 1: Apply Database Migration

```bash
# Run migration to add payout tracking columns
psql $DATABASE_URL -f supabase/migrations/add_payout_tracking.sql
```

This adds:
- `stripe_payout_id` column to track Stripe payout IDs (`po_*`)
- `platform_payout` transaction type to distinguish from creator payouts

### Step 2: Deploy Updated Webhook

The webhook now automatically logs:
- `payout.created` - When Stripe creates a payout
- `payout.paid` - When payout completes (money sent to bank)
- `payout.failed` - If payout fails
- `payout.canceled` - If payout is canceled

**Deploy:**
```bash
# Deploy the updated webhook function
supabase functions deploy stripe-webhook
```

### Step 3: Trace Existing Payout

**Update the IDs in the script:**
```sql
-- Edit scripts/trace-payout-flow.sql
-- Replace:
--   'pi_3SfnCSDt5IHC2XMO24gt3p5y' with your payment intent ID
--   'po_1SgwlQDt5lHC2XM0bmCpoeu6' with your payout ID  
--   '3673e1cc-939e-4ee5-81e6-f36f847a62af' with your campaign ID
```

**Run the trace:**
```bash
psql $DATABASE_URL -f scripts/trace-payout-flow.sql
```

This shows:
- ✅ Payment records (restaurant → Troodie)
- ✅ Platform payout records (Stripe → bank account)
- ✅ All transactions timeline
- ✅ Summary comparison

## What You'll See

### Expected Flow (Normal)
```
1. Payment Intent Created: pi_xxx
   └─> campaign_payments.status = 'pending'

2. Payment Succeeded: payment_intent.succeeded
   └─> campaign_payments.status = 'succeeded'
   └─> payment_transactions (type: 'payment')

3. Creator Applies & Deliverable Approved
   └─> stripe-process-payout creates Transfer: tr_xxx
   └─> payment_transactions (type: 'payout')

4. Transfer Paid: transfer.paid
   └─> campaign_deliverables.payment_status = 'completed'
```

### Actual Flow (Your Case)
```
1. Payment Intent Created: pi_3SfnCSDt5IHC2XMO24gt3p5y
   └─> campaign_payments.status = 'pending'

2. Payment Succeeded: payment_intent.succeeded
   └─> campaign_payments.status = 'succeeded'
   └─> payment_transactions (type: 'payment')

3. ⚠️ NO CREATOR APPLIED
   └─> No deliverables created
   └─> No transfers created

4. ⚠️ Stripe Automatic Payout: po_1SgwlQDt5lHC2XM0bmCpoeu6
   └─> payout.created webhook (NOW LOGGED)
   └─> payment_transactions (type: 'platform_payout')
   └─> Money sent to bank account
```

## Monitoring Going Forward

### Check for Unexpected Payouts

```sql
-- Find all platform payouts in last 7 days
SELECT 
  pt.stripe_payout_id,
  pt.amount_cents / 100.0 as amount_dollars,
  pt.status,
  pt.created_at,
  pt.completed_at,
  pt.metadata->>'destination' as destination_bank
FROM payment_transactions pt
WHERE pt.transaction_type = 'platform_payout'
  AND pt.created_at > NOW() - INTERVAL '7 days'
ORDER BY pt.created_at DESC;
```

### Check Payment vs Payout Balance

```sql
-- See if payouts exceed payments (shouldn't happen)
SELECT 
  DATE_TRUNC('day', created_at) as date,
  SUM(CASE WHEN transaction_type = 'payment' THEN amount_cents ELSE 0 END) / 100.0 as payments_received,
  SUM(CASE WHEN transaction_type = 'platform_payout' THEN amount_cents ELSE 0 END) / 100.0 as payouts_sent,
  SUM(CASE WHEN transaction_type = 'payout' THEN amount_cents ELSE 0 END) / 100.0 as creator_payouts,
  (SUM(CASE WHEN transaction_type = 'payment' THEN amount_cents ELSE 0 END) - 
   SUM(CASE WHEN transaction_type = 'platform_payout' THEN amount_cents ELSE 0 END) -
   SUM(CASE WHEN transaction_type = 'payout' THEN amount_cents ELSE 0 END)) / 100.0 as net_balance
FROM payment_transactions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

### Check Webhook Logs

**In Supabase Dashboard:**
1. Go to **Edge Functions** → **stripe-webhook**
2. Click **Logs**
3. Filter for: `payout.created`, `payout.paid`
4. Look for entries like:
   ```
   [Webhook] 💰 Platform payout created: { payoutId: 'po_xxx', ... }
   [Webhook] ✅ Logged platform payout creation: po_xxx
   ```

## Prevention: Disable Automatic Payouts

### In Stripe Dashboard

1. Go to **Settings** → **Payouts**
2. Change **Payout schedule** to **Manual**
3. This prevents Stripe from automatically paying out funds

**Why this matters:**
- Funds stay in Stripe balance until you manually initiate payout
- You can transfer to creators first, then withdraw remaining balance
- Better control over fund flow

### Alternative: Use Stripe Connect

For better fund flow control:
- Use **Stripe Connect Express** for creators
- Use **Direct Charges** (charges go directly to creator)
- Platform fee is automatically deducted
- No need to hold funds in platform balance

## Troubleshooting

### If payout isn't logged in database:

1. **Check webhook is deployed:**
   ```bash
   supabase functions list
   ```

2. **Check webhook endpoint is configured:**
   - Stripe Dashboard → Developers → Webhooks
   - Verify endpoint URL is correct
   - Check events: `payout.created`, `payout.paid`, etc.

3. **Check webhook logs:**
   - Supabase Dashboard → Edge Functions → stripe-webhook → Logs
   - Look for errors or missing events

### If migration fails:

```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'payment_transactions' 
  AND column_name = 'stripe_payout_id';

-- Manually add if missing
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS stripe_payout_id VARCHAR(255);

-- Add index
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payout_id 
ON payment_transactions(stripe_payout_id);
```

## Next Steps

1. ✅ Apply migration
2. ✅ Deploy webhook  
3. ✅ Run trace query
4. ⚠️ **Disable automatic payouts in Stripe**
5. ⚠️ **Review Stripe Connect architecture** (optional but recommended)

See [PAYOUT_TRACING_GUIDE.md](./PAYOUT_TRACING_GUIDE.md) for detailed explanation.

