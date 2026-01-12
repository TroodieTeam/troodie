# How to Find Stripe Payout Settings

## The Issue

You're seeing automatic payouts (`po_*`) but can't find where to configure them in Stripe Dashboard. This guide will help you locate the settings.

## Important: Two Different Types of Accounts

### 1. Standard Stripe Account (Your Main Account)
**Location:** Settings → Payouts
- This controls payouts FROM your Stripe balance TO your bank account
- **Path:** Dashboard → Settings (gear icon) → Payouts

### 2. Stripe Connect Express Account (Connected Accounts)
**Location:** Connect → Settings → Payouts
- This controls payouts for connected accounts (creators/businesses)
- **Path:** Dashboard → Connect → Settings → Payouts

## Step-by-Step: Finding Your Settings

### Method 1: Search Bar (Easiest)

1. **Open Stripe Dashboard**
2. **Click the search bar** at the top
3. **Type:** `payouts`
4. **Look for:**
   - Settings → Connect → **Payouts**
   - Settings → **Payouts**
   - Transactions → **Payouts**

### Method 2: Navigation Menu

**For Standard Account Payouts:**
1. Click **Settings** (gear icon, top right)
2. Look for **"Payouts"** in the left sidebar
3. If not visible, click **"More"** to expand

**For Connect Account Payouts:**
1. Click **Connect** in the left sidebar (under Products)
2. Click **Settings** (if visible)
3. Click **Payouts**

### Method 3: Direct URL

**Standard Account:**
```
https://dashboard.stripe.com/settings/payouts
```

**Connect Account:**
```
https://dashboard.stripe.com/connect/settings/payouts
```

## What You're Looking For

### Standard Account Payout Settings

You should see:
- **Payout schedule:** Daily / Weekly / Monthly / Manual
- **Minimum payout amount:** $X.XX
- **Payout delay:** X days
- **Bank account:** [Your bank account details]

### Connect Account Payout Settings

You should see:
- **Payout schedule:** For connected accounts
- **Instant payouts:** Enabled/Disabled
- **Payout schedules:** Default schedule for new accounts
- **Statement descriptor:** How payouts appear on statements

## If You Still Can't Find It

### Check Your Account Type

1. **Go to:** Dashboard → Settings → Account
2. **Look for:** "Account type" or "Account capabilities"
3. **Check if you have:**
   - ✅ Standard account
   - ✅ Connect enabled
   - ✅ Express accounts

### Check Permissions

- Make sure you're logged in as an **Owner** or **Admin**
- Some settings are only visible to account owners

### Check Test vs Live Mode

- **Test mode:** Settings might be different
- **Live mode:** Full settings available
- Toggle in top right corner

## What to Do Once You Find It

### For Standard Account:

1. **Change "Payout schedule" to "Manual"**
2. **Save changes**
3. **Verify bank account is correct**

### For Connect Account:

1. **Review payout schedules**
2. **Set default to "Manual" if possible**
3. **Disable "Instant payouts" if not needed**

## Alternative: Check via API

If you can't find it in the dashboard, check via API:

```bash
# Get account details
curl https://api.stripe.com/v1/account \
  -u sk_test_...:

# Get payout schedule
curl https://api.stripe.com/v1/account \
  -u sk_test_...: \
  | jq '.settings.payouts.schedule'
```

## Still Stuck?

1. **Check Stripe Support:**
   - Dashboard → Help → Contact Support
   - Ask: "Where do I find payout schedule settings?"

2. **Check Stripe Docs:**
   - https://docs.stripe.com/connect/payouts
   - https://docs.stripe.com/payouts

3. **Check the payout itself:**
   - Go to: Dashboard → Payouts → Click `po_1SgwlQDt5lHC2XM0bmCpoeu6`
   - Look at "Details" section
   - See if it says "Automatic" or "Manual"

## Quick Checklist

- [ ] Tried search bar with "payouts"
- [ ] Checked Settings → Payouts
- [ ] Checked Connect → Settings → Payouts  
- [ ] Verified account type (Standard vs Connect)
- [ ] Checked permissions (Owner/Admin)
- [ ] Checked test vs live mode
- [ ] Looked at payout details to see if it says "Automatic"

