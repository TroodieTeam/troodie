# Payment vs Payout - Understanding the Difference

## Two Separate Processes

### 1. **Payment Collection** (Customer → Stripe)
- **What it is**: Customer pays for the campaign
- **Status**: Payment intent created but **not yet confirmed**
- **What you need**: Confirm the payment intent to collect money FROM the customer
- **Where**: Stripe Dashboard → Payments tab → Find payment intent `pi_3SfILSDt5IHC2XMO0jxOzgDx`

### 2. **Payout Setup** (Stripe → Your Bank) ✅ Already Done
- **What it is**: Stripe transfers funds to your bank account
- **Status**: Bank account linked ✅
- **What you need**: Nothing - this is already set up correctly
- **Where**: Connected Account → Overview → External Accounts → "STRIPE TEST BANK ...2227"

## The Confusion

You're seeing two different things:

1. **"Payouts paused soon"** - This is about identity verification (SSN, DOB) for **future payouts**. It doesn't affect payment collection.

2. **Payment Intent "Incomplete"** - This is about **collecting payment from the customer**. The bank account you added is for receiving payouts later, not for collecting payments now.

## What You Need to Do

### Step 1: Confirm the Payment Intent (Collect Money FROM Customer)

Go to: **Stripe Dashboard → Payments** (not the connected account)

Or use Stripe CLI:
```bash
stripe payment_intents confirm pi_3SfILSDt5IHC2XMO0jxOzgDx --payment-method=pm_card_visa
```

This will:
- Collect $50 from the customer
- Update campaign to `status: 'active'`
- Funds will be held in Stripe

### Step 2: Payouts Will Happen Later (Stripe → Your Bank)

Once you have funds in Stripe and complete identity verification (SSN, DOB), Stripe will automatically transfer funds to your bank account ("STRIPE TEST BANK ...2227") according to your payout schedule (Daily - 2 day rolling basis).

## Summary

- ✅ **Bank account setup**: Correct - this is for receiving payouts
- ⏳ **Payment collection**: Need to confirm payment intent to collect money from customer
- ⚠️ **Identity verification**: Required for payouts but doesn't block payment collection

The bank account you added is correct - it's just for a different step (payouts) than what you're trying to do now (collect payment).
