# Production Test Cases

> **Version:** v1.0.16.b1
> **Date:** 2026-02-19
> **Total Test Cases:** 112
> **Audience:** Stakeholders, QA, engineering

This document contains all production test cases for the Troodie app. Each test case references specific test accounts, includes step-by-step instructions, expected results, and optional verification SQL.

---

## Table of Contents

1. [Test User Accounts](#test-user-accounts)
2. [Pre-Testing Setup (SETUP-1 to SETUP-3)](#pre-testing-setup)
3. [Test Data Overview](#test-data-overview)
4. [Isolation Verification (ISO-1 to ISO-8)](#isolation-verification)
5. [Authentication (AUTH-1 to AUTH-5)](#authentication)
6. [Consumer Flows (CON-1 to CON-8)](#consumer-flows)
7. [Creator Flows (CRE-1 to CRE-10)](#creator-flows)
8. [Business Flows (BUS-1 to BUS-10)](#business-flows)
9. [Campaign Lifecycle (CAM-1 to CAM-8)](#campaign-lifecycle)
10. [v1.0.16.b1: Content Submission Flow (CSF-1 to CSF-9)](#v1016b1-content-submission-flow)
11. [v1.0.16.b1: Payment Duplication Fix (PDF-1 to PDF-5)](#v1016b1-payment-duplication-fix)
12. [v1.0.16.b1: Rate Creator Timing (RCT-1 to RCT-8)](#v1016b1-rate-creator-timing)
13. [Payment Flows (PAY-1 to PAY-5)](#payment-flows)
14. [Social Features (SOC-1 to SOC-5)](#social-features)
15. [Restaurant Features (REST-1 to REST-5)](#restaurant-features)
16. [Board & Save Tests (BRD-1 to BRD-4)](#board--save-tests)
17. [Notification Tests (NOT-1 to NOT-3)](#notification-tests)
18. [Edge Cases (EDGE-1 to EDGE-13)](#edge-cases)
19. [Cross-Account Tests (CROSS-1 to CROSS-3)](#cross-account-tests)
20. [Verification SQL Reference (Appendix)](#verification-sql-reference-appendix)
21. [Summary](#summary)

---

## Test User Accounts

All test accounts use the `@bypass.com` email domain and OTP code `000000`.

### Consumers (10)

| # | Email | Purpose |
|---|-------|---------|
| 1 | `prod-consumer1@bypass.com` | Primary consumer testing |
| 2 | `prod-consumer2@bypass.com` | Social interactions (follow target) |
| 3 | `prod-consumer3@bypass.com` | Board creation and saves |
| 4 | `prod-consumer4@bypass.com` | Feed browsing and discovery |
| 5 | `prod-consumer5@bypass.com` | Search and explore |
| 6 | `prod-consumer6@bypass.com` | Notification testing |
| 7 | `prod-consumer7@bypass.com` | Post creation and engagement |
| 8 | `prod-consumer8@bypass.com` | Profile editing |
| 9 | `prod-consumer9@bypass.com` | Edge case testing |
| 10 | `prod-consumer10@bypass.com` | Cross-account upgrade testing |

### Creators (7)

| # | Email | Purpose |
|---|-------|---------|
| 1 | `prod-creator1@bypass.com` | Primary creator testing, campaign applications |
| 2 | `prod-creator2@bypass.com` | Deliverable submission and content upload |
| 3 | `prod-creator3@bypass.com` | Proof link submission |
| 4 | `prod-creator4@bypass.com` | Stripe onboarding and payouts |
| 5 | `prod-creator5@bypass.com` | Portfolio management |
| 6 | `prod-creator6@bypass.com` | Analytics and earnings |
| 7 | `prod-creator7@bypass.com` | Multi-campaign testing |

### Businesses (3)

| # | Email | Activity Level | Purpose |
|---|-------|---------------|---------|
| 1 | `prod-business1@bypass.com` | New (0 campaigns) | Fresh business onboarding |
| 2 | `prod-business2@bypass.com` | Medium (3 campaigns) | Campaign management, reviews |
| 3 | `prod-business3@bypass.com` | High (10 campaigns) | Analytics, bulk operations, large-scale testing |

---

## Pre-Testing Setup

### SETUP-1: Run Setup SQL Script

**Account:** Database admin (Supabase dashboard)
**Prerequisites:** Access to Supabase SQL Editor
**Steps:**
1. Open the Supabase dashboard and navigate to SQL Editor
2. Run the production test data setup script that creates all 20 test user accounts
3. Verify the script completes without errors
4. Note any UUIDs output by the script for reference

**Expected Result:** Script runs successfully. All 20 test accounts are created in both `auth.users` and `public.users` tables. Creator profiles exist in `creator_profiles`, business profiles in `business_profiles`.

**Verification SQL:**
```sql
-- Verify all 20 test accounts exist
SELECT
  u.id,
  u.email,
  u.account_type,
  CASE
    WHEN u.account_type = 'creator' THEN (SELECT id FROM creator_profiles WHERE user_id = u.id)
    WHEN u.account_type = 'business' THEN (SELECT id FROM business_profiles WHERE user_id = u.id)
    ELSE NULL
  END AS profile_id
FROM users u
WHERE u.email LIKE 'prod-%@bypass.com'
ORDER BY u.email;
```

---

### SETUP-2: Verify Test Data Created

**Account:** Database admin (Supabase dashboard)
**Prerequisites:** SETUP-1 complete
**Steps:**
1. Run the verification SQL below to confirm all accounts, restaurants, and campaigns exist
2. Confirm consumer count = 10, creator count = 7, business count = 3
3. Confirm test restaurants are linked to business accounts
4. Confirm campaigns exist for `prod-business2@bypass.com` (3) and `prod-business3@bypass.com` (10)

**Expected Result:** All counts match. Test restaurants, campaigns, and associated data are present.

**Verification SQL:**
```sql
-- Count by account type
SELECT account_type, COUNT(*) as cnt
FROM users
WHERE email LIKE 'prod-%@bypass.com'
GROUP BY account_type
ORDER BY account_type;

-- Verify campaigns
SELECT c.id, c.title, c.status, u.email AS owner_email
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE u.email LIKE 'prod-%@bypass.com'
ORDER BY u.email, c.created_at;
```

---

### SETUP-3: Login Verification

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** SETUP-1 complete
**Steps:**
1. Open the Troodie app on a test device or simulator
2. On the login screen, enter phone number associated with `prod-consumer1@bypass.com`
3. Enter OTP `000000`
4. Confirm you land on the home feed

**Expected Result:** Login succeeds. Home feed loads with content. User profile shows consumer account type.

---

## Test Data Overview

The following table summarizes all 20 test users and their roles in testing.

| Email | Account Type | UUID (set at SETUP) | Purpose |
|-------|-------------|---------------------|---------|
| `prod-consumer1@bypass.com` | consumer | (from SETUP-1) | Primary consumer tester |
| `prod-consumer2@bypass.com` | consumer | (from SETUP-1) | Follow target |
| `prod-consumer3@bypass.com` | consumer | (from SETUP-1) | Board and save testing |
| `prod-consumer4@bypass.com` | consumer | (from SETUP-1) | Feed browsing |
| `prod-consumer5@bypass.com` | consumer | (from SETUP-1) | Search and explore |
| `prod-consumer6@bypass.com` | consumer | (from SETUP-1) | Notification testing |
| `prod-consumer7@bypass.com` | consumer | (from SETUP-1) | Post creation |
| `prod-consumer8@bypass.com` | consumer | (from SETUP-1) | Profile editing |
| `prod-consumer9@bypass.com` | consumer | (from SETUP-1) | Edge cases |
| `prod-consumer10@bypass.com` | consumer | (from SETUP-1) | Upgrade to creator |
| `prod-creator1@bypass.com` | creator | (from SETUP-1) | Campaign applications |
| `prod-creator2@bypass.com` | creator | (from SETUP-1) | Content upload / deliverables |
| `prod-creator3@bypass.com` | creator | (from SETUP-1) | Proof links |
| `prod-creator4@bypass.com` | creator | (from SETUP-1) | Stripe onboarding |
| `prod-creator5@bypass.com` | creator | (from SETUP-1) | Portfolio |
| `prod-creator6@bypass.com` | creator | (from SETUP-1) | Analytics / earnings |
| `prod-creator7@bypass.com` | creator | (from SETUP-1) | Multi-campaign |
| `prod-business1@bypass.com` | business | (from SETUP-1) | Fresh business, no campaigns |
| `prod-business2@bypass.com` | business | (from SETUP-1) | Medium activity, 3 campaigns |
| `prod-business3@bypass.com` | business | (from SETUP-1) | High activity, 10 campaigns |

---

## Isolation Verification

These tests ensure test data does not leak into the real user experience.

### ISO-1: Real User Cannot See Test Users in Search

**Account:** A real (non-test) user account, e.g., `@troodieapp.com` admin switching to a fresh non-test account
**Prerequisites:** Test data created (SETUP-1)
**Steps:**
1. Log in with a real user account (not `@bypass.com`)
2. Navigate to the Search tab
3. Search for "prod-consumer1" or "prod-creator1"
4. Review search results

**Expected Result:** No test user profiles appear in search results. The `current_user_is_test()` database function returns `false` for real users, and RLS policies hide test data.

---

### ISO-2: Real User Cannot See Test Restaurants

**Account:** A real user account
**Prerequisites:** Test data created (SETUP-1), test restaurants exist
**Steps:**
1. Log in with a real user account
2. Navigate to restaurant search/discovery
3. Search for the test restaurant names created during setup
4. Browse the Explore page

**Expected Result:** Test restaurants do not appear in search results or discovery feeds for real users.

---

### ISO-3: Real User Cannot See Test Campaigns

**Account:** A real user account with creator access
**Prerequisites:** Test data created (SETUP-1)
**Steps:**
1. Log in with a real creator account (not `@bypass.com`)
2. Navigate to the Creator Marketplace
3. Browse available campaigns
4. Search for test campaign titles

**Expected Result:** Test campaigns created by `prod-business2@bypass.com` and `prod-business3@bypass.com` are not visible.

---

### ISO-4: @troodieapp.com User CAN See Test Data

**Account:** An `@troodieapp.com` admin account
**Prerequisites:** Test data created (SETUP-1)
**Steps:**
1. Log in with a `@troodieapp.com` account
2. Search for "prod-consumer1" in user search
3. Browse restaurant search for test restaurants
4. Browse the Creator Marketplace for test campaigns

**Expected Result:** All test data is visible. The `@troodieapp.com` domain is treated as a test-aware account and can see test data for QA purposes.

---

### ISO-5: @bypass.com User CAN See Test Data

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Test data created (SETUP-1)
**Steps:**
1. Log in as `prod-consumer1@bypass.com` with OTP `000000`
2. Search for "prod-consumer2" in user search
3. Browse available campaigns (if applicable)
4. View restaurant search results

**Expected Result:** Test accounts, test restaurants, and test campaigns are visible to `@bypass.com` users. Test users can interact with each other's data.

---

### ISO-6: Test User Posts Not in Real User Feed

**Account:** A real user account
**Prerequisites:** `prod-consumer7@bypass.com` has created at least one post
**Steps:**
1. Log in with a real user account
2. Browse the home feed, scrolling through recent posts
3. Navigate to the Explore page

**Expected Result:** Posts created by test accounts do not appear in the real user's feed or explore page.

---

### ISO-7: Test Communities Hidden from Real Users

**Account:** A real user account
**Prerequisites:** Test communities created during setup
**Steps:**
1. Log in with a real user account
2. Navigate to the Communities tab or discovery
3. Browse and search communities

**Expected Result:** Communities created by test accounts are not visible to real users.

---

### ISO-8: Database Function Verification (current_user_is_test)

**Account:** Database admin (Supabase dashboard)
**Prerequisites:** Test data created (SETUP-1)
**Steps:**
1. Open the Supabase SQL Editor
2. Run the verification query below for a test user and a real user

**Expected Result:** Function returns `true` for `@bypass.com` and `@troodieapp.com` users, `false` for all other users.

**Verification SQL:**
```sql
-- Test with a bypass user (should return true)
SELECT current_user_is_test()
FROM auth.users
WHERE email = 'prod-consumer1@bypass.com';

-- Test with a real user (should return false)
SELECT current_user_is_test()
FROM auth.users
WHERE email NOT LIKE '%bypass.com'
  AND email NOT LIKE '%troodieapp.com'
LIMIT 1;
```

---

## Authentication

### AUTH-1: Consumer Login with OTP 000000

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** SETUP-1 complete
**Steps:**
1. Open the Troodie app
2. Tap "Sign In"
3. Enter the phone number associated with `prod-consumer1@bypass.com`
4. On the OTP screen, enter `000000`
5. Wait for authentication to complete

**Expected Result:** Login succeeds. User lands on the home feed. Profile shows consumer account type.

---

### AUTH-2: Creator Login

**Account:** `prod-creator1@bypass.com`
**Prerequisites:** SETUP-1 complete
**Steps:**
1. Open the Troodie app
2. Tap "Sign In"
3. Enter the phone number associated with `prod-creator1@bypass.com`
4. Enter OTP `000000`
5. Wait for authentication to complete

**Expected Result:** Login succeeds. Creator-specific UI elements are visible (Marketplace tab, portfolio, earnings). Profile shows creator account type.

---

### AUTH-3: Business Login

**Account:** `prod-business2@bypass.com`
**Prerequisites:** SETUP-1 complete
**Steps:**
1. Open the Troodie app
2. Tap "Sign In"
3. Enter the phone number associated with `prod-business2@bypass.com`
4. Enter OTP `000000`
5. Wait for authentication to complete

**Expected Result:** Login succeeds. Business-specific UI elements are visible (Campaign management, Restaurant dashboard, Application reviews). Profile shows business account type.

---

### AUTH-4: Invalid OTP Rejection

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** SETUP-1 complete
**Steps:**
1. Open the Troodie app
2. Tap "Sign In"
3. Enter the phone number associated with `prod-consumer1@bypass.com`
4. Enter an incorrect OTP such as `123456`
5. Observe the result

**Expected Result:** Login fails. An error message is displayed indicating the OTP is invalid. User remains on the OTP entry screen and can retry.

---

### AUTH-5: Session Persistence

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** AUTH-1 completed successfully
**Steps:**
1. After a successful login, force-close the Troodie app completely
2. Wait 10 seconds
3. Re-open the Troodie app
4. Observe the initial screen

**Expected Result:** The app bypasses the login screen and loads directly to the home feed. Session token is persisted in AsyncStorage and restored on relaunch.

---

## Consumer Flows

### CON-1: Browse Feed

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in, feed contains content
**Steps:**
1. Navigate to the home feed (first tab)
2. Scroll through the feed to view posts
3. Pull down to refresh
4. Scroll further to trigger pagination

**Expected Result:** Feed loads with posts. Pull-to-refresh fetches new content. Scrolling loads additional posts. No duplicate posts appear.

---

### CON-2: Search Restaurants

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Navigate to the Search tab
2. Tap the search bar
3. Type a restaurant name (e.g., a test restaurant name)
4. Review the search results
5. Tap on a restaurant to view details

**Expected Result:** Search results appear as the user types. Restaurant cards show name, photo, and rating. Tapping a result navigates to the restaurant detail screen.

---

### CON-3: Save to Board

**Account:** `prod-consumer3@bypass.com`
**Prerequisites:** Logged in, at least one board exists or will be created
**Steps:**
1. Navigate to a restaurant detail page
2. Tap the "Save" button
3. If no boards exist, create a new board named "Test Board"
4. Select the board to save to
5. Confirm the save

**Expected Result:** Restaurant is saved to the selected board. A success toast appears. Navigating to the board shows the saved restaurant.

**Verification SQL:**
```sql
SELECT rs.id, rs.restaurant_id, b.name AS board_name, rs.created_at
FROM restaurant_saves rs
JOIN boards b ON rs.board_id = b.id
JOIN users u ON b.owner_id = u.id
WHERE u.email = 'prod-consumer3@bypass.com'
ORDER BY rs.created_at DESC
LIMIT 5;
```

---

### CON-4: Create Post

**Account:** `prod-consumer7@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Tap the "+" (Add) tab in the bottom navigation
2. Select "Create Post" or "Write a Review"
3. Select a restaurant to tag
4. Add a photo from the camera roll
5. Write a caption (e.g., "Test review from prod-consumer7")
6. Add a rating (e.g., 4 stars)
7. Tap "Post"

**Expected Result:** Post is created successfully. A success toast appears. The post appears in the user's profile and in the feed.

**Verification SQL:**
```sql
SELECT p.id, p.caption, p.rating, p.created_at
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'prod-consumer7@bypass.com'
ORDER BY p.created_at DESC
LIMIT 1;
```

---

### CON-5: Follow User

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Navigate to the profile of `prod-consumer2@bypass.com` (via search or direct link)
2. Tap the "Follow" button
3. Observe the button state change
4. Navigate back to the home feed

**Expected Result:** Follow button changes to "Following." `prod-consumer2@bypass.com` posts may now appear in the feed. The follow is recorded in the database.

**Verification SQL:**
```sql
SELECT f.id, f.created_at
FROM follows f
JOIN users follower ON f.follower_id = follower.id
JOIN users followed ON f.followed_id = followed.id
WHERE follower.email = 'prod-consumer1@bypass.com'
  AND followed.email = 'prod-consumer2@bypass.com';
```

---

### CON-6: Like and Comment

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in, a post exists in the feed
**Steps:**
1. Find a post in the feed
2. Tap the heart/like icon
3. Confirm the heart fills in and the like count increments
4. Tap the comment icon
5. Type a comment (e.g., "Great post!")
6. Submit the comment
7. Verify the comment appears under the post

**Expected Result:** Like is recorded; heart icon fills. Comment appears immediately in the comment section. Like and comment counts update.

---

### CON-7: View Profile

**Account:** `prod-consumer8@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Tap the Profile tab
2. Review the profile information (name, bio, avatar, post count, follower/following counts)
3. Tap "Edit Profile"
4. Change the bio to "Updated bio for testing"
5. Save changes
6. Verify the bio updates on the profile screen

**Expected Result:** Profile displays all user information. Bio update saves and displays correctly.

---

### CON-8: Explore Page

**Account:** `prod-consumer5@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Navigate to the Explore/Discover page
2. Browse featured restaurants, trending posts, and recommended users
3. Apply a filter (e.g., cuisine type or distance)
4. Tap on a recommended restaurant

**Expected Result:** Explore page loads with curated content. Filters narrow the results. Tapping items navigates to the appropriate detail screen.

---

## Creator Flows

### CRE-1: View Marketplace

**Account:** `prod-creator1@bypass.com`
**Prerequisites:** Logged in as creator
**Steps:**
1. Navigate to the Creator Marketplace tab
2. Browse available campaigns
3. Review campaign cards (title, brand, payout, deadline)
4. Scroll to load more campaigns

**Expected Result:** Marketplace shows active campaigns. Each campaign card displays title, restaurant/brand name, payout amount, and application deadline. Pagination works for long lists.

---

### CRE-2: Apply to Campaign

**Account:** `prod-creator1@bypass.com`
**Prerequisites:** Logged in, at least one campaign by `prod-business2@bypass.com` is available
**Steps:**
1. Navigate to the Creator Marketplace
2. Tap on a campaign from `prod-business2@bypass.com`
3. Review campaign details (requirements, payout, deadlines)
4. Tap "Apply"
5. Fill in the application form:
   - Proposed rate (e.g., the campaign's suggested rate)
   - Proposed deliverables (e.g., "1 IG Reel + 1 TikTok")
   - Cover letter (e.g., "Excited to collaborate on this campaign")
6. Submit the application

**Expected Result:** Application is submitted. A success toast appears. Application status shows as "Pending." The campaign's "Apply" button changes to show application status.

**Verification SQL:**
```sql
SELECT ca.id, ca.status, ca.proposed_rate_cents, ca.cover_letter, ca.applied_at
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator1@bypass.com'
ORDER BY ca.applied_at DESC
LIMIT 1;
```

---

### CRE-3: View Application Status

**Account:** `prod-creator1@bypass.com`
**Prerequisites:** CRE-2 completed
**Steps:**
1. Navigate to "My Applications" or the campaign detail
2. Locate the application from CRE-2
3. Review the application status

**Expected Result:** Application shows status "Pending" with the submitted details. If the business has already reviewed it, the status reflects the decision (accepted/rejected).

---

### CRE-4: Creator Profile

**Account:** `prod-creator5@bypass.com`
**Prerequisites:** Logged in as creator
**Steps:**
1. Navigate to the Profile tab
2. Verify creator-specific sections are visible (portfolio, ratings, campaign history)
3. Tap "Edit Profile"
4. Update display name and bio
5. Save changes

**Expected Result:** Creator profile displays portfolio section, average rating, and campaign history. Edits save correctly.

---

### CRE-5: Portfolio Management

**Account:** `prod-creator5@bypass.com`
**Prerequisites:** Logged in as creator
**Steps:**
1. Navigate to the Profile tab
2. Tap on the Portfolio section
3. Add a new portfolio item (upload a photo or video)
4. Add a caption and tag a restaurant
5. Save the portfolio item

**Expected Result:** Portfolio item is added and displayed on the creator's profile. Image/video renders correctly.

---

### CRE-6: Submit Deliverable (Content Upload -- Stage 1)

**Account:** `prod-creator2@bypass.com`
**Prerequisites:** Logged in, has an accepted campaign application with `prod-business2@bypass.com`
**Steps:**
1. Navigate to the accepted campaign
2. Tap "Upload Content for Review"
3. Select a video or photo from the device
4. Optionally add a caption and notes to restaurant
5. Tap "Submit for Review"

**Expected Result:** Content uploads to the `campaign-content` storage bucket. A deliverable record is created with `status: 'pending_review'` and `workflow_stage: 'review'`. Status shows "Awaiting Review."

**Verification SQL:**
```sql
SELECT cd.id, cd.status, cd.workflow_stage, cd.content_file_url, cd.content_file_type, cd.submitted_at
FROM campaign_deliverables cd
JOIN creator_profiles cp ON cd.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator2@bypass.com'
ORDER BY cd.submitted_at DESC
LIMIT 1;
```

---

### CRE-7: View Earnings

**Account:** `prod-creator6@bypass.com`
**Prerequisites:** Logged in, has at least one completed payout
**Steps:**
1. Navigate to the Earnings or Wallet section in the creator dashboard
2. Review total earnings, pending payouts, and completed payouts
3. Tap on a completed payout to see details

**Expected Result:** Earnings screen shows accurate totals. Individual payout records display campaign name, amount, date, and status.

---

### CRE-8: Stripe Onboarding

**Account:** `prod-creator4@bypass.com`
**Prerequisites:** Logged in, Stripe onboarding not yet completed
**Steps:**
1. Navigate to the Earnings or Wallet section
2. Tap "Set Up Payouts" or "Connect Stripe"
3. Follow the Stripe onboarding flow (opens in browser/webview)
4. Complete the required Stripe information
5. Return to the Troodie app

**Expected Result:** Stripe account is created. Onboarding status updates to "completed" in the database. The earnings section now shows payout-ready status.

**Verification SQL:**
```sql
SELECT sa.stripe_account_id, sa.stripe_account_status, sa.onboarding_completed
FROM stripe_accounts sa
JOIN users u ON sa.user_id = u.id
WHERE u.email = 'prod-creator4@bypass.com';
```

---

### CRE-9: View Analytics

**Account:** `prod-creator6@bypass.com`
**Prerequisites:** Logged in, has delivered content with engagement data
**Steps:**
1. Navigate to the creator dashboard or analytics section
2. Review metrics: total views, likes, engagement rate
3. Filter by date range or campaign

**Expected Result:** Analytics display engagement metrics aggregated across deliverables. Filtering updates the displayed data.

---

### CRE-10: Search Campaigns

**Account:** `prod-creator7@bypass.com`
**Prerequisites:** Logged in as creator
**Steps:**
1. Navigate to the Creator Marketplace
2. Use the search bar to search for campaigns by keyword (e.g., a restaurant name or campaign title)
3. Apply filters (e.g., payout range, location, platform requirements)
4. Review filtered results

**Expected Result:** Search returns matching campaigns. Filters narrow results appropriately. Each result card shows relevant details.

---

## Business Flows

### BUS-1: Claim Restaurant

**Account:** `prod-business1@bypass.com`
**Prerequisites:** Logged in as business, restaurant not yet claimed
**Steps:**
1. Navigate to the restaurant search
2. Find an unclaimed restaurant (or use a test restaurant)
3. Tap "Claim this Restaurant"
4. Fill out the claim form with business verification details
5. Submit the claim

**Expected Result:** Claim is submitted. Status shows "Pending verification." The claim record is created in the database.

**Verification SQL:**
```sql
SELECT rc.id, rc.restaurant_id, rc.status, rc.created_at
FROM restaurant_claims rc
JOIN users u ON rc.user_id = u.id
WHERE u.email = 'prod-business1@bypass.com'
ORDER BY rc.created_at DESC
LIMIT 1;
```

---

### BUS-2: Create Campaign

**Account:** `prod-business1@bypass.com`
**Prerequisites:** Logged in, has a claimed/verified restaurant
**Steps:**
1. Navigate to the Campaign Management section
2. Tap "Create Campaign"
3. Fill in campaign details:
   - Title: "Test Campaign from Business 1"
   - Description: campaign description
   - Budget: $150.00
   - Deliverable requirements: "1 Instagram Reel, 1 TikTok video, 1 Troodie post"
   - Duration: 30 days
   - Max creators: 5
4. Set up payment (if required)
5. Publish the campaign

**Expected Result:** Campaign is created with status "active." It appears in the business dashboard and in the Creator Marketplace for test users.

**Verification SQL:**
```sql
SELECT c.id, c.title, c.status, c.budget_cents, c.created_at
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE u.email = 'prod-business1@bypass.com'
ORDER BY c.created_at DESC
LIMIT 1;
```

---

### BUS-3: Review Applications

**Account:** `prod-business2@bypass.com`
**Prerequisites:** Logged in, campaign has pending applications from creators
**Steps:**
1. Navigate to the Campaign Management section
2. Select a campaign that has pending applications
3. Tap on the "Applications" tab
4. Review the list of applicants
5. Tap on an application to see details (cover letter, proposed rate, creator profile)

**Expected Result:** Application list shows all pending applications. Each application shows the creator's profile, proposed rate, deliverables, and cover letter.

---

### BUS-4: Accept Application

**Account:** `prod-business2@bypass.com`
**Prerequisites:** BUS-3 completed, application from `prod-creator1@bypass.com` is visible
**Steps:**
1. Open the application from `prod-creator1@bypass.com`
2. Review the application details
3. Tap "Accept"
4. Confirm the acceptance

**Expected Result:** Application status changes to "accepted." Creator is notified. The application card shows "Accepted" status. The creator can now begin submitting deliverables.

**Verification SQL:**
```sql
SELECT ca.id, ca.status, ca.reviewed_at
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator1@bypass.com'
ORDER BY ca.reviewed_at DESC
LIMIT 1;
```

---

### BUS-5: Reject Application

**Account:** `prod-business2@bypass.com`
**Prerequisites:** A pending application exists
**Steps:**
1. Open a pending application (not from `prod-creator1@bypass.com` to preserve that for other tests)
2. Tap "Reject"
3. Provide a reason (e.g., "Looking for different content style")
4. Confirm the rejection

**Expected Result:** Application status changes to "rejected." Creator is notified of the rejection with the provided reason.

---

### BUS-6: View Dashboard

**Account:** `prod-business2@bypass.com`
**Prerequisites:** Logged in, has active campaigns
**Steps:**
1. Navigate to the Business Dashboard
2. Review campaign overview (active, completed, draft)
3. Check the pending deliverables section
4. Review application counts

**Expected Result:** Dashboard shows accurate counts for campaigns, pending deliverables, and applications. All data loads without errors.

---

### BUS-7: Review Deliverable

**Account:** `prod-business2@bypass.com`
**Prerequisites:** A creator has submitted content for review (pending_review status)
**Steps:**
1. Navigate to the Campaign Management section
2. Select the campaign with pending deliverables
3. Tap on a pending deliverable
4. View the uploaded content (video player or image viewer)
5. Review the creator's caption and notes

**Expected Result:** Uploaded content (video/photo) renders inline in the review screen. The business can play video content or zoom into images directly within the app.

---

### BUS-8: Manage Campaign

**Account:** `prod-business2@bypass.com`
**Prerequisites:** Logged in, has campaigns
**Steps:**
1. Navigate to Campaign Management
2. Select an active campaign
3. Edit the campaign description
4. Extend the deadline by 7 days
5. Save changes

**Expected Result:** Campaign updates save correctly. Changes are reflected immediately in the campaign detail view.

---

### BUS-9: View Analytics

**Account:** `prod-business3@bypass.com`
**Prerequisites:** Logged in, has campaigns with deliverable data
**Steps:**
1. Navigate to the Business Analytics section
2. Review overall campaign performance metrics
3. View per-campaign breakdown (total deliverables, approval rate, average review time)
4. Filter by date range

**Expected Result:** Analytics display accurate metrics. Review performance shows approval rates, average response times, and auto-approval rates.

---

### BUS-10: Close Campaign

**Account:** `prod-business2@bypass.com`
**Prerequisites:** Logged in, has at least one active campaign with all deliverables completed
**Steps:**
1. Navigate to Campaign Management
2. Select a completed campaign
3. Tap "Close Campaign" or "Mark Complete"
4. Confirm the action

**Expected Result:** Campaign status changes to "completed." No new applications can be submitted. Existing data remains accessible for reference.

**Verification SQL:**
```sql
SELECT c.id, c.title, c.status, c.updated_at
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE u.email = 'prod-business2@bypass.com'
  AND c.status = 'completed'
ORDER BY c.updated_at DESC
LIMIT 1;
```

---

## Campaign Lifecycle

These tests cover the complete end-to-end campaign lifecycle from creation through completion.

### CAM-1: Create Campaign

**Account:** `prod-business2@bypass.com`
**Prerequisites:** Logged in, has a claimed restaurant
**Steps:**
1. Create a new campaign with 3 required deliverables (IG Reel, TikTok, Troodie post)
2. Set budget to $35 per creator
3. Set max creators to 3
4. Save as draft

**Expected Result:** Campaign saved as draft. Visible in the business dashboard but not in the Creator Marketplace.

---

### CAM-2: Publish Campaign

**Account:** `prod-business2@bypass.com`
**Prerequisites:** CAM-1 completed, campaign in draft status
**Steps:**
1. Open the draft campaign from CAM-1
2. Complete payment setup (or verify payment is configured)
3. Tap "Publish" or "Go Live"
4. Confirm publication

**Expected Result:** Campaign status changes to "active." Campaign appears in the Creator Marketplace for eligible creators.

---

### CAM-3: Receive Applications

**Account:** `prod-creator1@bypass.com` (apply), then `prod-business2@bypass.com` (review)
**Prerequisites:** CAM-2 completed
**Steps:**
1. As `prod-creator1@bypass.com`, navigate to the Marketplace and find the published campaign
2. Apply to the campaign with a cover letter and proposed deliverables
3. Switch to `prod-business2@bypass.com`
4. Navigate to the campaign and view applications

**Expected Result:** Application appears in the business's application list with "Pending" status.

---

### CAM-4: Accept Creator

**Account:** `prod-business2@bypass.com`
**Prerequisites:** CAM-3 completed
**Steps:**
1. Open the pending application from `prod-creator1@bypass.com`
2. Accept the application
3. Confirm the acceptance

**Expected Result:** Application status changes to "accepted." Creator is notified via in-app notification.

---

### CAM-5: Content Submission

**Account:** `prod-creator1@bypass.com`
**Prerequisites:** CAM-4 completed (application accepted)
**Steps:**
1. Navigate to the accepted campaign
2. Upload content for the first deliverable (video)
3. Add a caption
4. Submit for review

**Expected Result:** Deliverable created with `status: 'pending_review'`. Content file stored in the `campaign-content` bucket. Business is notified of the submission.

---

### CAM-6: Review Content

**Account:** `prod-business2@bypass.com`
**Prerequisites:** CAM-5 completed
**Steps:**
1. Navigate to the campaign's pending deliverables
2. Open the submitted deliverable
3. Review the uploaded video/photo
4. Tap "Approve" with optional feedback

**Expected Result:** Deliverable status changes to "approved." If not all deliverables are approved yet, no payout is triggered. Creator is notified of the approval.

---

### CAM-7: Payment Trigger

**Account:** `prod-business2@bypass.com`
**Prerequisites:** Creator has submitted all required deliverables and all are approved
**Steps:**
1. Approve the final remaining deliverable for the campaign application
2. Observe the payout trigger

**Expected Result:** When the last deliverable is approved, a single payout is triggered for the full campaign rate (e.g., $35). Only one payout record is created, not one per deliverable.

**Verification SQL:**
```sql
SELECT cd.id, cd.status, cd.payment_amount_cents, cd.payment_status
FROM campaign_deliverables cd
JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator1@bypass.com'
ORDER BY cd.created_at;
```

---

### CAM-8: Campaign Completion

**Account:** `prod-business2@bypass.com`
**Prerequisites:** CAM-7 completed, all creators have been paid
**Steps:**
1. Verify all applications have been fulfilled (deliverables approved, payouts completed)
2. Rate the creator (see RCT-3)
3. Close the campaign

**Expected Result:** Campaign marked as complete. All financial records are consistent. Creator ratings are recorded.

---

## v1.0.16.b1: Content Submission Flow

These are the critical stakeholder-facing tests for the two-step content submission workflow introduced in v1.0.16.b1. The old flow (paste URLs first) has been replaced with: (1) upload content for review, (2) submit proof links after approval.

| ID | Title | Account | What Stakeholders Verify |
|----|-------|---------|-------------------------|
| CSF-1 | Upload content for review (Step 1) | Creator | Creator can upload video/photo, see "Awaiting Review" status |
| CSF-2 | Unsupported file type rejection | Creator | .gif/.heic shows "Unsupported file type" error |
| CSF-3 | File too large rejection | Creator | >100MB video shows size limit error |
| CSF-4 | Restaurant reviews uploaded content | Business | Inline video/image preview in review screen |
| CSF-5 | Approve content (defers payment) | Business | Approval message mentions payment deferral |
| CSF-6 | Submit proof links (Step 2) | Creator | Platform URL entry with auto-detection badges |
| CSF-7 | Block proof before approval | Creator | Screen shows "Awaiting Review", no proof form |
| CSF-8 | Reject and resubmit | Both | Creator sees feedback banner, can re-upload |
| CSF-9 | Auto-approval at 72 hours | -- | Unreviewed content auto-approves, creator sees Step 2 |

---

### CSF-1: Upload Content for Review (Step 1)

**Account:** `prod-creator2@bypass.com`
**Prerequisites:** Logged in, has an accepted campaign application with `prod-business2@bypass.com`, no deliverables yet submitted
**Steps:**
1. Navigate to the accepted campaign detail
2. Tap "Upload Content for Review"
3. Select a video file (MP4 or MOV, under 100MB) from the device
4. Add a caption: "Content for review - test upload"
5. Add notes to restaurant: "Shot at the patio area"
6. Tap "Submit for Review"
7. Wait for the upload to complete
8. Observe the deliverable status on the campaign detail screen

**Expected Result:** Upload completes successfully. The deliverable status shows "Awaiting Review" (or "Pending Review"). The `workflow_stage` is set to `review`. The content file URL is stored in `content_file_url`. The 72-hour auto-approval timer starts.

**Verification SQL:**
```sql
SELECT
  cd.id,
  cd.status,
  cd.workflow_stage,
  cd.content_file_url,
  cd.content_file_type,
  cd.caption,
  cd.review_notes,
  cd.submitted_at,
  ca.restaurant_review_deadline
FROM campaign_deliverables cd
JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
JOIN creator_profiles cp ON cd.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator2@bypass.com'
ORDER BY cd.submitted_at DESC
LIMIT 1;
```

---

### CSF-2: Unsupported File Type Rejection

**Account:** `prod-creator2@bypass.com`
**Prerequisites:** Logged in, has an accepted campaign application
**Steps:**
1. Navigate to the accepted campaign detail
2. Tap "Upload Content for Review"
3. Attempt to select a .gif file from the device
4. If the device file picker allows the selection, observe the app's response
5. Repeat with a .heic file

**Expected Result:** The app rejects the file with an error message: "Unsupported file type. Please upload MP4, MOV, JPEG, or PNG files." The upload does not proceed. No deliverable record is created.

---

### CSF-3: File Too Large Rejection

**Account:** `prod-creator2@bypass.com`
**Prerequisites:** Logged in, has an accepted campaign application
**Steps:**
1. Navigate to the accepted campaign detail
2. Tap "Upload Content for Review"
3. Select a video file that exceeds 100MB
4. Observe the app's response before or during upload

**Expected Result:** The app displays an error message: "File exceeds 100MB limit. Please compress your video." The upload does not proceed. No deliverable record is created. For images, the limit is 10MB.

---

### CSF-4: Restaurant Reviews Uploaded Content

**Account:** `prod-business2@bypass.com`
**Prerequisites:** CSF-1 completed (creator has uploaded content)
**Steps:**
1. Log in as `prod-business2@bypass.com`
2. Navigate to Campaign Management
3. Select the campaign where `prod-creator2@bypass.com` submitted content
4. Tap on the pending deliverable
5. View the review screen

**Expected Result:** The review screen displays the uploaded content inline:
- For video: a video player with play/pause, seek bar, and progress indicator
- For images: a zoomable image viewer
The content is loaded from a signed URL from the `campaign-content` storage bucket. The creator's caption and notes are visible below the content.

---

### CSF-5: Approve Content (Defers Payment)

**Account:** `prod-business2@bypass.com`
**Prerequisites:** CSF-4 completed (content is visible in review screen)
**Steps:**
1. On the deliverable review screen, tap "Approve"
2. Optionally add feedback: "Great content, approved!"
3. Confirm the approval
4. Observe the status update and any messaging about payment

**Expected Result:** Deliverable status changes to "approved." `workflow_stage` changes to "approved." A message indicates that payment is deferred until the creator submits proof links showing the content was posted to platforms. No payout is triggered at this point (unless this was the last of all required deliverables AND proof links are not gated).

**Verification SQL:**
```sql
SELECT cd.id, cd.status, cd.workflow_stage, cd.reviewed_at, cd.restaurant_feedback
FROM campaign_deliverables cd
JOIN creator_profiles cp ON cd.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator2@bypass.com'
  AND cd.status = 'approved'
ORDER BY cd.reviewed_at DESC
LIMIT 1;
```

---

### CSF-6: Submit Proof Links (Step 2)

**Account:** `prod-creator2@bypass.com`
**Prerequisites:** CSF-5 completed (content approved by business)
**Steps:**
1. Log in as `prod-creator2@bypass.com`
2. Navigate to the campaign where content was approved
3. Observe the status: "Content approved! Post to platforms and submit links"
4. Tap "Submit Proof Links" or "Submit Post Links"
5. Enter a platform URL (e.g., `https://www.instagram.com/reel/TEST123/`)
6. Observe the platform auto-detection badge (Instagram icon should appear)
7. Tap "Submit"
8. Verify the deliverable status updates

**Expected Result:** Proof link is validated and accepted. Platform is auto-detected from the URL. `workflow_stage` updates to "proof." `proof_submitted_at` timestamp is set. `platform_post_url` is stored.

**Verification SQL:**
```sql
SELECT
  cd.id,
  cd.status,
  cd.workflow_stage,
  cd.platform_post_url,
  cd.social_platform,
  cd.proof_submitted_at
FROM campaign_deliverables cd
JOIN creator_profiles cp ON cd.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator2@bypass.com'
  AND cd.workflow_stage = 'proof'
ORDER BY cd.proof_submitted_at DESC
LIMIT 1;
```

---

### CSF-7: Block Proof Before Approval

**Account:** `prod-creator3@bypass.com`
**Prerequisites:** Logged in, has an accepted campaign application, content uploaded but NOT yet approved (status = `pending_review`)
**Steps:**
1. Navigate to the accepted campaign detail
2. Observe the deliverable status: "Awaiting Review"
3. Attempt to find a "Submit Proof Links" or "Submit Post Links" button
4. If accessible, attempt to submit a proof URL

**Expected Result:** The proof link submission form is not shown. The screen displays "Awaiting Review" status. If the creator somehow reaches the proof submission endpoint, the service returns: "Your content must be approved before submitting post links." The `submitProofLinks` function validates that `status` is `approved` or `auto_approved` before proceeding.

---

### CSF-8: Reject and Resubmit

**Account:** `prod-business2@bypass.com` (reject), then `prod-creator3@bypass.com` (resubmit)
**Prerequisites:** `prod-creator3@bypass.com` has uploaded content for review
**Steps:**
1. As `prod-business2@bypass.com`, navigate to the deliverable review screen
2. Tap "Reject" or "Request Changes"
3. Enter feedback: "Please reshoot with better lighting"
4. Confirm the rejection
5. Switch to `prod-creator3@bypass.com`
6. Navigate to the campaign detail
7. Observe the rejection feedback banner with the restaurant's notes
8. Tap "Re-upload Content"
9. Select a new video/photo
10. Submit the updated content for review

**Expected Result:** Rejection shows feedback from the business. The creator sees a feedback banner with the rejection reason. After re-upload, a new deliverable is created (or the existing one is updated) with `status: 'pending_review'`. The review cycle restarts.

---

### CSF-9: Auto-Approval at 72 Hours

**Account:** Database admin for verification
**Prerequisites:** A deliverable has been in `pending_review` status for more than 72 hours
**Steps:**
1. In the Supabase SQL Editor, find a deliverable submitted more than 72 hours ago
2. Trigger the auto-approval process (either wait for cron, or call `auto_approve_overdue_deliverables` manually)
3. Verify the deliverable status changes

**Expected Result:** The deliverable status changes to `auto_approved`. The creator is notified and can proceed to Step 2 (submit proof links). If all deliverables for the application are now auto-approved, the payout trigger logic checks whether all are approved before initiating payment.

**Verification SQL:**
```sql
-- Find deliverables eligible for auto-approval
SELECT cd.id, cd.status, cd.submitted_at,
  EXTRACT(EPOCH FROM (NOW() - cd.submitted_at)) / 3600 AS hours_elapsed
FROM campaign_deliverables cd
WHERE cd.status = 'pending_review'
  AND cd.submitted_at < NOW() - INTERVAL '72 hours';

-- After auto-approval, verify status
SELECT cd.id, cd.status, cd.auto_approved_at, cd.workflow_stage
FROM campaign_deliverables cd
WHERE cd.status = 'auto_approved'
ORDER BY cd.auto_approved_at DESC
LIMIT 5;
```

---

## v1.0.16.b1: Payment Duplication Fix

These tests verify the fix for the critical payment duplication bug where each deliverable approval was triggering a separate full-amount payout. The fix ensures payment triggers only once per campaign application when ALL deliverables are approved.

| ID | Title | Account | What Stakeholders Verify |
|----|-------|---------|-------------------------|
| PDF-1 | Individual approval (3 deliverables) | Business | Approve 1 -> no pay, 2 -> no pay, 3 -> pay once |
| PDF-2 | Bulk approval | Business | Approve all 3 at once -> exactly 1 payout |
| PDF-3 | Single deliverable campaign | Business | Approve 1/1 -> immediate payout |
| PDF-4 | Partial rejection then resubmit | Both | Reject 1, resubmit, approve -> payout triggers |
| PDF-5 | Duplicate guard | -- | Manual payout call blocked after first |

---

### PDF-1: Individual Approval (3 Deliverables)

**Account:** `prod-business2@bypass.com`
**Prerequisites:** `prod-creator1@bypass.com` has submitted 3 deliverables for a campaign (all in `pending_review` status). Creator has Stripe onboarding completed.
**Steps:**
1. Navigate to the campaign review screen
2. Approve deliverable 1 of 3
3. Check the console logs or database for payout trigger
4. Approve deliverable 2 of 3
5. Check again for payout trigger
6. Approve deliverable 3 of 3
7. Check for payout trigger

**Expected Result:**
- After approving 1/3: Log shows "Not all deliverables approved yet -- skipping payout (approved: 1, total: 3)." No payout initiated.
- After approving 2/3: Same -- no payout. "approved: 2, total: 3."
- After approving 3/3: Log shows "All deliverables approved -- triggering payout." Exactly one payout is initiated for the full campaign rate (e.g., $35.00).

**Verification SQL:**
```sql
-- Check deliverables and payment status
SELECT
  cd.id,
  cd.status,
  cd.payment_amount_cents,
  cd.payment_status,
  cd.paid_at
FROM campaign_deliverables cd
JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator1@bypass.com'
ORDER BY cd.created_at;

-- Verify only 1 deliverable has payment_amount_cents set (the trigger deliverable)
SELECT COUNT(*) AS deliverables_with_payment
FROM campaign_deliverables cd
JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator1@bypass.com'
  AND cd.payment_amount_cents > 0;
```

---

### PDF-2: Bulk Approval

**Account:** `prod-business2@bypass.com`
**Prerequisites:** A different creator (e.g., `prod-creator7@bypass.com`) has submitted 3 deliverables, all in `pending_review` status
**Steps:**
1. Navigate to the campaign review screen
2. Select all 3 pending deliverables
3. Tap "Approve All" or bulk approve
4. Observe the payout trigger

**Expected Result:** All 3 deliverables are approved sequentially via `bulkApproveDeliverables`. The function calls `approveDeliverable` for each one. Only on the last approval does the all-approved check pass, triggering exactly 1 payout. Total payout = campaign rate (e.g., $35), not $105.

**Verification SQL:**
```sql
SELECT cd.id, cd.status, cd.payment_amount_cents, cd.payment_status
FROM campaign_deliverables cd
JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator7@bypass.com'
ORDER BY cd.created_at;
```

---

### PDF-3: Single Deliverable Campaign

**Account:** `prod-business2@bypass.com`
**Prerequisites:** A campaign with only 1 required deliverable. A creator has submitted the single deliverable.
**Steps:**
1. Navigate to the campaign review screen
2. Approve the single deliverable
3. Observe payout trigger

**Expected Result:** Since there is only 1 deliverable and it is now approved, the all-approved check passes immediately. Payout triggers on this approval for the full campaign rate.

---

### PDF-4: Partial Rejection Then Resubmit

**Account:** `prod-business2@bypass.com` (approve/reject), `prod-creator2@bypass.com` (resubmit)
**Prerequisites:** Creator has submitted 3 deliverables. 2 are approved, 1 is pending.
**Steps:**
1. As `prod-business2@bypass.com`, approve deliverables 1 and 3
2. Reject deliverable 2 with feedback: "Needs better audio"
3. Verify no payout triggers (not all approved -- one is rejected)
4. As `prod-creator2@bypass.com`, resubmit deliverable 2 with updated content
5. As `prod-business2@bypass.com`, approve the resubmitted deliverable 2
6. Observe payout trigger

**Expected Result:**
- After approving 1 and 3, rejecting 2: No payout (statuses are approved, rejected, approved -- not all approved).
- After creator resubmits and business approves deliverable 2: All 3 are now approved. Payout triggers once for the full campaign rate.

---

### PDF-5: Duplicate Guard

**Account:** Database admin or backend engineer
**Prerequisites:** PDF-1 completed -- all deliverables approved and payout already processing/completed
**Steps:**
1. In the Supabase SQL Editor, find the trigger deliverable ID from PDF-1
2. Attempt to manually call `processDeliverablePayout` via the Edge Function or test script with that deliverable ID
3. Observe the result

**Expected Result:** The duplicate guard in `processDeliverablePayout` detects that a payout is already "processing" or "completed" for this campaign application. The call returns: "Payout already initiated for this campaign application." No second payout is created.

**Verification SQL:**
```sql
-- Verify the duplicate guard: check for existing payouts
SELECT cd.id, cd.payment_status
FROM campaign_deliverables cd
WHERE cd.campaign_application_id = (
  SELECT cd2.campaign_application_id
  FROM campaign_deliverables cd2
  WHERE cd2.payment_status IN ('processing', 'completed')
  LIMIT 1
)
AND cd.payment_status IN ('processing', 'completed');
```

---

## v1.0.16.b1: Rate Creator Timing

These tests verify the fix for the "Rate Creator" button appearing too early. The button should only appear after ALL deliverables are approved, not immediately upon accepting an application.

| ID | Title | Account | What Stakeholders Verify |
|----|-------|---------|-------------------------|
| RCT-1 | Hidden on fresh acceptance | Business | No "Rate Creator" button, shows "Awaiting Content" |
| RCT-2 | Partial deliverable approval | Business | Shows "1/3 Approved", button still hidden |
| RCT-3 | All deliverables approved | Business | "Rate Creator" button appears (orange with star) |
| RCT-4 | Application detail screen | Business | Progress bar + button visible when complete |
| RCT-5 | Zero deliverables submitted | Business | Shows "Awaiting Content" status |
| RCT-6 | Rating persists | Business | After rating, button becomes "Rated X/5" badge |
| RCT-7 | No rate button on deliverable cards | Business | Individual cards don't show rate button |
| RCT-8 | Auto-approved deliverables count | Business | Auto-approvals count toward button visibility |

---

### RCT-1: Hidden on Fresh Acceptance

**Account:** `prod-business2@bypass.com`
**Prerequisites:** A campaign has a freshly accepted application (creator has not submitted any deliverables yet)
**Steps:**
1. Navigate to Campaign Management
2. Select the campaign with the newly accepted creator
3. View the Applications list
4. Locate the accepted application
5. Inspect the UI for a "Rate Creator" button

**Expected Result:** No "Rate Creator" button is visible. Instead, the application card shows "Awaiting Content" status text. The condition `app.all_deliverables_approved` is `false` (since `total_deliverables === 0`), so the button is hidden.

---

### RCT-2: Partial Deliverable Approval

**Account:** `prod-business2@bypass.com`
**Prerequisites:** A creator has submitted 3 deliverables. 1 is approved, 2 are still pending.
**Steps:**
1. Navigate to the campaign Applications list
2. View the application where 1 out of 3 deliverables is approved
3. Check the status display and "Rate Creator" button visibility

**Expected Result:** The application card shows "1/3 Approved" progress text. The "Rate Creator" button is NOT visible. The `all_deliverables_approved` field is `false`.

---

### RCT-3: All Deliverables Approved

**Account:** `prod-business2@bypass.com`
**Prerequisites:** All 3 deliverables for a creator's application are approved (status = `approved` or `auto_approved`)
**Steps:**
1. Navigate to the campaign Applications list
2. View the application where all deliverables are approved
3. Check for the "Rate Creator" button

**Expected Result:** The "Rate Creator" button appears, styled with an orange background and star icon. The `all_deliverables_approved` field is `true`. Tapping the button opens a rating modal.

---

### RCT-4: Application Detail Screen

**Account:** `prod-business2@bypass.com`
**Prerequisites:** Same as RCT-3 -- all deliverables approved
**Steps:**
1. From the Applications list, tap on the fully-completed application
2. View the application detail screen
3. Check for a deliverable progress bar and "Rate Creator" button

**Expected Result:** The application detail screen shows a deliverable progress bar (e.g., 3/3 Approved). The "Rate Creator" button is visible at the bottom of the screen. The progress bar is fully filled.

---

### RCT-5: Zero Deliverables Submitted

**Account:** `prod-business2@bypass.com`
**Prerequisites:** An accepted application where the creator has not submitted any deliverables
**Steps:**
1. Navigate to the Applications list
2. Find an accepted application with zero deliverables submitted
3. Check the status display

**Expected Result:** The application shows "Awaiting Content" status. No progress indicator. No "Rate Creator" button. The `total_deliverables` is 0 and `all_deliverables_approved` is `false`.

---

### RCT-6: Rating Persists

**Account:** `prod-business2@bypass.com`
**Prerequisites:** RCT-3 completed (all deliverables approved, "Rate Creator" button visible)
**Steps:**
1. Tap "Rate Creator"
2. Select a rating (e.g., 4 out of 5 stars)
3. Add a comment: "Great work, timely delivery"
4. Submit the rating
5. Observe the button after rating
6. Navigate away and return to the same application

**Expected Result:** After rating, the "Rate Creator" button is replaced with a "Rated 4/5" badge (or similar). The rating persists across navigation. The database record shows the rating, comment, and timestamp.

**Verification SQL:**
```sql
SELECT ca.id, ca.rating, ca.rating_comment, ca.rated_at
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator1@bypass.com'
  AND ca.rating IS NOT NULL
ORDER BY ca.rated_at DESC
LIMIT 1;
```

---

### RCT-7: No Rate Button on Deliverable Cards

**Account:** `prod-business2@bypass.com`
**Prerequisites:** Any campaign with approved deliverables
**Steps:**
1. Navigate to the campaign review screen
2. View individual deliverable cards (approved deliverables)
3. Check each deliverable card for a "Rate Creator" button

**Expected Result:** Individual deliverable cards do NOT show a "Rate Creator" button. Rating is a per-application action and only appears on the ApplicationsList and application detail screen, not on individual DeliverableCards.

---

### RCT-8: Auto-Approved Deliverables Count

**Account:** `prod-business2@bypass.com`
**Prerequisites:** A campaign application where some deliverables were auto-approved (72-hour deadline passed without review)
**Steps:**
1. Navigate to the Applications list
2. Find an application where deliverables have `status = 'auto_approved'`
3. Check the deliverable progress count and "Rate Creator" button

**Expected Result:** Auto-approved deliverables count toward the "X/Y Approved" progress. If all deliverables are either `approved` or `auto_approved`, the "Rate Creator" button appears. The `canRateApplication()` service includes both `approved` and `auto_approved` statuses in its check.

---

## Payment Flows

### PAY-1: Stripe Onboarding

**Account:** `prod-creator4@bypass.com`
**Prerequisites:** Logged in as creator, no existing Stripe account
**Steps:**
1. Navigate to the Earnings/Wallet section
2. Tap "Set Up Payouts" or "Connect Bank Account"
3. Follow the Stripe Connect onboarding flow
4. Complete required banking information in the Stripe-hosted form
5. Return to the Troodie app

**Expected Result:** Stripe Express account is created. Onboarding status is "completed." The `stripe_accounts` table has a record with `onboarding_completed = true`. The `creator_profiles` table has `stripe_onboarding_completed = true`.

---

### PAY-2: Payment Creation (Business Funds Campaign)

**Account:** `prod-business2@bypass.com`
**Prerequisites:** Logged in, creating or funding a campaign
**Steps:**
1. During campaign creation or publish, proceed to the payment step
2. Enter payment card details (use Stripe test card `4242 4242 4242 4242`)
3. Confirm the payment amount matches the campaign budget
4. Submit payment

**Expected Result:** Payment intent is created via the `stripe-create-payment-intent` Edge Function. A `campaign_payments` record is created with `status: 'succeeded'`. The campaign `payment_status` updates to "paid."

**Verification SQL:**
```sql
SELECT cp.id, cp.campaign_id, cp.amount_cents, cp.creator_payout_cents, cp.status
FROM campaign_payments cp
JOIN campaigns c ON cp.campaign_id = c.id
JOIN users u ON c.owner_id = u.id
WHERE u.email = 'prod-business2@bypass.com'
ORDER BY cp.created_at DESC
LIMIT 1;
```

---

### PAY-3: Payout Execution

**Account:** Verification via database after all deliverables are approved
**Prerequisites:** All deliverables approved for a campaign application, creator has Stripe onboarding completed
**Steps:**
1. Verify all deliverables are approved (see PDF-1)
2. Check the deliverable with `payment_amount_cents > 0`
3. Verify the `stripe-process-payout` Edge Function was called
4. Check the `payment_transactions` table for the transfer record

**Expected Result:** A Stripe Transfer is created from the platform to the creator's connected account. The `payment_transactions` table has a record with `transaction_type: 'payout'` and `status: 'processing'` or `'completed'`.

**Verification SQL:**
```sql
SELECT pt.id, pt.campaign_id, pt.amount_cents, pt.status, pt.stripe_transfer_id, pt.created_at
FROM payment_transactions pt
JOIN campaigns c ON pt.campaign_id = c.id
JOIN users u ON c.owner_id = u.id
WHERE u.email = 'prod-business2@bypass.com'
  AND pt.transaction_type = 'payout'
ORDER BY pt.created_at DESC
LIMIT 1;
```

---

### PAY-4: Payment History

**Account:** `prod-creator6@bypass.com`
**Prerequisites:** Logged in, has completed payouts
**Steps:**
1. Navigate to the Earnings section
2. Tap "Payment History" or "Transaction History"
3. Review the list of past payments
4. Tap on a payment to view details

**Expected Result:** Payment history shows all completed payouts with campaign name, amount, date, and status. Detail view shows the Stripe transfer ID and breakdown.

---

### PAY-5: Refund Flow

**Account:** `prod-business2@bypass.com`
**Prerequisites:** A campaign payment exists
**Steps:**
1. Navigate to Campaign Management
2. Find a campaign where a refund might be needed (e.g., campaign cancelled before completion)
3. Initiate a refund request (if the feature is available) or verify via backend

**Expected Result:** Refund is processed through Stripe. The `campaign_payments` table updates with refund details. The `payment_transactions` table records the refund.

---

## Social Features

### SOC-1: Follow/Unfollow

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Navigate to `prod-consumer2@bypass.com`'s profile
2. Tap "Follow"
3. Verify the button changes to "Following"
4. Tap "Following" to unfollow
5. Verify the button reverts to "Follow"

**Expected Result:** Follow/unfollow operations complete immediately with optimistic UI updates. The follow count adjusts on both the follower's and followed user's profiles.

---

### SOC-2: Activity Feed

**Account:** `prod-consumer6@bypass.com`
**Prerequisites:** Logged in, follows other test users who have posted content
**Steps:**
1. Navigate to the Activity tab
2. Review recent activity items (likes, comments, follows, new posts from followed users)
3. Tap on an activity item to navigate to the referenced content

**Expected Result:** Activity feed shows chronological activity from followed users. Tapping an item navigates to the relevant post, profile, or restaurant.

---

### SOC-3: User Discovery

**Account:** `prod-consumer5@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Navigate to the Explore page
2. Browse the "Suggested Users" or "People to Follow" section
3. Tap on a suggested user to view their profile

**Expected Result:** User discovery shows relevant suggestions based on activity and interests. Tapping a user navigates to their profile where Follow is available.

---

### SOC-4: Follower List

**Account:** `prod-consumer2@bypass.com`
**Prerequisites:** At least one other test user follows this account
**Steps:**
1. Navigate to Profile tab
2. Tap on the follower count
3. Review the list of followers
4. Tap on a follower's name to visit their profile

**Expected Result:** Follower list displays all users who follow this account. Each entry shows the user's avatar, name, and a Follow/Following button.

---

### SOC-5: Social Search

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Navigate to the Search tab
2. Search for "prod-consumer2"
3. Review user search results
4. Search for a restaurant name
5. Review restaurant search results

**Expected Result:** Search returns matching users and restaurants. Results include avatars, names, and action buttons (Follow, View).

---

## Restaurant Features

### REST-1: Search Restaurants

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Navigate to the Search tab
2. Search for a known restaurant (test or real)
3. Review search results with Google Places integration

**Expected Result:** Restaurant search returns results from both the local database and Google Places API. Results show restaurant name, address, rating, and photos.

---

### REST-2: View Restaurant Details

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Tap on a restaurant from search results
2. Review the detail page: photos, address, hours, rating, reviews
3. View user posts about this restaurant
4. Check the "Save" button functionality

**Expected Result:** Restaurant detail page loads with all information. Photos display correctly. User posts tagged at this restaurant appear in a feed. The Save button allows saving to a board.

---

### REST-3: Claim Restaurant

**Account:** `prod-business1@bypass.com`
**Prerequisites:** Logged in as business
**Steps:**
1. Search for an unclaimed restaurant
2. Tap "Claim this Restaurant"
3. Submit verification information
4. Check claim status

**Expected Result:** Claim is submitted and shows "Pending" status. The `restaurant_claims` table has a new record linking the business user to the restaurant.

---

### REST-4: View Restaurant Analytics (Business)

**Account:** `prod-business2@bypass.com`
**Prerequisites:** Logged in, has a claimed and verified restaurant
**Steps:**
1. Navigate to the Restaurant Dashboard
2. View analytics: page views, saves, reviews
3. Filter by date range

**Expected Result:** Analytics display metrics for the claimed restaurant. Data includes page views, save counts, review counts, and engagement trends.

---

### REST-5: Manage Restaurant Photos

**Account:** `prod-business2@bypass.com`
**Prerequisites:** Logged in, has a claimed restaurant
**Steps:**
1. Navigate to the Restaurant Dashboard
2. Tap "Manage Photos"
3. Upload a new photo from the camera roll
4. Set a photo as the cover image
5. Delete an old photo

**Expected Result:** Photo upload succeeds. Cover photo updates immediately. Deleted photos are removed from the gallery. Changes are visible to other users viewing the restaurant.

---

## Board & Save Tests

### BRD-1: Create Board

**Account:** `prod-consumer3@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Navigate to the Profile tab or Boards section
2. Tap "Create Board"
3. Enter board name: "Favorite Brunch Spots"
4. Set privacy to "Private"
5. Save the board

**Expected Result:** Board is created and appears in the user's board list. Board shows the name, privacy setting, and zero saves.

**Verification SQL:**
```sql
SELECT b.id, b.name, b.board_type, b.created_at
FROM boards b
JOIN users u ON b.owner_id = u.id
WHERE u.email = 'prod-consumer3@bypass.com'
ORDER BY b.created_at DESC
LIMIT 1;
```

---

### BRD-2: Save to Board

**Account:** `prod-consumer3@bypass.com`
**Prerequisites:** BRD-1 completed, a board exists
**Steps:**
1. Navigate to a restaurant detail page
2. Tap "Save"
3. Select "Favorite Brunch Spots" from the board picker
4. Confirm the save
5. Navigate to the board and verify the restaurant appears

**Expected Result:** Restaurant is saved to the selected board. The board shows the restaurant with its name and photo. The save count on the board increments.

---

### BRD-3: Remove Save

**Account:** `prod-consumer3@bypass.com`
**Prerequisites:** BRD-2 completed
**Steps:**
1. Navigate to the "Favorite Brunch Spots" board
2. Find the saved restaurant
3. Swipe or tap to remove the save
4. Confirm removal
5. Verify the restaurant is no longer in the board

**Expected Result:** Restaurant is removed from the board. The save count decrements. The restaurant's "Saved" indicator reverts to "Save."

---

### BRD-4: Board Sharing

**Account:** `prod-consumer3@bypass.com`
**Prerequisites:** A board with at least one save
**Steps:**
1. Navigate to the board
2. Tap the "Share" button
3. Share via the native share sheet
4. Verify the deep link format (`troodie://boards/[id]`)

**Expected Result:** Share sheet opens with the board's deep link. The link format includes the board ID for deep linking.

---

## Notification Tests

### NOT-1: Push Notifications

**Account:** `prod-consumer6@bypass.com`
**Prerequisites:** Logged in, push notifications enabled on device, another test user triggers an event
**Steps:**
1. As `prod-consumer1@bypass.com`, follow `prod-consumer6@bypass.com`
2. Check `prod-consumer6@bypass.com`'s device for a push notification
3. Tap the notification

**Expected Result:** A push notification appears on the device: "[user] started following you." Tapping the notification opens the app and navigates to the follower's profile.

---

### NOT-2: In-App Notifications

**Account:** `prod-consumer6@bypass.com`
**Prerequisites:** Logged in, other test users have interacted with this account
**Steps:**
1. Navigate to the Activity/Notifications tab
2. Review in-app notifications (follows, likes, comments)
3. Tap on a notification to navigate to the relevant content

**Expected Result:** In-app notifications appear in chronological order. Each notification shows the action, actor, and timestamp. Tapping navigates to the relevant post, profile, or content.

---

### NOT-3: Notification Preferences

**Account:** `prod-consumer6@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Navigate to Settings > Notification Preferences
2. Toggle off "Like notifications"
3. Have another user like a post by `prod-consumer6@bypass.com`
4. Verify no notification appears for the like

**Expected Result:** After disabling like notifications, new likes do not generate push or in-app notifications. Other notification types (comments, follows) still work if enabled.

---

## Edge Cases

### EDGE-1: Empty States

**Account:** `prod-consumer9@bypass.com`
**Prerequisites:** Logged in, no prior activity (fresh account)
**Steps:**
1. Navigate to the home feed (no follows = no content)
2. Navigate to Boards (no boards created)
3. Navigate to Activity (no notifications)
4. Navigate to Search and search for a nonsense string

**Expected Result:** Each empty state displays an appropriate placeholder message or illustration:
- Feed: "Follow people to see their posts" or suggested content
- Boards: "Create your first board"
- Activity: "No notifications yet"
- Search: "No results found"

---

### EDGE-2: Network Errors

**Account:** `prod-consumer9@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Enable airplane mode on the device
2. Attempt to browse the feed
3. Attempt to create a post
4. Attempt to search for restaurants
5. Disable airplane mode and retry

**Expected Result:** All operations fail gracefully with user-friendly error messages (e.g., "No internet connection. Please check your network."). No crashes. After reconnecting, operations succeed normally.

---

### EDGE-3: Duplicate Operations

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Rapidly double-tap the "Like" button on a post
2. Rapidly tap "Follow" on a user profile
3. Rapidly tap "Save" on a restaurant

**Expected Result:** Only one like/follow/save is recorded regardless of rapid taps. The UI does not show inconsistent states. The database has exactly one record for each action.

---

### EDGE-4: Concurrent Modifications

**Account:** `prod-consumer1@bypass.com` on Device A, same account on Device B
**Prerequisites:** Logged in on two devices simultaneously
**Steps:**
1. On Device A, create a new board
2. On Device B, before refreshing, create a different board
3. Refresh both devices
4. Verify both boards appear

**Expected Result:** Both boards are created successfully. No data loss. Both devices show both boards after refresh.

---

### EDGE-5: Account Type Boundaries

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in as consumer
**Steps:**
1. Attempt to access creator-only URLs via deep link (e.g., `troodie://creator/marketplace`)
2. Attempt to access business-only URLs (e.g., `troodie://business/campaigns`)

**Expected Result:** Access is denied or redirected. The consumer sees an appropriate message (e.g., "Upgrade to creator to access this feature") or is redirected to the home feed.

---

### EDGE-6: Rate Limits

**Account:** `prod-consumer9@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Rapidly submit multiple search queries (10+ in quick succession)
2. Rapidly navigate between screens
3. Observe app performance and server responses

**Expected Result:** The app remains responsive. Server-side rate limits, if any, return appropriate error codes (429). The app handles rate limit responses gracefully without crashing.

---

### EDGE-7: Deep Linking

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Open a deep link to a restaurant: `troodie://restaurant/[valid-id]`
2. Open a deep link to a user profile: `troodie://user/[valid-id]`
3. Open a deep link to a post: `troodie://posts/[valid-id]`
4. Open a deep link to a board: `troodie://boards/[valid-id]`
5. Open a deep link with an invalid ID: `troodie://restaurant/invalid-uuid`

**Expected Result:** Valid deep links navigate to the correct screen. Invalid IDs show an error state (e.g., "Content not found") without crashing. Deep links work from both cold start and warm start.

---

### EDGE-8: Session Expiry

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Log in and use the app normally
2. In the Supabase dashboard, manually expire or revoke the session token for this user
3. Return to the app and attempt an action (e.g., create a post)

**Expected Result:** The app detects the expired session and redirects to the login screen with a message like "Your session has expired. Please sign in again." No data is lost.

---

### EDGE-9: Large Data Sets

**Account:** `prod-business3@bypass.com`
**Prerequisites:** Logged in, has 10 campaigns with many applications and deliverables
**Steps:**
1. Navigate to the Campaign Management screen
2. Scroll through all 10 campaigns
3. Open a campaign with many applications (10+)
4. Scroll through applications

**Expected Result:** All data loads correctly with pagination. Scrolling is smooth. No memory issues or crashes with large data sets.

---

### EDGE-10: Special Characters

**Account:** `prod-consumer9@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. Create a post with special characters in the caption: `Test <script>alert("xss")</script> & "quotes" 'apostrophes' emoji test`
2. Create a board with special characters in the name
3. Search for a restaurant with special characters

**Expected Result:** Special characters are properly escaped and displayed. No XSS or injection vulnerabilities. Content renders correctly without breaking the UI layout.

---

### EDGE-11: Offline Behavior

**Account:** `prod-consumer9@bypass.com`
**Prerequisites:** Logged in, some data cached
**Steps:**
1. Browse the feed and load some posts while online
2. Switch to airplane mode
3. Attempt to browse previously loaded content
4. Attempt to create new content while offline

**Expected Result:** Previously loaded content may be visible from cache. New actions fail gracefully with offline messaging. No crashes or data corruption.

---

### EDGE-12: Permission Boundaries

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in
**Steps:**
1. View another user's profile (`prod-consumer2@bypass.com`)
2. Attempt to edit their profile (should not be possible via UI)
3. Verify private boards of other users are not visible
4. Verify private communities of other users are not visible

**Expected Result:** Users can only edit their own profiles. Private boards and communities belonging to other users are not accessible. RLS policies enforce these boundaries at the database level.

---

### EDGE-13: Multi-Device Sync

**Account:** `prod-consumer1@bypass.com`
**Prerequisites:** Logged in on two devices
**Steps:**
1. On Device A, follow a new user
2. On Device B, pull to refresh the profile
3. On Device A, create a post
4. On Device B, refresh the feed

**Expected Result:** Changes made on Device A appear on Device B after refresh. Real-time subscriptions may update some data automatically (notifications, feed updates).

---

## Cross-Account Tests

### CROSS-1: Consumer to Creator Upgrade

**Account:** `prod-consumer10@bypass.com`
**Prerequisites:** Logged in as consumer
**Steps:**
1. Navigate to Profile > Settings
2. Find the "Become a Creator" or "Upgrade to Creator" option
3. Fill out the creator application:
   - Display name
   - Bio
   - Social media links
   - Content niche/category
4. Submit the application
5. (Simulate admin approval via database if needed)
6. Log out and log back in
7. Verify creator features are now accessible

**Expected Result:** Creator application is submitted with status "pending." After approval, the `account_type` changes to "creator." Creator-specific UI elements appear (Marketplace, Portfolio, Earnings). A `creator_profiles` record is created.

**Verification SQL:**
```sql
SELECT u.id, u.email, u.account_type,
  (SELECT id FROM creator_profiles WHERE user_id = u.id) AS creator_profile_id,
  (SELECT status FROM creator_applications WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS application_status
FROM users u
WHERE u.email = 'prod-consumer10@bypass.com';
```

---

### CROSS-2: Creator to Business Upgrade

**Account:** `prod-creator5@bypass.com`
**Prerequisites:** Logged in as creator, wants to also manage a restaurant
**Steps:**
1. Navigate to a restaurant that is not yet claimed
2. Tap "Claim this Restaurant" (or navigate to the business upgrade flow)
3. Fill out the business verification form
4. Submit the claim
5. (Simulate admin approval via database if needed)
6. Verify business features are now accessible alongside creator features

**Expected Result:** Restaurant claim is submitted. After approval, the account type updates to "business" (or a multi-role scenario). Business dashboard becomes accessible.

---

### CROSS-3: Multi-Role Workflows

**Account:** A business account that was previously a creator (e.g., `prod-business2@bypass.com` if it has creator history)
**Prerequisites:** Account has both business and creator capabilities
**Steps:**
1. Log in and navigate to the Business Dashboard
2. Create a campaign
3. Switch to the Creator Marketplace view (if dual-role is supported)
4. Browse campaigns created by other businesses
5. Verify context switches correctly between business and creator modes

**Expected Result:** Multi-role users can access both business and creator features. Context switching preserves data and does not cause errors. Each role's data remains isolated to the appropriate views.

---

## Verification SQL Reference (Appendix)

### A1: Count All Test Users by Type

```sql
SELECT account_type, COUNT(*) AS user_count
FROM users
WHERE email LIKE 'prod-%@bypass.com'
GROUP BY account_type
ORDER BY account_type;
```

### A2: List All Test Campaigns with Status

```sql
SELECT
  c.id,
  c.title,
  c.status,
  c.budget_cents / 100.0 AS budget_dollars,
  c.created_at,
  u.email AS owner_email
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE u.email LIKE 'prod-%@bypass.com'
ORDER BY u.email, c.created_at;
```

### A3: Test Campaign Applications Summary

```sql
SELECT
  ca.id AS application_id,
  c.title AS campaign_title,
  u_creator.email AS creator_email,
  u_business.email AS business_email,
  ca.status,
  ca.rating,
  ca.applied_at,
  ca.reviewed_at
FROM campaign_applications ca
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u_creator ON cp.user_id = u_creator.id
JOIN users u_business ON c.owner_id = u_business.id
WHERE u_creator.email LIKE 'prod-%@bypass.com'
   OR u_business.email LIKE 'prod-%@bypass.com'
ORDER BY ca.applied_at DESC;
```

### A4: Test Deliverables with Payment Status

```sql
SELECT
  cd.id,
  c.title AS campaign_title,
  u.email AS creator_email,
  cd.status,
  cd.workflow_stage,
  cd.payment_amount_cents,
  cd.payment_status,
  cd.submitted_at,
  cd.reviewed_at
FROM campaign_deliverables cd
JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
JOIN campaigns c ON cd.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email LIKE 'prod-%@bypass.com'
ORDER BY cd.submitted_at DESC;
```

### A5: Payment Transactions Audit

```sql
SELECT
  pt.id,
  pt.campaign_id,
  c.title AS campaign_title,
  pt.amount_cents / 100.0 AS amount_dollars,
  pt.transaction_type,
  pt.status,
  pt.stripe_transfer_id,
  pt.created_at
FROM payment_transactions pt
JOIN campaigns c ON pt.campaign_id = c.id
JOIN users u ON c.owner_id = u.id
WHERE u.email LIKE 'prod-%@bypass.com'
ORDER BY pt.created_at DESC;
```

### A6: Verify Payment Duplication -- No Application Has Multiple Payouts

```sql
SELECT
  cd.campaign_application_id,
  COUNT(*) FILTER (WHERE cd.payment_status IN ('processing', 'completed')) AS payout_count,
  SUM(cd.payment_amount_cents) FILTER (WHERE cd.payment_amount_cents > 0) AS total_payment_cents
FROM campaign_deliverables cd
JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email LIKE 'prod-%@bypass.com'
GROUP BY cd.campaign_application_id
HAVING COUNT(*) FILTER (WHERE cd.payment_status IN ('processing', 'completed')) > 1;
-- Expected: 0 rows (no application should have more than 1 payout)
```

### A7: Stripe Account Status for Test Creators

```sql
SELECT
  u.email,
  sa.stripe_account_id,
  sa.stripe_account_status,
  sa.onboarding_completed,
  cp.stripe_onboarding_completed AS profile_onboarding_completed
FROM users u
JOIN stripe_accounts sa ON u.id = sa.user_id
LEFT JOIN creator_profiles cp ON u.id = cp.user_id
WHERE u.email LIKE 'prod-creator%@bypass.com'
ORDER BY u.email;
```

### A8: Test Data Isolation Check

```sql
-- This should return 0 rows: test users should NOT appear in non-test queries
-- Simulates what a real user would see
SELECT u.id, u.email
FROM users u
WHERE u.email LIKE 'prod-%@bypass.com'
  AND NOT (
    u.email LIKE '%@bypass.com'
    OR u.email LIKE '%@troodieapp.com'
  );
-- Expected: 0 rows (all prod-* accounts are @bypass.com)
```

---

## Summary

| Section | Test Case IDs | Count |
|---------|--------------|-------|
| Pre-Testing Setup | SETUP-1 to SETUP-3 | 3 |
| Isolation Verification | ISO-1 to ISO-8 | 8 |
| Authentication | AUTH-1 to AUTH-5 | 5 |
| Consumer Flows | CON-1 to CON-8 | 8 |
| Creator Flows | CRE-1 to CRE-10 | 10 |
| Business Flows | BUS-1 to BUS-10 | 10 |
| Campaign Lifecycle | CAM-1 to CAM-8 | 8 |
| Content Submission Flow (v1.0.16.b1) | CSF-1 to CSF-9 | 9 |
| Payment Duplication Fix (v1.0.16.b1) | PDF-1 to PDF-5 | 5 |
| Rate Creator Timing (v1.0.16.b1) | RCT-1 to RCT-8 | 8 |
| Payment Flows | PAY-1 to PAY-5 | 5 |
| Social Features | SOC-1 to SOC-5 | 5 |
| Restaurant Features | REST-1 to REST-5 | 5 |
| Board & Save Tests | BRD-1 to BRD-4 | 4 |
| Notification Tests | NOT-1 to NOT-3 | 3 |
| Edge Cases | EDGE-1 to EDGE-13 | 13 |
| Cross-Account Tests | CROSS-1 to CROSS-3 | 3 |
| **Total** | | **112** |
