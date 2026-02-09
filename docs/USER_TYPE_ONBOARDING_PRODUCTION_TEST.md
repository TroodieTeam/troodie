# User Type Segmentation Onboarding - Production Test Guide

**Date:** January 13, 2026  
**Tickets:** TRO-139, TRO-140, TRO-141, TRO-142, TRO-143, TRO-136  
**Environment:** Production  
**Status:** Ready for Production Testing

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Production Checklist](#pre-production-checklist)
3. [Test Accounts Setup](#test-accounts-setup)
4. [Test Scenarios](#test-scenarios)
5. [Stripe Production Testing](#stripe-production-testing)
6. [Verification Queries](#verification-queries)
7. [Rollback Procedures](#rollback-procedures)
8. [Post-Test Cleanup](#post-test-cleanup)

---

## Overview

This guide covers **production testing** for the user type segmentation and payment onboarding features. Production testing requires extra care to avoid affecting real user data.

### Features Being Tested

| Ticket | Feature | Risk Level |
|--------|---------|------------|
| TRO-139 | User Type Segmentation | Low - New users only |
| TRO-140 | Radio Button Selection | Low - UI only |
| TRO-141 | Custom Onboarding Paths | Medium - Routing logic |
| TRO-142 | Navigation Updates | Low - UI display |
| TRO-143 | Database User Type | Low - New column |
| TRO-136 | Payment Onboarding | **High** - Stripe integration |

### Production Safety Rules

> ⚠️ **CRITICAL RULES FOR PRODUCTION TESTING:**
> 
> 1. **NEVER** test with real customer accounts
> 2. **NEVER** delete production data without backup
> 3. **ALWAYS** use dedicated test accounts with `@troodieapp.com` domain
> 4. **ALWAYS** verify test accounts before running cleanup queries
> 5. **DOCUMENT** all changes made during testing

---

## Pre-Production Checklist

### 1. Verify Migrations Applied

```sql
-- Run in Production Supabase SQL Editor
-- Check user_type column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'user_type';

-- Check payment columns in business_profiles
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

**Expected:** All columns exist.

### 2. Verify Edge Functions Deployed

```bash
# Check deployed functions
supabase functions list --project-ref <PROD_PROJECT_REF>
```

**Required Functions:**
- [ ] `stripe-create-setup-intent`
- [ ] `stripe-get-setup-intent`
- [ ] `stripe-create-payment-intent` (updated)
- [ ] `stripe-create-express-account`
- [ ] `stripe-refresh-account-status`

### 3. Verify Stripe Production Keys

- [ ] `STRIPE_SECRET_KEY` is production key (starts with `sk_live_`)
- [ ] `STRIPE_PUBLISHABLE_KEY` is production key (starts with `pk_live_`)
- [ ] Stripe webhook endpoint configured for production

### 4. App Build Verification

- [ ] App version contains all TRO-136 changes
- [ ] TestFlight build is current
- [ ] Production API URL configured

---

## Test Accounts Setup

### Create Dedicated Production Test Accounts

> ⚠️ Use ONLY `@troodieapp.com` emails for production testing

| Email | Purpose | User Type |
|-------|---------|-----------|
| `prod-test-diner@troodieapp.com` | Diner onboarding | diner |
| `prod-test-restaurant@troodieapp.com` | Restaurant onboarding | restaurant_admin |
| `prod-test-creator@troodieapp.com` | Creator onboarding | content_creator |

### Account Setup SQL

```sql
-- First, check if test accounts already exist
SELECT id, email, user_type, account_type, created_at
FROM users 
WHERE email IN (
  'prod-test-diner@troodieapp.com',
  'prod-test-restaurant@troodieapp.com',
  'prod-test-creator@troodieapp.com'
);

-- If accounts exist and need reset, run the cleanup (see Post-Test Cleanup section)
```

---

## Test Scenarios

### Scenario 1: Diner Onboarding (Low Risk)

**Account:** Fresh signup with `prod-test-diner@troodieapp.com`

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Open app, tap "Get Started" | User Type Selection screen | ☐ |
| 2 | Select "Discover Restaurants" | Radio button selected | ☐ |
| 3 | Tap "Continue" | Navigate to Signup | ☐ |
| 4 | Enter email, complete OTP | Navigate to Quiz Intro | ☐ |
| 5 | Complete quiz flow | Persona result shown | ☐ |
| 6 | Complete onboarding | Main app tabs displayed | ☐ |
| 7 | Check "More" tab | "Claim Your Restaurant" option visible | ☐ |

**Verification:**
```sql
SELECT email, user_type, account_type, is_restaurant
FROM users 
WHERE email = 'prod-test-diner@troodieapp.com';

-- Expected: user_type = 'diner', account_type = 'consumer', is_restaurant = false
```

---

### Scenario 2: Restaurant Onboarding with Stripe (High Risk)

**Account:** Fresh signup with `prod-test-restaurant@troodieapp.com`

> ⚠️ **STRIPE PRODUCTION WARNING:** This test will create REAL Stripe accounts and customers. Use test credit cards (4242 4242 4242 4242) if Stripe allows in production mode, otherwise use a company card you control.

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| **User Type Selection** |||
| 1 | Open app, tap "Get Started" | User Type Selection screen | ☐ |
| 2 | Select "Promote My Restaurant" | Radio button selected | ☐ |
| 3 | Tap "Continue" | Navigate to Signup | ☐ |
| 4 | Enter email, complete OTP | Navigate to Restaurant Claim | ☐ |
| **Restaurant Claim** |||
| 5 | Search for test restaurant | Results appear | ☐ |
| 6 | Select an UNCLAIMED restaurant | Restaurant info displays | ☐ |
| 7 | Fill admin details | Form completed | ☐ |
| 8 | Tap "Submit Claim" | Navigate to Stripe Connect | ☐ |
| **Stripe Connect (TRO-136)** |||
| 9 | Verify "Step 2 of 4" indicator | Progress shown | ☐ |
| 10 | Tap "Connect with Stripe" | Opens browser to Stripe | ☐ |
| 11 | Complete Stripe Express onboarding | Returns to app | ☐ |
| 12 | Tap "Continue" | Navigate to Payment Method | ☐ |
| **Payment Method (TRO-136)** |||
| 13 | Verify "Step 3 of 4" indicator | Progress shown | ☐ |
| 14 | Tap "Add Card" | Payment sheet opens | ☐ |
| 15 | Enter card details | Card saved | ☐ |
| 16 | Verify "Card Saved" confirmation | Shows last 4 digits | ☐ |
| 17 | Tap "Continue" | Navigate to Complete | ☐ |
| **Completion** |||
| 18 | Verify success screen | Restaurant name shown | ☐ |
| 19 | Verify "Payment Method Saved" card | Shows card info | ☐ |
| 20 | Verify "Stripe Connected" badge | Badge displayed | ☐ |
| 21 | Tap "Explore the App" | Navigate to main tabs | ☐ |
| 22 | Check "More" tab | Business tools visible (NOT "Claim Restaurant") | ☐ |

**Time Check:** Total onboarding should be 5-10 minutes.

---

### Scenario 3: Campaign Creation with Saved Payment (TRO-136)

**Prerequisite:** Complete Scenario 2 first

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Navigate to Business Dashboard | Dashboard loads | ☐ |
| 2 | Tap "Create Campaign" | Campaign wizard opens | ☐ |
| 3 | Fill campaign details (Step 1-3) | Fields completed | ☐ |
| 4 | On Step 4 (Payment), verify card display | "Card on file: •••• XXXX \| Change" shown | ☐ |
| 5 | Set budget to $5.00 | Budget entered | ☐ |
| 6 | Tap "Submit Campaign" | Charges saved card automatically | ☐ |
| 7 | Verify success | Campaign created without re-entering card | ☐ |

**Time Check:** Campaign creation should be < 2 minutes.

---

### Scenario 4: Free Campaign ($0 Budget)

**Prerequisite:** Restaurant account exists

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Create new campaign | Campaign wizard opens | ☐ |
| 2 | Fill campaign details | Fields completed | ☐ |
| 3 | Set budget to $0.00 | Budget shows $0 | ☐ |
| 4 | Tap "Submit Campaign" | **NO payment flow triggered** | ☐ |
| 5 | Verify success | Campaign created with status "active" | ☐ |

**Verification:**
```sql
SELECT id, title, budget_cents, payment_status, status
FROM campaigns
WHERE business_profile_id = (
  SELECT bp.id FROM business_profiles bp
  JOIN users u ON bp.user_id = u.id
  WHERE u.email = 'prod-test-restaurant@troodieapp.com'
)
ORDER BY created_at DESC
LIMIT 1;

-- Expected: budget_cents = 0, payment_status = 'paid', status = 'active'
```

---

### Scenario 5: Creator Onboarding (Low Risk)

**Account:** Fresh signup with `prod-test-creator@troodieapp.com`

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Select "Create Content" | Radio button selected | ☐ |
| 2 | Complete signup + OTP | Navigate to Quiz Intro | ☐ |
| 3 | Complete quiz flow | Standard quiz flow | ☐ |
| 4 | Complete onboarding | Main app displayed | ☐ |

**Verification:**
```sql
SELECT email, user_type, account_type, is_creator
FROM users 
WHERE email = 'prod-test-creator@troodieapp.com';

-- Expected: user_type = 'content_creator'
```

---

## Stripe Production Testing

### Test Card Numbers (for Production with Radar)

> **Note:** In production Stripe, you cannot use test cards directly. Use these approaches:

**Option A: Use Stripe Radar Test Mode**
If Stripe Radar test mode is enabled, these cards work:
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds

**Option B: Use a Real Test Card**
Use a company prepaid/debit card with a small balance for testing.
- Set budget to minimum ($1.00 or $5.00)
- Refund immediately after test

### Verifying Stripe Data

```sql
-- Check Stripe account connection
SELECT 
  bp.id,
  bp.stripe_account_id,
  bp.stripe_onboarding_completed,
  bp.stripe_customer_id,
  bp.default_payment_method_id,
  bp.payment_method_last4,
  bp.payment_method_brand,
  bp.payment_setup_completed
FROM business_profiles bp
JOIN users u ON bp.user_id = u.id
WHERE u.email = 'prod-test-restaurant@troodieapp.com';
```

### Stripe Dashboard Verification

1. Login to [Stripe Dashboard](https://dashboard.stripe.com)
2. Search for test customer email
3. Verify:
   - [ ] Customer created
   - [ ] Payment method attached
   - [ ] Express account connected (if applicable)

---

## Verification Queries

### Complete Production Verification

```sql
-- 1. Verify all test accounts
SELECT 
  email,
  user_type,
  account_type,
  is_restaurant,
  is_creator,
  created_at
FROM users 
WHERE email LIKE 'prod-test-%@troodieapp.com'
ORDER BY created_at;

-- 2. Verify business profile for restaurant test
SELECT 
  bp.*,
  r.name as restaurant_name
FROM business_profiles bp
JOIN restaurants r ON bp.restaurant_id = r.id
JOIN users u ON bp.user_id = u.id
WHERE u.email = 'prod-test-restaurant@troodieapp.com';

-- 3. Verify campaigns created during test
SELECT 
  c.id,
  c.title,
  c.budget_cents,
  c.payment_status,
  c.status,
  c.created_at
FROM campaigns c
JOIN business_profiles bp ON c.business_profile_id = bp.id
JOIN users u ON bp.user_id = u.id
WHERE u.email = 'prod-test-restaurant@troodieapp.com';

-- 4. Check for any errors in test period
SELECT * FROM error_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
AND user_id IN (
  SELECT id FROM users WHERE email LIKE 'prod-test-%@troodieapp.com'
);
```

---

## Rollback Procedures

### If Something Goes Wrong

#### Issue: Bad data created
```sql
-- DO NOT RUN without explicit approval
-- Save current state first
SELECT * FROM users WHERE email LIKE 'prod-test-%@troodieapp.com';
SELECT * FROM business_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'prod-test-%@troodieapp.com');
```

#### Issue: Stripe account in bad state
1. Go to Stripe Dashboard
2. Find the test Express account
3. Manually disable/delete if needed
4. Update database:
```sql
-- Reset Stripe fields (TEST ACCOUNTS ONLY)
UPDATE business_profiles 
SET 
  stripe_account_id = NULL,
  stripe_onboarding_completed = false,
  stripe_customer_id = NULL,
  default_payment_method_id = NULL,
  payment_method_last4 = NULL,
  payment_method_brand = NULL,
  payment_setup_completed = false
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'prod-test-restaurant@troodieapp.com'
);
```

---

## Post-Test Cleanup

### Full Cleanup for Test Accounts

> ⚠️ **VERIFY EMAIL ADDRESSES BEFORE RUNNING**

```sql
-- Step 0: Verify these are TEST accounts (should only return test emails)
SELECT id, email FROM users 
WHERE email IN (
  'prod-test-diner@troodieapp.com',
  'prod-test-restaurant@troodieapp.com',
  'prod-test-creator@troodieapp.com'
);

-- Step 1: Delete test campaigns
DELETE FROM campaigns 
WHERE business_profile_id IN (
  SELECT bp.id FROM business_profiles bp
  JOIN users u ON bp.user_id = u.id
  WHERE u.email LIKE 'prod-test-%@troodieapp.com'
);

-- Step 2: Delete business profiles
DELETE FROM business_profiles 
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'prod-test-%@troodieapp.com'
);

-- Step 3: Delete restaurant claims
DELETE FROM restaurant_claims 
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'prod-test-%@troodieapp.com'
);

-- Step 4: Delete user_onboarding records
DELETE FROM user_onboarding
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'prod-test-%@troodieapp.com'
);

-- Step 5: Reset user accounts (or delete if preferred)
UPDATE users 
SET 
  user_type = NULL,
  account_type = 'consumer',
  is_restaurant = false,
  is_creator = false
WHERE email LIKE 'prod-test-%@troodieapp.com';

-- Step 6: Verify cleanup
SELECT email, user_type, account_type FROM users 
WHERE email LIKE 'prod-test-%@troodieapp.com';
```

### Stripe Cleanup

1. **Refund any test charges** via Stripe Dashboard
2. **Archive test customers** (don't delete - keep for audit)
3. **Disable test Express accounts** if created

---

## Production Test Sign-Off

### Checklist

| Category | Item | Status |
|----------|------|--------|
| **TRO-139** | User type saves correctly | ☐ Pass / ☐ Fail |
| **TRO-140** | Radio buttons work | ☐ Pass / ☐ Fail |
| **TRO-141** | Restaurant path routes correctly | ☐ Pass / ☐ Fail |
| **TRO-141** | Diner path routes correctly | ☐ Pass / ☐ Fail |
| **TRO-141** | Creator path routes correctly | ☐ Pass / ☐ Fail |
| **TRO-142** | Business user sees business tools | ☐ Pass / ☐ Fail |
| **TRO-142** | Non-business sees "Claim Restaurant" | ☐ Pass / ☐ Fail |
| **TRO-143** | user_type recorded in DB | ☐ Pass / ☐ Fail |
| **TRO-136** | Stripe Connect works | ☐ Pass / ☐ Fail |
| **TRO-136** | Payment method saves | ☐ Pass / ☐ Fail |
| **TRO-136** | Saved card used for campaigns | ☐ Pass / ☐ Fail |
| **TRO-136** | Free campaigns ($0) work | ☐ Pass / ☐ Fail |
| **TRO-136** | Restaurant onboarding < 10 min | ☐ Pass / ☐ Fail |
| **TRO-136** | Campaign creation < 2 min | ☐ Pass / ☐ Fail |

### Tester Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |

---

## Troubleshooting

### Common Production Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Stripe onboarding stuck | Browser redirect failed | Use "Refresh Status" button |
| Payment sheet not opening | Edge Function error | Check Supabase Function logs |
| "Column does not exist" | Migration not applied | Apply pending migration |
| Card not saving | SetupIntent failed | Check Stripe Dashboard for errors |
| Campaign creation fails | Off-session charge declined | Verify card has funds |

### Getting Help

1. **Edge Function Logs:** Supabase Dashboard → Functions → Logs
2. **Stripe Logs:** Stripe Dashboard → Developers → Logs
3. **App Logs:** Expo console or device logs

---

**Last Updated:** January 13, 2026  
**Author:** Development Team  
**Version:** 1.0 Production
