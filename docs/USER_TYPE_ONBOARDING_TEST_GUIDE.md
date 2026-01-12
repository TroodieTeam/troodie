# User Type Segmentation Onboarding - Test Guide

**Date:** January 11, 2026  
**Tickets:** TRO-139, TRO-140, TRO-141, TRO-142, TRO-143  
**Status:** Ready for Testing

---

## Table of Contents

1. [Overview](#overview)
2. [Test Accounts](#test-accounts)
3. [Pre-Test Setup](#pre-test-setup)
4. [Test Scenarios](#test-scenarios)
   - [Scenario A: Restaurant Owner Onboarding](#scenario-a-restaurant-owner-onboarding)
   - [Scenario B: Diner Onboarding](#scenario-b-diner-onboarding)
   - [Scenario C: Creator Onboarding](#scenario-c-creator-onboarding)
5. [Database Verification](#database-verification)
6. [Navigation Updates Verification (TRO-142)](#navigation-updates-verification-tro-142)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)
8. [Post-Test Cleanup](#post-test-cleanup)
9. [Known Issues & Limitations](#known-issues--limitations)

---

## Overview

This guide covers testing for the new user type segmentation onboarding flow:

| Ticket | Feature | Description |
|--------|---------|-------------|
| TRO-139 | User Type Segmentation | Sort users into appropriate onboarding paths early |
| TRO-140 | Radio Button Selection | First screen with user type options: Diner, Restaurant, Creator |
| TRO-141 | Custom Onboarding Paths | Restaurant: Claim → Complete; Diner/Creator: Standard quiz flow |
| TRO-142 | Navigation Updates | More tab shows business tools for restaurant users |
| TRO-143 | Database User Type | Record user_type in database for analytics |

### New Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WELCOME SCREEN                               │
│                    "Welcome to Troodie"                              │
│                   [Get Started] button                               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    USER TYPE SELECTION (NEW)                         │
│                                                                      │
│   ○ 🍽️  Discover Restaurants                                        │
│         "Find your next favorite spot and share dining experiences" │
│                                                                      │
│   ○ 🏪  Promote My Restaurant                                        │
│         "Manage your restaurant profile and run creator campaigns"  │
│                                                                      │
│   ○ 📸  Create Content                                               │
│         "Partner with restaurants and grow your food content brand" │
│                                                                      │
│                        [Continue] button                             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         RESTAURANT      DINER       CREATOR
              │            │            │
              ▼            │            │
┌─────────────────────┐    │            │
│   SIGNUP SCREEN     │◄───┴────────────┘
│   (Email Entry)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   VERIFY OTP        │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
RESTAURANT    DINER/CREATOR
    │             │
    ▼             ▼
┌─────────────────────┐  ┌─────────────────────┐
│  RESTAURANT CLAIM   │  │    QUIZ INTRO       │
│  - Search location  │  │  (Standard flow)    │
│  - Admin full name  │  └──────────┬──────────┘
│  - Email address    │             │
│  - Phone number     │             ▼
└──────────┬──────────┘  ┌─────────────────────┐
           │             │      QUIZ           │
           ▼             └──────────┬──────────┘
┌─────────────────────┐             │
│  STRIPE CONNECT     │  (TRO-136)  ▼
│  - Connect Stripe   │  ┌─────────────────────┐
│  - Step 2 of 4      │  │  PERSONA RESULT     │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐
│  PAYMENT METHOD     │  │  FAVORITE SPOTS     │
│  - Save card        │  └──────────┬──────────┘
│  - Step 3 of 4      │             │
└──────────┬──────────┘             ▼
           │             ┌─────────────────────┐
           ▼             │    COMPLETE         │
┌─────────────────────┐  └──────────┬──────────┘
│  RESTAURANT         │             │
│  COMPLETE           │             │
│  - Success message  │             │
│  - Saved card info  │             │
│  - CTAs:            │             │
│    • Explore App    │             │
│    • View Dashboard │             │
└──────────┬──────────┘             │
           │                        │
           └────────────────────────┘
                        │
                        ▼
                  ┌───────────┐
                  │   TABS    │
                  │  (Main    │
                  │   App)    │
                  └───────────┘
```

---

## Test Accounts

> ⚠️ **IMPORTANT:** Test accounts use the `@bypass.com` domain, NOT `@troodieapp.com`!

### For Testing New Onboarding Flow

| Email | OTP Code | Purpose | Notes |
|-------|----------|---------|-------|
| `test-consumer1@bypass.com` | `000000` | Existing consumer | Reset onboarding to test fresh flow |
| `test-consumer2@bypass.com` | `000000` | Existing consumer | Alternative for testing |
| `test-consumer3@bypass.com` | `000000` | Existing consumer | Alternative for testing |
| Any new email (real) | Real OTP | Production-like test | Use your real email |

### For Testing Navigation Updates (TRO-142)

| Email | OTP Code | Account Type | Purpose |
|-------|----------|--------------|---------|
| `test-business1@bypass.com` | `000000` | Business (NEW) | Verify More tab shows business tools |
| `test-business2@bypass.com` | `000000` | Business (MEDIUM) | Verify More tab shows business tools |
| `test-consumer1@bypass.com` | `000000` | Consumer | Verify More tab shows "Claim Restaurant" option |
| `test-creator1@bypass.com` | `000000` | Creator | Verify creator view in More tab |

### Account Password

All bypass accounts use: `BypassPassword123`  
All bypass accounts accept OTP: `000000`

### For Database Verification

After onboarding, verify user_type is recorded:
- `diner` - Selected "Discover Restaurants"
- `restaurant_admin` - Selected "Promote My Restaurant"  
- `content_creator` - Selected "Create Content"

---

## Pre-Test Setup

### 0. Cleanup: Reset Test State (REQUIRED)

> ⚠️ **Run this query BEFORE testing to clear all previous test data:**

```sql
-- CLEANUP: Remove all restaurant claims and reset claimed restaurants
-- Run in DEV Supabase SQL Editor

-- Step 1: Clear business profiles (this removes claims)
DELETE FROM business_profiles 
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email IN ('test-consumer4@bypass.com', 'test-consumer5@bypass.com')
);

-- Step 2: Reset restaurant claims table
DELETE FROM restaurant_claims 
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email IN ('test-consumer4@bypass.com', 'test-consumer5@bypass.com')
);

-- Step 3: Reset test user accounts
UPDATE users 
SET 
  user_type = NULL,
  account_type = 'consumer',
  is_restaurant = false,
  is_creator = false
WHERE email IN ('test-consumer4@bypass.com', 'test-consumer5@bypass.com');

-- Step 4: Clear user_onboarding progress (if exists)
DELETE FROM user_onboarding
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email IN ('test-consumer4@bypass.com', 'test-consumer5@bypass.com')
);

-- Step 5: Verify cleanup
SELECT email, user_type, account_type, is_restaurant, is_creator
FROM users 
WHERE email IN ('test-consumer4@bypass.com', 'test-consumer5@bypass.com');
```

### 1. Database Migration Verification

Before testing, verify the migrations have been applied:

```sql
-- Check if user_type column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'user_type';

-- Should return:
-- column_name | data_type        | is_nullable
-- user_type   | character varying | YES

-- Check index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'users' AND indexname = 'idx_users_user_type';

-- TRO-136: Check payment columns in business_profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'business_profiles' 
AND column_name IN ('stripe_customer_id', 'default_payment_method_id', 'payment_method_last4', 'payment_setup_completed');
```

### 2. Clear Test Account State (Required for Fresh Onboarding Test)

**⚠️ IMPORTANT:** Run this SQL in Supabase SQL Editor BEFORE testing:

```sql
-- Reset test-consumer1 for fresh onboarding test
UPDATE users 
SET 
  onboarding_completed = false,
  user_type = NULL,
  account_type = 'consumer',
  is_business = false,
  is_creator = false
WHERE email = 'test-consumer1@bypass.com';

-- Clear any associated business profile
DELETE FROM business_profiles 
WHERE user_id = (SELECT id FROM users WHERE email = 'test-consumer1@bypass.com');

-- Verify reset was successful
SELECT email, user_type, account_type, is_business, onboarding_completed
FROM users WHERE email = 'test-consumer1@bypass.com';
```

Then in the app:
1. Log out of the account (if logged in)
2. Clear app data/cache OR uninstall and reinstall the app
3. This clears the AsyncStorage `hasCompletedOnboarding` flag

### 3. Ensure Test Restaurants Exist

For restaurant claiming, ensure unclaimed restaurants exist:

```sql
-- List unclaimed restaurants available for testing
SELECT r.id, r.name, r.city, r.state
FROM restaurants r
LEFT JOIN business_profiles bp ON bp.restaurant_id = r.id
WHERE bp.id IS NULL
LIMIT 10;
```

---

## Test Scenarios

### Scenario A: Restaurant Owner Onboarding (TRO-136 Updated)

**Objective:** Complete restaurant owner onboarding in 5-10 minutes (updated per TRO-136)  
**Key Change:** Now includes Stripe Connect and Payment Method setup

**Test Account:** `test-consumer5@bypass.com`  
**OTP:** `000000`

> ⚠️ **First, reset the account** - See "Pre-Test Setup" section (Step 0) to clear onboarding state

#### Step-by-Step Test

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Open app (fresh install or logged out) | Splash screen appears, then Welcome screen | ☐ |
| 2 | On Welcome screen, tap "Get Started" | Navigate to User Type Selection screen | ☐ |
| 3 | Verify User Type Selection screen displays | Three options visible with icons and descriptions | ☐ |
| 4 | Verify options text matches specs | - "Discover Restaurants" with fork/knife icon<br>- "Promote My Restaurant" with store icon<br>- "Create Content" with camera icon | ☐ |
| 5 | Tap "Promote My Restaurant" option | Radio button selects, Continue button enabled | ☐ |
| 6 | Tap "Continue" button | Navigate to Signup screen | ☐ |
| 7 | Enter email and tap "Continue" | OTP sent, navigate to Verify screen | ☐ |
| 8 | Enter OTP code (000000 for test accounts) | OTP verified, navigate to Restaurant Claim screen | ☐ |
| 9 | Verify Restaurant Claim screen displays | Form with: Restaurant search, Full name, Email, Phone fields | ☐ |
| 10 | Search for restaurant | Restaurant search results appear | ☐ |
| 11 | Select a restaurant from results | Restaurant info displays below search | ☐ |
| 12 | Enter admin details: | | |
| | - Full name: "Test Restaurant Owner" | Field accepts input | ☐ |
| | - Email: Uses account email (pre-filled) | Email shown | ☐ |
| | - Phone: "(555) 123-4567" | Field accepts input | ☐ |
| 13 | Tap "Submit Claim" button | Loading state, then navigate to **Stripe Connect** screen | ☐ |
| **NEW: Stripe Connect Steps (TRO-136)** |||
| 14 | Verify Stripe Connect screen displays | Shows: "Step 2 of 4", "Connect Stripe" card, security messaging | ☐ |
| 15 | Tap "Connect with Stripe" button | Opens Stripe Express in browser | ☐ |
| 16 | Complete Stripe onboarding (or tap Skip) | Returns to app, status updated OR skip alert shown | ☐ |
| 17 | If skipped: Confirm skip | Navigate to Payment Method screen | ☐ |
| 17a | If completed: Tap "Continue" | Navigate to Payment Method screen | ☐ |
| **NEW: Payment Method Steps (TRO-136)** |||
| 18 | Verify Payment Method screen displays | Shows: "Step 3 of 4", "Add Card" button, security badges | ☐ |
| 19 | Tap "Add Card" button | Card input UI appears OR simulation prompt | ☐ |
| 20 | Complete card entry (or simulate) | Card saved, shows "Card Saved" confirmation | ☐ |
| 21 | Verify saved card display | Shows: card brand, •••• last4, "Change" link | ☐ |
| 22 | Tap "Continue" | Navigate to Restaurant Complete screen | ☐ |
| **Completion** |||
| 23 | Verify Restaurant Complete screen | Shows: success animation, restaurant name, "claim submitted" | ☐ |
| 24 | Verify saved card info displayed | Shows: "Payment Method Saved" card with last4 (if saved) | ☐ |
| 25 | Verify Stripe Connected badge | Shows: "Stripe Connected" badge (if connected) | ☐ |
| 26 | Verify CTAs on Complete screen | Two buttons: "Explore the App", "View Business Dashboard" | ☐ |
| 27 | Tap "Explore the App" | Navigate to main tabs (Home tab) | ☐ |
| 28 | Navigate to "More" tab | Business tools section visible (NOT "Claim Restaurant" option) | ☐ |
| 29 | **TIME CHECK** | Total time from Welcome to Complete: 5-10 minutes | ☐ |

#### Database Verification

After completing Scenario A:

```sql
-- Verify user_type was set correctly
SELECT 
  id,
  email,
  user_type,
  account_type,
  is_business,
  onboarding_completed
FROM users
WHERE email = 'test-consumer5@bypass.com';

-- Expected:
-- user_type: 'restaurant_admin'
-- account_type: 'business' (or appropriate value)
-- is_business: true
-- onboarding_completed: true

-- Verify business profile was created with payment info (TRO-136)
SELECT 
  bp.id,
  bp.user_id,
  bp.restaurant_id,
  bp.admin_name,
  bp.business_email,
  bp.business_phone,
  bp.verification_status,
  bp.stripe_account_id,
  bp.stripe_onboarding_completed,
  bp.stripe_customer_id,
  bp.default_payment_method_id,
  bp.payment_method_last4,
  bp.payment_method_brand,
  bp.payment_setup_completed,
  r.name as restaurant_name
FROM business_profiles bp
JOIN restaurants r ON bp.restaurant_id = r.id
JOIN users u ON bp.user_id = u.id
WHERE u.email = 'test-consumer5@bypass.com';

-- Expected: Record exists with:
-- - All claim details (admin_name, business_email, business_phone)
-- - stripe_account_id (if Stripe connected)
-- - stripe_onboarding_completed: true (if Stripe connected)
-- - stripe_customer_id (if payment method saved)
-- - default_payment_method_id (if card saved)
-- - payment_method_last4: e.g., '4242' (if card saved)
-- - payment_method_brand: e.g., 'visa' (if card saved)
-- - payment_setup_completed: true (if payment setup done)
```

---

### Scenario B: Diner Onboarding

**Objective:** Verify diner selection routes to standard quiz flow

**Test Account:** `test-consumer4@bypass.com`  
**OTP:** `000000`

> ⚠️ **First, reset the account** - See "Pre-Test Setup" section (Step 0) to clear onboarding state

#### Step-by-Step Test

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Open app (fresh install or logged out) | Splash → Welcome screen | ☐ |
| 2 | Tap "Get Started" | Navigate to User Type Selection | ☐ |
| 3 | Tap "Discover Restaurants" option | Radio button selects | ☐ |
| 4 | Tap "Continue" | Navigate to Signup screen | ☐ |
| 5 | Complete email signup and OTP verification | Navigate to Quiz Intro (NOT Restaurant Claim) | ☐ |
| 6 | Complete standard quiz flow | Persona result, favorite spots, complete | ☐ |
| 7 | Navigate to "More" tab | "Claim Your Restaurant" option visible (user is NOT business) | ☐ |

#### Database Verification

```sql
SELECT id, email, user_type, account_type, is_business
FROM users
WHERE email = 'YOUR_TEST_EMAIL';

-- Expected:
-- user_type: 'diner'
-- account_type: 'consumer'
-- is_business: false
```

---

### Scenario C: Creator Onboarding

**Objective:** Verify creator selection routes to standard quiz flow (same as diner for now)

**Test Account:** `test-consumer3@bypass.com` (reset onboarding first)  
**OTP:** `000000`

> ⚠️ Run the reset SQL (from Pre-Test Setup) substituting `test-consumer3@bypass.com`

#### Step-by-Step Test

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Open app (fresh install or logged out) | Splash → Welcome screen | ☐ |
| 2 | Tap "Get Started" | Navigate to User Type Selection | ☐ |
| 3 | Tap "Create Content" option | Radio button selects | ☐ |
| 4 | Tap "Continue" | Navigate to Signup screen | ☐ |
| 5 | Complete email signup and OTP verification | Navigate to Quiz Intro (standard flow) | ☐ |
| 6 | Complete quiz flow | Persona result, favorite spots, complete | ☐ |
| 7 | Navigate to "More" tab | Shows standard options (can become creator later) | ☐ |

#### Database Verification

```sql
SELECT id, email, user_type, account_type, is_creator
FROM users
WHERE email = 'YOUR_TEST_EMAIL';

-- Expected:
-- user_type: 'content_creator'
-- account_type: 'consumer' (initially)
-- is_creator: false (until they complete creator onboarding)
```

---

## Database Verification

### Quick Verification Queries

```sql
-- 1. Check all test users and their user_type
SELECT 
  email,
  user_type,
  account_type,
  is_business,
  is_creator,
  onboarding_completed,
  created_at
FROM users
WHERE email LIKE 'test-%@bypass.com'
ORDER BY created_at DESC;

-- 2. Verify user_type distribution (analytics check)
SELECT 
  user_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM users
WHERE user_type IS NOT NULL
GROUP BY user_type
ORDER BY count DESC;

-- 3. Check for users who completed onboarding without user_type (should be 0 for new users)
SELECT COUNT(*)
FROM users
WHERE onboarding_completed = true
  AND user_type IS NULL
  AND created_at > '2026-01-11'; -- After migration was applied

-- 4. Verify restaurant claims from onboarding
SELECT 
  u.email,
  u.user_type,
  bp.admin_name,
  bp.business_email,
  bp.business_phone,
  bp.verification_status,
  r.name as restaurant_name,
  bp.created_at as claim_date
FROM business_profiles bp
JOIN users u ON bp.user_id = u.id
JOIN restaurants r ON bp.restaurant_id = r.id
WHERE u.user_type = 'restaurant_admin'
ORDER BY bp.created_at DESC;
```

---

## Navigation Updates Verification (TRO-142)

### Test: Business User Navigation

**Account:** `test-business1@bypass.com` or `test-business2@bypass.com`  
**OTP:** `000000`

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Login as business user | Successful login | ☐ |
| 2 | Navigate to "More" tab | More tab displays | ☐ |
| 3 | Verify Business Tools section visible | Section with business-related options shows | ☐ |
| 4 | Verify "Claim Your Restaurant" is NOT visible | Option should be hidden for business users | ☐ |
| 5 | Verify business options available | Campaign management, analytics, etc. | ☐ |

### Test: Regular User Navigation

**Account:** `test-consumer5@bypass.com` (with completed restaurant onboarding)  
**OTP:** `000000`

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Login as regular (non-business) user | Successful login | ☐ |
| 2 | Navigate to "More" tab | More tab displays | ☐ |
| 3 | Verify "Claim Your Restaurant" IS visible | Option shown in growth/action section | ☐ |
| 4 | Verify Business Tools section NOT visible | Section hidden for non-business users | ☐ |

---

## Edge Cases & Error Handling

### Test Case E1: No Restaurant Selected

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Reach Restaurant Claim screen | Form displays | ☐ |
| 2 | Fill admin details WITHOUT selecting restaurant | Submit button disabled | ☐ |
| 3 | Try to submit | Button should be disabled or show validation error | ☐ |

### Test Case E2: Missing Required Fields

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Select restaurant | Restaurant info displays | ☐ |
| 2 | Leave name field empty | Submit button disabled or shows error | ☐ |
| 3 | Fill name, leave phone empty | Submit button disabled or shows error | ☐ |
| 4 | Fill all fields | Submit button enabled | ☐ |

### Test Case E3: Restaurant Already Claimed

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Search for already-claimed restaurant | Restaurant appears in search | ☐ |
| 2 | Select the claimed restaurant | Warning or different UI shown | ☐ |
| 3 | Attempt to submit | Error message: "This restaurant has already been claimed" | ☐ |

### Test Case E4: Network Error During Claim

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Fill all claim details | Form completed | ☐ |
| 2 | Disable network (airplane mode) | Network off | ☐ |
| 3 | Tap Submit | Error message shown | ☐ |
| 4 | Enable network | Network on | ☐ |
| 5 | Retry submission | Claim succeeds | ☐ |

### Test Case E5: Back Navigation

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | On User Type Selection, tap back | Return to Welcome screen | ☐ |
| 2 | On Signup, tap back | Return to User Type Selection | ☐ |
| 3 | On Restaurant Claim, tap back | Return to Verify (or appropriate screen) | ☐ |
| 4 | Verify selections are preserved | User type still selected | ☐ |

### Test Case E6: Change User Type Selection

| Step | Action | Expected Result | ✓ |
|------|--------|-----------------|---|
| 1 | Select "Discover Restaurants" | Radio selected | ☐ |
| 2 | Change to "Promote My Restaurant" | Previous deselects, new selects | ☐ |
| 3 | Change to "Create Content" | Previous deselects, new selects | ☐ |
| 4 | Tap Continue | Correct path based on final selection | ☐ |

---

## Post-Test Cleanup

### Reset Test Accounts

```sql
-- Reset test accounts for future testing
UPDATE users 
SET 
  user_type = NULL,
  account_type = 'consumer',
  is_restaurant = false,
  is_creator = false
WHERE email IN ('test-consumer4@bypass.com', 'test-consumer5@bypass.com');

-- Remove business profiles created during test
DELETE FROM business_profiles 
WHERE user_id IN (SELECT id FROM users WHERE email IN ('test-consumer4@bypass.com', 'test-consumer5@bypass.com'));

-- Remove restaurant claims created during test
DELETE FROM restaurant_claims 
WHERE user_id IN (SELECT id FROM users WHERE email IN ('test-consumer4@bypass.com', 'test-consumer5@bypass.com'));

-- Clear user_onboarding progress
DELETE FROM user_onboarding
WHERE user_id IN (SELECT id FROM users WHERE email IN ('test-consumer4@bypass.com', 'test-consumer5@bypass.com'));
```

### Clear App State

In the app:
1. Navigate to Settings → Developer Options (if available)
2. Tap "Clear Onboarding State"
3. Or: Uninstall and reinstall the app

### Verify Cleanup

```sql
-- Confirm reset was successful
SELECT email, user_type, account_type, is_restaurant, is_creator
FROM users
WHERE email IN ('test-consumer4@bypass.com', 'test-consumer5@bypass.com');

-- Should show: user_type NULL, account_type 'consumer', is_restaurant false, is_creator false
```

---

## Known Issues & Limitations

### Current Limitations

1. **Beta Passcode Required for Restaurant Claiming**
   - The claim flow may require `TROODIE2025` passcode
   - This is entered in the beta gate if present

2. **Restaurant Search**
   - Requires active network connection
   - Search is based on Google Places or similar API

3. **Claim Verification**
   - Claims are submitted with `pending` verification status
   - Manual verification required before full business features

### Expected Behaviors

1. **User Type is Immutable**
   - Once set during onboarding, `user_type` should not change
   - This is for analytics purposes

2. **Account Type Can Change**
   - `account_type` can change (e.g., consumer → creator)
   - `user_type` captures initial signup intent

---

## Acceptance Criteria Checklist

### TRO-139: User Type Segmentation
- [ ] Restaurant owners sorted into dedicated onboarding path
- [ ] Restaurant onboarding completes in 5-10 minutes (including Stripe/payment)

### TRO-140: Radio Button Selection
- [ ] Three options displayed with correct text and icons
- [ ] Only one option selectable at a time
- [ ] Continue button requires selection

### TRO-141: Custom Onboarding Paths
- [ ] Restaurant: Claim → Stripe → Payment → Complete → App
- [ ] Diner: Quiz flow (unchanged)
- [ ] Creator: Quiz flow (unchanged)

### TRO-142: Navigation Updates
- [ ] Business users see business tools in More tab
- [ ] Business users do NOT see "Claim Restaurant" option
- [ ] Non-business users see "Claim Restaurant" option

### TRO-143: Database User Type
- [ ] `user_type` column exists in users table
- [ ] Value set on signup based on selection
- [ ] Values: 'diner', 'content_creator', 'restaurant_admin'

### TRO-136: Restaurant Payment Onboarding (NEW)
- [ ] Restaurant Claim navigates to Stripe Connect screen
- [ ] Stripe Connect screen shows "Step 2 of 4" indicator
- [ ] "Connect with Stripe" opens Stripe Express onboarding
- [ ] Skip option available for Stripe Connect
- [ ] Payment Method screen shows "Step 3 of 4" indicator
- [ ] "Add Card" saves payment method via SetupIntent
- [ ] Skip option available for Payment Method
- [ ] Restaurant Complete shows saved card info (if saved)
- [ ] Restaurant Complete shows Stripe Connected badge (if connected)
- [ ] Campaign creation shows saved payment method
- [ ] Campaign creation shows "Card on file: •••• XXXX | Change"
- [ ] No payment re-entry required when creating campaigns
- [ ] `business_profiles` has payment columns:
  - [ ] `stripe_customer_id`
  - [ ] `default_payment_method_id`
  - [ ] `payment_method_last4`
  - [ ] `payment_method_brand`
  - [ ] `payment_setup_completed`

---

## Reporting Issues

When reporting bugs, include:

1. **Test case number** (e.g., Scenario A, Step 8)
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Screenshots/video** (use device screen recording)
5. **Console logs** (if available)
6. **Database state** (run verification queries)
7. **Device info** (iOS/Android, version)
8. **App version**

---

**Last Updated:** January 11, 2026  
**Author:** Development Team  
**Version:** 1.0

---

## Quick Reference

### Test Accounts

> ⚠️ All test accounts use the `@bypass.com` domain!

| Email | OTP | Type | Use For |
|-------|-----|------|---------|
| `test-consumer4@bypass.com` | `000000` | Consumer | Diner onboarding tests |
| `test-consumer5@bypass.com` | `000000` | Consumer | Restaurant onboarding tests |
| `test-business1@bypass.com` | `000000` | Business | Navigation verification |
| `test-business2@bypass.com` | `000000` | Business | Navigation verification |
| `test-creator1@bypass.com` | `000000` | Creator | Creator flow testing |

### User Type Mapping

| Selection | user_type Value | Onboarding Path |
|-----------|-----------------|-----------------|
| Discover Restaurants | `diner` | Quiz flow |
| Promote My Restaurant | `restaurant_admin` | Restaurant Claim |
| Create Content | `content_creator` | Quiz flow |

### Time Target

- **Restaurant Onboarding Goal:** 5-10 minutes (updated for TRO-136)
- **Measure from:** Welcome screen "Get Started" tap
- **Measure to:** Restaurant Complete screen displayed
- **Includes:** Restaurant claim, Stripe Connect, Payment method setup

### Campaign Creation Time Target (TRO-136)

- **Goal:** < 2 minutes for subsequent campaigns
- **Key benefit:** No payment re-entry required
- **Shows:** "Card on file: •••• XXXX | Change"