# Payment System End-to-End Testing Guide

**Date:** January 17, 2025  
**Purpose:** Comprehensive testing guide for the Stripe Connect Express payment system  
**Status:** Ready for Testing

---

## Table of Contents

1. [Overview](#overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Test Accounts](#test-accounts)
4. [Test Campaigns](#test-campaigns)
5. [Payment Flow Testing](#payment-flow-testing)
   - [Business Payment Onboarding](#business-payment-onboarding)
   - [Campaign Payment Processing](#campaign-payment-processing)
   - [Creator Payout Onboarding](#creator-payout-onboarding)
   - [Automatic Payout Processing](#automatic-payout-processing)
6. [Webhook Testing](#webhook-testing)
7. [Edge Cases & Error Scenarios](#edge-cases--error-scenarios)
8. [Integration Testing](#integration-testing)
9. [Production Readiness Checklist](#production-readiness-checklist)

---

## Overview

This guide covers comprehensive testing for the Stripe Connect Express payment system, including:

- ✅ Business Stripe Connect Express onboarding
- ✅ Campaign payment processing (escrow model)
- ✅ Creator Stripe Connect Express onboarding
- ✅ Automatic payout processing on deliverable approval
- ✅ Webhook event handling
- ✅ Payment notifications
- ✅ Error handling and retry logic
- ✅ Payment status tracking

**⚠️ Stripe Test Mode Required:** All testing should be done in Stripe Test Mode using test API keys and test cards.

---

## Test Environment Setup

### Prerequisites

1. **Database Migrations**
   ```bash
   # Ensure payment system migration is applied:
   - 20251210_payment_system.sql
   ```

2. **Supabase Edge Functions**
   ```bash
   # Deploy required functions:
   supabase functions deploy stripe-webhook
   supabase functions deploy stripe-redirect
   ```

3. **Stripe Configuration**
   - Stripe Test Mode account set up
   - API keys configured in environment variables:
     - `STRIPE_SECRET_KEY` (test mode: `sk_test_...`)
     - `STRIPE_PUBLISHABLE_KEY` (test mode: `pk_test_...`)
     - `STRIPE_WEBHOOK_SECRET` (test mode: `whsec_...`)
   - Webhook endpoint configured in Stripe Dashboard:
     - URL: `https://[your-dev-supabase-project].supabase.co/functions/v1/stripe-webhook`
     - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `transfer.created`, `transfer.paid`, `transfer.failed`, `account.updated`
   - Redirect URLs configured in Stripe Connect settings:
     - Return URL: `https://[your-dev-supabase-project].supabase.co/functions/v1/stripe-redirect/return`
     - Refresh URL: `https://[your-dev-supabase-project].supabase.co/functions/v1/stripe-redirect/refresh`

4. **Environment Variables**
   ```env
   # Supabase
   SUPABASE_URL=https://[your-dev-project].supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   
   # Stripe (Test Mode)
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

5. **Test Data Setup**
   
   **Initial Campaign Setup (Run Once):**
   ```sql
   -- Create all 6 holiday test campaigns
   -- Run scripts/payment-test-setup-all-campaigns.sql
   -- This creates campaigns assigned to test-business1@bypass.com
   ```
   
   **Test Case Setup Scripts:**
   - Each test case has its own setup script (see individual test cases)
   - Setup scripts prepare the exact state needed for testing
   - Reset scripts clean up after testing
   
   **Complete Reset (When Needed):**
   ```sql
   -- Reset ALL payment test data
   -- Run scripts/payment-test-reset-all.sql
   -- Use this to start fresh or clean up all test data
   ```
   
   **Existing Test Accounts:** Use accounts from `docs/TEST_DATA_GUIDE.md`:
   - Business: `test-business1@bypass.com`, `test-business2@bypass.com`
   - Creators: `test-creator1@bypass.com`, `test-creator2@bypass.com`, `test-creator3@bypass.com`
   - Consumers: `test-consumer1@bypass.com` through `test-consumer5@bypass.com`
   - All passwords: `BypassPassword123` or OTP: `000000`

---

## Test Scripts Overview

Each test case has **setup** and **reset** scripts to prepare and clean up test data:

### Setup Scripts
- **Purpose:** Prepare test environment before testing
- **When to run:** Before each test case
- **What they do:** Remove existing data, set up required state (e.g., remove Stripe accounts, create campaigns, etc.)

### Reset Scripts
- **Purpose:** Clean up after testing
- **When to run:** After each test case
- **What they do:** Remove test data created during testing (e.g., Stripe accounts, payments, transactions)

### Quick Start

**First Time Setup:**
```sql
-- 1. Create all test campaigns (run once)
-- Run: scripts/payment-test-setup-all-campaigns.sql

-- 2. Before each test case, run its setup script
-- Example: scripts/payment-test-setup-business-onboarding.sql
```

**After Testing:**
```sql
-- Run the reset script for the test case you just completed
-- Example: scripts/payment-test-reset-business-onboarding.sql

-- Or reset everything:
-- Run: scripts/payment-test-reset-all.sql
```

**Script Reference:** See [Test Scripts Reference](#test-scripts-reference) section at the end of this guide for complete list.

---

## Test Accounts

**⚠️ All test accounts use:** `@bypass.com` domain, password: `BypassPassword123`, OTP: `000000`

**📚 Reference:** See `docs/TEST_DATA_GUIDE.md` for complete test account details and setup instructions.

**Current Test Data Available:**
- 5 Consumers: `test-consumer1@bypass.com` through `test-consumer5@bypass.com`
- 3 Creators: `test-creator1@bypass.com` through `test-creator3@bypass.com`
- 2 Businesses: `test-business1@bypass.com`, `test-business2@bypass.com`
- All accounts have existing data: posts, saves, campaigns, applications, deliverables

### Business Accounts (For Payment Testing)

- **test-business1@bypass.com** (NEW)
  - **Password:** `BypassPassword123` (or OTP: `000000`)
  - **Account Type:** Business
  - **Restaurant:** Has claimed restaurant
  - **Stripe Account:** None (will create during testing)
  - **Purpose:** Test business Stripe onboarding and first campaign payment
  - **Current State:** New user, just claimed restaurant, 0 campaigns

- **test-business2@bypass.com** (EXISTING)
  - **Password:** `BypassPassword123` (or OTP: `000000`)
  - **Account Type:** Business
  - **Restaurant:** Has claimed restaurant
  - **Stripe Account:** May exist (will verify during testing)
  - **Purpose:** Test campaign payment with existing Stripe account
  - **Current State:** Medium activity (3 campaigns, ~8 applications, ~5 deliverables)

### Creator Accounts (For Payout Testing)

- **test-creator1@bypass.com**
  - **Password:** `BypassPassword123` (or OTP: `000000`)
  - **Account Type:** Creator
  - **Stripe Account:** None initially (will create during testing)
  - **Purpose:** Test creator Stripe onboarding and payout processing
  - **Current State:** Has creator profile, portfolio, and applications

- **test-creator2@bypass.com**
  - **Password:** `BypassPassword123` (or OTP: `000000`)
  - **Account Type:** Creator
  - **Stripe Account:** None initially (will create during testing)
  - **Purpose:** Test creator onboarding prompt after deliverable approval
  - **Current State:** Has creator profile and deliverables

- **test-creator3@bypass.com**
  - **Password:** `BypassPassword123` (or OTP: `000000`)
  - **Account Type:** Creator
  - **Stripe Account:** None initially (will create during testing)
  - **Purpose:** Test multiple creator payouts
  - **Current State:** Has creator profile and applications

### Consumer Accounts (For Creator Upgrade Testing)

- **test-consumer1@bypass.com** through **test-consumer5@bypass.com**
  - **Password:** `BypassPassword123` (or OTP: `000000`)
  - **Account Type:** Consumer
  - **Purpose:** Test consumer → creator upgrade flow, then Stripe onboarding
  - **Current State:** Consumer accounts with posts and saves

### Admin Account (For Campaign Creation)

- **admin@troodie.test** or **troodie-admin@troodieapp.com**
  - **Password:** `Admin123!` or `BypassPassword123` (or OTP: `000000`)
  - **Account Type:** Admin/Business
  - **Purpose:** Create test campaigns for payment testing
  - **Note:** The SQL script will find or create this account automatically

---

## Test Campaigns

Six holiday-themed campaigns have been created for testing:

### 1. Holiday Latte Crawl ☕✨
- **Budget:** $35 (3500 cents)
- **Deliverable:** 1 Reel on Instagram & TikTok collab with @troodieapp
- **Status:** Active (ready for applications)
- **Test Use Cases:**
  - Business payment onboarding
  - Campaign payment processing
  - Creator payout on approval

### 2. Cozy Winter Date Night Pick ❄️❤️
- **Budget:** $40 (4000 cents)
- **Deliverable:** 1 Reel highlighting ambiance + one dish/drink
- **Status:** Active
- **Test Use Cases:**
  - Multiple creator applications
  - Multiple deliverables per campaign
  - Sequential payout processing

### 3. Festive Cocktails Tour 🍹🎄
- **Budget:** $45 (4500 cents)
- **Deliverable:** 1 Reel on Instagram & TikTok
- **Status:** Active
- **Test Use Cases:**
  - Higher budget payment processing
  - Payment failure scenarios
  - Retry logic

### 4. Best Holiday Dessert in Charlotte 🎂✨
- **Budget:** $30 (3000 cents)
- **Deliverable:** 1 Reel on Instagram & TikTok
- **Status:** Active
- **Test Use Cases:**
  - Lower budget payment
  - Creator onboarding required before payout

### 5. My Favorite Black-Owned Spot for the Holidays 🎁🔥
- **Budget:** $40 (4000 cents)
- **Deliverable:** 1 Reel on Instagram & TikTok
- **Status:** Active
- **Test Use Cases:**
  - Payment success flow
  - Full payout amount verification

### 6. Winter Warm-Up: Soup / Ramen / Pho Season 🍜❄️
- **Budget:** $35 (3500 cents)
- **Deliverable:** 1 Reel on Instagram & TikTok
- **Status:** Active
- **Test Use Cases:**
  - Edge cases
  - Error recovery

**To find campaign IDs:**
```sql
SELECT id, title, budget_cents, status, created_at
FROM campaigns
WHERE title LIKE '%Holiday%' OR title LIKE '%Winter%' OR title LIKE '%Festive%'
ORDER BY created_at DESC;
```

---

## Payment Flow Testing

### Business Payment Onboarding

#### Test Case 1.1: First-Time Business Stripe Onboarding

**Status:** ✅ **COMPLETED**  
**Objective:** Verify business can connect Stripe account when creating first paid campaign

**⚠️ Setup Required:** Run setup script before testing:
```sql
-- Run this script in Supabase SQL Editor:
-- scripts/payment-test-setup-business-onboarding.sql
-- This ensures test-business1@bypass.com has no Stripe account and is ready for onboarding
```

**Prerequisites:**
- Business account without Stripe Connect account
- Test account: `test-business1@bypass.com`

**Steps:**
1. Sign in as `test-business1@bypass.com` (Password: `BypassPassword123` or OTP: `000000`)
2. Navigate to Campaigns tab → Create Campaign
3. Fill in campaign details:
   - Title: "Test Payment Campaign"
   - Description: "Testing payment system"
   - Budget: $50
   - Add deliverables
4. On payment step, click "Connect Payment Account"
5. Should redirect to Stripe Connect onboarding
6. Complete Stripe onboarding:
   - Business information
   - Bank account details
   - Identity verification (use test data)
7. Return to app via redirect URL
8. Verify account status

**Expected Results:**
- ✅ Stripe account created in `stripe_accounts` table
- ✅ `onboarding_completed` = true
- ✅ Business can proceed to payment
- ✅ Account status shows as "Connected" in UI

**Verification SQL:**
```sql
SELECT sa.*, u.email
FROM stripe_accounts sa
JOIN users u ON sa.user_id = u.id
WHERE u.email = 'test-business1@bypass.com'
  AND sa.account_type = 'business';
```

**Success Criteria:**
- Stripe account ID stored
- Onboarding completed flag set
- Can create payment intent

**Post-Test Cleanup:**
```sql
-- Reset test-business1@bypass.com Stripe account for next test
-- Run scripts/payment-test-reset-business-onboarding.sql
-- This removes the Stripe account created during testing
```

---

#### Test Case 1.2: Business Stripe Onboarding Refresh

**Status:** ✅ **COMPLETED**  
**Objective:** Verify business can complete incomplete onboarding

**⚠️ Setup Required:** Run setup script before testing:
```sql
-- Run this script in Supabase SQL Editor:
-- scripts/payment-test-setup-incomplete-onboarding.sql
-- This creates an incomplete Stripe account for test-business2@bypass.com
```

**Prerequisites:**
- Business account with incomplete Stripe onboarding
- Test account: `test-business2@bypass.com`

**Steps:**
1. Sign in as business account
2. Navigate to campaign creation
3. If Stripe account exists but incomplete, should show "Complete Setup"
4. Click to refresh onboarding link
5. Complete missing information in Stripe
6. Return to app

**Expected Results:**
- ✅ Onboarding link refreshed
- ✅ Can complete missing steps
- ✅ Account status updated after completion

**Post-Test Cleanup:**
```sql
-- Reset test-business2@bypass.com Stripe account for next test
-- Run scripts/payment-test-reset-all.sql (removes all Stripe accounts)
-- Or manually delete: DELETE FROM stripe_accounts WHERE user_id = (SELECT id FROM users WHERE email = 'test-business2@bypass.com') AND account_type = 'business';
```

---

### Campaign Payment Processing

#### Test Case 2.1: Successful Campaign Payment

**Status:** ✅ **COMPLETED**  
**Objective:** Verify business can pay for campaign and campaign activates

**⚠️ Setup Required:** Run setup script before testing:
```sql
-- Run this script in Supabase SQL Editor:
-- scripts/payment-test-setup-campaign-payment.sql
-- This ensures test-business1@bypass.com has completed Stripe onboarding and a campaign ready for payment
```

**Prerequisites:**
- Business with completed Stripe onboarding
- Test campaign created (use one of the 6 test campaigns)

**Steps:**
1. Sign in as business account with Stripe connected
2. Navigate to campaign creation or existing unpaid campaign
3. Review payment summary:
   - Campaign budget: $X
   - Total amount: $X (no platform fee)
4. Click "Pay Now" or "Complete Payment"
5. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
6. Complete payment in Stripe Checkout
7. Wait for webhook confirmation

**Expected Results:**
- ✅ Payment intent created in Stripe
- ✅ Payment record created in `campaign_payments` table
- ✅ Status = 'pending' initially
- ✅ Webhook receives `payment_intent.succeeded` event
- ✅ Payment status updated to 'succeeded'
- ✅ Campaign status updated to 'active'
- ✅ Campaign `payment_status` = 'paid'
- ✅ Transaction record created in `payment_transactions`
- ✅ Business receives payment success notification
- ✅ Campaign becomes visible to creators

**Verification SQL:**
```sql
-- Check payment record
SELECT cp.*, c.title, c.status as campaign_status, c.payment_status
FROM campaign_payments cp
JOIN campaigns c ON cp.campaign_id = c.id
WHERE c.title = 'Holiday Latte Crawl'
ORDER BY cp.created_at DESC
LIMIT 1;

-- Check transaction record
SELECT pt.*
FROM payment_transactions pt
WHERE pt.campaign_id = (
  SELECT id FROM campaigns WHERE title = 'Holiday Latte Crawl' LIMIT 1
)
AND pt.transaction_type = 'payment'
ORDER BY pt.created_at DESC
LIMIT 1;
```

**Success Criteria:**
- Payment intent ID stored
- Payment amount matches campaign budget
- Platform fee = 0 (creators get full amount)
- Campaign activated
- Notification sent

**Post-Test Cleanup:**
```sql
-- Reset campaign payment for next test
-- Run scripts/payment-test-reset-campaign-payment.sql
-- This removes payment records and resets campaign to unpaid state
```

---

#### Test Case 2.2: Failed Payment Handling

**Status:** ✅ Tested  
**Objective:** Verify failed payments are handled correctly

**⚠️ Setup Required:** Use same setup as Test Case 2.1:
```sql
-- Run scripts/payment-test-setup-campaign-payment.sql
-- This sets up business with Stripe account and unpaid campaign
```

**Prerequisites:**
- Business with Stripe account
- Test campaign

**Steps:**
1. Sign in as business account
2. Navigate to campaign payment
3. Use Stripe test card for declined payment: `4000 0000 0000 0002`
4. Attempt payment
5. Payment should fail

**Expected Results:**
- ✅ Payment intent created
- ✅ Payment fails in Stripe
- ✅ Webhook receives `payment_intent.payment_failed` event
- ✅ Payment status updated to 'failed'
- ✅ Campaign `payment_status` = 'failed'
- ✅ Campaign remains inactive
- ✅ Business receives payment failed notification
- ✅ Business can retry payment

**Verification SQL:**
```sql
SELECT cp.status, cp.updated_at, c.payment_status, c.status as campaign_status
FROM campaign_payments cp
JOIN campaigns c ON cp.campaign_id = c.id
WHERE cp.status = 'failed'
ORDER BY cp.updated_at DESC
LIMIT 1;
```

**Success Criteria:**
- Failed status recorded
- Campaign not activated
- Error notification sent
- Retry option available

**Post-Test Cleanup:**
```sql
-- Same as Test Case 2.1
-- Run scripts/payment-test-reset-campaign-payment.sql
```

---

#### Test Case 2.3: Payment Retry After Failure

**Status:** ✅ **COMPLETED**  
**Objective:** Verify business can retry failed payment

**⚠️ Setup Required:** 
```sql
-- First run Test Case 2.2 to create a failed payment
-- Or manually set campaign payment_status = 'failed'
-- Run scripts/payment-test-setup-campaign-payment.sql first
```

**Prerequisites:**
- Campaign with failed payment

**Steps:**
1. Navigate to campaign with failed payment
2. Click "Retry Payment" or "Pay Now"
3. Use successful test card: `4242 4242 4242 4242`
4. Complete payment

**Expected Results:**
- ✅ New payment intent created
- ✅ Previous failed payment remains in history
- ✅ New payment succeeds
- ✅ Campaign activates

**Post-Test Cleanup:**
```sql
-- Run scripts/payment-test-reset-campaign-payment.sql
```

---

### Creator Payout Onboarding

#### Test Case 3.1: Creator Stripe Onboarding Before Deliverable Approval

**Objective:** Verify creator can connect Stripe account before receiving payout

**⚠️ Setup Required:** Run setup script before testing:
```sql
-- Run this script in Supabase SQL Editor:
-- scripts/payment-test-setup-creator-onboarding.sql
-- This ensures test-creator1@bypass.com has no Stripe account and is ready for onboarding
```

**Prerequisites:**
- Creator account without Stripe Connect account
- Test account: `test-creator1@bypass.com`
- Approved deliverable waiting for payout

**Steps:**
1. Sign in as `test-creator1@bypass.com` (Password: `BypassPassword123` or OTP: `000000`)
2. Navigate to Payments/Earnings screen
3. Should see "Connect Payment Account" prompt
4. Click "Connect Account"
5. Complete Stripe Connect onboarding:
   - Personal information
   - Bank account details
   - SSN/Tax information (use test data)
6. Return to app via redirect URL
7. Verify account status

**Expected Results:**
- ✅ Stripe account created in `stripe_accounts` table
- ✅ `onboarding_completed` = true
- ✅ Creator profile updated with `stripe_account_id`
- ✅ Can receive payouts
- ✅ Pending payouts can be processed

**Verification SQL:**
```sql
SELECT sa.*, cp.stripe_account_id, cp.stripe_onboarding_completed
FROM stripe_accounts sa
JOIN creator_profiles cp ON cp.user_id = sa.user_id
JOIN users u ON sa.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com'
  AND sa.account_type = 'creator';
```

**Success Criteria:**
- Stripe account ID stored
- Creator profile updated
- Onboarding completed
- Ready for payouts

**Post-Test Cleanup:**
```sql
-- Reset test-creator1@bypass.com Stripe account for next test
-- Run scripts/payment-test-reset-creator-onboarding.sql
-- This removes the Stripe account created during testing
```

---

#### Test Case 3.2: Creator Onboarding Prompt After Deliverable Approval

**Objective:** Verify creator is prompted to onboard when deliverable approved without Stripe account

**⚠️ Setup Required:** Run setup script before testing:
```sql
-- Run this script in Supabase SQL Editor:
-- scripts/payment-test-setup-creator-onboarding-after-approval.sql
-- This sets up:
-- - test-creator2@bypass.com with NO Stripe account
-- - Paid campaign from test-business1@bypass.com
-- - Approved deliverable with payment_status = 'pending_onboarding'
```

**Prerequisites:**
- Creator account without Stripe account
- Deliverable submitted and approved
- Test account: `test-creator2@bypass.com`

**Steps:**
1. Creator submits deliverable for campaign
2. Business approves deliverable
3. Payout processing attempts
4. System detects no Stripe account
5. Creator receives notification: "Complete payment setup to receive payout"
6. Deliverable `payment_status` = 'pending_onboarding'
7. Creator navigates to Payments screen
8. Completes Stripe onboarding
9. Payout automatically processes (or manual retry)

**Expected Results:**
- ✅ Deliverable status = 'pending_onboarding'
- ✅ Notification sent to creator
- ✅ After onboarding, payout processes
- ✅ Deliverable `payment_status` = 'completed'

**Verification SQL:**
```sql
SELECT cd.id, cd.status, cd.payment_status, cd.payment_transaction_id
FROM campaign_deliverables cd
JOIN creator_profiles cp ON cd.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator2@bypass.com'
  AND cd.payment_status = 'pending_onboarding';
```

**Post-Test Cleanup:**
```sql
-- Reset test-creator2@bypass.com Stripe account and deliverable for next test
-- Run scripts/payment-test-reset-creator-onboarding.sql (for test-creator2@bypass.com)
-- Or run scripts/payment-test-reset-all.sql to reset everything
```

---

### Automatic Payout Processing

#### Test Case 4.1: Successful Automatic Payout

**Status:** ✅ **COMPLETED** (December 17, 2025)  
**Objective:** Verify payout processes automatically when deliverable approved

**⚠️ Setup Required:** Run setup script before testing:
```sql
-- Run this script in Supabase SQL Editor:
-- scripts/payment-test-setup-payout-processing.sql
-- This sets up:
-- - Business with completed Stripe onboarding
-- - Creator with completed Stripe onboarding
-- - Paid campaign
-- - Submitted deliverable (ready for approval)
```

**Prerequisites:**
- Campaign with successful payment
- Creator with completed Stripe onboarding
- Deliverable submitted
- Test accounts: Business (`test-business1@bypass.com`) + Creator (`test-creator1@bypass.com`)

**Steps:**
1. Creator applies to campaign and gets selected
2. Creator submits deliverable
3. Business approves deliverable
4. System automatically processes payout
5. Wait for Stripe transfer to complete
6. Webhook receives `transfer.paid` event

**Expected Results:**
- ✅ Payout processing triggered on approval
- ✅ Stripe Transfer created to creator's account
- ✅ Transfer amount = full campaign budget (no fee deduction)
- ✅ Deliverable `payment_status` = 'processing' initially
- ✅ Webhook receives `transfer.paid` event
- ✅ Deliverable `payment_status` = 'completed'
- ✅ `paid_at` timestamp set
- ✅ Transaction record created in `payment_transactions`
- ✅ Creator receives payout notification
- ✅ Creator earnings updated

**Verification SQL:**
```sql
-- Check deliverable payment status
SELECT cd.id, cd.status, cd.payment_status, cd.paid_at, cd.payment_transaction_id
FROM campaign_deliverables cd
WHERE cd.payment_status = 'completed'
ORDER BY cd.paid_at DESC
LIMIT 1;

-- Check transaction record
SELECT pt.*
FROM payment_transactions pt
WHERE pt.transaction_type = 'payout'
  AND pt.status = 'completed'
ORDER BY pt.completed_at DESC
LIMIT 1;

-- Verify payout amount (should equal campaign budget)
SELECT 
  c.budget_cents as campaign_budget,
  pt.creator_amount_cents as payout_amount,
  pt.platform_fee_cents
FROM payment_transactions pt
JOIN campaigns c ON pt.campaign_id = c.id
WHERE pt.transaction_type = 'payout'
ORDER BY pt.created_at DESC
LIMIT 1;
-- Expected: payout_amount = campaign_budget, platform_fee_cents = 0
```

**Success Criteria:**
- ✅ Transfer created in Stripe
- ✅ Full amount transferred (no fee)
- ✅ Status updated correctly
- ✅ Notification sent
- ✅ Transaction logged

**Test Results (December 17, 2025):**
- ✅ `approveDeliverable()` correctly sets `payment_amount_cents` from `campaign_payments.creator_payout_cents` or `campaigns.budget_cents`
- ✅ `processDeliverablePayout()` automatically invoked after approval
- ✅ Stripe transfer created successfully (`tr_1SfNzQDt5lHC2XMOrtrFF47N`)
- ✅ Payment transaction record created in `payment_transactions` table
- ✅ Deliverable `payment_status` updated to `'processing'`
- ✅ All validation checks pass (creator onboarding, campaign payment, amount > 0)
- ✅ Error handling improved with detailed logging

**Known Issues Fixed:**
- ✅ Fixed `reviewer_id` column name (was incorrectly using `reviewed_by`)
- ✅ Fixed `payment_amount_cents` calculation to use `budget_cents` correctly (1 creator per campaign)
- ✅ Fixed `handleDeliverableStatusChange` to use proper service functions instead of direct DB updates
- ✅ Added comprehensive tracing logs for debugging payout flow

**⚠️ Payment Model Consideration:**
Currently, payouts happen per deliverable upon approval. Consideration for future:
- **Option A:** Pay once when campaign is completed (all deliverables approved)
- **Option B:** Lock deliverables after campaign payment to prevent changes
- **Current Model:** Pay per deliverable as approved (working as implemented)

**Post-Test Cleanup:**
```sql
-- Reset payout test data for next test
-- Run scripts/payment-test-reset-payout-processing.sql
-- This resets deliverables payment status and removes payout transaction records
```

---

#### Test Case 4.2: Payout Failure Handling

**Objective:** Verify payout failures are handled and retried

**⚠️ Setup Required:** Use same setup as Test Case 4.1:
```sql
-- Run scripts/payment-test-setup-payout-processing.sql
-- This sets up paid campaign and deliverable ready for approval
```

**Prerequisites:**
- Campaign with payment
- Creator with Stripe account
- Deliverable approved

**Steps:**
1. Approve deliverable
2. Payout processing attempts
3. Simulate transfer failure (or use Stripe test mode failure scenarios)
4. System handles failure

**Expected Results:**
- ✅ Transfer failure detected
- ✅ Webhook receives `transfer.failed` event
- ✅ Deliverable `payment_status` = 'failed' or 'processing' (depending on retry count)
- ✅ `payment_error` message stored
- ✅ `payment_retry_count` incremented
- ✅ Retry scheduled (if retry count < 3)
- ✅ Creator notified of failure
- ✅ After 3 failures, status = 'failed' and manual review required

**Verification SQL:**
```sql
SELECT cd.id, cd.payment_status, cd.payment_error, cd.payment_retry_count
FROM campaign_deliverables cd
WHERE cd.payment_status = 'failed'
ORDER BY cd.updated_at DESC
LIMIT 1;
```

**Post-Test Cleanup:**
```sql
-- Run scripts/payment-test-reset-payout-processing.sql
```

---

#### Test Case 4.3: Multiple Deliverables Payout

**Objective:** Verify multiple deliverables from same campaign can be paid out

**⚠️ Setup Required:** 
```sql
-- Run scripts/payment-test-setup-payout-processing.sql
-- Then manually create additional deliverables for same campaign
-- Or use existing deliverables from test data
```

**Prerequisites:**
- Campaign with multiple selected creators
- Multiple deliverables submitted

**Steps:**
1. Multiple creators submit deliverables
2. Approve each deliverable sequentially
3. Each approval triggers payout
4. Verify each payout processes independently

**Expected Results:**
- ✅ Each deliverable gets separate payout
- ✅ Each payout = full campaign budget (not split)
- ✅ Multiple transfers created
- ✅ All payouts complete successfully
- ✅ Each creator receives full amount

**Note:** This tests the escrow model where each deliverable gets the full campaign budget.

**Post-Test Cleanup:**
```sql
-- Run scripts/payment-test-reset-payout-processing.sql
```

---

## Webhook Testing

### Test Case 5.1: Payment Intent Success Webhook

**Objective:** Verify webhook correctly processes payment success

**Steps:**
1. Create and complete payment
2. Monitor webhook logs in Supabase Edge Functions
3. Verify webhook receives event
4. Check database updates

**Expected Results:**
- ✅ Webhook receives `payment_intent.succeeded` event
- ✅ Signature verification passes
- ✅ Payment record updated
- ✅ Campaign activated
- ✅ Transaction created
- ✅ Notification sent

**Webhook Logs:**
```bash
# Check Supabase Edge Function logs
supabase functions logs stripe-webhook --project-ref [your-project-ref]
```

---

### Test Case 5.2: Transfer Paid Webhook

**Objective:** Verify payout completion webhook

**Steps:**
1. Approve deliverable
2. Wait for Stripe transfer
3. Monitor webhook for `transfer.paid` event
4. Verify deliverable status updated

**Expected Results:**
- ✅ Webhook receives `transfer.paid` event
- ✅ Deliverable `payment_status` = 'completed'
- ✅ `paid_at` timestamp set
- ✅ Transaction status updated
- ✅ Creator notification sent

---

### Test Case 5.3: Account Updated Webhook

**Objective:** Verify Stripe account status updates

**Steps:**
1. Complete Stripe onboarding
2. Update account in Stripe Dashboard
3. Monitor webhook for `account.updated` event

**Expected Results:**
- ✅ Webhook receives `account.updated` event
- ✅ Account status updated in database
- ✅ UI reflects updated status

---

## Edge Cases & Error Scenarios

### Test Case 6.1: Concurrent Payment Processing

**Objective:** Verify system handles concurrent payments correctly

**Steps:**
1. Multiple businesses attempt to pay simultaneously
2. Verify no race conditions
3. All payments process correctly

**Expected Results:**
- ✅ All payments process independently
- ✅ No duplicate payment intents
- ✅ All campaigns activate correctly

---

### Test Case 6.2: Campaign Cancellation After Payment

**Objective:** Verify refund handling if campaign cancelled

**Steps:**
1. Business pays for campaign
2. Campaign activates
3. Business cancels campaign
4. Verify refund process (if implemented)

**Expected Results:**
- ✅ Refund created (if feature implemented)
- ✅ Payment status = 'refunded'
- ✅ Campaign status updated
- ✅ Business notified

---

### Test Case 6.3: Webhook Delivery Failure

**Objective:** Verify system handles webhook failures

**Steps:**
1. Temporarily disable webhook endpoint
2. Complete payment
3. Re-enable webhook
4. Verify Stripe retries webhook delivery

**Expected Results:**
- ✅ Stripe retries webhook delivery
- ✅ Event processed when webhook available
- ✅ No data loss

---

### Test Case 6.4: Invalid Webhook Signature

**Objective:** Verify webhook signature validation

**Steps:**
1. Send webhook with invalid signature
2. Verify webhook rejects request

**Expected Results:**
- ✅ Webhook returns 400 error
- ✅ Event not processed
- ✅ No database updates

---

## Integration Testing

### Test Case 7.1: End-to-End Payment Flow

**Objective:** Complete flow from campaign creation to creator payout

**Test Accounts:**
- Business: `test-business1@bypass.com` (Password: `BypassPassword123` or OTP: `000000`)
- Creator: `test-creator1@bypass.com` (Password: `BypassPassword123` or OTP: `000000`)

**Steps:**
1. **Business Side:**
   - Sign in as `test-business1@bypass.com`
   - Navigate to Campaigns → Create Campaign
   - Fill in campaign details with budget (use one of the 6 test campaigns or create new)
   - Connect Stripe account (if needed) - will redirect to Stripe onboarding
   - Complete Stripe onboarding
   - Return to app and pay for campaign
   - Use test card: `4242 4242 4242 4242`
   - Verify campaign activates

2. **Creator Side:**
   - Sign in as `test-creator1@bypass.com`
   - Navigate to Creator Marketplace
   - Browse and apply to the paid campaign
   - Get selected by business
   - Connect Stripe account (if needed) - navigate to Payments screen
   - Complete Stripe onboarding
   - Submit deliverable for the campaign

3. **Business Review:**
   - Sign in as `test-business1@bypass.com`
   - Navigate to campaign → Review deliverables
   - Approve the deliverable
   - Verify payout automatically triggers

4. **Creator Receives Payment:**
   - Sign in as `test-creator1@bypass.com`
   - Navigate to Payments/Earnings screen
   - Verify payout completes (status = 'completed')
   - Check earnings updated with full payment amount
   - Verify notification received about payment

**Expected Results:**
- ✅ All steps complete successfully
- ✅ Payment flows correctly
- ✅ Payout processes automatically
- ✅ All notifications sent
- ✅ Data consistent across tables

---

### Test Case 7.2: Multiple Campaigns, Multiple Creators

**Objective:** Verify system handles multiple concurrent campaigns

**Test Accounts:**
- Businesses: `test-business1@bypass.com`, `test-business2@bypass.com`
- Creators: `test-creator1@bypass.com`, `test-creator2@bypass.com`, `test-creator3@bypass.com`

**Steps:**
1. Use the 6 test campaigns created by the SQL script
2. Sign in as `test-business1@bypass.com` and pay for 2-3 campaigns
3. Sign in as `test-business2@bypass.com` and pay for remaining campaigns
4. Multiple creators (`test-creator1`, `test-creator2`, `test-creator3`) apply to different campaigns
5. Businesses select creators and creators submit deliverables
6. Approve deliverables sequentially
7. Verify all payouts process correctly (each creator receives full campaign budget)

**Expected Results:**
- ✅ All campaigns activate
- ✅ All payouts process
- ✅ No conflicts or errors
- ✅ All data accurate

---

## Production Readiness Checklist

Before going live, verify:

### Stripe Configuration
- [ ] Live mode API keys configured
- [ ] Live mode webhook endpoint deployed
- [ ] Live mode redirect URLs configured
- [ ] Webhook events subscribed correctly
- [ ] Stripe Connect settings configured for live mode

### Supabase Configuration
- [ ] Production Edge Functions deployed
- [ ] Production environment variables set
- [ ] Webhook secret matches Stripe Dashboard
- [ ] Redirect function deployed to production

### Database
- [ ] Payment migrations applied
- [ ] RLS policies configured
- [ ] Indexes created
- [ ] Triggers working correctly

### Code
- [ ] Platform fee removed (creators get full amount)
- [ ] Error handling implemented
- [ ] Retry logic working
- [ ] Notifications configured

### Testing
- [ ] All test cases passed
- [ ] Edge cases tested
- [ ] Webhook delivery verified
- [ ] Payment flows tested end-to-end
- [ ] Error scenarios tested

### Documentation
- [ ] Setup instructions complete
- [ ] API documentation updated
- [ ] User guides created (if needed)

---

## Stripe Test Cards

Use these test cards for testing:

### Successful Payments
- **Card:** `4242 4242 4242 4242`
- **Expiry:** Any future date
- **CVC:** Any 3 digits
- **ZIP:** Any 5 digits

### Declined Payments
- **Card:** `4000 0000 0000 0002`
- **Card:** `4000 0000 0000 9995` (insufficient funds)

### 3D Secure Authentication
- **Card:** `4000 0025 0000 3155` (requires authentication)

### More Test Cards
See: https://stripe.com/docs/testing#cards

---

## Troubleshooting

### Payment Intent Not Created
- Check Stripe API key is correct
- Verify business has Stripe account
- Check network connectivity
- Review error logs

### Webhook Not Receiving Events
- Verify webhook URL in Stripe Dashboard
- Check webhook secret matches
- Verify Edge Function is deployed
- Check Supabase function logs

### Payout Not Processing
- Verify creator has Stripe account
- Check account onboarding completed
- Verify campaign payment succeeded
- Check deliverable is approved
- Review payout service logs

### Redirect URLs Not Working
- Verify `stripe-redirect` function deployed
- Check redirect URLs in Stripe Dashboard
- Test deep links in app
- Verify app handles redirect routes

---

## Test Scripts Reference

### Setup Scripts (Run Before Testing)

| Test Case | Setup Script | Purpose |
|-----------|-------------|---------|
| 1.1 - Business Onboarding | `scripts/payment-test-setup-business-onboarding.sql` | Remove Stripe account, ensure business account type |
| 1.2 - Incomplete Onboarding | `scripts/payment-test-setup-incomplete-onboarding.sql` | Create incomplete Stripe account |
| 2.1 - Campaign Payment | `scripts/payment-test-setup-campaign-payment.sql` | Setup completed Stripe account + unpaid campaign |
| 3.1 - Creator Onboarding | `scripts/payment-test-setup-creator-onboarding.sql` | Remove Stripe account, ensure creator account type |
| 3.2 - Creator Onboarding After Approval | `scripts/payment-test-setup-creator-onboarding-after-approval.sql` | Setup approved deliverable + creator without Stripe account |
| 4.1 - Payout Processing | `scripts/payment-test-setup-payout-processing.sql` | Setup paid campaign + deliverable ready for approval |
| All Campaigns | `scripts/payment-test-setup-all-campaigns.sql` | Create all 6 holiday test campaigns |

### Reset Scripts (Run After Testing)

| Test Case | Reset Script | Purpose |
|-----------|-------------|---------|
| 1.1 - Business Onboarding | `scripts/payment-test-reset-business-onboarding.sql` | Remove Stripe account |
| 2.1 - Campaign Payment | `scripts/payment-test-reset-campaign-payment.sql` | Remove payments, reset campaigns to unpaid |
| 3.1 - Creator Onboarding | `scripts/payment-test-reset-creator-onboarding.sql` | Remove Stripe account, reset creator profile |
| 3.2 - Creator Onboarding After Approval | `scripts/payment-test-reset-creator-onboarding.sql` | Remove Stripe account, reset creator profile and deliverable status |
| 4.1 - Payout Processing | `scripts/payment-test-reset-payout-processing.sql` | Reset deliverables, remove payout transactions |
| Complete Reset | `scripts/payment-test-reset-all.sql` | Reset ALL payment test data |

### Usage Pattern

**Before Each Test:**
1. Run the appropriate setup script for the test case
2. Verify setup with verification SQL queries
3. Execute test steps
4. Verify results with verification SQL queries

**After Each Test:**
1. Run the appropriate reset script
2. Verify cleanup with verification SQL queries
3. Ready for next test

**Quick Reset Everything:**
```sql
-- Run scripts/payment-test-reset-all.sql
-- Then run scripts/payment-test-setup-all-campaigns.sql
-- Ready for fresh testing
```

---

## Support Resources

- **Stripe Docs:** https://stripe.com/docs/connect
- **Stripe Testing:** https://stripe.com/docs/testing
- **Stripe Support:** https://support.stripe.com
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions

---

**Last Updated:** December 17, 2025  
**Status:** ✅ Core Payment Flow Tested & Working

## Recent Updates (December 17, 2025)

### ✅ Completed Test Cases
- **Test Case 4.1: Successful Automatic Payout** - ✅ **VERIFIED WORKING**
  - Payout automatically triggers on deliverable approval
  - Stripe transfer created successfully
  - Payment transaction records created
  - All validation checks passing

### 🔧 Fixes Applied
- Fixed `reviewer_id` column name issue
- Fixed `payment_amount_cents` calculation (now uses `budget_cents` correctly)
- Updated `handleDeliverableStatusChange` to use proper service functions
- Added comprehensive tracing logs
- Improved Edge Function error handling

### ⚠️ Payment Model Consideration
See `docs/PAYMENT_MODEL_CONSIDERATION.md` for discussion on:
- Current: Pay per deliverable upon approval
- Alternative: Pay once when campaign completed
- Alternative: Lock deliverables after payment

**Recommendation:** Keep current model + add deliverable locking mechanism
