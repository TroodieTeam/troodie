# Production Test Data Setup Guide

This guide walks you through setting up test data for production test accounts.

## Prerequisites

1. ✅ Users must already exist in `public.users` table
   - Run `scripts/sync-auth-to-public-users.sql` first if needed
   - Verify users exist: `node scripts/prod-test-data-helper.js users`

## Setup Steps

Run these SQL scripts **in order** in Supabase SQL Editor:

### Step 1: Create Creator Profiles
**File:** `02a-create-creator-profiles.sql`

Creates creator profiles for:
- `prod-creator1@bypass.com` (Available)
- `prod-creator2@bypass.com` (Available)  
- `prod-creator3@bypass.com` (Busy)

### Step 2: Create Restaurants
**File:** `02b-create-restaurants.sql`

Creates test restaurants:
- "Prod Test Restaurant 1" (for prod-business1)
- "Prod Test Restaurant 2" (for prod-business2)

### Step 3: Claim Restaurants
**File:** `02c-claim-restaurants.sql`

Links restaurants to business accounts:
- Claims Restaurant 1 for `prod-business1@bypass.com`
- Claims Restaurant 2 for `prod-business2@bypass.com`
- Marks restaurants as test restaurants

### Step 3.5: Fix Business Profiles (Required for Business Dashboard)
**File:** `02h-fix-business-profiles.sql`

Creates/updates business_profiles with correct UUIDs and restaurant links:
- Links business_profiles to the claimed restaurants
- Required for Business Dashboard to work (fixes CM-8 error)

**Note:** Must run after Step 3 (claim restaurants).

### Step 4: Create Default Boards
**File:** `02d-create-boards.sql`

Creates "Quick Saves" default boards for all test users.

### Step 5: Create Campaigns (Optional)
**File:** `02f-create-campaigns.sql`

Creates test campaigns for business accounts (10 campaigns total).

### Step 6: Create Restaurant Analytics Data (CM-6 Testing)
**File:** `02g-create-restaurant-analytics-data.sql`

Creates analytics test data:
- ~25 saves for Restaurant 1 (with recent saves for trending badge)
- ~15 saves for Restaurant 2
- Posts mentioning restaurants (creator posts and regular posts)
- Engagement metrics (likes)

**Note:** Requires Steps 1-4 to be completed first.

### Step 7: Verify Setup
**File:** `02e-verify-setup.sql`

Run verification queries to confirm everything was created correctly.

### Step 8: Setup Restaurant Claim & Upgrade Test (Optional)
**File:** `02i-setup-restaurant-claim-upgrade-test.sql`

Prepares `prod-consumer2` and creates unclaimed restaurant for testing:
- Restaurant claiming flow
- Automatic account upgrade from `consumer` → `business`
- Business profile creation
- Restaurant claim verification

**Test Account:**
- Email: `prod-consumer2@bypass.com`
- OTP: `000000`
- Starts as `account_type = 'consumer'`

**Test Restaurant:**
- Name: "Prod Test Claiming"
- Status: Unclaimed (ready for claim)

**Use Case:** Test Case BUS-1 in `docs/CREATOR_MARKETPLACE_PRODUCTION_TESTING_CHECKLIST.md`

**After Testing:**
- Run the RESET query at the bottom of the script to reset for next test iteration
- Resets account back to `consumer` and unclaims the restaurant

## Quick Reference

**Test Account UIDs:**
- Consumer 1: `b22f710c-c15a-4ee1-bce4-061902b954cc`
- Consumer 2: `2621c5c4-a6de-42e5-8f1d-b73039646403`
- Creator 1: `348be0b5-eef5-41be-8728-84c4d09d2bf2`
- Creator 2: `6740e5be-c1ca-444c-b100-6122c3dd8273`
- Creator 3: `08f478e2-45b9-4ab2-a068-8276beb851c3`
- Business 1: `cfd8cdb5-a227-42bd-8040-cd4fb965b58e`
- Business 2: `0e281bb7-6867-40b4-afff-4e82608cc34d`

**Login Credentials:**
- Email: `prod-xxx@bypass.com`
- OTP Code: `000000`

## Troubleshooting

If you get errors:
1. Verify users exist: `SELECT * FROM users WHERE email LIKE 'prod-%@bypass.com';`
2. Check if profiles already exist: `SELECT * FROM creator_profiles cp JOIN users u ON cp.user_id = u.id WHERE u.email LIKE 'prod-creator%@bypass.com';`
3. Check restaurant claims: `SELECT * FROM restaurant_claims rc JOIN users u ON rc.user_id = u.id WHERE u.email LIKE 'prod-business%@bypass.com';`
4. Check business profiles: `SELECT bp.*, u.email, r.name as restaurant_name FROM business_profiles bp JOIN users u ON bp.user_id = u.id LEFT JOIN restaurants r ON bp.restaurant_id = r.id WHERE u.email LIKE 'prod-business%@bypass.com';`

**Common Issue: Business Dashboard Error**
If you see "JSON object requested, multiple (or no) rows returned" when accessing Business Dashboard:
- Run `02h-fix-business-profiles.sql` to create/update business_profiles with correct restaurant links

All scripts use `ON CONFLICT` so they're safe to run multiple times.

---

## Complete Reset & Testing

### Step 9: Reset All Test Data (Before Fresh Testing)
**File:** `03-complete-reset-all-test-data.sql`

Resets ALL test data to a clean state:
- Removes Stripe accounts
- Removes payment transactions
- Removes campaign payments
- Removes deliverables
- Removes applications
- Resets campaigns to unpaid/active state
- Clears notifications

**Use this before each testing session to start fresh.**

### Step 10: Setup Troodie Restaurant Paid Campaigns
**File:** `04-setup-troodie-restaurant-paid-campaigns.sql`

Creates/finds Troodie Restaurant with paid opportunities:
- Featured Creator Partnership ($500) - 2 creators
- New Menu Launch ($300) - 1 creator
- UGC Video Creator ($400) - 1 creator

**Total: $1,200 in paid opportunities for creators to apply!**

## Ultimate Testing Guide

See `docs/PRODUCTION_TESTING_ULTIMATE_GUIDE.md` for:
- Step-by-step E2E testing instructions
- Stripe onboarding guides (business & creator)
- Campaign payment flow
- Creator application & deliverable flow
- Payout verification
- Troubleshooting common issues

## Admin Account Setup

See `docs/ADMIN_ACCOUNT_SETUP_GUIDE.md` for:
- Creating admin accounts with bypass OTP (`000000`)
- Setting up `team@troodieapp.com` admin account
- Adding admin UUIDs to `adminReviewService.ts`
- Verifying admin access and capabilities
