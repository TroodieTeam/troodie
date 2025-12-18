# Creator Marketplace Production Testing Checklist

**Date:** December 6, 2025  
**Purpose:** Comprehensive production testing checklist for Creator Marketplace features  
**Status:** Production Testing Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Testing Setup](#pre-testing-setup)
3. [Test User Isolation Verification](#test-user-isolation-verification)
4. [Consumer Flow Testing](#consumer-flow-testing)
5. [Creator Flow Testing](#creator-flow-testing)
6. [Business Flow Testing](#business-flow-testing)
7. [Campaign Application Flow](#campaign-application-flow)
8. [Deliverable Submission Flow](#deliverable-submission-flow)
9. [Edge Cases & Error Handling](#edge-cases--error-handling)
10. [Cross-Platform Testing](#cross-platform-testing)
11. [Performance Testing](#performance-testing)
12. [Sign-Off](#sign-off)

---

## Overview

This checklist ensures the Creator Marketplace feature works correctly in production and that test user isolation is properly implemented.

**Use this checklist:**
1. After initial production deployment
2. After any migration updates
3. Before major app releases
4. During QA sign-off

**Test Accounts:**
- **Test Consumer:** `prod-consumer1@bypass.com` (OTP: `000000`)
- **Test Creator 1:** `prod-creator1@bypass.com` (OTP: `000000`)
- **Test Creator 2:** `prod-creator2@bypass.com` (OTP: `000000`)
- **Test Business:** `prod-business1@bypass.com` (OTP: `000000`)

**Admin Accounts:**
- Admin accounts are identified by hardcoded UUIDs in `services/adminReviewService.ts`
- **Admin UUIDs:**
  - Admin 1: `b08d9600-358d-4be9-9552-4607d9f50227`
  - Admin 2: `31744191-f7c0-44a4-8673-10b34ccbb87f`
- **To identify admin emails:** Run `data/test-data/prod/02j-identify-admin-accounts.sql` in Supabase SQL Editor
- **Admin Access:**
  - Admins can access admin review panel at `/admin/reviews` in the app
  - Admins can approve/reject restaurant claims and creator applications
  - Admin access is validated by checking if user ID matches hardcoded UUIDs in `adminReviewService.requireAdmin()`
- **Note:** Admin accounts must exist in `users` table with these UUIDs to have admin access

---

## Pre-Testing Setup

### Environment Verification

#### Test Case SETUP-1: Verify Production Environment
1. **Setup:** None required
2. **Steps:**
   - Check `EXPO_PUBLIC_SUPABASE_URL` environment variable
   - Verify URL points to production Supabase project
   - Check `EXPO_PUBLIC_TEST_EMAIL_DOMAINS` includes `@bypass.com`
3. **Expected:**
   - `EXPO_PUBLIC_SUPABASE_URL` = `https://[your-prod-project].supabase.co`
   - `EXPO_PUBLIC_TEST_EMAIL_DOMAINS` includes `@bypass.com`
4. **Verification:**
   ```bash
   echo $EXPO_PUBLIC_SUPABASE_URL
   echo $EXPO_PUBLIC_TEST_EMAIL_DOMAINS
   ```

### Test Account Access

#### Test Case SETUP-2: Verify Test Accounts Exist
1. **Setup:** None required
2. **Steps:**
   - Run verification query in Supabase SQL Editor
3. **Expected:**
   - All test accounts exist in `users` table
   - All accounts have `is_test_account = true`
4. **Verification SQL:**
   ```sql
   SELECT email, account_type, is_test_account 
   FROM users
   WHERE email LIKE 'prod-%@bypass.com'
   ORDER BY email;
   -- Expected: All rows show is_test_account = true
   ```

---

## Test User Isolation Verification

### Database Isolation Checks

#### Test Case ISO-1: Verify Test Users Flagged
1. **Setup:** None required
2. **Steps:**
   - Run verification query in Supabase SQL Editor
3. **Expected:**
   - All test users have `is_test_account = true`
   - Test users are properly isolated from production data
4. **Verification SQL:**
   ```sql
   SELECT email, is_test_account FROM users
   WHERE email LIKE 'prod-%@bypass.com';
   -- Expected: All rows have is_test_account = true
   ```

#### Test Case ISO-2: Verify Creator Discovery Excludes Test Users
1. **Setup:** None required
2. **Steps:**
   - Run verification query simulating production user context
3. **Expected:**
   - `get_creators()` function excludes test users when called by production users
   - Test creators only visible to other test users
4. **Verification SQL:**
   ```sql
   -- Verify get_creators excludes test users (as production user)
   SELECT COUNT(*) FROM creator_profiles cp
   JOIN users u ON cp.user_id = u.id
   WHERE u.is_test_account IS NOT TRUE;
   -- This should match the count from get_creators() when called by production user
   ```

#### Test Case ISO-3: Verify Test Campaigns Flagged
1. **Setup:** None required
2. **Steps:**
   - Run verification query in Supabase SQL Editor
3. **Expected:**
   - Test campaigns are properly flagged with `is_test_campaign = true`
   - Test campaigns only visible to test users
4. **Verification SQL:**
   ```sql
   SELECT id, name, title, is_test_campaign FROM campaigns
   WHERE is_test_campaign = true;
   -- Should show all test campaigns
   ```

### App UI Isolation Tests

#### Test Case ISO-4: Production User Cannot See Test Data
1. **Setup:** Log in as production user (real non-test account)
2. **Steps:**
   - Navigate to Browse Creators screen
   - Navigate to Explore Campaigns screen
   - Check Activity Feed
   - Search for users
   - Search for restaurants
3. **Expected:**
   - No test creators visible (names don't include "Prod Creator")
   - No test campaigns visible
   - No posts from test users in activity feed
   - Test users don't appear in search results
   - Test restaurants don't appear in search results
4. **Verification:**
   - Visual inspection of UI
   - Search results verification

#### Test Case ISO-5: Test User Can See Test Data
1. **Setup:** Log in as `prod-consumer1@bypass.com` (OTP: `000000`)
2. **Steps:**
   - Navigate to Browse Creators screen
   - Navigate to Explore Campaigns screen
   - Check Activity Feed
   - Interact with test content
3. **Expected:**
   - Can see other test creators in Browse Creators
   - Can see test campaigns in Explore
   - Can interact with test content
   - Changes don't affect production data
4. **Verification:**
   - Visual inspection of UI
   - Verify test data isolation maintained

---

## Consumer Flow Testing

**Test Account:** `prod-consumer1@bypass.com` (OTP: `000000`)

### Login & Onboarding

#### Test Case CON-1: Successful Login with Bypass OTP
1. **Setup:** App installed and ready
2. **Steps:**
   - Open app
   - Enter email: `prod-consumer1@bypass.com`
   - Tap "Continue"
   - Enter OTP: `000000`
   - Tap "Verify"
3. **Expected:**
   - "Enter Code" screen appears after entering email
   - OTP `000000` works for bypass authentication
   - User lands on home screen after login
   - Profile shows correct account type (consumer)
4. **Verification:**
   - Check account type in profile
   - Verify home screen loads correctly

### Core Features

#### Test Case CON-2: Feed Browsing
1. **Setup:** Logged in as `prod-consumer1@bypass.com`
2. **Steps:**
   - Navigate to Feed tab
   - Scroll through posts
   - Tap on posts to view details
3. **Expected:**
   - Feed loads successfully
   - Posts display correctly
   - Can view post details
   - Can interact with posts (like, comment, save)
4. **Verification:**
   - Visual inspection
   - Interaction functionality works

#### Test Case CON-3: Restaurant Search and Details
1. **Setup:** Logged in as `prod-consumer1@bypass.com`
2. **Steps:**
   - Navigate to Search
   - Search for restaurants
   - Tap on restaurant to view details
   - View restaurant information
3. **Expected:**
   - Search works correctly
   - Restaurant results display
   - Restaurant details page loads
   - Can save restaurant to boards
4. **Verification:**
   - Search functionality works
   - Restaurant details display correctly

#### Test Case CON-4: Board Management
1. **Setup:** Logged in as `prod-consumer1@bypass.com`
2. **Steps:**
   - Navigate to Boards
   - Create new board
   - Save restaurant to board
   - View saved restaurants
3. **Expected:**
   - Can create boards
   - Can save restaurants to boards
   - Saved restaurants appear in board
   - Default "Quick Saves" board exists
4. **Verification:**
   - Board creation works
   - Restaurant saves work correctly

#### Test Case CON-5: User Interactions
1. **Setup:** Logged in as `prod-consumer1@bypass.com`
2. **Steps:**
   - Follow/unfollow users
   - Like posts
   - Comment on posts
   - Save posts
3. **Expected:**
   - Follow/unfollow works
   - Like functionality works
   - Comments can be added
   - Posts can be saved
4. **Verification:**
   - All interactions work correctly
   - Changes persist after refresh

---

## Creator Flow Testing

**Test Account:** `prod-creator1@bypass.com` (OTP: `000000`)

### Creator Profile

#### Test Case CRE-1: Creator Dashboard Access
1. **Setup:** Logged in as `prod-creator1@bypass.com`
2. **Steps:**
   - Navigate to Profile tab
   - View creator dashboard
   - Check profile information
3. **Expected:**
   - Profile tab shows creator dashboard
   - Can view own creator profile
   - Profile information displays correctly
4. **Verification:**
   - Dashboard loads correctly
   - Profile information accurate

#### Test Case CRE-2: Profile Editing
1. **Setup:** Logged in as `prod-creator1@bypass.com`
2. **Steps:**
   - Navigate to profile edit screen
   - Update display name
   - Update bio
   - Update location
   - Add/remove specialties
   - Change availability status
   - Toggle "Open to collaborations"
   - Save changes
3. **Expected:**
   - Can access profile edit screen
   - All fields editable
   - Availability status selector works (available/busy/not_accepting)
   - Open to collaborations toggle works
   - Changes save successfully
   - Changes reflect in profile view immediately
4. **Verification SQL:**
   ```sql
   SELECT display_name, bio, location, specialties, availability_status, open_to_collabs
   FROM creator_profiles cp
   JOIN users u ON cp.user_id = u.id
   WHERE u.email = 'prod-creator1@bypass.com';
   -- Verify changes persisted
   ```

#### Test Case CRE-3: Portfolio Display
1. **Setup:** Logged in as `prod-creator1@bypass.com`
2. **Steps:**
   - Navigate to profile
   - View portfolio section
   - Check portfolio items display
3. **Expected:**
   - Portfolio section displays
   - Portfolio items show correctly (images/videos)
   - Empty state shows if no portfolio items
4. **Verification:**
   - Visual inspection
   - Portfolio items load correctly

### Creator Discovery (CM-9)

**As Test Business:** `prod-business1@bypass.com`

#### Test Case CRE-4: Browse Creators Screen
1. **Setup:** Logged in as `prod-business1@bypass.com`
2. **Steps:**
   - Navigate to Browse Creators screen
   - View creator list
   - Check creator cards display
3. **Expected:**
   - Can access Browse Creators screen
   - Test creators (prod-creator1, prod-creator2) appear
   - Creator cards show correct info (name, followers, engagement, specialties)
   - Tapping card navigates to creator profile
4. **Verification:**
   - Creator list loads correctly
   - Navigation works

#### Test Case CRE-5: Creator Filtering
1. **Setup:** Logged in as `prod-business1@bypass.com`
2. **Steps:**
   - Navigate to Browse Creators
   - Filter by location
   - Filter by followers
   - Filter by engagement
   - Clear filters
3. **Expected:**
   - Filter by location works
   - Filter by followers works
   - Filter by engagement works
   - Results update correctly
   - Can clear filters
4. **Verification:**
   - Filters apply correctly
   - Results match filter criteria

#### Test Case CRE-6: Creator Profile View
1. **Setup:** Logged in as `prod-business1@bypass.com`, viewing test creator profile
2. **Steps:**
   - Navigate to creator profile
   - View profile header
   - Check stats row
   - View bio section
   - View specialties
   - View portfolio section
   - View sample posts
   - Check "Invite to Campaign" button
3. **Expected:**
   - Profile header shows avatar, name, username
   - Stats row shows: followers, engagement, campaigns, rating
   - Availability badge shows when busy/not_accepting
   - Bio section displays (or empty state)
   - Specialties chips display (or empty state)
   - Portfolio section displays if items exist
   - Sample posts section displays
   - "Invite to Campaign" button appears (placeholder OK)
4. **Verification:**
   - All profile sections display correctly
   - Information accurate

---

## Business Flow Testing

**Test Account:** `prod-business1@bypass.com` (OTP: `000000`)

### Restaurant Claiming & Account Upgrade

#### Test Case BUS-1: Claim Restaurant and Upgrade to Business Account
1. **Setup:** 
   - Run `02i-setup-restaurant-claim-upgrade-test.sql` to prepare test environment
   - Test account: `prod-consumer2@bypass.com` (OTP: `000000`)
   - Test restaurant: "Prod Test Claiming" (unclaimed)
   - Account starts as `account_type = 'consumer'`
2. **Steps:**
   - Log in as `prod-consumer2@bypass.com`
   - **Open browser/device console to monitor logs** (look for `[RestaurantClaimService]` and `[ClaimRestaurant]` prefixes)
   - Navigate to restaurant claiming flow (via restaurant details page or claim screen)
   - Search for "Prod Test Claiming" restaurant
   - Select and submit restaurant claim request
   - **Monitor console logs** - should see:
     - User authentication confirmation
     - Account state BEFORE claim (should show `account_type: 'consumer'`)
     - Restaurant check results
     - Claim creation confirmation
     - Account state AFTER claim (check if upgraded to `'business'`)
     - Business profile check results
   - Complete any required verification steps
   - Verify account upgrade occurs automatically
   - Check that Business Dashboard becomes accessible
3. **Expected:**
   - Can access restaurant claiming flow
   - Can search and find "Prod Test Claiming" restaurant
   - Claim submission succeeds
   - Account type automatically upgrades from `'consumer'` to `'business'`
   - `business_profiles` record created with correct `restaurant_id`
   - `restaurant_claims` record created with `status = 'verified'`
   - Restaurant marked as `is_claimed = true` and `owner_id` set
   - User can now access Business Dashboard
   - Business tab becomes available in navigation
4. **Verification SQL:**
   ```sql
   -- Verify account type upgraded
   SELECT 
     u.email,
     u.account_type,
     u.account_upgraded_at,
     u.is_restaurant,
     bp.restaurant_id,
     bp.verification_status,
     bp.claimed_at,
     r.name as restaurant_name,
     r.is_claimed,
     r.owner_id,
     rc.status as claim_status,
     rc.verified_at
   FROM users u
   LEFT JOIN business_profiles bp ON bp.user_id = u.id
   LEFT JOIN restaurants r ON bp.restaurant_id = r.id
   LEFT JOIN restaurant_claims rc ON rc.user_id = u.id AND rc.restaurant_id = r.id
   WHERE u.email = 'prod-consumer2@bypass.com';
   
   -- Expected Results:
   -- account_type = 'business'
   -- account_upgraded_at IS NOT NULL
   -- is_restaurant = true
   -- bp.restaurant_id IS NOT NULL
   -- bp.verification_status = 'verified'
   -- r.name = 'Prod Test Claiming'
   -- r.is_claimed = true
   -- r.owner_id = u.id
   -- rc.status = 'verified'
   ```
5. **Admin Accounts for Approval:**
   - **Admin accounts are identified by hardcoded UUIDs in `adminReviewService.ts`:**
     - Admin 1: `b08d9600-358d-4be9-9552-4607d9f50227`
     - Admin 2: `31744191-f7c0-44a4-8673-10b34ccbb87f`
   - **To identify admin emails, run:** `data/test-data/prod/02j-identify-admin-accounts.sql`
   - **Admin Access:**
     - Admins can access admin review panel at `/admin/reviews`
     - Admins can approve/reject restaurant claims and creator applications
     - Admin access is checked via `adminReviewService.requireAdmin()` which validates user ID against hardcoded list
   - **How to Approve Claims:**
     - **Via Admin Panel:** Log in as admin → Navigate to `/admin/reviews` → Approve pending claim
     - **Via SQL (for testing):** See SQL query below
     - **Via Service:** Use `adminReviewService.approveRestaurantClaim(claimId, { review_notes: '...' })`
6. **Troubleshooting / Logging:**
   - **If account does NOT upgrade automatically:**
     - Check console logs for `[RestaurantClaimService]` entries
     - Verify claim was created: Check `restaurant_claims` table for claim with `status = 'pending'`
     - **Note:** Current flow creates claims with `status = 'pending'` which require admin approval
     - Account upgrade happens when claim status changes to `'approved'` or `'verified'`
     - Check if admin approval is required (see `adminReviewService.approveRestaurantClaim()`)
   - **Key Log Points to Check:**
     - `[RestaurantClaimService] User account state BEFORE claim` - Should show `account_type: 'consumer'`
     - `[RestaurantClaimService] Claim created successfully` - Confirms claim was created
     - `[RestaurantClaimService] User account state AFTER claim creation` - Check if upgraded
     - `[RestaurantClaimService] Business profile check` - Should show profile if upgraded
     - `[ClaimRestaurant] User account state after claim` - Final verification
   - **If upgrade doesn't happen:**
     - Claims are created with `status = 'pending'` and require admin approval
     - Use admin panel to approve the claim, which triggers account upgrade
     - **Or use SQL to manually approve (for testing):**
       ```sql
       -- Get claim ID first
       SELECT id, user_id, restaurant_id, status 
       FROM restaurant_claims 
       WHERE user_id = (SELECT id FROM users WHERE email = 'prod-consumer2@bypass.com')
       ORDER BY submitted_at DESC LIMIT 1;
       
       -- Then approve it (replace <claim_id> with actual claim ID)
       UPDATE restaurant_claims 
       SET status = 'approved', 
           reviewed_at = NOW(),
           reviewed_by = 'b08d9600-358d-4be9-9552-4607d9f50227'  -- Admin 1 UUID
       WHERE id = '<claim_id>';
       
       -- This will trigger account upgrade via adminReviewService.approveRestaurantClaim()
       -- Or manually upgrade:
       SELECT upgrade_user_to_business(
         (SELECT id FROM users WHERE email = 'prod-consumer2@bypass.com'),
         (SELECT restaurant_id FROM restaurant_claims WHERE id = '<claim_id>')
       );
       ```
6. **Reset After Testing:**
   - Run the RESET query at the bottom of `02i-setup-restaurant-claim-upgrade-test.sql`
   - This resets `prod-consumer2` back to `consumer` account type
   - Unclaims "Prod Test Claiming" restaurant for next test run
7. **Notes:**
   - **Current Implementation:** Claims are created with `status = 'pending'` and require admin approval
   - Account upgrade happens when claim is approved (via admin panel or SQL)
   - The `upgrade_user_to_business()` function is called when claim status changes to `'approved'` or `'verified'`
   - For automatic upgrade, claims would need to use `claim_restaurant()` RPC function with domain verification
   - Run reset query after testing to prepare for next test iteration

### Business Dashboard

#### Test Case BUS-2: Dashboard Access
1. **Setup:** Logged in as `prod-business1@bypass.com`
2. **Steps:**
   - Navigate to Business tab
   - View dashboard
   - Check metrics display
   - Navigate to campaign management
3. **Expected:**
   - Business tab is accessible
   - Dashboard shows campaign metrics
   - Restaurant info displays correctly
   - Can navigate to campaign management
4. **Verification:**
   - Dashboard loads correctly
   - Metrics display accurately

### Campaign Creation (CM-7)

#### Test Case BUS-3: Create Campaign Flow
1. **Setup:** Logged in as `prod-business1@bypass.com`
2. **Steps:**
   - Navigate to Create Campaign screen
   - Step 1: Enter title and description
   - Step 2: Set budget and deadline
   - Step 3: Add deliverables
   - Add requirements (optional)
   - Submit campaign
3. **Expected:**
   - Can access Create Campaign screen
   - All steps complete successfully
   - Campaign creates successfully
   - Campaign appears in business dashboard
   - Campaign is flagged as test campaign (`is_test_campaign = true`)
4. **Verification SQL:**
   ```sql
   SELECT id, name, title, status, is_test_campaign
   FROM campaigns c
   JOIN restaurants r ON c.restaurant_id = r.id
   JOIN restaurant_claims rc ON rc.restaurant_id = r.id
   JOIN users u ON rc.user_id = u.id
   WHERE u.email = 'prod-business1@bypass.com'
   ORDER BY c.created_at DESC
   LIMIT 1;
   -- Verify is_test_campaign = true
   ```

### Campaign Management

#### Test Case BUS-4: View Campaign Details
1. **Setup:** Logged in as `prod-business1@bypass.com`, campaign exists
2. **Steps:**
   - Navigate to campaign details
   - View campaign information
   - Check applications list
   - View deliverable submissions
3. **Expected:**
   - Can view campaign details
   - Can see applications (if any)
   - Can view deliverable submissions
   - All information displays correctly
4. **Verification:**
   - Campaign details load correctly
   - Applications display if present

#### Test Case BUS-5: Application Review
1. **Setup:** Logged in as `prod-business1@bypass.com`, campaign has pending applications
2. **Steps:**
   - View application details
   - Accept application
   - Reject application (with reason)
   - Check status updates
3. **Expected:**
   - Can view application details
   - Can accept applications
   - Can reject applications with reason
   - Status updates reflect correctly
   - Creator sees status change
4. **Verification SQL:**
   ```sql
   SELECT ca.status, ca.reviewed_at, ca.reviewer_id
   FROM campaign_applications ca
   JOIN creator_profiles cp ON ca.creator_id = cp.id
   JOIN users u ON cp.user_id = u.id
   WHERE u.email = 'prod-creator1@bypass.com'
   ORDER BY ca.applied_at DESC
   LIMIT 1;
   -- Verify status updated correctly
   ```

#### Test Case BUS-6: Deliverable Review
1. **Setup:** Logged in as `prod-business1@bypass.com`, campaign has deliverable submissions
2. **Steps:**
   - View pending deliverable
   - View deliverable content
   - Approve deliverable
   - Reject deliverable (with reason)
   - Request revision
   - Check status updates
3. **Expected:**
   - Can see pending deliverables
   - Can view deliverable content
   - Can approve deliverables
   - Can reject deliverables with reason
   - Can request revision
   - Status updates reflect correctly
4. **Verification:**
   - Deliverable review works correctly
   - Status updates persist

---

## Campaign Application Flow

### Creator Applies to Campaign

#### Test Case APP-1: View Available Campaigns
1. **Setup:** Logged in as `prod-creator1@bypass.com`
2. **Steps:**
   - Navigate to Explore Campaigns screen
   - View campaign list
   - Check campaign cards display
   - Tap campaign to view details
3. **Expected:**
   - Can view Explore Campaigns screen
   - Can see test campaigns
   - Campaign cards show: title, budget, deadline, deliverable count
   - Can tap to view campaign details
4. **Verification:**
   - Campaign list loads correctly
   - Campaign details modal works

#### Test Case APP-2: Campaign Details Modal
1. **Setup:** Logged in as `prod-creator1@bypass.com`, viewing campaign details
2. **Steps:**
   - View campaign modal
   - Check restaurant info
   - Check description
   - Check budget/payout
   - Check deadline
   - Check expected deliverables ← CRITICAL (CM-13)
   - Check requirements
3. **Expected:**
   - Campaign modal shows:
     - Restaurant info
     - Description
     - Budget/payout
     - Deadline
     - Expected deliverables ← CRITICAL
     - Requirements
   - All information displays correctly
4. **Verification:**
   - Modal displays all required information
   - Deliverables section visible

#### Test Case APP-3: Submit Application
1. **Setup:** Logged in as `prod-creator1@bypass.com`, viewing campaign details
2. **Steps:**
   - Click "Apply Now" button
   - Application modal appears
   - Select deliverables
   - Fill in application form
   - Submit application
   - Check application status
3. **Expected:**
   - Apply button works
   - Application modal allows selecting deliverables
   - Can submit application
   - Application appears in "My Campaigns"
   - "Applied" badge shows on campaign card
4. **Verification SQL:**
   ```sql
   SELECT ca.id, ca.status, ca.applied_at, ca.proposed_rate_cents, ca.cover_letter
   FROM campaign_applications ca
   JOIN creator_profiles cp ON ca.creator_id = cp.id
   JOIN users u ON cp.user_id = u.id
   WHERE u.email = 'prod-creator1@bypass.com'
   ORDER BY ca.applied_at DESC
   LIMIT 1;
   -- Verify application created with correct data
   ```

### Business Reviews Application

#### Test Case APP-4: Business Views Application
1. **Setup:** Logged in as `prod-business1@bypass.com`, campaign has new application
2. **Steps:**
   - Navigate to campaign details
   - View applications list
   - Open application details
   - Review application information
3. **Expected:**
   - Can see new application in campaign
   - Can view application details
   - Application information displays correctly
4. **Verification:**
   - Application appears in list
   - Details display correctly

#### Test Case APP-5: Accept Application
1. **Setup:** Logged in as `prod-business1@bypass.com`, viewing application details
2. **Steps:**
   - Review application
   - Accept application
   - Check status update
   - Verify creator sees status change
3. **Expected:**
   - Can accept application
   - Creator status updates to "accepted"
   - Creator sees status change
   - Application appears in creator's "Active" tab
4. **Verification SQL:**
   ```sql
   SELECT ca.status, ca.reviewed_at, ca.reviewer_id
   FROM campaign_applications ca
   JOIN creator_profiles cp ON ca.creator_id = cp.id
   JOIN users u ON cp.user_id = u.id
   WHERE u.email = 'prod-creator1@bypass.com'
   AND ca.status = 'accepted'
   ORDER BY ca.applied_at DESC
   LIMIT 1;
   -- Verify status = 'accepted' and reviewed_at is set
   ```

---

## Deliverable Submission Flow

### Creator Submits Deliverable

#### Test Case DEL-1: Access Submit Deliverable Screen
1. **Setup:** Logged in as `prod-creator1@bypass.com`, has accepted application
2. **Steps:**
   - Navigate to "My Campaigns" → "Active" tab
   - Open campaign with accepted application
   - Access Submit Deliverable screen
3. **Expected:**
   - Can access Submit Deliverable screen
   - Screen loads correctly
   - Campaign information displays
4. **Verification:**
   - Submit screen accessible
   - UI loads correctly

#### Test Case DEL-2: Upload Content
1. **Setup:** Logged in as `prod-creator1@bypass.com`, on submit deliverable screen
2. **Steps:**
   - Upload content (image/video)
   - Add content URL (Instagram, TikTok, etc.)
   - Add caption/notes
   - Submit deliverable
3. **Expected:**
   - Can upload content
   - Can add content URL
   - Can add caption/notes
   - Submit works successfully
   - Deliverable status shows "pending_review"
4. **Verification SQL:**
   ```sql
   SELECT id, status, content_url, caption, submitted_at
   FROM campaign_deliverables cd
   JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
   JOIN creator_profiles cp ON ca.creator_id = cp.id
   JOIN users u ON cp.user_id = u.id
   WHERE u.email = 'prod-creator1@bypass.com'
   ORDER BY cd.submitted_at DESC
   LIMIT 1;
   -- Verify status = 'pending_review' and content saved
   ```

### Business Reviews Deliverable

#### Test Case DEL-3: View Pending Deliverable
1. **Setup:** Logged in as `prod-business1@bypass.com`, campaign has pending deliverable
2. **Steps:**
   - Navigate to campaign details
   - View pending deliverables
   - Open deliverable details
   - View deliverable content
3. **Expected:**
   - Can see pending deliverable
   - Can view deliverable content
   - Content displays correctly
4. **Verification:**
   - Deliverable appears in list
   - Content loads correctly

#### Test Case DEL-4: Approve Deliverable
1. **Setup:** Logged in as `prod-business1@bypass.com`, viewing deliverable details
2. **Steps:**
   - Review deliverable content
   - Approve deliverable
   - Check status update
   - Verify creator sees status change
3. **Expected:**
   - Can approve deliverable
   - Status updates to "approved"
   - Creator notified of approval
   - Status reflects correctly
4. **Verification SQL:**
   ```sql
   SELECT cd.status, cd.reviewed_at, cd.reviewer_id
   FROM campaign_deliverables cd
   JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
   JOIN creator_profiles cp ON ca.creator_id = cp.id
   JOIN users u ON cp.user_id = u.id
   WHERE u.email = 'prod-creator1@bypass.com'
   AND cd.status = 'approved'
   ORDER BY cd.submitted_at DESC
   LIMIT 1;
   -- Verify status = 'approved' and reviewed_at is set
   ```

#### Test Case DEL-5: Reject Deliverable
1. **Setup:** Logged in as `prod-business1@bypass.com`, viewing deliverable details
2. **Steps:**
   - Review deliverable content
   - Reject deliverable
   - Add rejection reason
   - Submit rejection
   - Check status update
3. **Expected:**
   - Can reject deliverable with reason
   - Status updates to "rejected"
   - Rejection reason saved
   - Creator notified of rejection
4. **Verification SQL:**
   ```sql
   SELECT cd.status, cd.rejection_reason, cd.reviewed_at
   FROM campaign_deliverables cd
   JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
   JOIN creator_profiles cp ON ca.creator_id = cp.id
   JOIN users u ON cp.user_id = u.id
   WHERE u.email = 'prod-creator1@bypass.com'
   AND cd.status = 'rejected'
   ORDER BY cd.submitted_at DESC
   LIMIT 1;
   -- Verify status = 'rejected' and rejection_reason is set
   ```

#### Test Case DEL-6: Request Revision
1. **Setup:** Logged in as `prod-business1@bypass.com`, viewing deliverable details
2. **Steps:**
   - Review deliverable content
   - Request revision
   - Add revision notes
   - Submit revision request
   - Check status update
3. **Expected:**
   - Can request revision
   - Status updates to "revision_requested"
   - Revision notes saved
   - Creator notified of revision request
4. **Verification:**
   - Revision request works correctly
   - Status updates persist

### Auto-Approval (if applicable)

#### Test Case DEL-7: Auto-Approval After 72 Hours
1. **Setup:** Deliverable in "pending_review" status for > 72 hours
2. **Steps:**
   - Wait for auto-approval cron job to run
   - Check deliverable status
   - Verify creator notification
3. **Expected:**
   - Unreviewed deliverables auto-approve after 72 hours
   - Auto-approved status shows correctly
   - Creator notified of auto-approval
4. **Verification SQL:**
   ```sql
   SELECT cd.id, cd.status, cd.auto_approved, cd.reviewed_at
   FROM campaign_deliverables cd
   WHERE cd.status = 'approved'
   AND cd.auto_approved = true
   AND cd.reviewed_at > NOW() - INTERVAL '1 day'
   ORDER BY cd.reviewed_at DESC
   LIMIT 1;
   -- Verify auto_approved = true and reviewed_at is recent
   ```

---

## Edge Cases & Error Handling

### Empty States

#### Test Case EDGE-1: Empty Creator Browse
1. **Setup:** Logged in as `prod-business1@bypass.com`, no creators match filters
2. **Steps:**
   - Apply filters that return no results
   - Check empty state display
3. **Expected:**
   - Empty state message displays
   - Clear message about no results
   - Option to clear filters
4. **Verification:**
   - Empty state displays correctly
   - UI handles empty state gracefully

#### Test Case EDGE-2: Empty Campaign List
1. **Setup:** Logged in as `prod-creator1@bypass.com`, no campaigns available
2. **Steps:**
   - Navigate to Explore Campaigns
   - Check empty state display
3. **Expected:**
   - Empty state message displays
   - Clear message about no campaigns
   - Helpful guidance for user
4. **Verification:**
   - Empty state displays correctly

#### Test Case EDGE-3: Empty Applications List
1. **Setup:** Logged in as `prod-business1@bypass.com`, campaign has no applications
2. **Steps:**
   - Navigate to campaign details
   - Check applications section
3. **Expected:**
   - Empty state message displays
   - Clear message about no applications
4. **Verification:**
   - Empty state displays correctly

#### Test Case EDGE-4: Profile Empty States
1. **Setup:** Logged in as `prod-creator1@bypass.com`, profile missing data
2. **Steps:**
   - View profile with no bio
   - View profile with no portfolio
   - Check placeholder displays
3. **Expected:**
   - Profile with no bio shows placeholder
   - Profile with no portfolio shows placeholder
   - Placeholders are helpful and clear
4. **Verification:**
   - Empty states display correctly

### Error Handling

#### Test Case EDGE-5: Network Error During Login
1. **Setup:** App ready, network disconnected
2. **Steps:**
   - Attempt login
   - Check error message
3. **Expected:**
   - Network error shows appropriate message
   - Retry option available
   - User-friendly error handling
4. **Verification:**
   - Error message displays correctly
   - Retry functionality works

#### Test Case EDGE-6: Invalid OTP
1. **Setup:** App ready, email entered
2. **Steps:**
   - Enter invalid OTP code
   - Submit OTP
   - Check error message
3. **Expected:**
   - Invalid OTP shows error message
   - Clear error message
   - Option to retry
4. **Verification:**
   - Error message displays correctly

#### Test Case EDGE-7: Campaign Creation Validation
1. **Setup:** Logged in as `prod-business1@bypass.com`, creating campaign
2. **Steps:**
   - Attempt to create campaign with missing fields
   - Submit incomplete form
   - Check validation errors
3. **Expected:**
   - Campaign creation with missing fields shows validation errors
   - Clear error messages
   - Fields highlighted
4. **Verification:**
   - Validation errors display correctly

#### Test Case EDGE-8: Application to Closed Campaign
1. **Setup:** Logged in as `prod-creator1@bypass.com`, campaign is closed
2. **Steps:**
   - Attempt to apply to closed campaign
   - Check error message
3. **Expected:**
   - Application to closed campaign shows error
   - Clear error message
   - Application blocked
4. **Verification:**
   - Error handling works correctly

#### Test Case EDGE-9: Upload Failure
1. **Setup:** Logged in as `prod-creator1@bypass.com`, submitting deliverable
2. **Steps:**
   - Attempt upload
   - Simulate upload failure
   - Check error handling
3. **Expected:**
   - Upload failure shows retry option
   - Clear error message
   - Can retry upload
4. **Verification:**
   - Error handling works correctly
   - Retry functionality works

### Data Validation

#### Test Case EDGE-10: Duplicate Application Prevention
1. **Setup:** Logged in as `prod-creator1@bypass.com`, already applied to campaign
2. **Steps:**
   - Attempt to apply to same campaign again
   - Check error handling
3. **Expected:**
   - Cannot apply to same campaign twice
   - Error message or disabled button
   - No duplicate application created
4. **Verification SQL:**
   ```sql
   SELECT COUNT(*) as application_count
   FROM campaign_applications ca
   JOIN creator_profiles cp ON ca.creator_id = cp.id
   JOIN users u ON cp.user_id = u.id
   WHERE u.email = 'prod-creator1@bypass.com'
   AND ca.campaign_id = '[campaign_id]';
   -- Should be 1, not 2
   ```

#### Test Case EDGE-11: Deliverable Count Validation
1. **Setup:** Logged in as `prod-creator1@bypass.com`, submitting deliverables
2. **Steps:**
   - Attempt to submit more deliverables than required
   - Check validation
3. **Expected:**
   - Cannot submit more deliverables than required
   - Validation error shown
   - Submission blocked
4. **Verification:**
   - Validation works correctly

#### Test Case EDGE-12: Budget Validation
1. **Setup:** Logged in as `prod-business1@bypass.com`, creating campaign
2. **Steps:**
   - Attempt to set negative budget
   - Attempt to set zero budget
   - Check validation
3. **Expected:**
   - Cannot set negative budget
   - Cannot set zero budget (if required)
   - Validation errors shown
4. **Verification:**
   - Validation works correctly

#### Test Case EDGE-13: Date Validation
1. **Setup:** Logged in as `prod-business1@bypass.com`, creating campaign
2. **Steps:**
   - Attempt to set past deadline
   - Attempt to set end date before start date
   - Check validation
3. **Expected:**
   - Cannot set past deadline
   - Cannot set end date before start date
   - Validation errors shown
4. **Verification:**
   - Validation works correctly

---

## Cross-Platform Testing

### iOS Specific

#### Test Case PLAT-1: iOS Simulator Testing
1. **Setup:** iOS simulator running
2. **Steps:**
   - Test all flows on iOS simulator
   - Check UI rendering
   - Test interactions
3. **Expected:**
   - All flows work on iOS simulator
   - UI renders correctly
   - Interactions work properly
4. **Verification:**
   - All test cases pass on iOS simulator

#### Test Case PLAT-2: iOS Physical Device Testing
1. **Setup:** Physical iOS device
2. **Steps:**
   - Test all flows on physical device
   - Test image picker
   - Test push notifications (if applicable)
3. **Expected:**
   - All flows work on physical iOS device
   - Image picker works correctly
   - Push notifications work (if applicable)
4. **Verification:**
   - All test cases pass on physical device

### Android Specific

#### Test Case PLAT-3: Android Emulator Testing
1. **Setup:** Android emulator running
2. **Steps:**
   - Test all flows on Android emulator
   - Check UI rendering
   - Test back button behavior
3. **Expected:**
   - All flows work on Android emulator
   - UI renders correctly
   - Back button behavior correct
4. **Verification:**
   - All test cases pass on Android emulator

#### Test Case PLAT-4: Android Physical Device Testing
1. **Setup:** Physical Android device
2. **Steps:**
   - Test all flows on physical device
   - Test image picker
   - Test back button behavior
3. **Expected:**
   - All flows work on physical Android device
   - Image picker works correctly
   - Back button behavior correct
4. **Verification:**
   - All test cases pass on physical device

---

## Performance Testing

### Response Times

#### Test Case PERF-1: Browse Creators Load Time
1. **Setup:** Logged in as `prod-business1@bypass.com`
2. **Steps:**
   - Navigate to Browse Creators
   - Measure load time
   - Check performance
3. **Expected:**
   - Browse Creators loads in < 2 seconds
   - Smooth scrolling
   - No lag
4. **Verification:**
   - Load time measured
   - Performance acceptable

#### Test Case PERF-2: Campaign List Load Time
1. **Setup:** Logged in as `prod-creator1@bypass.com`
2. **Steps:**
   - Navigate to Explore Campaigns
   - Measure load time
   - Check performance
3. **Expected:**
   - Campaign list loads in < 2 seconds
   - Smooth scrolling
   - No lag
4. **Verification:**
   - Load time measured
   - Performance acceptable

#### Test Case PERF-3: Profile Load Time
1. **Setup:** Logged in as `prod-creator1@bypass.com`
2. **Steps:**
   - Navigate to profile
   - Measure load time
   - Check performance
3. **Expected:**
   - Profile loads in < 1 second
   - Smooth rendering
   - No lag
4. **Verification:**
   - Load time measured
   - Performance acceptable

#### Test Case PERF-4: Image Upload Performance
1. **Setup:** Logged in as `prod-creator1@bypass.com`, submitting deliverable
2. **Steps:**
   - Upload image
   - Measure upload time
   - Check progress indicator
3. **Expected:**
   - Image uploads complete in < 10 seconds
   - Progress indicator shows progress
   - Upload completes successfully
4. **Verification:**
   - Upload time measured
   - Performance acceptable

### Pagination

#### Test Case PERF-5: Browse Creators Pagination
1. **Setup:** Logged in as `prod-business1@bypass.com`
2. **Steps:**
   - Scroll through creator list
   - Check pagination loading
   - Verify no duplicates
3. **Expected:**
   - Browse Creators loads more on scroll
   - Pagination works smoothly
   - No duplicate items on pagination
4. **Verification:**
   - Pagination works correctly
   - No duplicates found

#### Test Case PERF-6: Campaign List Pagination
1. **Setup:** Logged in as `prod-creator1@bypass.com`
2. **Steps:**
   - Scroll through campaign list
   - Check pagination loading
   - Verify no duplicates
3. **Expected:**
   - Campaign list loads more on scroll
   - Pagination works smoothly
   - No duplicate items on pagination
4. **Verification:**
   - Pagination works correctly
   - No duplicates found

---

## Sign-Off

### Tester Information

| Field | Value |
|-------|-------|
| Tester Name | |
| Test Date | |
| App Version | |
| Environment | Production |

### Summary

| Category | Pass | Fail | N/A |
|----------|------|------|-----|
| Test User Isolation | | | |
| Consumer Flow | | | |
| Creator Flow | | | |
| Business Flow | | | |
| Campaign Application | | | |
| Deliverable Submission | | | |
| Edge Cases | | | |
| Cross-Platform | | | |
| Performance | | | |

### Critical Issues Found

| Issue | Severity | Blocker? |
|-------|----------|----------|
| | | |
| | | |

### Sign-Off Checklist

- [ ] All critical paths tested
- [ ] No P0 blockers identified
- [ ] Test user isolation verified
- [ ] Ready for production release

**Signed:** ___________________ **Date:** ___________________

---

## Appendix: Quick Reference

### Test Account Login

1. Open app
2. Enter email: `prod-xxx@bypass.com`
3. Tap "Continue"
4. Enter OTP: `000000`
5. You're logged in!

### Verify Isolation (Quick Check)

```sql
-- Run in Supabase SQL Editor
SELECT
  (SELECT COUNT(*) FROM users WHERE is_test_account = true) as test_users,
  (SELECT COUNT(*) FROM campaigns WHERE is_test_campaign = true) as test_campaigns,
  (SELECT COUNT(*) FROM restaurants WHERE is_test_restaurant = true) as test_restaurants;
```

### Emergency Rollback

If critical issues found, see:
- `docs/CREATOR_MARKETPLACE_PRODUCTION_DEPLOYMENT.md#6-rollback-procedures`
