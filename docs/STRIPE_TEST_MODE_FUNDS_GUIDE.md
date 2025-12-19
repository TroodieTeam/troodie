# Stripe Test Mode - Adding Funds Guide

## The Issue

When you get the error: **"You have insufficient available funds in your Stripe account"**, it means the **platform Stripe account** doesn't have enough balance to create transfers to creators.

## Why This Happens

In **Stripe Test Mode**, when a business pays for a campaign:
1. ✅ The Payment Intent is created successfully
2. ✅ The payment succeeds (if using test cards)
3. ❌ **BUT** the funds don't automatically appear in your platform account balance

**In test mode, Stripe doesn't automatically credit your account balance.** You need to manually add test funds.

## How to Add Test Funds

### Method 1: Using Test Card (Recommended)

1. Go to Stripe Dashboard → **Payments** → **Create Payment**
2. Use test card: `4000000000000077` (this card adds funds directly to available balance)
3. Enter the amount you need (e.g., $1000)
4. Complete the payment
5. Funds will appear in your **Available Balance**

### Method 2: Using Stripe CLI

```bash
stripe test_cli create_payment_intent \
  --amount=100000 \
  --currency=usd \
  --payment-method=pm_card_chargeDeclinedInsufficientFunds
```

### Method 3: Manual Balance Top-Up (Test Mode Only)

1. Go to Stripe Dashboard → **Balance** → **Add funds**
2. Use test card `4000000000000077`
3. Add the amount needed

## Payment Flow Explanation

```
Business Pays $45
  ↓
Payment Intent Created → Payment Succeeds
  ↓
Money goes to Platform Stripe Account (but in test mode, balance stays $0)
  ↓
When Creator Deliverable Approved:
  ↓
Platform tries to Transfer $45 to Creator
  ↓
ERROR: Platform account has $0 balance ❌
```

## Solution

**Before testing payouts**, add test funds to your platform account:

1. Use test card `4000000000000077` to add funds
2. Or use the Stripe Dashboard to manually top up balance
3. Then try approving deliverables again

## Production Mode

In **production mode**, this won't be an issue because:
- Real payments automatically add funds to your platform account
- Stripe processes payments normally
- Your account balance increases as businesses pay

## Quick Test Script

Run this SQL to check your current payment status:

```sql
-- Check if campaign payment succeeded
SELECT 
    cp.id,
    cp.campaign_id,
    cp.status,
    cp.amount_cents / 100.0 as amount_dollars,
    cp.stripe_payment_intent_id,
    c.title as campaign_title
FROM campaign_payments cp
JOIN campaigns c ON c.id = cp.campaign_id
WHERE cp.status = 'succeeded'
ORDER BY cp.created_at DESC
LIMIT 5;
```

If `status = 'succeeded'` but you still get the error, it means you need to add test funds to your platform account.
