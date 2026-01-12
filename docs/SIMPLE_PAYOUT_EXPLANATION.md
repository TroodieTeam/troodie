# Simple Explanation: Why Money Was Paid Out

## The Flow (What Actually Happened)

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ Restaurant  │  Pays   │   Stripe     │  Auto   │  Bank       │
│   ($45)     │ ──────> │   Balance    │ ──────> │  Account    │
│             │         │  (Troodie)   │ Payout  │  ($77.07)   │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              │ (Should stay here until creator paid)
                              │
                              ▼
                         ┌──────────────┐
                         │   Creator    │
                         │  (NOT PAID)  │
                         └──────────────┘
```

## Two Different Types of "Payouts"

### 1. Platform Payout (What You're Seeing) ❌
- **What**: Stripe automatically sends money from YOUR Stripe balance to YOUR bank account
- **When**: According to Stripe's automatic schedule (usually daily or weekly)
- **Why**: Stripe's default behavior - they don't want to hold your money forever
- **Problem**: Money leaves Stripe before creators can be paid
- **ID Format**: `po_1SgwlQDt5lHC2XM0bmCpoeu6` (payout ID)

### 2. Creator Payout (What Should Happen) ✅
- **What**: You send money from YOUR Stripe balance to CREATOR's Stripe account
- **When**: When a deliverable is approved
- **Why**: To pay creators for their work
- **ID Format**: `tr_xxxxx` (transfer ID)

## Why This Is A Problem

**Current Situation:**
1. Restaurant pays $45 → Goes to Stripe balance ✅
2. Stripe automatically pays out $77.07 → Goes to bank account ❌
3. Creator applies later → No money in Stripe to pay them ❌

**What Should Happen:**
1. Restaurant pays $45 → Goes to Stripe balance ✅
2. Money STAYS in Stripe balance ✅
3. Creator applies & deliverable approved → Transfer $45 to creator ✅
4. Only THEN, withdraw remaining balance to bank ✅

## How to Fix It

### Step 1: Check Your Stripe Payout Settings

1. Go to **Stripe Dashboard** → **Settings** → **Payouts**
2. Look for **"Payout schedule"**
3. You'll see something like:
   - ✅ **Daily** (pays out every day)
   - ✅ **Weekly** (pays out once a week)
   - ✅ **Monthly** (pays out once a month)
   - ✅ **Manual** (only pays out when you click "Pay out")

### Step 2: Change to Manual

**Change it to "Manual"** so Stripe doesn't automatically pay out funds.

**Why Manual is Better:**
- You control when money leaves Stripe
- Money stays available to pay creators
- You can withdraw platform fees after creators are paid

### Step 3: Verify the Bank Account

Check which bank account is receiving the payouts:
- Stripe Dashboard → **Payouts** → Click on `po_1SgwlQDt5lHC2XM0bmCpoeu6`
- See "Account details" → Should show your bank account
- If it's NOT your account, that's a bigger problem!

## What About the $77.07?

The payout includes:
- $45.00 from "Festive Cocktails Tour" campaign
- $35.00 from "Holiday Latte Crawl" campaign  
- Total: $80.00 gross
- After Stripe fees: $77.07 net

**This means:**
- Both campaigns were paid
- Stripe combined them into one payout
- Money went to your bank account (not back to restaurant)

## Going Forward

### Option 1: Manual Payouts (Easiest)
- Set Stripe to "Manual" payouts
- Money stays in Stripe until you manually withdraw
- Pay creators first, then withdraw remaining balance

### Option 2: Stripe Connect (Better Long-term)
- Use Stripe Connect for creators
- Money goes directly to creators (you take platform fee)
- No need to hold funds in your balance

## Quick Checklist

- [ ] Go to Stripe Dashboard → Settings → Payouts
- [ ] Check current payout schedule
- [ ] Change to "Manual" if it's automatic
- [ ] Verify bank account is correct
- [ ] Check if money is in your bank account (it should be)
- [ ] Deploy webhook updates to track future payouts

## Still Confused?

**Think of it like this:**
- Stripe balance = Your wallet
- Automatic payout = Stripe automatically emptying your wallet into your bank
- Manual payout = You decide when to move money from wallet to bank
- Creator transfer = You give money from wallet to creator

The problem: Stripe is emptying your wallet before you can pay creators!

