# Investigating Unexpected Payout: po_1SgwlQDt5lHC2XM0bmCpoeu6

## The Issue

A payment intent succeeded (`pi_3SfnCSDt5IHC2XMO24gt3p5y`), but there's a payout ID (`po_1SgwlQDt5lHC2XM0bmCpoeu6`) showing in Stripe Dashboard even though:
- ✅ Payment succeeded
- ❌ No creator applied for the campaign
- ❌ No deliverables exist

## Important Distinction

In Stripe terminology:
- **Payout (`po_*`)** = Money going FROM Stripe TO a bank account/card
- **Transfer (`tr_*`)** = Money going FROM platform TO creator's connected account

The codebase **only creates transfers**, not payouts. So this payout must be:
1. A **refund** processed by Stripe (shows as payout back to card)
2. A **chargeback/dispute** reversal
3. A **Stripe Connect** automatic payout (if using Connect)
4. Something else Stripe processed automatically

## Investigation Steps

### Step 1: Check Stripe Dashboard

1. Go to Stripe Dashboard → **Payouts**
2. Find payout `po_1SgwlQDt5lHC2XM0bmCpoeu6`
3. Check:
   - **Status**: What's the status? (paid, pending, failed, canceled)
   - **Amount**: How much?
   - **Destination**: Where did it go? (bank account, card, etc.)
   - **Description**: What does it say?
   - **Related charge**: Click through to see the related charge

### Step 2: Check the Charge

1. Go to Stripe Dashboard → **Payments**
2. Find charge `ch_3SfnCSDt5lHC2XM02xvMAnJT`
3. Check:
   - **Status**: succeeded, refunded, disputed?
   - **Refunds**: Are there any refunds listed?
   - **Disputes**: Are there any disputes?
   - **Related payout**: Click the payout link to see details

### Step 3: Check Webhook Events

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Find events for payment intent `pi_3SfnCSDt5IHC2XMO24gt3p5y`
3. Look for:
   - `charge.refunded`
   - `refund.created`
   - `charge.dispute.created`
   - `payout.paid`
   - Any other unexpected events

### Step 4: Run Diagnostic Query

Run `scripts/diagnose-payout-issue.sql` to check:
- Payment status in database
- Any refund transactions
- Any deliverables (should be none)
- Any payout transfers (should be none)

## Possible Explanations

### 1. Automatic Refund (Most Likely)
**Scenario**: Stripe automatically refunded the payment
**Why**: 
- Payment was disputed
- Chargeback occurred
- Payment was flagged as fraudulent
- Manual refund was processed

**Check**: Look for `charge.refunded` or `refund.created` webhook events

### 2. Stripe Connect Payout
**Scenario**: If using Stripe Connect, money might have been automatically paid out
**Why**: 
- Connected account has automatic payout schedule
- Money was transferred incorrectly

**Check**: Check if you're using Stripe Connect and if there's a connected account involved

### 3. Chargeback/Dispute
**Scenario**: Customer disputed the charge
**Why**: 
- Card was stolen
- Customer didn't recognize the charge
- Service wasn't delivered (no creator = no deliverables)

**Check**: Look for dispute events in Stripe Dashboard

### 4. Manual Refund
**Scenario**: Someone manually refunded the payment
**Why**: 
- Support refunded it
- Test mode cleanup
- Error correction

**Check**: Check Stripe Dashboard → Payments → Refunds

## What to Do Next

1. **Check Stripe Dashboard** for the payout details
2. **Run the diagnostic query** to see database state
3. **Check webhook logs** in Supabase Edge Functions
4. **Verify** if refund webhook handlers are working (they should be now after the fix)

## Prevention

The refund webhook handlers we added will now:
- ✅ Track refunds in database
- ✅ Update payment status automatically
- ✅ Create refund transaction records
- ✅ Notify businesses when refunds occur

But we need to understand **why** the refund happened in the first place.

