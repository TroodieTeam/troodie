# Finding Stripe Payout Settings - Complete Guide

Based on latest Stripe documentation, here's where to find payout settings:

## Key Finding: Settings Location Changed

According to recent Stripe updates, payout settings may be under:
- **Settings → Bank accounts and scheduling** (not just "Payouts")

## Step-by-Step: Find Your Settings

### Method 1: Direct Navigation

1. **Stripe Dashboard** → Click **Settings** (gear icon, top right)
2. Look for **"Bank accounts and scheduling"** in the left sidebar
3. OR look for **"Payouts"** directly

### Method 2: Search (Most Reliable)

1. **Click the search bar** at the top of Stripe Dashboard
2. **Type:** `payout schedule` or `bank accounts`
3. **Click:** Settings → Bank accounts and scheduling → **Payouts**

### Method 3: Via Payout Details

1. **Go to:** Dashboard → **Payouts** → Click on `po_1SgwlQDt5lHC2XM0bmCpoeu6`
2. **Look at the payout details**
3. **See if it says:** "Automatic" or "Manual"
4. **Click "Settings"** link if available

## What You Should See

### Payout Schedule Options:
- ✅ **Daily** - Pays out every day
- ✅ **Weekly** - Pays out once a week  
- ✅ **Monthly** - Pays out once a month
- ✅ **Manual** - Only pays out when you click "Pay out" ← **This is what you want**

### Other Settings:
- **Minimum balance** - Keep X amount in Stripe (prevents automatic payouts)
- **Payout delay** - X days delay before payout
- **Bank account** - Which account receives payouts

## Important: Check Minimum Balance Setting

According to Stripe docs, you can set a **Minimum balance** to prevent automatic payouts:

1. **Settings → Bank accounts and scheduling**
2. **Set "Minimum balance"** to a value (e.g., $1000)
3. **Stripe will keep this amount** in your balance
4. **Only excess funds** will be paid out automatically

**This is a workaround** if you can't find the payout schedule setting!

## If You're Using Stripe Connect

### For Connected Accounts (Creators):

1. **Dashboard → Connect → Settings**
2. **Click "Payouts"**
3. **Set default payout schedule** for new accounts
4. **Disable "Instant payouts"** if not needed

### For Your Platform Account:

1. **Dashboard → Settings → Bank accounts and scheduling**
2. **Set payout schedule to "Manual"**

## Alternative: Check via API

If you can't find it in dashboard, check programmatically:

```bash
# Check account payout settings
curl https://api.stripe.com/v1/account \
  -u sk_live_...: \
  | jq '.settings.payouts'

# Expected output:
# {
#   "schedule": {
#     "delay_days": 2,
#     "interval": "daily"  ← This is what you want to change
#   },
#   "statement_descriptor": "...",
#   ...
# }
```

## Update via API (If Dashboard Doesn't Work)

```bash
# Change to manual payouts
curl https://api.stripe.com/v1/account \
  -u sk_live_...: \
  -X POST \
  -d "settings[payouts][schedule][interval]=manual"
```

## Quick Diagnostic: Check Current Payout

Look at the payout `po_1SgwlQDt5lHC2XM0bmCpoeu6`:

1. **Dashboard → Payouts → Click the payout**
2. **Check "Details" section:**
   - Does it say "Automatic" or "Manual"?
   - What's the "Delivery method"?
   - When was it "Initiated"?

3. **Check "Summary" section:**
   - Which charges are included?
   - Total amount

## Still Can't Find It?

### Try These:

1. **Check account type:**
   - Standard account vs Connect account
   - Settings location differs

2. **Check permissions:**
   - Must be Owner or Admin
   - Some settings hidden for other roles

3. **Check test vs live:**
   - Settings might differ
   - Toggle in top right

4. **Contact Stripe Support:**
   - Dashboard → Help → Contact Support
   - Ask: "Where do I change payout schedule from automatic to manual?"

## Recommended Solution: Minimum Balance

If you can't change the schedule, use **Minimum Balance**:

1. **Settings → Bank accounts and scheduling**
2. **Set "Minimum balance"** to a high value (e.g., $10,000)
3. **Stripe will keep this amount** in your balance
4. **Only excess funds** get paid out automatically
5. **This ensures funds stay available** for creator payouts

## Next Steps

1. ✅ **Try search bar** with "payout schedule"
2. ✅ **Check Settings → Bank accounts and scheduling**
3. ✅ **Set Minimum balance** as workaround
4. ✅ **Check payout details** to see if it's automatic
5. ✅ **Contact Stripe Support** if still stuck

## References

- Stripe Payouts Docs: https://docs.stripe.com/global-payouts/manage-payouts
- Stripe Connect Payouts: https://docs.stripe.com/connect/payouts
- Stripe Account Settings: https://docs.stripe.com/api/accounts/update

