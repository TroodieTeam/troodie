# TRO-136: Payment Onboarding - Production Testing Guide

## Overview

This guide covers testing the new restaurant payment onboarding flow in production. The flow allows restaurants to:
1. Claim their restaurant
2. Connect Stripe account
3. Save a payment method for future campaigns
4. Create campaigns with saved card (no PaymentSheet) or free campaigns ($0)

---

## Pre-Requisites

### 1. Database Migration Applied
Verify these columns exist in `business_profiles`:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'business_profiles' 
AND column_name IN (
  'stripe_customer_id', 
  'default_payment_method_id', 
  'payment_method_last4', 
  'payment_method_brand',
  'payment_setup_completed'
);
```

### 2. Edge Functions Deployed
| Function | Purpose |
|----------|---------|
| `stripe-create-setup-intent` | Creates SetupIntent for saving payment method |
| `stripe-create-payment-intent` | Creates PaymentIntent (with off-session support) |
| `stripe-get-setup-intent` | Retrieves payment method details after card saved |

### 3. Stripe Secret Key Configured
Ensure `STRIPE_SECRET_KEY` is set in Edge Function secrets with the **production** key (`sk_live_...`).

---

## Test Scenarios

### Scenario A: New Restaurant Onboarding (Full Flow)

**Test Account:** Use a new email that hasn't onboarded before

#### Steps:
1. **Sign Up / Sign In**
   - Open app → Sign in with new account
   - Expected: Lands on user type selection

2. **Select "Restaurant"**
   - Tap "Restaurant" option
   - Expected: Navigate to restaurant claim screen

3. **Claim Restaurant**
   - Search for a restaurant
   - Fill in: Full name, Email, Phone
   - Submit claim
   - Expected: "Claim submitted" → Navigate to welcome screen

4. **Welcome Screen**
   - Review the 4-step setup overview
   - Tap "Let's Get Started"
   - Expected: Navigate to Stripe connection screen

5. **Connect Stripe (Step 2)**
   - Tap "Connect Stripe Account"
   - Complete Stripe onboarding in browser
   - Return to app → Tap "Refresh Status"
   - Expected: "Stripe Connected" badge appears

6. **Add Payment Method (Step 3)**
   - Tap "Add Payment Method"
   - Stripe PaymentSheet appears
   - Enter card details:
     - **Production:** Use real card
     - **Test mode:** `4242 4242 4242 4242`, any future date, any CVC
   - Submit
   - Expected: "Card Saved" with last 4 digits displayed

7. **Complete Onboarding (Step 4)**
   - Tap "Continue"
   - Expected: Complete screen with saved card info displayed

#### Verification:
```sql
-- Check business profile has payment data
SELECT 
  user_id,
  stripe_customer_id,
  default_payment_method_id,
  payment_method_last4,
  payment_method_brand,
  payment_setup_completed
FROM business_profiles
WHERE user_id = '<USER_ID>';
```

---

### Scenario B: Create Campaign with Saved Card (Off-Session Charge)

**Pre-requisite:** Complete Scenario A first

#### Steps:
1. Navigate to **Business** → **Campaigns** → **Create Campaign**
2. Fill in campaign details:
   - Title: "Test Paid Campaign"
   - Description: "Testing off-session charging"
   - Budget: **$25** (or any amount > $0)
   - Deadline: Any future date
   - Add at least 1 deliverable
3. On Step 4, verify:
   - "Payment Account Connected" ✓
   - "This will be charged to your Visa •••• 4242" (your saved card)
4. Tap "Create Campaign"

#### Expected Result:
- **NO PaymentSheet appears** (card charged off-session)
- Alert: "Campaign Created! Your campaign is now active..."
- Campaign status: **ACTIVE**
- Payment status: **paid**

#### Verification:
```sql
-- Check campaign was charged
SELECT 
  id, title, status, payment_status, budget_cents
FROM campaigns
WHERE title LIKE '%Test Paid Campaign%'
ORDER BY created_at DESC
LIMIT 1;

-- Check payment record
SELECT * FROM campaign_payments
WHERE campaign_id = '<CAMPAIGN_ID>';
```

---

### Scenario C: Create Free Campaign ($0 Budget)

#### Steps:
1. Navigate to **Business** → **Campaigns** → **Create Campaign**
2. Fill in campaign details:
   - Title: "Test Free Campaign"
   - Description: "Testing free campaign flow"
   - Budget: **$0**
   - Deadline: Any future date
   - Add at least 1 deliverable
3. Tap "Create Campaign"

#### Expected Result:
- **NO PaymentSheet appears** (payment skipped entirely)
- Alert: "Campaign Created! Your free campaign is now active..."
- Campaign status: **ACTIVE**
- Payment status: **paid** (nothing to pay)

#### Verification:
```sql
SELECT id, title, status, payment_status, budget_cents
FROM campaigns
WHERE title LIKE '%Test Free Campaign%';
-- Expected: status='active', payment_status='paid', budget_cents=0
```

---

### Scenario D: Resume Pending Free Campaign

**Test case:** Resume a $0 campaign that was created before and is still PENDING

#### Steps:
1. Create a free campaign ($0) that somehow ends up in PENDING status
   - Or find existing pending $0 campaign
2. Go to campaign details
3. Tap "Resume Campaign"

#### Expected Result:
- Campaign activates immediately (no payment flow)
- Alert: "Your free campaign is now active!"

---

### Scenario E: Campaign Creation Without Saved Card (Fallback)

**Test case:** User without saved payment method creates paid campaign

#### Setup:
```sql
-- Clear saved payment method for testing
UPDATE business_profiles
SET 
  default_payment_method_id = NULL,
  payment_method_last4 = NULL,
  payment_method_brand = NULL
WHERE user_id = '<USER_ID>';
```

#### Steps:
1. Create campaign with budget > $0
2. On Step 4, tap "Create Campaign"

#### Expected Result:
- **PaymentSheet DOES appear** (fallback to manual entry)
- User enters card details
- Campaign activates after payment

---

## Cleanup Queries

### Reset Test User's Payment Data
```sql
UPDATE business_profiles
SET 
  stripe_customer_id = NULL,
  default_payment_method_id = NULL,
  payment_method_last4 = NULL,
  payment_method_brand = NULL,
  payment_setup_completed = false
WHERE user_id = '<USER_ID>';
```

### Delete Test Campaigns
```sql
DELETE FROM campaign_payments WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE title LIKE 'Test%Campaign'
);

DELETE FROM campaigns WHERE title LIKE 'Test%Campaign';
```

---

## Acceptance Criteria Checklist

### Onboarding Flow
- [ ] Restaurant claim creates pending business profile
- [ ] Stripe Connect onboarding works (opens in browser)
- [ ] Refresh status detects completed Stripe onboarding
- [ ] Payment method can be added via Stripe PaymentSheet
- [ ] Card details (last4, brand) saved to business_profiles
- [ ] Complete screen shows saved card info

### Campaign Creation
- [ ] Paid campaign with saved card → off-session charge (no UI)
- [ ] Paid campaign without saved card → PaymentSheet appears
- [ ] Free campaign ($0) → activates immediately, no payment
- [ ] Resume pending free campaign → activates without payment

### Data Integrity
- [ ] `stripe_customer_id` saved correctly
- [ ] `default_payment_method_id` saved correctly
- [ ] `payment_method_last4` and `payment_method_brand` saved
- [ ] Campaign `payment_status` correct ('paid' for both paid and free)

---

## Troubleshooting

### "Edge Function returned non-2xx status code"
- Check Edge Function logs in Supabase Dashboard
- Verify `STRIPE_SECRET_KEY` is set correctly
- Ensure database columns exist

### PaymentSheet Not Appearing
- Check if `stripe_customer_id` exists in business_profiles
- Verify Stripe SDK is initialized in app

### Card Not Saving
- Check `stripe-get-setup-intent` Edge Function logs
- Verify SetupIntent completed successfully

### Off-Session Charge Failing
- Ensure both `paymentMethodId` and `customerId` are present
- Check Stripe Dashboard for payment errors

---

## Time Targets

| Flow | Target Time |
|------|-------------|
| Full restaurant onboarding (claim → payment setup) | 5-10 minutes |
| Create campaign with saved card | < 1 minute |
| Create free campaign | < 1 minute |

---

*Last Updated: January 12, 2026*
