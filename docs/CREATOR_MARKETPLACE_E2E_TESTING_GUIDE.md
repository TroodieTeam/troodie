# Creator Marketplace End-to-End Testing Guide

**Date:** January 22, 2025  
**Purpose:** Comprehensive testing guide for the Creator Marketplace feature set  
**Status:** Implementation in Progress

---

## Table of Contents

1. [Overview](#overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Test Accounts](#test-accounts)
4. [Feature Testing](#feature-testing)
   - [CM-1: Creator Profile Race Condition Fix](#cm-1-creator-profile-race-condition-fix)
   - [CM-2: Portfolio Image Upload](#cm-2-portfolio-image-upload)
   - [CM-3: Campaign Application creator_id](#cm-3-campaign-application-creator_id)
   - [CM-4: Deliverable URL Validation](#cm-4-deliverable-url-validation)
   - [CM-5: Auto-Approval Cron Job](#cm-5-auto-approval-cron-job)
   - [CM-7: Campaign Creation Validation](#cm-7-campaign-creation-validation)
5. [End-to-End User Flows](#end-to-end-user-flows)
6. [Regression Testing](#regression-testing)
7. [Performance Testing](#performance-testing)
8. [Known Issues & Limitations](#known-issues--limitations)

---

## Overview

This guide covers testing for the Creator Marketplace feature set, including:
- ✅ Creator onboarding with atomic upgrades
- ✅ Portfolio image uploads to cloud storage
- ✅ Campaign applications with proper creator_id lookup
- ✅ Flexible deliverable URL validation
- ✅ Auto-approval cron job scheduling
- ✅ Campaign creation validation
- ✅ Restaurant analytics dashboard (CM-6)
- ✅ Restaurant editable details (CM-8)
- ✅ Creator profiles & discovery (CM-9)

**⚠️ Beta Access Required:** All creator and business features require the beta passcode `TROODIE2025` during onboarding.

---

## Test Environment Setup

### Prerequisites

1. **Database Migrations**
   ```bash
   # Run all migrations including:
   - 20251201_atomic_creator_upgrade.sql
   - 20251201_portfolio_storage_bucket.sql
   - 20250122_schedule_auto_approval_cron.sql
   - 20250122_restaurant_analytics.sql
   - 20250122_restaurant_editable_fields.sql
   - 20250122_creator_profiles_discovery.sql
   ```

2. **Storage Buckets**
   - Verify `creator-portfolios` bucket exists
   - Check RLS policies are configured
   - Test upload permissions

3. **Environment Variables**
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ```

4. **Beta Passcode**
   - **Passcode:** `TROODIE2025` (all uppercase)
   - Required for creator onboarding and restaurant claiming
   - Entered automatically when typing in beta gate

5. **Test Data Setup**
   - **Robust Setup (Recommended):** Run `data/test-data/dev/setup-robust-test-scenario.sql` in Supabase SQL Editor
     - Creates **20 test accounts**:
       - **10 Consumers:** test-consumer1 through test-consumer10@troodieapp.com
       - **7 Creators:** test-creator1 through test-creator7@troodieapp.com
       - **3 Businesses:** test-business1, test-business2, test-business3@troodieapp.com
     - All accounts use OTP: `000000` for authentication
     - Includes realistic, interconnected data:
       - Creator profiles with portfolios (images/videos)
       - ~50+ posts with engagement (likes, comments, saves)
       - Restaurant saves for analytics
       - User follows (social graph)
       - Campaigns, applications, deliverables
     - **Business Activity Levels:**
       - **test-business1:** New user (just claimed restaurant, 0 campaigns)
       - **test-business2:** Medium activity (3 campaigns, ~8 applications, ~5 deliverables)
       - **test-business3:** High activity (10 campaigns, ~25 applications, ~15 deliverables)
   - **Simple Setup:** Run `data/test-data/dev/setup-test-scenario.sql` for minimal test data (3 users)
   - **Test Data Reference:** See `data/test-data/dev/` for JSON files containing test data IDs, relationships, and SQL queries
   - **Helper Script:** Use `node scripts/test-data-helper.js <type>` to view test data info

---

## Test Data Reference

For realistic testing scenarios, reference data IDs are stored in `data/test-data/dev/`:

- **`users.json`** - Test account IDs and metadata
- **`restaurants.json`** - Restaurant IDs with claim status and usage notes
- **`creator_profiles.json`** - Creator profile IDs and expected state
- **`campaigns.json`** - Campaign IDs for testing
- **`campaign_applications.json`** - Application IDs
- **`deliverables.json`** - Deliverable IDs for auto-approval testing
- **`posts.json`** - Post IDs for analytics/discovery testing

Each file includes:
- Entity IDs (or queries to find them)
- Purpose and usage notes
- SQL queries to locate entities
- Relationships and dependencies
- Test scenario requirements

**Example Usage:**
```sql
-- Find creator profile ID from test data reference
SELECT cp.id, cp.user_id, u.email 
FROM creator_profiles cp 
JOIN users u ON cp.user_id = u.id 
WHERE u.email = 'test-creator1@troodieapp.com';
```

See `data/test-data/dev/README.md` for detailed usage instructions.

---

## Test Accounts

### Consumer Accounts
- **Emails:** `test-consumer1@troodieapp.com` through `test-consumer10@troodieapp.com`
- **Password:** OTP: `000000` (all accounts)
- **Account Type:** Consumer
- **Purpose:** Test consumer features, consumer → creator upgrade flow, general app features

### Creator Accounts
- **Emails:** `test-creator1@troodieapp.com` through `test-creator7@troodieapp.com`
- **Password:** OTP: `000000` (all accounts)
- **Account Type:** Creator
- **Purpose:** Test creator features, campaign applications, deliverable submissions, portfolio uploads (images/videos), creator profile editing, creator discovery

### Business Accounts
- **test-business1@troodieapp.com** (NEW): Just claimed restaurant, no campaigns yet
- **test-business2@troodieapp.com** (MEDIUM): 3 campaigns, ~8 applications, ~5 deliverables
- **test-business3@troodieapp.com** (HIGH): 10 campaigns, ~25 applications, ~15 deliverables
- **Password:** OTP: `000000` (all accounts)
- **Account Type:** Business
- **Purpose:** Test campaign creation, deliverable review, restaurant management, restaurant analytics, restaurant editable details, creator discovery/browsing

## Test Restaurants

Two restaurants are available for testing restaurant claim flow and restaurant owner features:

### Unclaimed Restaurants (For Claim Testing)
- **Purpose:** Test restaurant claiming flow
- **Status:** Unclaimed (5 restaurants available for testing claim process)
- **Usage:** 
  - Sign in as `test-business1@troodieapp.com` (or any business account)
  - Navigate to More tab → "Claim Your Restaurant"
  - **Enter beta passcode: `TROODIE2025`**
  - Search for and select an unclaimed restaurant
  - Complete claim verification process
  - Test restaurant analytics after claiming (CM-6)
  - Test restaurant editable details after claiming (CM-8)

### Claimed Restaurants (For Restaurant Features)
- **Restaurant 1:** Claimed by `test-business1@troodieapp.com` (NEW - no campaigns)
- **Restaurant 2:** Claimed by `test-business2@troodieapp.com` (MEDIUM activity)
- **Restaurant 3:** Claimed by `test-business3@troodieapp.com` (HIGH activity)
- **Usage:**
  - Sign in as the corresponding business account
  - Navigate to restaurant profile
  - Test analytics dashboard (CM-6):
    - View saves, mentions, creator posts
    - Check trending badge
    - View daily saves chart
    - Review top savers
    - Export analytics
  - Test editable details (CM-8):
    - Edit description, About Us
    - Update parking info
    - Add special deals
    - Set hours of operation
  - Test campaign creation (CM-7)
  - Test creator browsing (CM-9)

**To find restaurant IDs in Supabase:**
```sql
-- List all restaurants with their claim status
SELECT 
  r.id, 
  r.name, 
  r.city, 
  r.state,
  CASE WHEN bp.id IS NOT NULL THEN 'Claimed' ELSE 'Unclaimed' END as status,
  u.email as claimed_by
FROM restaurants r
LEFT JOIN business_profiles bp ON bp.restaurant_id = r.id
LEFT JOIN users u ON bp.user_id = u.id
ORDER BY r.name;

-- Find restaurants claimed by test business accounts
SELECT r.id, r.name, r.city, r.state, bp.verified, u.email as claimed_by
FROM restaurants r
JOIN business_profiles bp ON bp.restaurant_id = r.id
JOIN users u ON bp.user_id = u.id
WHERE u.email LIKE 'test-business%@troodieapp.com';
```

**Note:** For realistic analytics testing, the setup script creates:
- Restaurant saves from various test users (5-25 saves per restaurant)
- Multiple posts mentioning each restaurant
- Creator posts (from test-creator1 through test-creator7)
- Posts with likes/comments for engagement metrics
- User follows creating a realistic social graph

---

## Feature Testing

### CM-1: Creator Profile Race Condition Fix

**Status:** ✅ Implemented  
**Testing Confirmed:** ✅ Tested

**⚠️ Important:** Before testing CM-1, run the reset script to ensure the test account is in consumer state:
```sql
-- Run this script in Supabase SQL Editor:
-- scripts/reset-creator-status.sql
-- This resets test-consumer2@bypass.com back to consumer status
```

#### Test Case 1.1: Successful Atomic Upgrade
1. **Setup:** Consumer account with no creator profile
   - **Test Account:** `test-consumer2@bypass.com` (OTP: `000000`)
   - **⚠️ Reset First:** Run `scripts/reset-creator-status.sql` before testing
2. **Steps:**
   - Navigate to More tab → "Become a Creator"
   - **Enter beta passcode: `TROODIE2025`**
   - Complete onboarding form (bio, location, specialties)
   - Upload 3-5 portfolio images and/or videos
   - Submit onboarding
3. **Expected:**
   - Account upgraded to `creator` type
   - `creator_profiles` record created
   - Portfolio items saved
   - No orphaned state (account_type='creator' without profile)
   - User navigated to More tab after successful completion
4. **Verification SQL:**
   ```sql
   SELECT u.id, u.account_type, u.is_creator, cp.id as profile_id
   FROM users u
   LEFT JOIN creator_profiles cp ON cp.user_id = u.id
   WHERE u.email = 'test-consumer2@bypass.com';
   -- Should show: account_type='creator', is_creator=true, profile_id NOT NULL
   ```

#### Test Case 1.2: Rollback on Profile Creation Failure
1. **Setup:** Simulate profile creation failure (temporarily break RLS policy)
   - **Test Account:** `test-consumer2@bypass.com` (OTP: `000000`)
   - **⚠️ Reset First:** Run `scripts/reset-creator-status.sql` before testing
2. **Steps:**
   - Attempt creator onboarding
   - Profile creation should fail (or portfolio upload fails)
3. **Expected:**
   - Account remains `consumer` type
   - No partial `creator_profiles` record
   - Error message shown with retry option
   - User stays on onboarding screen (not navigated away)
4. **Verification:**
   - Check user account_type is still 'consumer'
   - Verify no creator_profiles record exists

---

### CM-2: Portfolio Image Upload

**Status:** ✅ Implemented  
**Testing Confirmed:** ✅ Tested

#### Test Case 2.1: Successful Image Upload
1. **Setup:** Creator onboarding flow
   - **Test Account:** `test-consumer3@troodieapp.com` (OTP: `000000`) - Consumer upgrading to creator
2. **Steps:**
   - Select 3-5 images from device
   - Complete onboarding
   - Observe upload progress indicators
3. **Expected:**
   - Images compressed before upload
   - Upload progress shown for each image
   - Images saved to `creator-portfolios` bucket
   - Portfolio items contain cloud URLs (not local URIs)
   - Images viewable on any device
4. **Verification:**
   ```sql
   SELECT image_url, media_type FROM creator_portfolio_items
   WHERE creator_profile_id = (SELECT id FROM creator_profiles WHERE user_id = '...');
   -- URLs should be: https://[project].supabase.co/storage/v1/object/public/creator-portfolios/...
   -- media_type should be 'image'
   ```

#### Test Case 2.4: Successful Video Upload
1. **Setup:** Creator onboarding flow
   - **Test Account:** `test-consumer4@troodieapp.com` (OTP: `000000`) - Consumer upgrading to creator
2. **Steps:**
   - Select videos from device (can mix with images)
   - Complete onboarding
   - Observe upload progress indicators
3. **Expected:**
   - Videos uploaded to `creator-portfolios` bucket
   - Thumbnails generated for videos
   - Portfolio items contain video_url and thumbnail_url
   - Media type set to 'video'
   - Videos viewable on any device
4. **Verification:**
   ```sql
   SELECT video_url, thumbnail_url, media_type FROM creator_portfolio_items
   WHERE creator_profile_id = (SELECT id FROM creator_profiles WHERE user_id = '...')
   AND media_type = 'video';
   -- Should have video_url and thumbnail_url populated
   ```

#### Test Case 2.5: Mixed Image and Video Upload
1. **Setup:** Creator onboarding flow
   - **Test Account:** `test-consumer5@troodieapp.com` (OTP: `000000`) - Consumer upgrading to creator
2. **Steps:**
   - Select mix of images and videos (e.g., 2 images, 2 videos)
   - Complete onboarding
3. **Expected:**
   - Both images and videos upload successfully
   - Media type correctly set for each item
   - All items display in portfolio

#### Test Case 2.2: Upload Failure Handling
1. **Setup:** Simulate network failure during upload
   - **Test Account:** `test-consumer6@troodieapp.com` (OTP: `000000`) - Consumer upgrading to creator
2. **Steps:**
   - Start onboarding with images
   - Disconnect network mid-upload
3. **Expected:**
   - Failed uploads show error state
   - Retry option available
   - Successful uploads preserved
   - Can retry only failed images

#### Test Case 2.3: Large Image Compression
1. **Setup:** Select image > 2MB
   - **Test Account:** `test-consumer7@troodieapp.com` (OTP: `000000`) - Consumer upgrading to creator
2. **Steps:**
   - Upload large image
3. **Expected:**
   - Image compressed to < 1MB
   - Quality remains acceptable
   - Upload completes successfully

---

### CM-3: Campaign Application creator_id

**Status:** ✅ Implemented  
**Testing Confirmed:** ✅ Tested

**⚠️ Important:** Before testing CM-3, run the reset script to remove existing applications:
```sql
-- Run this script in Supabase SQL Editor:
-- scripts/reset-campaign-application.sql
-- This removes applications for the test account to allow re-testing
```

#### Test Case 3.1: Successful Application Submission
1. **Setup:** Creator account with complete profile
   - **Test Account:** `test-creator1@bypass.com` (OTP: `000000`) - Has complete profile with portfolio
   - **⚠️ Reset First:** Run `scripts/reset-campaign-application.sql` before testing
   - **Campaign:** Use any active campaign from `test-business2@troodieapp.com` or `test-business3@troodieapp.com`
2. **Steps:**
   - Navigate to available campaigns (Discover Campaigns)
   - Click on a campaign to view details
   - Click "Apply Now" button
   - Fill in the application form:
     - **Proposed rate** (e.g., $100)
     - **Cover letter** (explain why you're a good fit)
     - **Proposed deliverables** (describe what content you'll create)
   - Submit application
3. **Expected:**
   - Application form modal appears when clicking "Apply Now"
   - All three fields are required (form validation)
   - Application saved with correct `creator_profiles.id` (not `users.id`)
   - All fields saved: `proposed_rate_cents`, `cover_letter`, `proposed_deliverables`
   - Success confirmation shown
   - Application visible in "My Campaigns" → "Pending" tab
   - "Applied" badge shows on campaign card in Discover Campaigns
4. **Verification SQL:**
   ```sql
   SELECT 
     ca.id, 
     ca.creator_id, 
     cp.id as profile_id, 
     cp.user_id,
     u.email,
     ca.status,
     ca.proposed_rate_cents,
     ca.cover_letter,
     ca.proposed_deliverables,
     c.title as campaign_title
   FROM campaign_applications ca
   JOIN creator_profiles cp ON ca.creator_id = cp.id
   JOIN users u ON cp.user_id = u.id
   LEFT JOIN campaigns c ON ca.campaign_id = c.id
   WHERE u.email = 'test-creator1@bypass.com'
   ORDER BY ca.applied_at DESC;
   -- creator_id should equal profile_id, not user_id
   ```

#### Test Case 3.2: Missing Creator Profile
1. **Setup:** User with `is_creator=true` but no `creator_profiles` record
   - **Test Account:** `test-consumer8@troodieapp.com` (OTP: `000000`) - Requires manual setup: set `is_creator=true` but delete `creator_profiles` record
   - **Note:** This is an edge case that requires manual database manipulation
2. **Steps:**
   - Attempt to apply to campaign
3. **Expected:**
   - Error: "Please complete your creator profile first"
   - Redirect to profile setup

#### Test Case 3.3: Duplicate Application Prevention
1. **Setup:** Creator with existing application to campaign
   - **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)
   - **Campaign:** Apply to a campaign, then try to apply again to the same campaign
2. **Steps:**
   - Apply to a campaign (see Test Case 3.1)
   - Navigate back to Discover Campaigns
   - Try to apply to the same campaign again
3. **Expected:**
   - "Apply Now" button shows "Already Applied" (disabled state)
   - Error alert: "You have already applied to this campaign" if somehow triggered
   - No duplicate application created

#### Diagnostic Query: Understanding Campaign Visibility
If you have no campaigns showing in "My Campaigns", run this diagnostic query to understand why:
```sql
-- Run scripts/diagnose-creator-campaigns.sql in Supabase SQL Editor
-- This will check:
-- 1. If user has creator profile
-- 2. All applications and their statuses
-- 3. Available active campaigns
-- 4. Which campaigns the creator has/hasn't applied to
```

**Understanding Tab Visibility:**
- **Pending Tab**: Shows applications with `status = 'pending'` (waiting for business approval)
- **Active Tab**: Shows applications with `status = 'accepted'` (requires business to accept application)
- **Completed Tab**: Currently shows `status = 'accepted'` (same as Active)

**⚠️ Important Notes:**
- If you have pending applications, they will appear in the **"Pending" tab**, not "Active"
- Switch to the "Pending" tab to see your submitted applications
- The "Active" tab only shows campaigns where your application was accepted by the business
- Duplicate applications: If you see duplicate pending applications to the same campaign, run the cleanup script below

**To Test Active Tab:**
If you have pending applications but want to test the Active tab, you can manually accept an application:
```sql
-- Run scripts/accept-campaign-application.sql
-- This accepts a pending application so it appears in the "Active" tab
```

**Check All Application Statuses:**
```sql
-- Run scripts/check-all-application-statuses.sql
-- Shows breakdown of all applications and which tabs they appear in
```

**Cleanup Duplicate Applications:**
If you have duplicate pending applications to the same campaign:
```sql
-- Run scripts/cleanup-duplicate-applications.sql
-- Removes duplicate applications, keeping only the most recent one per campaign
```

---

### CM-4: Deliverable URL Validation

**Status:** ✅ Implemented  
**Testing Confirmed:** ✅ Tested

**Note:** When deliverables are under review (`pending_review` status), clicking on the campaign card will show an alert preventing re-submission until the current deliverables are reviewed.

#### Setup for CM-4 Testing

Before testing CM-4, run the SQL script to create campaigns and assign them to `test-creator1@bypass.com`:

```sql
-- Run this script to set up test campaigns for CM-4
-- File: scripts/setup-cm4-deliverable-validation.sql

-- This script will:
-- 1. Create 3 active campaigns owned by test-business1@bypass.com
-- 2. Create and accept campaign applications from test-creator1@bypass.com
-- 3. Set up campaigns for Instagram, TikTok, and YouTube URL validation testing
```

**Quick Setup:**
```bash
# Execute the SQL script in your Supabase SQL editor or via psql
psql -h your-db-host -U postgres -d your-database -f scripts/setup-cm4-deliverable-validation.sql
```

**What gets created:**
- 3 active campaigns with different deliverable types
- Accepted applications for `test-creator1@bypass.com` for all 3 campaigns
- Campaigns will appear in the "Active" tab when logged in as `test-creator1@bypass.com`

**Reset script (if needed):**
To clean up and reset the test data:
```sql
-- Delete test campaigns and applications created for CM-4
DELETE FROM campaign_applications WHERE creator_id IN (
  SELECT id FROM creator_profiles WHERE user_id IN (
    SELECT id FROM users WHERE email = 'test-creator1@bypass.com'
  )
);
DELETE FROM campaigns WHERE title LIKE '%CM-4 Test%';
```

#### Test Case 4.1: Instagram URL Patterns
1. **Setup:** Creator with accepted campaign application
   - **Test Account:** `test-creator1@bypass.com` (OTP: `000000`) - Has accepted applications after running setup script
   - **Campaign:** Use any of the 3 campaigns created by the setup script where `test-creator1` has an accepted application

Test URLs:
- ✅ `https://www.instagram.com/p/ABC123/` (Post)
- ✅ `https://www.instagram.com/reel/ABC123/` (Reel)
- ✅ `https://www.instagram.com/reel/ABC123/?igsh=xyz` (Reel with params)
- ✅ `https://www.instagram.com/tv/ABC123/` (IGTV)
- ✅ `https://www.instagram.com/stories/user/ABC123/` (Story)

**Steps:**
1. Navigate to deliverable submission
2. Paste each URL
3. Verify validation passes
4. Check platform detected as "instagram"

#### Test Case 4.2: TikTok URL Patterns
1. **Setup:** Same as Test Case 4.1
   - **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

Test URLs:
- ✅ `https://www.tiktok.com/@user/video/1234567890`
- ✅ `https://vm.tiktok.com/ABC123/` (Shortened)
- ✅ `https://tiktok.com/t/ABC123/`

**Expected:** All validate as "tiktok"

#### Test Case 4.3: YouTube URL Patterns
1. **Setup:** Same as Test Case 4.1
   - **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

Test URLs:
- ✅ `https://youtube.com/watch?v=ABC123`
- ✅ `https://youtube.com/shorts/ABC123` (Shorts)
- ✅ `https://youtu.be/ABC123` (Shortened)
- ✅ `https://youtube.com/live/ABC123` (Live)

**Expected:** All validate as "youtube"

#### Test Case 4.4: New Platforms
1. **Setup:** Same as Test Case 4.1
   - **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

Test URLs:
- ✅ `https://www.threads.net/@user/post/ABC123` (Threads)
- ✅ `https://linkedin.com/posts/user_ABC123` (LinkedIn)

**Expected:** Validation passes with platform detection

#### Test Case 4.5: Unknown URLs with Warning
1. **Setup:** Same as Test Case 4.1
   - **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

Test URLs:
- `https://example.com/post/123` (Unknown platform)
- `https://instagram.com/unknown-format/123` (Known domain, unknown format)

**Expected:**
- Validation passes (doesn't block)
- Warning shown: "Platform not auto-detected. Please verify the link works."
- User can still submit

#### Test Case 4.6: Invalid URLs
1. **Setup:** Same as Test Case 4.1
   - **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

Test URLs:
- `not-a-url` (Invalid format)
- `http://instagram.com/p/ABC` (Non-HTTPS)

**Expected:**
- Validation fails
- Clear error message shown
- Submission blocked

---

### CM-5: Auto-Approval Cron Job

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

#### Test Case 5.1: Cron Job Scheduled
1. **Setup:** No specific test account needed (database verification)
2. **Verification:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'auto-approve-deliverables';
   ```
2. **Expected:**
   - Job exists
   - Schedule: `0 * * * *` (every hour)
   - Active status

#### Test Case 5.2: Manual Trigger Test
1. **Setup:** No specific test account needed (database function test)
2. **Steps:**
   ```sql
   SELECT trigger_auto_approval_manually();
   ```
2. **Expected:**
   - Returns JSON with `approved_count`
   - Log entry in `cron_job_logs`
   - Deliverables >72 hours old auto-approved

#### Test Case 5.3: Auto-Approval Execution
1. **Setup:**
   - **Test Account:** `test-creator1@troodieapp.com` (OTP: `000000`) - Has deliverables
   - **Deliverable:** Use existing deliverable from `test-creator1` or create new one
   - Update deliverable: `submitted_at` = 73 hours ago, `status` = `pending_review`
2. **Steps:**
   - Wait for cron job to run (or trigger manually)
3. **Expected:**
   - Deliverable status → `auto_approved`
   - `auto_approved_at` timestamp set
   - `payment_status` → `processing`
   - Notification sent to creator
4. **Verification:**
   ```sql
   SELECT id, status, auto_approved_at, payment_status
   FROM campaign_deliverables
   WHERE id = '...';
   ```

#### Test Case 5.4: Recently Submitted Not Affected
1. **Setup:** Deliverable submitted 48 hours ago
   - **Test Account:** `test-creator2@troodieapp.com` (OTP: `000000`) - Has deliverables
   - **Deliverable:** Use existing deliverable or create new one with `submitted_at` = 48 hours ago, `status` = `pending_review`
2. **Steps:** Run auto-approval
3. **Expected:**
   - Status remains `pending_review`
   - Not auto-approved

#### Test Case 5.5: Already Reviewed Not Affected
1. **Setup:** Deliverable approved manually 80 hours ago
   - **Test Account:** `test-creator3@troodieapp.com` (OTP: `000000`) - Has approved deliverables
   - **Deliverable:** Use existing approved deliverable or update one to `status` = `approved`, `submitted_at` = 80 hours ago
2. **Steps:** Run auto-approval
3. **Expected:**
   - Status remains `approved`
   - Not changed to `auto_approved`

#### Test Case 5.6: Monitoring View
1. **Setup:** No specific test account needed (database view check)
2. **Query:**
   ```sql
   SELECT * FROM auto_approval_status;
   ```
2. **Expected:**
   - Shows daily statistics
   - Overdue count accurate
   - Auto-approved count accurate

---

### CM-7: Campaign Creation Validation

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

#### Test Case 7.1: Successful Campaign Creation
1. **Setup:** Business account with verified restaurant
   - **Test Account:** `test-business1@bypass.com` (OTP: `000000`) - NEW user, has claimed restaurant, no campaigns yet
   - **Restaurant:** Restaurant claimed by `test-business1` (Penguin Drive In)
   - **Pre-requisite:** Restaurant must have `verification_status = 'verified'` in `business_profiles`

2. **Step-by-Step Test:**
   - **Navigate:** Go to Business tab → "Campaigns" → Tap "+" or "Create Campaign" button
   - **Verify Loading:**
     - Loading state appears briefly
     - Restaurant name displays in header (e.g., "Penguin Drive In")
     - Form loads without errors
     - Step indicator shows "1 of 4" at top

   - **Step 1: Campaign Basics**
     - **Title:** Enter "Summer Menu Launch 2025"
     - **Description:** Enter "Promote our new summer menu featuring fresh ingredients and cocktails. Looking for creators to showcase our dishes."
     - **Add Requirements:** 
       - Tap "Add Requirement"
       - Enter "Visit during dinner service (5 PM - 10 PM)"
       - Tap "Add Requirement" again
       - Enter "Order at least 2 items from new summer menu"
       - Verify both requirements appear as removable chips
     - Tap "Next" button
     - **Expected:** Step 2 loads, step indicator shows "2 of 4"

   - **Step 2: Budget & Timeline**
     - **Budget:** Enter "500" (dollars)
     - **Deadline:** 
       - Tap date picker
       - Select a date 30 days in the future
       - Verify date displays correctly
     - Tap "Next" button
     - **Expected:** Step 3 loads, step indicator shows "3 of 4"

   - **Step 3: Deliverables**
     - Tap "Add Deliverable"
     - **Select Type:** Choose "Instagram Post" from dropdown
     - **Description:** Enter "1 Instagram post with 3+ photos showcasing summer dishes"
     - **Quantity:** Leave as 1 (or adjust if applicable)
     - Tap "Add" button
     - **Add Another:**
       - Tap "Add Deliverable" again
       - Select "Instagram Reel"
       - Enter "1 Instagram reel (30+ seconds) featuring the restaurant atmosphere"
       - Tap "Add"
     - Verify both deliverables appear in list with remove (X) buttons
     - Tap "Next" button
     - **Expected:** Step 4 loads, step indicator shows "4 of 4"

   - **Step 4: Content Details**
     - **Target Audience:** Enter "Food enthusiasts, locals, ages 25-45"
     - **Content Types:** 
       - Tap "Photo Posts" chip (selected)
       - Tap "Video Content" chip (selected)
       - Tap "Reels/Stories" chip (selected)
       - Verify chips highlight when selected
     - **Posting Schedule:** Enter "Within 2 weeks of acceptance"
     - **Brand Guidelines:** Enter "Use #SummerMenu2025, tag @restauranthandle, maintain positive tone"
     - Tap "Create Campaign" button
     - **Expected:** 
       - Loading spinner appears
       - Success alert: "Campaign created successfully!"
       - Alert shows "OK" button
       - After tapping OK, navigates to `/business/campaigns` (Campaigns list)

3. **Verification:**
   - **UI Verification:**
     - ✅ Restaurant name displayed correctly in header throughout
     - ✅ All 4 steps accessible and navigable
     - ✅ Step indicator updates correctly (1→2→3→4)
     - ✅ Validation prevents proceeding with empty required fields
     - ✅ Success alert appears after submission
     - ✅ Redirects to campaigns list after success

   - **Database Verification:**
     ```sql
     SELECT 
       c.id,
       c.title,
       c.description,
       c.restaurant_id,
       c.status,
       c.budget,
       c.deadline,
       c.requirements,
       r.name as restaurant_name,
       u.email as created_by
     FROM campaigns c
     JOIN restaurants r ON c.restaurant_id = r.id
     JOIN business_profiles bp ON bp.restaurant_id = r.id
     JOIN users u ON bp.user_id = u.id
     WHERE u.email = 'test-business1@bypass.com'
       AND c.title = 'Summer Menu Launch 2025'
     ORDER BY c.created_at DESC
     LIMIT 1;
     ```
     - ✅ Campaign record created with correct `restaurant_id`
     - ✅ `title` matches entered value
     - ✅ `description` matches entered value
     - ✅ `requirements` array contains all added requirements
     - ✅ `budget` matches entered amount (500.00)
     - ✅ `deadline` matches selected date
     - ✅ `status` = 'active'
     - ✅ `campaign_data` JSONB contains target_audience, content_type, deliverables, etc.

   - **Campaign List Verification:**
     - Navigate to Business tab → "Campaigns"
     - ✅ New campaign appears in list
     - ✅ Campaign title visible
     - ✅ Status shows as "Active"
     - ✅ Budget/date information displays correctly

#### Test Case 7.2: No Business Profile
1. **Setup:** User without business profile
   - **Test Account:** `test-consumer9@bypass.com` (OTP: `000000`) - Consumer account (no business profile)
2. **Steps:**
   - Navigate to Create Campaign
3. **Expected:**
   - Loading state shown
   - Error screen: "Business Setup Required"
   - Message: "Please complete your business setup to create campaigns"
   - "Complete Setup" button → redirects to setup
   - "Go Back" button available

#### Test Case 7.3: No Restaurant Linked
1. **Setup:** Business profile without restaurant
   - **Test Account:** `test-consumer10@bypass.com` (OTP: `000000`) - Requires manual setup: create business_profile without restaurant_id
   - **Note:** This is an edge case that requires manual database manipulation
2. **Steps:**
   - Navigate to Create Campaign
3. **Expected:**
   - Error screen: "No Restaurant Linked"
   - Message: "Please claim a restaurant before creating campaigns"
   - "Claim Restaurant" button → redirects to claim flow
   - "Go Back" button available

#### Test Case 7.4: Unverified Restaurant
1. **Setup:** Business profile with unverified restaurant claim
   - **Test Account:** `test-business1@bypass.com` (OTP: `000000`) - Requires manual setup: set `verification_status` = `'pending'` in business_profiles
2. **Steps:**
   - Navigate to Create Campaign
3. **Expected:**
   - Error screen shown
   - Message: "Your restaurant claim is pending verification"
   - Submit button disabled (form doesn't load)

#### Test Case 7.5: Network Error Handling
1. **Setup:** Simulate network failure
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`) - MEDIUM activity business
2. **Steps:**
   - Navigate to Create Campaign
   - Network fails during restaurant data load
3. **Expected:**
   - Error screen with retry option
   - Clear error message
   - Can retry without leaving screen

#### Test Case 7.6: Submit Button Disabled
1. **Setup:** Campaign form with missing restaurant data
   - **Test Account:** `test-business1@troodieapp.com` (OTP: `000000`) - Can test with restaurant data loading failure
2. **Steps:**
   - Attempt to submit
3. **Expected:**
   - Submit button disabled
   - Cannot submit without valid restaurant

---

### CM-6: Restaurant Analytics Dashboard

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

#### Test Case 6.1: Access Analytics Dashboard
1. **Setup:** Business account with claimed restaurant
   - **Test Account (Owner):** `test-business2@bypass.com` (OTP: `000000`) - MEDIUM activity, has claimed restaurant (Vicente)
   - **Test Account (Non-Owner):** `test-consumer1@troodieapp.com` (OTP: `000000`) - To verify tab is hidden
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Navigate to restaurant profile (`/restaurant/[id]`)
   - Verify "Analytics" tab visible (owners only)
   - Tap Analytics tab
3. **Expected:**
   - Analytics screen loads
   - Shows loading state initially
   - Displays metrics after load
4. **Verification:**
   - Only restaurant owners see Analytics tab
   - Non-owners don't see tab

#### Test Case 6.2: View Real-Time Metrics
1. **Setup:** Restaurant with existing saves and posts
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`) - MEDIUM activity
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente) - Has ~15 saves, multiple posts
2. **Steps:**
   - Open Analytics dashboard
   - Observe metrics displayed
3. **Expected:**
   - Total Saves count accurate
   - Saves This Month displayed
   - Creator Posts count shown
   - Total Engagement (likes) displayed
   - Metrics match database counts
4. **Verification SQL:**
   ```sql
   SELECT * FROM get_restaurant_analytics('restaurant_id_here');
   -- Compare with displayed values
   ```

#### Test Case 6.3: Trending Badge Display
1. **Setup:** Restaurant with >10 saves in last 24 hours
   - **Test Account:** `test-business3@troodieapp.com` (OTP: `000000`) - HIGH activity
   - **Restaurant:** Restaurant claimed by `test-business3` (Fin & Fino) - Has ~25 saves
   - **Note:** May need to update some saves to be within last 24 hours to trigger trending badge
2. **Steps:**
   - Open Analytics dashboard
3. **Expected:**
   - "Trending Now!" badge appears at top
   - Shows saves count for last 24h
   - Badge styled with red/orange colors
4. **Verification:**
   - Badge only shows when `saves_last_24h > 10`
   - Badge hidden when < 10 saves

#### Test Case 6.4: Daily Saves Chart
1. **Setup:** Restaurant with saves over past 30 days
   - **Test Account:** `test-business3@troodieapp.com` (OTP: `000000`) - HIGH activity
   - **Restaurant:** Restaurant claimed by `test-business3` (Fin & Fino) - Has saves distributed over time
2. **Steps:**
   - View Analytics dashboard
   - Scroll to "Saves Over Time" section
3. **Expected:**
   - Chart displays daily save counts
   - Bars show relative heights
   - Dates formatted correctly
   - Chart responsive to screen size
4. **Verification:**
   - Chart data matches `daily_saves` from function
   - Empty state shown if no data

#### Test Case 6.5: Top Savers List
1. **Setup:** Restaurant with multiple users who saved
   - **Test Account:** `test-business3@troodieapp.com` (OTP: `000000`) - HIGH activity
   - **Restaurant:** Restaurant claimed by `test-business3` (Fin & Fino) - Has saves from multiple test users
2. **Steps:**
   - View Analytics dashboard
   - Scroll to "Top Savers" section
3. **Expected:**
   - List shows top 10 savers
   - Creator badge shown for creators
   - Save count displayed
   - Tappable to view user profile
4. **Verification:**
   - List ordered by save count DESC
   - Creator badge only on creators

#### Test Case 6.6: Real-Time Save Updates
1. **Setup:** Analytics dashboard open
   - **Test Account (Owner):** `test-business2@troodieapp.com` (OTP: `000000`) - Viewing analytics
   - **Test Account (Saver):** `test-consumer1@troodieapp.com` (OTP: `000000`) - Will save restaurant
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Log in as `test-business2` and open analytics dashboard
   - Log in as `test-consumer1` in another session/device and save the restaurant
   - Observe dashboard updates
3. **Expected:**
   - Total saves count updates automatically
   - Saves Last 24h increments
   - Trending badge appears if threshold crossed
   - No page refresh needed
4. **Verification:**
   - Real-time subscription working
   - Updates within 1-2 seconds

#### Test Case 6.7: Export Analytics Data
1. **Setup:** Analytics dashboard with data
   - **Test Account:** `test-business3@troodieapp.com` (OTP: `000000`) - HIGH activity, has most data
   - **Restaurant:** Restaurant claimed by `test-business3` (Fin & Fino)
2. **Steps:**
   - Tap "Export Data" button (download icon)
   - Share dialog appears
3. **Expected:**
   - CSV data generated
   - Share options available
   - Data includes all metrics
   - Date ranges included
4. **Verification:**
   - CSV format correct
   - All metrics included

#### Test Case 6.8: Pull-to-Refresh
1. **Setup:** Analytics dashboard
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`) - MEDIUM activity
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Pull down to refresh
3. **Expected:**
   - Refresh indicator shows
   - Data reloads
   - Metrics update
   - Loading state shown during refresh

#### Test Case 6.9: Empty State
1. **Setup:** New restaurant with no saves/posts
   - **Test Account:** `test-business1@troodieapp.com` (OTP: `000000`) - NEW user, has claimed restaurant but minimal activity
   - **Restaurant:** Restaurant claimed by `test-business1` (Penguin Drive In) - Has 5 saves (minimal data)
   - **Note:** May need to clear some saves/posts to test true empty state
2. **Steps:**
   - Open Analytics dashboard
3. **Expected:**
   - Metrics show 0 values
   - Chart shows empty state
   - Top Savers shows "No savers yet"
   - No errors displayed

---

### CM-8: Restaurant Editable Details

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

#### Test Case 8.1: Edit Button Visibility
1. **Setup:** Restaurant profile page
   - **Test Account (Owner):** `test-business2@troodieapp.com` (OTP: `000000`) - Owns restaurant
   - **Test Account (Non-Owner):** `test-consumer1@troodieapp.com` (OTP: `000000`) - Does not own restaurant
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Log in as `test-business2` and view owned restaurant
   - Log in as `test-consumer1` and view same restaurant
3. **Expected:**
   - "Edit Details" button visible for owned restaurant
   - Button hidden for non-owned restaurant
   - Button navigates to edit screen

#### Test Case 8.2: Edit Description
1. **Setup:** Restaurant owner viewing own restaurant
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`) - MEDIUM activity
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Tap "Edit Details"
   - Update description field
   - Enter text (max 500 chars)
   - Tap "Save"
3. **Expected:**
   - Description saves successfully
   - Success message shown
   - Returns to restaurant profile
   - Updated description visible immediately
   - Other users see updated description
4. **Verification SQL:**
   ```sql
   SELECT custom_description FROM restaurants WHERE id = '...';
   -- Should match entered text
   ```

#### Test Case 8.3: Description Validation
1. **Setup:** Edit restaurant screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Enter description > 500 characters
   - Attempt to save
3. **Expected:**
   - Character count shows (e.g., "501/500")
   - Error message: "Description must be under 500 characters"
   - Save button disabled
   - Cannot save until under limit

#### Test Case 8.4: Edit About Us
1. **Setup:** Edit restaurant screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Update "About Us" field
   - Enter text (max 1000 chars)
   - Save
3. **Expected:**
   - About Us saves successfully
   - Character count displayed
   - Updates visible immediately

#### Test Case 8.5: Parking Information
1. **Setup:** Edit restaurant screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Select parking type from options
   - Add parking notes (optional)
   - Save
3. **Expected:**
   - Parking type saved
   - Notes saved if provided
   - Displayed on restaurant profile
4. **Verification:**
   - Parking options: Free Lot, Paid Lot, Valet, Street, Validation, None
   - Notes max 200 characters

#### Test Case 8.6: Special Deals Editor
1. **Setup:** Edit restaurant screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Scroll to "Special Deals" section
   - Tap "Add Deal"
   - Enter deal title
   - Enter deal description
   - Toggle "Troodie Exclusive Deal"
   - Save
3. **Expected:**
   - Deal card created
   - Can add multiple deals
   - Can remove deals (X button)
   - Deals saved to database
   - Displayed on restaurant profile
4. **Verification:**
   - Deals stored as JSONB array
   - Title max 100 chars
   - Description max 300 chars

#### Test Case 8.7: Hours Editor
1. **Setup:** Edit restaurant screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Scroll to "Hours of Operation"
   - Toggle days open/closed
   - Set open/close times for open days
   - Save
3. **Expected:**
   - Hours saved per day
   - Closed days marked
   - Time format validated (HH:MM)
   - Hours displayed on profile
4. **Verification:**
   - Hours stored as JSONB
   - Format: `{ "monday": { "open": "09:00", "close": "22:00", "closed": false } }`

#### Test Case 8.8: Unsaved Changes Warning
1. **Setup:** Edit restaurant screen with changes
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Make changes
   - Tap back/X button without saving
3. **Expected:**
   - Alert: "Discard Changes?"
   - Options: "Keep Editing", "Discard"
   - Discard returns to profile
   - Keep Editing stays on edit screen

#### Test Case 8.9: Save Button States
1. **Setup:** Edit restaurant screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Observe save button
   - Make changes
   - Clear all changes
3. **Expected:**
   - Save button disabled when no changes
   - Save button enabled when changes made
   - Save button shows "Saving..." during save
   - Button disabled during save operation

#### Test Case 8.10: Activity Feed Entry
1. **Setup:** Restaurant owner
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente)
2. **Steps:**
   - Update restaurant details
   - Save changes
3. **Expected:**
   - Activity feed entry created
   - Type: `restaurant_updated`
   - Message: "updated restaurant details"
   - Visible to followers
4. **Verification SQL:**
   ```sql
   SELECT * FROM activity_feed
   WHERE entity_type = 'restaurant' AND entity_id = '...'
   ORDER BY created_at DESC LIMIT 1;
   ```

#### Test Case 8.11: Ownership Verification
1. **Setup:** User trying to edit restaurant they don't own
   - **Test Account:** `test-consumer1@troodieapp.com` (OTP: `000000`) - Does not own restaurant
   - **Restaurant:** Restaurant claimed by `test-business2` (Vicente) - Try to access edit URL directly
2. **Steps:**
   - Attempt to access edit screen via direct URL
3. **Expected:**
   - Access denied error
   - Redirected back
   - Cannot edit restaurant

---

### CM-9: Creator Profiles & Discovery

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

#### Test Case 9.1: Creator Discovery Screen Access
1. **Setup:** App navigation
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`) - Business account browsing creators
2. **Steps:**
   - Navigate to Explore tab
   - Look for "Creators" option
   - OR navigate to `/explore/creators`
3. **Expected:**
   - Creators discovery screen loads
   - Shows grid of creator cards
   - Filter button visible
   - Loading state shown initially

#### Test Case 9.2: Creator Card Display
1. **Setup:** Creators discovery screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`) - Business browsing creators
   - **Expected Creators:** Should see `test-creator1` through `test-creator7` in results
2. **Steps:**
   - View creator cards in grid
3. **Expected:**
   - Each card shows:
     - Sample post image
     - Creator avatar
     - Display name
     - Location (if available)
     - Follower count (formatted: 1K, 5K, etc.)
     - Engagement rate (X.X%)
     - "Open to Collabs" badge (if applicable)
4. **Verification:**
   - Cards in 2-column grid
   - Images load correctly
   - Metrics formatted properly

#### Test Case 9.3: Filter by City
1. **Setup:** Creators discovery screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Filter:** City = "Charlotte" (where test-creator1 is located)
2. **Steps:**
   - Tap filter button
   - Enter city name (e.g., "Charlotte")
   - Apply filters
3. **Expected:**
   - Only creators in that city shown
   - Active filter badge appears
   - Filter count updates
   - Results update immediately
4. **Verification SQL:**
   ```sql
   SELECT * FROM get_creators(p_city := 'Charlotte');
   -- Compare with displayed results
   ```

#### Test Case 9.4: Filter by Minimum Followers
1. **Setup:** Creators discovery screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Filter:** Minimum followers = "5K+" (should filter creators)
2. **Steps:**
   - Open filters
   - Select "5K+" followers
   - Apply
3. **Expected:**
   - Only creators with 5000+ followers shown
   - Active filter badge: "👥 5K+"
   - Can remove filter (X button)
4. **Verification:**
   - Filter options: Any, 1K+, 5K+, 10K+, 50K+
   - Filter applied correctly

#### Test Case 9.5: Filter by Engagement Rate
1. **Setup:** Creators discovery screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Filter:** Engagement rate = "5%+" (should filter creators)
2. **Steps:**
   - Open filters
   - Select "5%+" engagement
   - Apply
3. **Expected:**
   - Only creators with 5%+ engagement shown
   - Active filter badge: "📈 5%+"
   - Results filtered correctly
4. **Verification:**
   - Filter options: Any, 2%+, 5%+, 10%+
   - Engagement rate calculated correctly

#### Test Case 9.6: Multiple Filters Combined
1. **Setup:** Creators discovery screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Filters:** City = "Charlotte", Followers = "10K+", Engagement = "5%+"
2. **Steps:**
   - Apply city filter: "Charlotte"
   - Apply follower filter: "10K+"
   - Apply engagement filter: "5%+"
   - Apply all
3. **Expected:**
   - All filters active
   - Results match all criteria
   - Multiple filter badges shown
   - Can remove individual filters

#### Test Case 9.7: Clear All Filters
1. **Setup:** Creators with active filters
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Filters:** Apply multiple filters first, then clear
2. **Steps:**
   - Tap "Reset" in filter sheet
   - OR remove all active filter badges
3. **Expected:**
   - All filters cleared
   - Full creator list shown
   - Filter count resets to 0

#### Test Case 9.8: Creator Profile View
1. **Setup:** Creators discovery screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`) - Business browsing
   - **Creator to View:** `test-creator1@troodieapp.com` - Has complete profile with portfolio
2. **Steps:**
   - Tap `test-creator1` creator card
   - View creator profile
3. **Expected:**
   - Profile screen loads
   - Shows:
     - Large avatar
     - Display name
     - Location
     - "Open to Collabs" badge
     - Follower count
     - Engagement rate
     - Bio (if available)
     - Specialties (if available)
     - Sample posts grid (top 3)
   - Edit button visible if own profile

#### Test Case 9.9: Sample Posts Display
1. **Setup:** Creator profile
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`) - Viewing creator profile
   - **Creator:** `test-creator1@troodieapp.com` - Has multiple posts with likes
2. **Steps:**
   - View "Sample Posts" section
   - Tap a sample post
3. **Expected:**
   - Top 3 posts by likes shown
   - Posts displayed in grid
   - Tappable to view full post
   - Images load correctly
4. **Verification:**
   - Posts ordered by likes_count DESC
   - Only posts with images shown

#### Test Case 9.10: Edit Own Creator Profile
1. **Setup:** Creator viewing own profile
   - **Test Account:** `test-creator1@troodieapp.com` (OTP: `000000`) - Creator viewing own profile
2. **Steps:**
   - Tap "Edit" button
   - Update display name
   - Update bio
   - Update location
   - Add/remove specialties
   - Toggle "Open to Collabs"
   - Save
3. **Expected:**
   - Changes save successfully
   - Profile updates immediately
   - Success message shown
   - Returns to profile view
4. **Verification:**
   - Changes persist in database
   - Visible to other users

#### Test Case 9.11: Specialties Management
1. **Setup:** Edit creator profile
   - **Test Account:** `test-creator1@troodieapp.com` (OTP: `000000`) - Editing own profile
2. **Steps:**
   - Add specialty: "Food Photography"
   - Add specialty: "Restaurant Reviews"
   - Remove a specialty
   - Save
3. **Expected:**
   - Specialties added as chips
   - Can remove with X button
   - No duplicates allowed
   - Saved to database
   - Displayed on profile

#### Test Case 9.12: Open to Collabs Toggle
1. **Setup:** Edit creator profile
   - **Test Account:** `test-creator1@troodieapp.com` (OTP: `000000`) - Editing own profile
2. **Steps:**
   - Toggle "Open to Collaborations" switch
   - Save
3. **Expected:**
   - Toggle saves immediately
   - When ON: Badge shows on profile
   - When ON: Appears in discovery results
   - When OFF: Hidden from discovery
4. **Verification SQL:**
   ```sql
   SELECT open_to_collabs FROM creator_profiles WHERE id = '...';
   -- Should match toggle state
   ```

#### Test Case 9.13: Pagination
1. **Setup:** Creators discovery with many results
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Note:** With 7 test creators, pagination may not trigger unless more creators are added
2. **Steps:**
   - Scroll to bottom of list
3. **Expected:**
   - More creators load automatically
   - Loading indicator shown
   - Smooth infinite scroll
   - No duplicates

#### Test Case 9.14: Empty State
1. **Setup:** Filters that return no results
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Filters:** Apply strict filters (e.g., City = "New York", Followers = "50K+", Engagement = "10%+")
2. **Steps:**
   - Apply strict filters (e.g., 50K+ followers in small city)
3. **Expected:**
   - "No creators found" message
   - "Clear Filters" button shown
   - Helpful empty state

#### Test Case 9.15: Pull-to-Refresh
1. **Setup:** Creators discovery screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
2. **Steps:**
   - Pull down to refresh
3. **Expected:**
   - Refresh indicator shows
   - Creator list reloads
   - New creators appear if available

#### Test Case 9.16: Creator Metrics Update
1. **Setup:** Creator with posts
   - **Test Account:** `test-creator1@troodieapp.com` (OTP: `000000`) - Has multiple posts with engagement
2. **Steps:**
   - Run metrics update function
   - View creator profile
3. **Expected:**
   - Engagement rate calculated correctly
   - Post count accurate
   - Likes/comments aggregated
4. **Verification SQL:**
   ```sql
   SELECT update_creator_metrics();
   SELECT troodie_engagement_rate, troodie_posts_count
   FROM creator_profiles WHERE id = '...';
   ```

#### Test Case 9.17: Browse Creators Screen (Restaurant Owner)
1. **Setup:** Business account logged in
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`) - MEDIUM activity business
2. **Steps:**
   - Navigate to Business Dashboard
   - Tap "Find Creators" or navigate to `/business/creators/browse`
   - View Browse Creators screen
3. **Expected:**
   - Header shows "Browse Creators" with back arrow and filter icon
   - Search bar with magnifying glass icon
   - "X creators found" count displayed
   - Creator cards show:
     - Circular profile picture (left)
     - Name with VERIFIED badge (if applicable)
     - Username/handle
     - Location with pin icon
     - Star rating and campaign count (right)
     - Bio text
     - Metrics: Followers, Engagement %, Rate range (horizontal)
     - Specialties/categories as chips
     - Recent Posts section with 3 posts (showing likes)
     - "Contact Creator" button (light gray)
4. **Verification:**
   - Layout matches design spec 1:1
   - All data displays correctly
   - Cards are tappable

#### Test Case 9.18: Browse Creators Search
1. **Setup:** Browse Creators screen open
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`)
   - **Search Terms:** Try "test-creator", "Foodie", "Charlotte", etc.
2. **Steps:**
   - Enter search query in search bar
   - Observe results
3. **Expected:**
   - Results filter by name, username, or bio
   - Count updates dynamically
   - Empty state shown if no matches

#### Test Case 9.19: Contact Creator from Browse
1. **Setup:** Browse Creators screen
   - **Test Account:** `test-business2@troodieapp.com` (OTP: `000000`) - Business browsing
   - **Creator:** `test-creator1@troodieapp.com` - Has complete profile
2. **Steps:**
   - Tap "Contact Creator" button on a creator card
3. **Expected:**
   - Navigates to creator profile
   - OR opens contact/invite modal
   - Can send campaign invitation

---

## End-to-End User Flows

## End-to-End User Flows

### Flow A: Consumer → Creator → Campaign Application → Deliverable Submission

**Duration:** ~30 minutes

1. **Consumer Onboarding**
   - Sign in as `test-consumer1@troodieapp.com` (OTP: `000000`)
   - Navigate to "Become a Creator"
   - **Enter beta passcode: `TROODIE2025`**
   - Complete onboarding (CM-1, CM-2)
   - Verify profile created atomically
   - Verify portfolio images uploaded

2. **Creator Profile Setup (CM-9)**
   - Sign in as `test-creator1@troodieapp.com` (OTP: `000000`)
   - Edit creator profile
   - Add bio, location, specialties
   - Toggle "Open to Collabs" ON
   - Verify profile visible in discovery

3. **Campaign Discovery**
   - Browse available campaigns
   - View campaign details

4. **Campaign Application**
   - Apply to campaign (CM-3)
   - Verify application uses correct creator_id
   - Wait for acceptance (or use admin to accept)

5. **Deliverable Submission**
   - Create social media post
   - Submit deliverable with URL (CM-4)
   - Test various URL formats
   - Verify warnings shown for unrecognized formats
   - Upload screenshot (optional)

6. **Auto-Approval Test**
   - Wait 73 hours OR manually set `submitted_at` to past
   - Trigger auto-approval (CM-5)
   - Verify deliverable auto-approved
   - Check notification sent

**Success Criteria:**
- ✅ All steps complete without errors
- ✅ Data integrity maintained throughout
- ✅ No orphaned records
- ✅ All validations pass
- ✅ Creator profile discoverable

---

### Flow B: Business Owner → Campaign Creation → Review Deliverables

**Duration:** ~20 minutes

1. **Business Setup**
   - Sign in as `test-business1@troodieapp.com` (OTP: `000000`) for new user experience
   - OR sign in as `test-business2@troodieapp.com` (OTP: `000000`) for medium activity
   - OR sign in as `test-business3@troodieapp.com` (OTP: `000000`) for high activity
   - **Enter beta passcode: `TROODIE2025`** (if required)
   - Navigate to More tab → "Claim Your Restaurant" (for test-business1)
   - Claim an unclaimed restaurant
   - Verify restaurant claim
   - OR use pre-claimed restaurants (test-business2 or test-business3) to skip claim step

2. **Restaurant Details Setup (CM-8)**
   - Edit restaurant details
   - Add description, about us
   - Set parking information
   - Add special deals
   - Set hours of operation
   - Verify changes visible on profile

3. **Campaign Creation**
   - Navigate to Create Campaign (CM-7)
   - Verify restaurant data loads
   - Fill campaign form
   - Submit campaign

4. **Review Applications**
   - View creator applications
   - Accept/reject applications

5. **Review Deliverables**
   - View submitted deliverables
   - Review within 72 hours OR let auto-approve
   - Approve/reject deliverables

6. **View Analytics (CM-6)**
   - Navigate to restaurant profile
   - Open Analytics tab
   - View metrics (saves, mentions, engagement)
   - Check trending badge (if applicable)
   - View daily saves chart
   - Review top savers
   - Export analytics data

**Success Criteria:**
- ✅ Campaign created successfully
- ✅ Validation errors handled gracefully
- ✅ Applications visible
- ✅ Deliverables reviewable
- ✅ Restaurant details editable
- ✅ Analytics dashboard functional

### Flow C: Restaurant Owner → Analytics → Edit Details → Creator Discovery

**Duration:** ~25 minutes

1. **Setup**
   - Sign in as `test-business2@troodieapp.com` (OTP: `000000`) for medium activity
   - OR sign in as `test-business3@troodieapp.com` (OTP: `000000`) for high activity
   - Restaurant is already claimed

2. **View Analytics (CM-6)**
   - Open restaurant profile (Restaurant 2 or 3, depending on account)
   - Navigate to Analytics tab
   - Review all metrics (saves, mentions, engagement)
   - Check trending badge (if >10 saves in 24h)
   - View daily saves chart
   - Review top savers list
   - Export analytics data

3. **Edit Restaurant Details (CM-8)**
   - On restaurant profile, tap "Edit Details"
   - Update description and About Us
   - Set parking information
   - Add special deals (e.g., "Troodie Thursdays - 15% off")
   - Update hours of operation
   - Save changes
   - Verify updates visible on restaurant profile

4. **Discover Creators (CM-9)**
   - Navigate to Business Dashboard → "Find Creators"
   - OR navigate to `/business/creators/browse`
   - Browse creator profiles
   - Use search bar to find specific creators
   - Apply filters (city, followers, engagement)
   - View creator profiles
   - Tap sample posts to view full posts
   - Tap "Contact Creator" to view profile

5. **Invite Creators**
   - From creator profile or browse screen
   - Invite to campaign (if feature available)

**Success Criteria:**
- ✅ Analytics data accurate
- ✅ Restaurant details update correctly
- ✅ Creator discovery works
- ✅ Filters apply correctly
- ✅ Profile views functional

### Flow D: Creator Discovery → Profile View → Edit Profile

**Duration:** ~15 minutes

1. **Discover Creators (CM-9)**
   - Sign in as `test-business2@troodieapp.com` or `test-business3@troodieapp.com` (OTP: `000000`)
   - Navigate to Business Dashboard → "Find Creators"
   - Browse without filters
   - Use search: "test-creator"
   - Apply city filter
   - Apply follower filter (e.g., "5K+")
   - Apply engagement filter (e.g., "5%+")
   - Clear all filters

2. **View Creator Profile**
   - Tap creator card (e.g., `test-creator1@troodieapp.com`)
   - Review profile information:
     - Bio and location
     - Follower count and engagement rate
     - Specialties/categories
     - Sample posts (top 3 by likes)
   - Check metrics accuracy

3. **Edit Own Creator Profile**
   - Sign in as `test-creator1@troodieapp.com` (OTP: `000000`)
   - Navigate to creator profile
   - Tap Edit button
   - Update bio, location, specialties
   - Toggle "Open to Collabs" switch
   - Save changes
   - Verify updates visible on profile
   - Verify profile appears in discovery when "Open to Collabs" is ON

**Success Criteria:**
- ✅ Discovery screen loads correctly
- ✅ Filters work as expected
- ✅ Profile views complete
- ✅ Profile editing successful

---

## Regression Testing

### Critical Paths to Test After Each Deployment

1. **Creator Onboarding**
   - [ ] Beta passcode required (`TROODIE2025`)
   - [ ] Consumer can upgrade to creator
   - [ ] Profile created atomically
   - [ ] Portfolio images upload successfully
   - [ ] No broken states possible

2. **Campaign Applications**
   - [ ] Creators can apply to campaigns
   - [ ] Applications use correct creator_id
   - [ ] Duplicate prevention works
   - [ ] Error messages clear

3. **Deliverable Submission**
   - [ ] All supported URL formats validate
   - [ ] Warnings shown appropriately
   - [ ] Invalid URLs blocked
   - [ ] Submission succeeds

4. **Auto-Approval**
   - [ ] Cron job runs hourly
   - [ ] Only overdue deliverables approved
   - [ ] Logs created correctly
   - [ ] Notifications sent

5. **Campaign Creation**
   - [ ] Validation works for all error states
   - [ ] Restaurant data loads correctly
   - [ ] Submit button disabled appropriately
   - [ ] Error screens show correct actions

6. **Restaurant Analytics (CM-6)**
   - [ ] Analytics tab visible to owners only
   - [ ] Metrics load correctly
   - [ ] Trending badge appears when threshold met
   - [ ] Real-time updates work
   - [ ] Export functionality works

7. **Restaurant Editable Details (CM-8)**
   - [ ] Edit button visible to owners only
   - [ ] All fields save correctly
   - [ ] Validation works
   - [ ] Unsaved changes warning appears
   - [ ] Activity feed entry created

8. **Creator Discovery (CM-9)**
   - [ ] Discovery screen loads
   - [ ] Filters work correctly
   - [ ] Creator profiles display
   - [ ] Sample posts show
   - [ ] Profile editing works
   - [ ] "Open to Collabs" toggle works

---

## Performance Testing

### Load Tests

1. **Portfolio Image Upload**
   - Test with 5 images simultaneously
   - Verify progress tracking accurate
   - Check upload completes in < 30 seconds per image

2. **URL Validation**
   - Test validation response time < 100ms
   - Verify no blocking on main thread

3. **Auto-Approval**
   - Test with 100+ overdue deliverables
   - Verify cron job completes in < 5 seconds
   - Check database locks handled correctly

---

## Known Issues & Limitations

### Current Limitations

1. **pg_cron Availability**
   - Auto-approval cron requires Supabase Pro plan
   - Alternative: External cron service needed for free tier
   - Workaround: Manual trigger function available

2. **Portfolio Upload**
   - Max file size: 5MB (after compression for images)
   - Image formats: JPEG, PNG, WebP
   - Video formats: MP4 (with thumbnail generation)
   - Can mix images and videos in portfolio

3. **URL Validation**
   - Some edge case URLs may show warnings
   - Platform detection not 100% accurate for all formats
   - Manual verification recommended for unknown platforms

### Future Enhancements

- [ ] Push notifications for status changes
- [ ] Advanced filtering for creator discovery (collab types, specialties)
- [ ] Creator comparison feature
- [ ] Direct messaging between restaurants and creators
- [ ] Scheduled deal start/end times
- [ ] Rich text editor for restaurant descriptions
- [ ] Change history tracking for restaurant edits
- [ ] Comparative analytics (vs similar restaurants)

---

## ER-001: Creator Discovery Filter Fix

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

### Pre-Test Setup for ER-001

Before testing ER-001, ensure the migration is applied and set up test data:

```sql
-- 1. Verify migration is applied
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'get_creators' 
AND routine_schema = 'public';

-- 2. Ensure test creators have open_to_collabs = true
UPDATE creator_profiles cp
SET open_to_collabs = true
FROM users u
WHERE cp.user_id = u.id
AND u.email IN ('test-creator1@bypass.com', 'test-creator2@bypass.com', 'test-creator3@bypass.com');

-- 3. Create edge case: Business user with creator_profile (should NOT appear)
-- First, get test-business1's user_id
DO $$
DECLARE
  business_user_id UUID;
  creator_profile_id UUID;
BEGIN
  -- Get business user ID
  SELECT id INTO business_user_id FROM users WHERE email = 'test-business1@bypass.com';
  
  -- Create a creator_profile for the business user (edge case)
  INSERT INTO creator_profiles (user_id, display_name, bio, open_to_collabs)
  VALUES (business_user_id, 'Business User Profile', 'This should not appear', true)
  ON CONFLICT (user_id) DO UPDATE SET open_to_collabs = true
  RETURNING id INTO creator_profile_id;
  
  RAISE NOTICE 'Created creator_profile % for business user %', creator_profile_id, business_user_id;
END $$;

-- 4. Verify test data setup
SELECT 
  u.email,
  u.account_type,
  cp.id as profile_id,
  cp.open_to_collabs
FROM users u
LEFT JOIN creator_profiles cp ON cp.user_id = u.id
WHERE u.email IN ('test-creator1@bypass.com', 'test-creator2@bypass.com', 'test-business1@bypass.com')
ORDER BY u.account_type, u.email;
```

### Test Case ER-001-1: Verify Only Creators Appear in Browse

**Objective:** Ensure that only users with `account_type = 'creator'` appear in browse creators results.

**Prerequisites:**
- Database migration `20250122_fix_get_creators_account_type.sql` applied
- Pre-test setup completed
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Business tab → "Browse Creators" (or "Find Creators")
3. Verify the list loads without errors
4. Scroll through the creator list
5. Verify only creator accounts appear (test-creator1, test-creator2, test-creator3)
6. Verify `test-business1` does NOT appear in the list (even though they have a creator_profile with `open_to_collabs = true`)

**Expected Result:**
- Only users with `account_type = 'creator'` appear in browse results
- Business users with creator_profiles records are excluded
- List shows creators with `open_to_collabs = true`
- No business accounts visible

**Database Verification:**
```sql
-- Verify function filters correctly
SELECT 
  u.email,
  u.account_type,
  cp.display_name,
  cp.open_to_collabs
FROM get_creators() gc
JOIN creator_profiles cp ON cp.id = gc.id
JOIN users u ON cp.user_id = u.id
ORDER BY u.email;

-- Should only return creators with account_type = 'creator'
-- Should NOT include test-business1@bypass.com

-- Verify business user is excluded
SELECT 
  u.email,
  u.account_type,
  cp.open_to_collabs,
  CASE WHEN EXISTS (
    SELECT 1 FROM get_creators() gc WHERE gc.id = cp.id
  ) THEN 'INCLUDED' ELSE 'EXCLUDED' END as in_results
FROM users u
JOIN creator_profiles cp ON cp.user_id = u.id
WHERE u.email = 'test-business1@bypass.com';
-- Should show: account_type = 'business', open_to_collabs = true, in_results = 'EXCLUDED'
```

### Test Case ER-001-2: Filter by City

**Objective:** Verify city filtering works correctly with account_type filter.

**Prerequisites:**
- Pre-test setup completed
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Browse Creators
3. Use city filter (if available) or verify creators have location data
4. Verify filtered results still only show creators (not businesses)

**Expected Result:**
- City filter works correctly
- Filtered results still exclude business accounts
- Only creators matching city filter appear

**Database Verification:**
```sql
-- Test city filter
SELECT * FROM get_creators(p_city := 'San Francisco');
-- Should only return creators in San Francisco, no businesses
```

---

## ER-007: Campaign Invitation System

**Status:** ✅ Implemented  
**Testing Confirmed:** ✅ Tested (ER-007-4 and ER-007-6 skipped for later review)

### Pre-Test Setup for ER-007

Before testing ER-007, set up campaigns and ensure creators are visible:

```sql
-- 1. Ensure test-business1 has at least one active campaign
-- Get restaurant_id for test-business1
DO $$
DECLARE
  business_user_id UUID;
  restaurant_id_val UUID;
  campaign_id_val UUID;
BEGIN
  -- Get business user ID
  SELECT id INTO business_user_id FROM users WHERE email = 'test-business1@bypass.com';
  
  -- Get restaurant ID
  SELECT r.id INTO restaurant_id_val
  FROM restaurants r
  JOIN business_profiles bp ON bp.restaurant_id = r.id
  WHERE bp.user_id = business_user_id
  LIMIT 1;
  
  -- Create an active campaign if none exists
  IF NOT EXISTS (
    SELECT 1 FROM campaigns 
    WHERE restaurant_id = restaurant_id_val 
    AND status = 'active'
    AND end_date > NOW()
  ) THEN
    INSERT INTO campaigns (
      restaurant_id,
      owner_id,
      title,
      description,
      status,
      budget_cents,
      payout_per_creator,
      start_date,
      end_date,
      max_creators,
      requirements,
      deliverable_requirements
    )
    VALUES (
      restaurant_id_val,
      business_user_id,
      'ER-007 Test Campaign: Summer Promotion',
      'Test campaign for invitation system testing',
      'active',
      100000, -- $1000
      50000,  -- $500 per creator
      NOW(),
      NOW() + INTERVAL '30 days',
      5,
      ARRAY['Create engaging content', 'Tag restaurant'],
      '{"deliverables": [{"index": 1, "type": "Instagram Post", "quantity": 1, "description": "1 Instagram post showcasing the restaurant"}]}'::jsonb
    )
    RETURNING id INTO campaign_id_val;
    
    RAISE NOTICE 'Created campaign % for restaurant %', campaign_id_val, restaurant_id_val;
  END IF;
END $$;

-- 2. Ensure test creators have open_to_collabs = true
UPDATE creator_profiles cp
SET open_to_collabs = true
FROM users u
WHERE cp.user_id = u.id
AND u.email IN ('test-creator1@bypass.com', 'test-creator2@bypass.com');

-- 3. Verify setup
SELECT 
  c.id as campaign_id,
  c.title,
  c.status,
  r.name as restaurant_name,
  u.email as business_email
FROM campaigns c
JOIN restaurants r ON c.restaurant_id = r.id
JOIN business_profiles bp ON bp.restaurant_id = r.id
JOIN users u ON bp.user_id = u.id
WHERE u.email = 'test-business1@bypass.com'
AND c.status = 'active'
AND c.end_date > NOW();

-- 4. Verify creators are visible
SELECT 
  cp.id as creator_id,
  u.email,
  cp.display_name,
  cp.open_to_collabs
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email IN ('test-creator1@bypass.com', 'test-creator2@bypass.com')
AND cp.open_to_collabs = true;
```

### Test Case ER-007-1: Business Invites Creator

**Objective:** Verify businesses can invite creators to campaigns.

**Prerequisites:**
- Pre-test setup completed
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Business tab → "Browse Creators" (or "Find Creators")
3. Verify creator list loads (should see test-creator1, test-creator2, etc.)
4. Find `test-creator1` in the list
5. Click "Invite to Campaign" button on the creator card
6. Verify invite modal opens
7. Verify modal shows:
   - Creator name/display name
   - Dropdown list of active campaigns
   - Optional message field
   - "Send Invitation" button
8. Select an active campaign from dropdown
9. Optionally add a message: "We'd love to work with you on this campaign!"
10. Click "Send Invitation"
11. Verify success alert appears: "Invitation sent to [Creator Name]!"
12. Verify modal closes
13. Verify invitation badge count updates (if displayed)

**Expected Result:**
- Invitation modal displays correctly
- Active campaigns appear in dropdown
- Invitation is created with status 'pending'
- Success message appears
- Creator will see invitation in their "Invitations" tab

**Database Verification:**
```sql
-- Verify invitation was created
SELECT 
  ci.id,
  ci.status,
  ci.message,
  ci.invited_at,
  ci.expires_at,
  c.title as campaign_title,
  cp.display_name as creator_name,
  u.email as creator_email,
  inviter.email as invited_by_email
FROM campaign_invitations ci
JOIN campaigns c ON ci.campaign_id = c.id
JOIN creator_profiles cp ON ci.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
JOIN users inviter ON ci.invited_by = inviter.id
WHERE inviter.email = 'test-business1@bypass.com'
AND u.email = 'test-creator1@bypass.com'
ORDER BY ci.invited_at DESC
LIMIT 1;
-- Should show: status = 'pending', expires_at = invited_at + 14 days
```

### Test Case ER-007-2: Creator Views Invitation

**Objective:** Verify creators can see invitations in their campaigns screen.

**Prerequisites:**
- Invitation created (from ER-007-1)
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Creator tab → "My Campaigns"
3. Verify tabs are visible: "Active", "Pending", "Completed", "Invitations"
4. Click "Invitations" tab
5. Verify invitation appears in the list with:
   - Campaign title
   - Restaurant name/image
   - Campaign deadline
   - Payout amount
   - Invitation message (if provided)
   - Status badge showing "Pending"
   - "Accept" and "Decline" buttons
6. Verify invitation details are correct

**Expected Result:**
- Invitations tab displays correctly
- Pending invitation visible with all details
- Accept/Decline buttons functional
- Badge shows invitation count (if implemented)

**Database Verification:**
```sql
-- Verify invitation is visible to creator
SELECT 
  ci.id,
  ci.status,
  ci.message,
  c.title as campaign_title,
  r.name as restaurant_name
FROM campaign_invitations ci
JOIN campaigns c ON ci.campaign_id = c.id
JOIN restaurants r ON c.restaurant_id = r.id
JOIN creator_profiles cp ON ci.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com'
AND ci.status = 'pending';
-- Should return the invitation created in ER-007-1
```

### Test Case ER-007-3: Creator Accepts Invitation

**Objective:** Verify creators can accept invitations and campaigns are auto-accepted.

**Prerequisites:**
- Invitation created (from ER-007-1)
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Creator tab → "My Campaigns" → "Invitations" tab
3. Verify pending invitation appears
4. Review campaign details:
   - Campaign title
   - Restaurant name
   - Deadline date
   - Payout amount
   - Invitation message
5. Click "Accept" button
6. Verify confirmation alert appears: "Are you sure you want to accept this invitation?"
7. Click "Accept" in confirmation
8. Verify success alert: "Invitation accepted successfully!"
9. Verify invitation disappears from "Invitations" tab (or shows as "Accepted")
10. Navigate to "Active" tab
11. Verify campaign now appears in "Active" campaigns list
12. Verify campaign shows as accepted (not pending)

**Expected Result:**
- Invitation status changes to 'accepted'
- Campaign application created automatically with status 'accepted'
- Campaign appears in creator's Active campaigns
- Creator can now submit deliverables for this campaign
- Business receives notification (if implemented)

**Database Verification:**
```sql
-- Check invitation status
SELECT 
  ci.id,
  ci.status,
  ci.responded_at
FROM campaign_invitations ci
JOIN creator_profiles cp ON ci.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com'
ORDER BY ci.invited_at DESC
LIMIT 1;
-- Should show: status = 'accepted', responded_at IS NOT NULL

-- Check application was created automatically
SELECT 
  ca.id,
  ca.status,
  ca.applied_at,
  c.title as campaign_title
FROM campaign_applications ca
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com'
AND c.id = (
  SELECT campaign_id FROM campaign_invitations ci2
  JOIN creator_profiles cp2 ON ci2.creator_id = cp2.id
  JOIN users u2 ON cp2.user_id = u2.id
  WHERE u2.email = 'test-creator1@bypass.com'
  ORDER BY ci2.invited_at DESC
  LIMIT 1
);
-- Should exist with status = 'accepted'
```

### Test Case ER-007-4: Creator Declines Invitation ⏭️ SKIPPED (Will revisit)

**Objective:** Verify creators can decline invitations.

**Prerequisites:**
- Create a new invitation for this test (use ER-007-1 setup, but invite test-creator2)
- **Test Account:** `test-creator2@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Create invitation for test-creator2
DO $$
DECLARE
  business_user_id UUID;
  creator_profile_id UUID;
  campaign_id_val UUID;
  invitation_id_val UUID;
BEGIN
  -- Get IDs
  SELECT id INTO business_user_id FROM users WHERE email = 'test-business1@bypass.com';
  SELECT cp.id INTO creator_profile_id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id WHERE u.email = 'test-creator2@bypass.com';
  SELECT c.id INTO campaign_id_val FROM campaigns c
  JOIN restaurants r ON c.restaurant_id = r.id
  JOIN business_profiles bp ON bp.restaurant_id = r.id
  WHERE bp.user_id = business_user_id AND c.status = 'active'
  LIMIT 1;
  
  -- Create invitation
  INSERT INTO campaign_invitations (campaign_id, creator_id, invited_by, message, status)
  VALUES (
    campaign_id_val,
    creator_profile_id,
    business_user_id,
    'Test invitation for decline testing',
    'pending'
  )
  RETURNING id INTO invitation_id_val;
  
  RAISE NOTICE 'Created invitation % for creator %', invitation_id_val, creator_profile_id;
END $$;
```

**Steps:**
1. Log in as `test-creator2@bypass.com`
2. Navigate to Creator tab → "My Campaigns" → "Invitations" tab
3. Verify pending invitation appears
4. Click "Decline" button
5. Verify confirmation alert: "Are you sure you want to decline this invitation?"
6. Click "Decline" in confirmation
7. Verify success alert: "Invitation declined successfully!"
8. Verify invitation disappears from list (or shows as "Declined")
9. Navigate to "Active" tab
10. Verify campaign does NOT appear in Active campaigns

**Expected Result:**
- Invitation status changes to 'declined'
- No campaign application created
- Invitation removed from pending list
- Campaign does not appear in Active tab
- Business receives notification (if implemented)

**Database Verification:**
```sql
-- Check invitation status
SELECT 
  ci.id,
  ci.status,
  ci.responded_at
FROM campaign_invitations ci
JOIN creator_profiles cp ON ci.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator2@bypass.com'
ORDER BY ci.invited_at DESC
LIMIT 1;
-- Should show: status = 'declined', responded_at IS NOT NULL

-- Verify NO application was created
SELECT COUNT(*) as application_count
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator2@bypass.com'
AND ca.campaign_id = (
  SELECT campaign_id FROM campaign_invitations ci2
  JOIN creator_profiles cp2 ON ci2.creator_id = cp2.id
  JOIN users u2 ON cp2.user_id = u2.id
  WHERE u2.email = 'test-creator2@bypass.com'
  ORDER BY ci2.invited_at DESC
  LIMIT 1
);
-- Should return: 0 (no application created)
```

### Test Case ER-007-5: Duplicate Invitation Prevention

**Objective:** Verify businesses cannot send duplicate invitations.

**Prerequisites:**
- Invitation exists from ER-007-1 (test-creator1)
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Browse Creators
3. Find `test-creator1` in the list
4. Click "Invite to Campaign"
5. Select the SAME campaign that was used in ER-007-1
6. Click "Send Invitation"
7. Verify error alert appears: "Invitation already exists" or similar error message
8. Verify modal does NOT close
9. Verify no duplicate invitation created

**Expected Result:**
- Error message displayed: "Invitation already exists" or "This creator has already been invited to this campaign"
- No duplicate invitation created
- Modal remains open (allows selecting different campaign)

**Database Verification:**
```sql
-- Verify only one invitation exists for this campaign+creator pair
SELECT 
  COUNT(*) as invitation_count,
  ci.campaign_id,
  ci.creator_id,
  ci.status
FROM campaign_invitations ci
JOIN creator_profiles cp ON ci.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com'
AND ci.campaign_id = (
  SELECT campaign_id FROM campaign_invitations ci2
  JOIN creator_profiles cp2 ON ci2.creator_id = cp2.id
  JOIN users u2 ON cp2.user_id = u2.id
  WHERE u2.email = 'test-creator1@bypass.com'
  ORDER BY ci2.invited_at DESC
  LIMIT 1
)
GROUP BY ci.campaign_id, ci.creator_id, ci.status;
-- Should return: invitation_count = 1 (only one invitation)
```

### Test Case ER-007-6: Invitation Expiry ⏭️ SKIPPED (Will revisit)

**Objective:** Verify invitations expire after 14 days.

**Prerequisites:**
- Create invitation for testing expiry
- **Test Account:** `test-creator3@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Create invitation with past expiry date
DO $$
DECLARE
  business_user_id UUID;
  creator_profile_id UUID;
  campaign_id_val UUID;
  invitation_id_val UUID;
BEGIN
  -- Get IDs
  SELECT id INTO business_user_id FROM users WHERE email = 'test-business1@bypass.com';
  SELECT cp.id INTO creator_profile_id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id WHERE u.email = 'test-creator3@bypass.com';
  SELECT c.id INTO campaign_id_val FROM campaigns c
  JOIN restaurants r ON c.restaurant_id = r.id
  JOIN business_profiles bp ON bp.restaurant_id = r.id
  WHERE bp.user_id = business_user_id AND c.status = 'active'
  LIMIT 1;
  
  -- Create expired invitation
  INSERT INTO campaign_invitations (campaign_id, creator_id, invited_by, message, status, expires_at)
  VALUES (
    campaign_id_val,
    creator_profile_id,
    business_user_id,
    'Expired test invitation',
    'pending',
    NOW() - INTERVAL '1 day' -- Expired yesterday
  )
  RETURNING id INTO invitation_id_val;
  
  RAISE NOTICE 'Created expired invitation %', invitation_id_val;
END $$;

-- Run expiry function
SELECT expire_old_invitations();
```

**Steps:**
1. Log in as `test-creator3@bypass.com`
2. Navigate to Creator tab → "My Campaigns" → "Invitations" tab
3. Verify expired invitation appears with "Expired" status badge
4. Verify "Accept" and "Decline" buttons are disabled or not shown
5. Verify invitation shows expiry information

**Expected Result:**
- Expired invitations have status 'expired'
- Creators see expired invitations as expired
- Cannot accept expired invitations
- UI clearly indicates invitation is expired

**Database Verification:**
```sql
-- Verify invitation status updated
SELECT 
  ci.id,
  ci.status,
  ci.expires_at,
  ci.invited_at
FROM campaign_invitations ci
JOIN creator_profiles cp ON ci.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator3@bypass.com'
ORDER BY ci.invited_at DESC
LIMIT 1;
-- Should show: status = 'expired', expires_at < NOW()
```

### Test Case ER-007-7: Business Withdraws Invitation

**Objective:** Verify businesses can withdraw pending invitations.

**Prerequisites:**
- Create new invitation for withdrawal testing
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Create invitation for withdrawal test
DO $$
DECLARE
  business_user_id UUID;
  creator_profile_id UUID;
  campaign_id_val UUID;
  invitation_id_val UUID;
BEGIN
  -- Get IDs
  SELECT id INTO business_user_id FROM users WHERE email = 'test-business1@bypass.com';
  SELECT cp.id INTO creator_profile_id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id WHERE u.email = 'test-creator2@bypass.com';
  SELECT c.id INTO campaign_id_val FROM campaigns c
  JOIN restaurants r ON c.restaurant_id = r.id
  JOIN business_profiles bp ON bp.restaurant_id = r.id
  WHERE bp.user_id = business_user_id AND c.status = 'active'
  LIMIT 1;
  
  -- Create new pending invitation (if one doesn't exist)
  INSERT INTO campaign_invitations (campaign_id, creator_id, invited_by, message, status)
  SELECT campaign_id_val, creator_profile_id, business_user_id, 'Invitation for withdrawal test', 'pending'
  WHERE NOT EXISTS (
    SELECT 1 FROM campaign_invitations ci
    WHERE ci.campaign_id = campaign_id_val
    AND ci.creator_id = creator_profile_id
    AND ci.status = 'pending'
  )
  RETURNING id INTO invitation_id_val;
  
  RAISE NOTICE 'Created invitation % for withdrawal test', invitation_id_val;
END $$;
```

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Business tab → Campaigns
3. Open the campaign that has the pending invitation
4. Find invitations section (if implemented in campaign details)
5. OR: Navigate to Browse Creators and verify invitation status
6. Find pending invitation to `test-creator2`
7. Click "Withdraw" button (if available in UI)
8. Confirm withdrawal
9. Verify invitation status updates
10. Log in as `test-creator2@bypass.com`
11. Navigate to Invitations tab
12. Verify invitation no longer appears (or shows as "Withdrawn")

**Expected Result:**
- Invitation status changes to 'withdrawn' (or deleted)
- Creator no longer sees invitation in pending list
- No application created
- Business can see withdrawal status

**Database Verification:**
```sql
-- Check invitation status
SELECT 
  ci.id,
  ci.status,
  ci.responded_at
FROM campaign_invitations ci
JOIN creator_profiles cp ON ci.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
JOIN users inviter ON ci.invited_by = inviter.id
WHERE u.email = 'test-creator2@bypass.com'
AND inviter.email = 'test-business1@bypass.com'
ORDER BY ci.invited_at DESC
LIMIT 1;
-- Should show: status = 'withdrawn' (or record deleted)
```

---

## ER-008: Multiple Deliverables Support

**Status:** ✅ Implemented  
**Testing Confirmed:** ✅ Tested and Working

### Pre-Test Setup for ER-008

Before testing ER-008, set up a campaign with multiple required deliverables:

```sql
-- 1. Create campaign with multiple deliverables
DO $$
DECLARE
  business_user_id UUID;
  restaurant_id_val UUID;
  campaign_id_val UUID;
  creator_profile_id UUID;
  application_id_val UUID;
BEGIN
  -- Get business user ID
  SELECT id INTO business_user_id FROM users WHERE email = 'test-business1@bypass.com';
  
  -- Get restaurant ID
  SELECT r.id INTO restaurant_id_val
  FROM restaurants r
  JOIN business_profiles bp ON bp.restaurant_id = r.id
  WHERE bp.user_id = business_user_id
  LIMIT 1;
  
  -- Create campaign with multiple deliverables
  INSERT INTO campaigns (
    restaurant_id,
    owner_id,
    title,
    description,
    status,
    budget_cents,
    start_date,
    end_date,
    max_creators,
    requirements,
    deliverable_requirements
  )
  VALUES (
    restaurant_id_val,
    business_user_id,
    'ER-008 Test: Multi-Deliverable Campaign',
    'Test campaign requiring multiple deliverables',
    'active',
    150000, -- $1500
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    3,
    ARRAY['Create engaging content', 'Tag restaurant', 'Use hashtag #TroodieTest'],
    '{
      "deliverables": [
        {
          "index": 1,
          "type": "Instagram Post",
          "quantity": 1,
          "description": "1 Instagram post with 3+ photos showcasing the restaurant"
        },
        {
          "index": 2,
          "type": "Instagram Reel",
          "quantity": 1,
          "description": "1 Instagram reel (30+ seconds) featuring the restaurant atmosphere"
        },
        {
          "index": 3,
          "type": "TikTok Video",
          "quantity": 1,
          "description": "1 TikTok video showcasing the food and ambiance"
        }
      ]
    }'::jsonb
  )
  RETURNING id INTO campaign_id_val;
  
  -- Get creator profile ID
  SELECT cp.id INTO creator_profile_id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id WHERE u.email = 'test-creator1@bypass.com';
  
  -- Create accepted application
  INSERT INTO campaign_applications (
    campaign_id,
    creator_id,
    status,
    proposed_rate_cents,
    cover_letter
  )
  VALUES (
    campaign_id_val,
    creator_profile_id,
    'accepted',
    150000,
    'Ready to create multiple deliverables!'
  )
  RETURNING id INTO application_id_val;
  
  RAISE NOTICE 'Created campaign % with application %', campaign_id_val, application_id_val;
END $$;

-- 2. Verify setup
SELECT 
  c.id as campaign_id,
  c.title,
  c.deliverable_requirements,
  ca.id as application_id,
  ca.status as application_status,
  cp.display_name as creator_name
FROM campaigns c
JOIN campaign_applications ca ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE c.title = 'ER-008 Test: Multi-Deliverable Campaign'
AND u.email = 'test-creator1@bypass.com';
```

### Test Case ER-008-1: Submit Multiple Deliverables

**Objective:** Verify creators can submit multiple deliverables for a campaign.

**Prerequisites:**
- Pre-test setup completed
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Creator tab → "My Campaigns" → "Active" tab
3. Find "ER-008 Test: Multi-Deliverable Campaign"
4. Click on the campaign card
5. Click "Submit Deliverables" button
6. Verify submit deliverables screen loads
7. Verify progress section shows:
   - "0 of 3 deliverables submitted"
   - Progress bar at 0%
8. Verify "Expected Deliverables" section shows:
   - Deliverable 1: Instagram Post
   - Deliverable 2: Instagram Reel
   - Deliverable 3: TikTok Video
9. **Submit First Deliverable:**
   - Enter Instagram post URL: `https://www.instagram.com/p/ABC123/`
   - Verify platform detected as "Instagram"
   - Optionally upload screenshot
   - Optionally add caption and notes
   - Click "Add Another Deliverable" button
10. **Submit Second Deliverable:**
    - New deliverable form appears
    - Enter Instagram reel URL: `https://www.instagram.com/reel/XYZ789/`
    - Verify platform detected as "Instagram"
    - Optionally add caption
    - Click "Add Another Deliverable" button
11. **Submit Third Deliverable:**
    - New deliverable form appears
    - Enter TikTok URL: `https://www.tiktok.com/@user/video/1234567890`
    - Verify platform detected as "TikTok"
    - Optionally add caption and notes
12. Review all three deliverables
13. Click "Submit 3 Deliverables" button
14. Verify loading state during submission
15. Verify success alert: "All 3 deliverable(s) submitted successfully."
16. Verify navigation back to campaign list
17. Navigate back to campaign details
18. Verify progress shows "3 of 3 deliverables submitted (100%)"
19. Verify all deliverables appear in list

**Expected Result:**
- Progress indicator updates correctly (0% → 33% → 67% → 100%)
- Multiple deliverables can be added and submitted
- Each deliverable has correct deliverable_index (1, 2, 3)
- All deliverables tracked separately
- Success message confirms all submissions
- Progress bar shows 100% completion

**Database Verification:**
```sql
-- Verify all deliverables were created
SELECT 
  cd.deliverable_index,
  cd.platform,
  cd.platform_post_url,
  cd.status,
  cd.submitted_at,
  ca.id as application_id
FROM campaign_deliverables cd
JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE c.title = 'ER-008 Test: Multi-Deliverable Campaign'
AND u.email = 'test-creator1@bypass.com'
ORDER BY cd.deliverable_index;
-- Should show 3 deliverables with indices 1, 2, 3
-- All should have status = 'pending_review'
```

### Test Case ER-008-2: Deliverable Progress Tracking

**Objective:** Verify progress tracking works correctly during incremental submission.

**Prerequisites:**
- Pre-test setup completed (campaign with 3 deliverables)
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Reset deliverables for this test (if any exist)
DELETE FROM campaign_deliverables cd
WHERE cd.campaign_application_id IN (
  SELECT ca.id FROM campaign_applications ca
  JOIN campaigns c ON ca.campaign_id = c.id
  JOIN creator_profiles cp ON ca.creator_id = cp.id
  JOIN users u ON cp.user_id = u.id
  WHERE c.title = 'ER-008 Test: Multi-Deliverable Campaign'
  AND u.email = 'test-creator1@bypass.com'
);
```

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to campaign "ER-008 Test: Multi-Deliverable Campaign"
3. Click "Submit Deliverables"
4. **Initial State:**
   - Verify progress shows "0 of 3 deliverables submitted (0%)"
   - Progress bar shows 0% filled
5. **Submit First Deliverable:**
   - Enter Instagram post URL: `https://www.instagram.com/p/FIRST123/`
   - Submit only this one deliverable
   - Verify success message
   - Navigate back to campaign details
   - Verify progress shows "1 of 3 deliverables submitted (33%)"
   - Progress bar shows ~33% filled
6. **Submit Second Deliverable:**
   - Click "Submit Deliverables" again
   - Verify progress shows "1 of 3 deliverables submitted (33%)"
   - Add new deliverable form
   - Enter Instagram reel URL: `https://www.instagram.com/reel/SECOND456/`
   - Submit
   - Navigate back to campaign details
   - Verify progress shows "2 of 3 deliverables submitted (67%)"
   - Progress bar shows ~67% filled
7. **Submit Third Deliverable:**
   - Click "Submit Deliverables" again
   - Verify progress shows "2 of 3 deliverables submitted (67%)"
   - Add new deliverable form
   - Enter TikTok URL: `https://www.tiktok.com/@user/video/THIRD789`
   - Submit
   - Navigate back to campaign details
   - Verify progress shows "3 of 3 deliverables submitted (100%)"
   - Progress bar shows 100% filled
   - Verify "✓ All deliverables submitted" message appears

**Expected Result:**
- Progress percentage calculates correctly (0% → 33% → 67% → 100%)
- Visual progress bar updates accurately
- Complete status shown when all submitted
- Progress persists across multiple submission sessions

**Database Verification:**
```sql
-- Check progress calculation
SELECT 
  COUNT(*) as submitted_count,
  (SELECT jsonb_array_length(deliverable_requirements->'deliverables') FROM campaigns WHERE title = 'ER-008 Test: Multi-Deliverable Campaign') as required_count,
  ROUND(
    (COUNT(*)::numeric / NULLIF((SELECT jsonb_array_length(deliverable_requirements->'deliverables') FROM campaigns WHERE title = 'ER-008 Test: Multi-Deliverable Campaign'), 0)) * 100,
    0
  ) as percentage
FROM campaign_deliverables cd
JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE c.title = 'ER-008 Test: Multi-Deliverable Campaign'
AND u.email = 'test-creator1@bypass.com';
-- Should show: submitted_count = 3, required_count = 3, percentage = 100
```

### Test Case ER-008-3: Auto-Calculate Deliverable Index

**Objective:** Verify deliverable_index is auto-calculated correctly.

**Prerequisites:**
- Pre-test setup completed
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Reset deliverables to test index calculation
DELETE FROM campaign_deliverables cd
WHERE cd.campaign_application_id IN (
  SELECT ca.id FROM campaign_applications ca
  JOIN campaigns c ON ca.campaign_id = c.id
  JOIN creator_profiles cp ON ca.creator_id = cp.id
  JOIN users u ON cp.user_id = u.id
  WHERE c.title = 'ER-008 Test: Multi-Deliverable Campaign'
  AND u.email = 'test-creator1@bypass.com'
);
```

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to campaign "ER-008 Test: Multi-Deliverable Campaign"
3. Click "Submit Deliverables"
4. **Submit First Deliverable:**
   - Enter URL: `https://www.instagram.com/p/INDEX1/`
   - Submit (do NOT specify index manually)
   - Verify submission succeeds
5. **Submit Second Deliverable:**
   - Add another deliverable
   - Enter URL: `https://www.instagram.com/reel/INDEX2/`
   - Submit
   - Verify submission succeeds
6. **Submit Third Deliverable:**
   - Add another deliverable
   - Enter URL: `https://www.tiktok.com/@user/video/INDEX3`
   - Submit
   - Verify submission succeeds

**Expected Result:**
- First deliverable gets index 1 automatically
- Second deliverable gets index 2 automatically
- Third deliverable gets index 3 automatically
- No index conflicts or errors
- Indices are sequential with no gaps

**Database Verification:**
```sql
-- Check indices are sequential
SELECT 
  cd.deliverable_index,
  cd.platform,
  cd.platform_post_url,
  cd.submitted_at
FROM campaign_deliverables cd
JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE c.title = 'ER-008 Test: Multi-Deliverable Campaign'
AND u.email = 'test-creator1@bypass.com'
ORDER BY cd.deliverable_index;
-- Should be: 1, 2, 3 with no gaps or duplicates
```

### Test Case ER-008-4: Required Deliverables Display in Campaign Details

**Objective:** Verify required deliverables are displayed to creators before applying.

**Prerequisites:**
- Campaign with deliverable_requirements exists
- **Test Account:** `test-creator2@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-creator2@bypass.com`
2. Navigate to Creator tab → "Explore Campaigns"
3. Find "ER-008 Test: Multi-Deliverable Campaign" (or any campaign with multiple deliverables)
4. Click on campaign card to open details modal
5. Scroll through campaign details
6. Verify "Expected Deliverables" section appears BEFORE "Requirements" section
7. Verify section shows:
   - Deliverable 1: Instagram Post
     - Description: "1 Instagram post with 3+ photos showcasing the restaurant"
   - Deliverable 2: Instagram Reel
     - Description: "1 Instagram reel (30+ seconds) featuring the restaurant atmosphere"
   - Deliverable 3: TikTok Video
     - Description: "1 TikTok video showcasing the food and ambiance"
8. Verify each deliverable shows:
   - Index number
   - Platform/type
   - Quantity (if applicable)
   - Description
9. Verify section is clearly labeled "Expected Deliverables"

**Expected Result:**
- All required deliverables displayed before application
- Platform and description shown for each
- Creators know what's expected before applying
- Section is clearly visible and easy to understand

**Note:** This addresses Issue #6a from audit findings - deliverables must be visible to creators.

**Database Verification:**
```sql
-- Verify campaign has deliverable_requirements
SELECT 
  c.title,
  c.deliverable_requirements,
  jsonb_array_length(c.deliverable_requirements->'deliverables') as deliverable_count
FROM campaigns c
WHERE c.title = 'ER-008 Test: Multi-Deliverable Campaign';
-- Should show deliverable_requirements JSONB with 3 deliverables
```

### Test Case ER-008-5: Partial Submission Handling

**Objective:** Verify system handles partial deliverable submissions correctly.

**Prerequisites:**
- Pre-test setup completed
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Reset deliverables
DELETE FROM campaign_deliverables cd
WHERE cd.campaign_application_id IN (
  SELECT ca.id FROM campaign_applications ca
  JOIN campaigns c ON ca.campaign_id = c.id
  JOIN creator_profiles cp ON ca.creator_id = cp.id
  JOIN users u ON cp.user_id = u.id
  WHERE c.title = 'ER-008 Test: Multi-Deliverable Campaign'
  AND u.email = 'test-creator1@bypass.com'
);
```

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to campaign "ER-008 Test: Multi-Deliverable Campaign"
3. Click "Submit Deliverables"
4. **Submit Only 2 of 3 Deliverables:**
   - Add first deliverable: `https://www.instagram.com/p/PARTIAL1/`
   - Add second deliverable: `https://www.instagram.com/reel/PARTIAL2/`
   - Do NOT add third deliverable
   - Click "Submit 2 Deliverables"
5. Verify success message: "All 2 deliverable(s) submitted successfully."
6. Navigate back to campaign details
7. Verify progress shows "2 of 3 deliverables submitted (67%)"
8. Verify progress bar shows 67% filled
9. Verify "Expected Deliverables" section shows:
   - Deliverable 1: ✓ Submitted (or status indicator)
   - Deliverable 2: ✓ Submitted
   - Deliverable 3: ⏱ Pending
10. Click "Submit Deliverables" again
11. Verify form shows existing 2 deliverables (or allows adding more)
12. Add third deliverable: `https://www.tiktok.com/@user/video/PARTIAL3`
13. Submit
14. Verify progress updates to "3 of 3 deliverables submitted (100%)"

**Expected Result:**
- Partial submissions are accepted
- Progress tracking reflects partial completion
- Creators can submit remaining deliverables later
- System tracks which deliverables are submitted vs pending
- Progress updates correctly as more deliverables are added

**Database Verification:**
```sql
-- Check partial submission status
SELECT 
  cd.deliverable_index,
  cd.status,
  cd.submitted_at,
  (SELECT jsonb_array_length(deliverable_requirements->'deliverables') FROM campaigns WHERE title = 'ER-008 Test: Multi-Deliverable Campaign') as total_required
FROM campaign_deliverables cd
JOIN campaign_applications ca ON cd.campaign_application_id = ca.id
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE c.title = 'ER-008 Test: Multi-Deliverable Campaign'
AND u.email = 'test-creator1@bypass.com'
ORDER BY cd.deliverable_index;
-- Should show 2-3 deliverables depending on test step
```

---

## CM-10: Creator Profile Schema Cleanup

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

### Pre-Test Setup for CM-10

Before testing CM-10, verify the migration is applied:

```sql
-- Verify columns are removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'creator_profiles' 
AND column_name IN ('persona', 'collab_types', 'preferred_compensation');
-- Should return 0 rows

-- Verify get_creators function signature updated
SELECT routine_name, parameters 
FROM information_schema.routines 
WHERE routine_name = 'get_creators';
-- Should NOT include p_collab_types parameter
```

### Test Case CM-10-1: Verify Columns Removed

**Objective:** Ensure unused columns are removed from creator_profiles table.

**Prerequisites:**
- Migration `20250122_cleanup_creator_profiles_columns.sql` applied
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Creator tab → Profile → Edit
3. Verify profile edit screen loads without errors
4. Verify all existing fields still work (display name, bio, location, specialties)
5. Save profile changes
6. Verify save succeeds

**Expected Result:**
- Profile edit works correctly
- No database errors related to removed columns
- No TypeScript errors in console

**Database Verification:**
```sql
-- Verify columns don't exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'creator_profiles' 
AND column_name IN ('persona', 'collab_types', 'preferred_compensation');
-- Should return 0 rows

-- Verify get_creators function works
SELECT * FROM get_creators(p_limit := 5);
-- Should return creators without errors
```

### Test Case CM-10-2: Verify get_creators Function Updated

**Objective:** Ensure get_creators function no longer accepts collab_types parameter.

**Prerequisites:**
- Migration applied
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Business tab → Browse Creators
3. Verify creator list loads
4. Verify filtering works (city, followers, engagement)
5. Verify no errors in console

**Expected Result:**
- Creator browse works correctly
- No errors about missing collab_types parameter
- Filtering functions as expected

**Database Verification:**
```sql
-- Test function call without collab_types
SELECT * FROM get_creators(
  p_city := NULL,
  p_min_followers := NULL,
  p_min_engagement := NULL,
  p_limit := 10,
  p_offset := 0
);
-- Should work without errors
```

---

## CM-11: Creator Availability Status

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

### Pre-Test Setup for CM-11

```sql
-- Ensure test creators have availability_status set
UPDATE creator_profiles cp
SET availability_status = 'available'
FROM users u
WHERE cp.user_id = u.id
AND u.email IN ('test-creator1@bypass.com', 'test-creator2@bypass.com', 'test-creator3@bypass.com');
```

### Test Case CM-11-1: Creator Sets Availability Status

**Objective:** Verify creators can set their availability status in profile edit.

**Prerequisites:**
- Pre-test setup completed
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Creator tab → Profile → Edit
3. Scroll to "Availability" section
4. Verify three options visible:
   - Available (with description "Actively looking for campaigns")
   - Busy (with description "Visible but may not respond quickly")
   - Not Accepting (with description "Hidden from browse, won't receive invites")
5. Select "Busy" option
6. Verify radio button updates
7. Click "Save"
8. Verify success message
9. Navigate back to profile view
10. Verify "Currently Busy" badge appears

**Expected Result:**
- Availability selector displays correctly
- Status saves successfully
- Badge appears on profile view
- Status persists after refresh

**Database Verification:**
```sql
-- Verify availability_status saved
SELECT cp.id, cp.availability_status, u.email
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com';
-- Should show: availability_status = 'busy'
```

### Test Case CM-11-2: Business Views Busy Creator

**Objective:** Verify businesses see busy badge when viewing creator profile.

**Prerequisites:**
- Creator set to "busy" (from CM-11-1)
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Business tab → Browse Creators
3. Find `test-creator1` in the list
4. Verify "Busy" badge appears on creator card
5. Click on creator card to view profile
6. Verify "Currently Busy" badge appears in profile header
7. Verify profile still accessible (not hidden)

**Expected Result:**
- Busy badge visible on card and profile
- Profile accessible to businesses
- Badge styling matches design (amber/yellow)

### Test Case CM-11-3: Not Accepting Creators Hidden from Browse

**Objective:** Verify creators with "not_accepting" status don't appear in browse.

**Prerequisites:**
- **Test Account:** `test-creator2@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Set test-creator2 to not_accepting
UPDATE creator_profiles cp
SET availability_status = 'not_accepting'
FROM users u
WHERE cp.user_id = u.id
AND u.email = 'test-creator2@bypass.com';
```

**Steps:**
1. Log in as `test-creator2@bypass.com`
2. Navigate to Profile → Edit
3. Set availability to "Not Accepting"
4. Save profile
5. Log in as `test-business1@bypass.com`
6. Navigate to Browse Creators
7. Verify `test-creator2` does NOT appear in list
8. Verify `test-creator1` (busy) and `test-creator3` (available) still appear

**Expected Result:**
- Not accepting creators excluded from browse
- Busy and available creators still visible
- Direct profile link still works (if shared before)

**Database Verification:**
```sql
-- Verify get_creators filters correctly
SELECT cp.id, cp.availability_status, u.email
FROM get_creators() gc
JOIN creator_profiles cp ON cp.id = gc.id
JOIN users u ON cp.user_id = u.id
WHERE u.email IN ('test-creator1@bypass.com', 'test-creator2@bypass.com', 'test-creator3@bypass.com');
-- Should show: test-creator1 (busy), test-creator3 (available)
-- Should NOT show: test-creator2 (not_accepting)
```

---

## CM-12: Campaign Form Simplification

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

### Pre-Test Setup for CM-12

```sql
-- Ensure test-business1 has a verified restaurant
UPDATE business_profiles bp
SET verification_status = 'verified'
FROM users u
WHERE bp.user_id = u.id
AND u.email = 'test-business1@bypass.com';
```

### Test Case CM-12-1: Create Campaign with Simplified Form

**Objective:** Verify campaign creation works with 3-step form (removed fields).

**Prerequisites:**
- Pre-test setup completed
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Business tab → Campaigns → Create Campaign
3. Verify step indicator shows "1 of 3" (not 4)
4. **Step 1: Campaign Basics**
   - Enter title: "CM-12 Test Campaign"
   - Enter description: "Test campaign with simplified form. Include hashtags and guidelines here."
   - Verify NO "Brand Guidelines" field
   - Click "Next"
5. **Step 2: Budget & Timeline**
   - Enter budget: "500"
   - Select deadline date
   - Verify NO "Posting Schedule" field
   - Click "Next"
6. **Step 3: Deliverables & Requirements**
   - Add deliverable: "Instagram Post" with description "1 Instagram post"
   - Add requirement: "Use #TroodieTest hashtag"
   - Verify NO "Content Types" selection
   - Verify NO "Target Audience" field
   - Click "Create Campaign"
7. Verify success message
8. Verify campaign appears in campaigns list

**Expected Result:**
- Form has 3 steps (not 4)
- Removed fields not present
- Campaign creates successfully
- Description placeholder includes guidelines hint

**Database Verification:**
```sql
-- Verify campaign created without removed fields
SELECT 
  c.id,
  c.title,
  c.description,
  c.deliverable_requirements
FROM campaigns c
JOIN restaurants r ON c.restaurant_id = r.id
JOIN business_profiles bp ON bp.restaurant_id = r.id
JOIN users u ON bp.user_id = u.id
WHERE u.email = 'test-business1@bypass.com'
AND c.title = 'CM-12 Test Campaign'
ORDER BY c.created_at DESC
LIMIT 1;
-- deliverable_requirements should NOT contain: target_audience, content_type, posting_schedule, brand_guidelines
-- deliverable_requirements should contain: deliverables array
```

### Test Case CM-12-2: Verify Requirements Moved to Step 3

**Objective:** Verify requirements section is now in Step 3 with deliverables.

**Prerequisites:**
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Create Campaign
3. Complete Steps 1 and 2
4. On Step 3, verify:
   - Deliverables section at top
   - Requirements section below deliverables
   - Requirements labeled "Additional Requirements (Optional)"
   - Hint text: "Add specific asks like hashtags, mentions, or timing"
5. Add multiple requirements
6. Verify requirements save correctly

**Expected Result:**
- Requirements in Step 3
- Requirements optional (not blocking submission)
- Requirements save with campaign

---

## CM-13: Display Deliverables to Creators

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

### Pre-Test Setup for CM-13

```sql
-- Create campaign with deliverables for testing
DO $$
DECLARE
  business_user_id UUID;
  restaurant_id_val UUID;
  campaign_id_val UUID;
BEGIN
  SELECT id INTO business_user_id FROM users WHERE email = 'test-business1@bypass.com';
  SELECT r.id INTO restaurant_id_val
  FROM restaurants r
  JOIN business_profiles bp ON bp.restaurant_id = r.id
  WHERE bp.user_id = business_user_id
  LIMIT 1;
  
  INSERT INTO campaigns (
    restaurant_id,
    owner_id,
    title,
    description,
    status,
    budget_cents,
    payout_per_creator,
    start_date,
    end_date,
    max_creators,
    deliverable_requirements
  )
  VALUES (
    restaurant_id_val,
    business_user_id,
    'CM-13 Test: Deliverables Display',
    'Test campaign to verify deliverables are shown to creators',
    'active',
    100000,
    100000,
    NOW(),
    NOW() + INTERVAL '30 days',
    3,
    '{
      "deliverables": [
        {
          "index": 1,
          "type": "Instagram Post",
          "quantity": 1,
          "description": "1 Instagram post showcasing the restaurant"
        },
        {
          "index": 2,
          "type": "Instagram Reel",
          "quantity": 1,
          "description": "1 Instagram reel (30+ seconds) featuring the atmosphere"
        }
      ]
    }'::jsonb
  )
  RETURNING id INTO campaign_id_val;
  
  RAISE NOTICE 'Created campaign % for CM-13 testing', campaign_id_val;
END $$;
```

### Test Case CM-13-1: Deliverables Displayed in Campaign Modal

**Objective:** Verify deliverables appear in campaign detail modal.

**Prerequisites:**
- Pre-test setup completed
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Creator tab → Explore Campaigns
3. Find "CM-13 Test: Deliverables Display" campaign
4. Click on campaign card
5. Verify campaign detail modal opens
6. Scroll through modal content
7. Verify "Expected Deliverables" section appears BEFORE "Requirements" section
8. Verify deliverables show:
   - "1× Instagram Post"
   - Description: "1 Instagram post showcasing the restaurant"
   - "1× Instagram Reel"
   - Description: "1 Instagram reel (30+ seconds) featuring the atmosphere"
9. Verify each deliverable in its own card/container

**Expected Result:**
- Deliverables section visible
- All deliverables displayed with type, quantity, and description
- Section appears before requirements
- Styling consistent with design system

**Database Verification:**
```sql
-- Verify campaign has deliverables
SELECT 
  c.title,
  c.deliverable_requirements->'deliverables' as deliverables
FROM campaigns c
WHERE c.title = 'CM-13 Test: Deliverables Display';
-- Should show JSONB array with 2 deliverables
```

### Test Case CM-13-2: Deliverable Count on Campaign Card

**Objective:** Verify deliverable count appears on campaign cards.

**Prerequisites:**
- Pre-test setup completed
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Explore Campaigns
3. Find "CM-13 Test: Deliverables Display" campaign card
4. Verify stats row shows:
   - Budget amount
   - Days left
   - Spots available
   - "2 deliverables" (with Target icon)
5. Verify deliverable count matches actual deliverables

**Expected Result:**
- Deliverable count visible on card
- Count accurate
- Icon and styling consistent

### Test Case CM-13-3: Campaign Without Deliverables

**Objective:** Verify campaigns without deliverables don't show deliverable section.

**Prerequisites:**
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Create campaign without deliverables
DO $$
DECLARE
  business_user_id UUID;
  restaurant_id_val UUID;
BEGIN
  SELECT id INTO business_user_id FROM users WHERE email = 'test-business1@bypass.com';
  SELECT r.id INTO restaurant_id_val
  FROM restaurants r
  JOIN business_profiles bp ON bp.restaurant_id = r.id
  WHERE bp.user_id = business_user_id
  LIMIT 1;
  
  INSERT INTO campaigns (
    restaurant_id,
    owner_id,
    title,
    description,
    status,
    budget_cents,
    start_date,
    end_date,
    max_creators,
    deliverable_requirements
  )
  VALUES (
    restaurant_id_val,
    business_user_id,
    'CM-13 Test: No Deliverables',
    'Campaign without deliverables',
    'active',
    50000,
    NOW(),
    NOW() + INTERVAL '30 days',
    2,
    NULL
  );
END $$;
```

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Explore Campaigns
3. Find "CM-13 Test: No Deliverables" campaign
4. Verify card does NOT show deliverable count
5. Open campaign modal
6. Verify "Expected Deliverables" section does NOT appear

**Expected Result:**
- No deliverable count on card
- No deliverables section in modal
- No errors or crashes

---

## CM-14: Creator Profile Business View Improvements

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

### Pre-Test Setup for CM-14

```sql
-- Set up test creator with portfolio and completed campaigns
DO $$
DECLARE
  creator_profile_id UUID;
  campaign_id_val UUID;
BEGIN
  -- Get creator profile ID
  SELECT cp.id INTO creator_profile_id
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email = 'test-creator1@bypass.com';
  
  -- Create completed campaign application with rating
  SELECT c.id INTO campaign_id_val
  FROM campaigns c
  JOIN restaurants r ON c.restaurant_id = r.id
  JOIN business_profiles bp ON bp.restaurant_id = r.id
  JOIN users u ON bp.user_id = u.id
  WHERE u.email = 'test-business1@bypass.com'
  LIMIT 1;
  
  -- Insert completed application with rating
  INSERT INTO campaign_applications (
    campaign_id,
    creator_id,
    status,
    rating
  )
  VALUES (
    campaign_id_val,
    creator_profile_id,
    'completed',
    4.8
  )
  ON CONFLICT DO NOTHING;
  
  -- Add portfolio items if none exist
  IF NOT EXISTS (SELECT 1 FROM creator_portfolio_items WHERE creator_profile_id = creator_profile_id) THEN
    INSERT INTO creator_portfolio_items (
      creator_profile_id,
      media_url,
      media_type,
      display_order
    )
    VALUES
      (creator_profile_id, 'https://example.com/portfolio1.jpg', 'image', 0),
      (creator_profile_id, 'https://example.com/portfolio2.jpg', 'image', 1),
      (creator_profile_id, 'https://example.com/portfolio3.jpg', 'image', 2);
  END IF;
END $$;
```

### Test Case CM-14-1: Enhanced Profile View with All Data

**Objective:** Verify business sees enhanced creator profile with all new fields.

**Prerequisites:**
- Pre-test setup completed
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Browse Creators
3. Find `test-creator1` in the list
4. Click on creator card to view profile
5. Verify profile header shows:
   - Display name
   - Username (@handle) below name
   - Location
   - Availability badge (if set)
6. Verify stats row shows 4 items:
   - Followers count
   - Engagement rate
   - Completed campaigns count (should show 1+)
   - Average rating (should show 4.8)
7. Scroll down and verify:
   - Estimated Rate card (green card showing rate range)
   - About section (with bio or "No bio provided")
   - Specialties section (with tags or "No specialties set")
   - Portfolio section (showing 3 portfolio images)
   - Sample Posts section (or "No posts yet")
8. Verify "Invite to Campaign" button at bottom (placeholder)

**Expected Result:**
- All new fields displayed
- Empty states show placeholders
- Portfolio section visible
- Stats row shows 4 metrics
- Estimated rate calculated correctly

**Database Verification:**
```sql
-- Verify profile data
SELECT 
  cp.id,
  cp.total_followers,
  cp.troodie_engagement_rate,
  u.username,
  (SELECT COUNT(*) FROM campaign_applications WHERE creator_id = cp.id AND status = 'completed') as completed_campaigns,
  (SELECT AVG(rating) FROM campaign_applications WHERE creator_id = cp.id AND status = 'completed' AND rating IS NOT NULL) as avg_rating
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com';
```

### Test Case CM-14-2: Profile with Missing Data (Empty States)

**Objective:** Verify empty states display correctly.

**Prerequisites:**
- **Test Account:** `test-creator2@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Ensure test-creator2 has minimal profile data
UPDATE creator_profiles cp
SET bio = NULL, specialties = NULL
FROM users u
WHERE cp.user_id = u.id
AND u.email = 'test-creator2@bypass.com';

-- Remove portfolio items
DELETE FROM creator_portfolio_items cpi
WHERE creator_profile_id IN (
  SELECT cp.id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email = 'test-creator2@bypass.com'
);
```

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Browse Creators
3. Find `test-creator2` and view profile
4. Verify empty states:
   - About section shows "No bio provided" (italic, gray)
   - Specialties section shows "No specialties set" (italic, gray)
   - Portfolio section does NOT appear (no items)
   - Sample Posts shows "No posts yet" (if no posts)

**Expected Result:**
- Empty states clearly indicated
- No blank/confusing sections
- Profile still usable

### Test Case CM-14-3: Estimated Rate Calculation

**Objective:** Verify estimated rate calculates correctly based on followers.

**Prerequisites:**
- **Test Account:** `test-creator3@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Set different follower counts for testing
UPDATE creator_profiles cp
SET total_followers = 3000  -- Should show $50 - $200
FROM users u
WHERE cp.user_id = u.id
AND u.email = 'test-creator3@bypass.com';
```

**Steps:**
1. Log in as `test-business1@bypass.com`
2. View `test-creator3` profile
3. Verify Estimated Rate shows "$50 - $200"
4. Update `test-creator3` followers to 8000 (should show "$200 - $500")
5. Refresh profile view
6. Verify rate updates

**Expected Result:**
- Rate ranges match follower counts:
  - < 5K: $50 - $200
  - 5K-10K: $200 - $500
  - 10K-50K: $500 - $1,000
  - 50K+: $1,000+

---

## CM-15: Creator Profile Edit Enhancements

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

### Pre-Test Setup for CM-15

```sql
-- Ensure test creator has some portfolio items
DO $$
DECLARE
  creator_profile_id UUID;
BEGIN
  SELECT cp.id INTO creator_profile_id
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email = 'test-creator1@bypass.com';
  
  -- Add portfolio items if none exist
  IF NOT EXISTS (SELECT 1 FROM creator_portfolio_items WHERE creator_profile_id = creator_profile_id) THEN
    INSERT INTO creator_portfolio_items (
      creator_profile_id,
      media_url,
      media_type,
      display_order
    )
    VALUES
      (creator_profile_id, 'https://example.com/portfolio1.jpg', 'image', 0),
      (creator_profile_id, 'https://example.com/portfolio2.jpg', 'image', 1);
  END IF;
END $$;
```

### Test Case CM-15-1: Profile Completeness Indicator

**Objective:** Verify completeness indicator displays and updates correctly.

**Prerequisites:**
- Pre-test setup completed
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Creator tab → Profile → Edit
3. Verify completeness card at top shows:
   - "Profile Completeness" title
   - Percentage (e.g., "60%")
   - Progress bar filled to percentage
   - Hint text showing missing items (e.g., "Add Bio and Portfolio images to improve visibility")
4. Fill in missing fields (e.g., add bio)
5. Verify percentage updates
6. Verify progress bar animates
7. Verify hint text updates

**Expected Result:**
- Completeness calculates correctly
- Progress bar visual updates
- Missing items identified accurately
- Percentage updates in real-time

**Database Verification:**
```sql
-- Check profile completeness factors
SELECT 
  cp.display_name,
  cp.bio,
  cp.location,
  cp.specialties,
  (SELECT COUNT(*) FROM creator_portfolio_items WHERE creator_profile_id = cp.id) as portfolio_count
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com';
-- Completeness = (fields filled / 5) * 100
-- Fields: display_name, bio, location, specialties (array), portfolio (min 3)
```

### Test Case CM-15-2: Portfolio Management

**Objective:** Verify creators can add and remove portfolio images.

**Prerequisites:**
- Pre-test setup completed
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Profile → Edit
3. Scroll to Portfolio section
4. Verify existing portfolio items display (if any)
5. Verify "Add Image" button visible (if < 10 images)
6. Click "Add Image"
7. Select image from device
8. Verify upload progress indicator
9. Verify image appears in portfolio grid after upload
10. Verify count updates (e.g., "3/10 images")
11. Click remove (X) button on an image
12. Confirm removal
13. Verify image removed from grid

**Expected Result:**
- Portfolio items load on mount
- Can add new images (up to 10)
- Can remove existing images
- Upload progress shown
- Images persist after refresh

**Database Verification:**
```sql
-- Verify portfolio items
SELECT 
  id,
  media_url,
  media_type,
  display_order
FROM creator_portfolio_items
WHERE creator_profile_id = (
  SELECT cp.id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email = 'test-creator1@bypass.com'
)
ORDER BY display_order;
-- Should show all portfolio items
```

### Test Case CM-15-3: Portfolio Maximum Limit

**Objective:** Verify portfolio limited to 10 images.

**Prerequisites:**
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Add 10 portfolio items
DO $$
DECLARE
  creator_profile_id UUID;
  i INTEGER;
BEGIN
  SELECT cp.id INTO creator_profile_id
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email = 'test-creator1@bypass.com';
  
  -- Delete existing items
  DELETE FROM creator_portfolio_items WHERE creator_profile_id = creator_profile_id;
  
  -- Add 10 items
  FOR i IN 0..9 LOOP
    INSERT INTO creator_portfolio_items (
      creator_profile_id,
      media_url,
      media_type,
      display_order
    )
    VALUES (
      creator_profile_id,
      'https://example.com/portfolio' || i || '.jpg',
      'image',
      i
    );
  END LOOP;
END $$;
```

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Profile → Edit
3. Scroll to Portfolio section
4. Verify count shows "10/10 images"
5. Verify "Add Image" button NOT visible (at limit)
6. Remove one image
7. Verify "Add Image" button appears
8. Add image back
9. Verify count returns to "10/10"

**Expected Result:**
- Maximum 10 images enforced
- Add button hidden at limit
- Can remove to add more

### Test Case CM-15-4: Profile Tips Section

**Objective:** Verify tips section provides helpful guidance.

**Prerequisites:**
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Profile → Edit
3. Verify "Profile Tips" card appears (amber/yellow styling)
4. Verify tips listed:
   - "Add a bio that describes your content style"
   - "Include 3+ portfolio images showing your best work"
   - "Set your location to appear in local searches"
   - "Add specialties that match your food content"
5. Verify tips are actionable and clear

**Expected Result:**
- Tips card visible
- Tips helpful and relevant
- Styling matches design (amber background)

---

## CM-16: Creator Rating System

### Test Case CM-16-1: Business Rates Creator After Campaign Completion

**Objective:** Verify businesses can rate creators after campaign completion.

**Prerequisites:**
- **Test Accounts:** 
  - `test-business1@bypass.com` (OTP: `000000`)
  - `test-creator1@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Ensure creator has completed campaign application
DO $$
DECLARE
  business_user_id UUID;
  creator_profile_id UUID;
  campaign_id UUID;
  application_id UUID;
BEGIN
  -- Get business user ID
  SELECT id INTO business_user_id
  FROM auth.users
  WHERE email = 'test-business1@bypass.com';

  -- Get creator profile ID
  SELECT cp.id INTO creator_profile_id
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email = 'test-creator1@bypass.com';

  -- Get or create a campaign
  SELECT id INTO campaign_id
  FROM campaigns
  WHERE restaurant_id IN (
    SELECT id FROM restaurants WHERE claimed_by = business_user_id
  )
  LIMIT 1;

  IF campaign_id IS NULL THEN
    -- Create a campaign
    INSERT INTO campaigns (
      restaurant_id,
      title,
      description,
      budget_cents,
      end_date,
      status
    )
    SELECT 
      r.id,
      'Test Campaign for Rating',
      'Test campaign for rating system',
      10000,
      NOW() + INTERVAL '30 days',
      'active'
    FROM restaurants r
    WHERE r.claimed_by = business_user_id
    LIMIT 1
    RETURNING id INTO campaign_id;
  END IF;

  -- Get or create application
  SELECT id INTO application_id
  FROM campaign_applications
  WHERE campaign_id = campaign_id
    AND creator_id = creator_profile_id;

  IF application_id IS NULL THEN
    INSERT INTO campaign_applications (
      campaign_id,
      creator_id,
      status,
      applied_at
    )
    VALUES (
      campaign_id,
      creator_profile_id,
      'accepted',
      NOW()
    )
    RETURNING id INTO application_id;
  ELSE
    -- Ensure status is accepted
    UPDATE campaign_applications
    SET status = 'accepted'
    WHERE id = application_id;
  END IF;

  -- Ensure no existing rating
  UPDATE campaign_applications
  SET rating = NULL, rating_comment = NULL, rated_at = NULL
  WHERE id = application_id;
END $$;

-- Verify setup
SELECT 
  ca.id as application_id,
  ca.status,
  ca.rating,
  c.title as campaign_title,
  cp.display_name as creator_name
FROM campaign_applications ca
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com'
  AND ca.status = 'accepted'
LIMIT 1;
-- Should show application with status 'accepted' and no rating
```

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Business → Campaigns
3. Open a campaign with accepted creator application
4. Navigate to "Applications" tab
5. Find the accepted application for `test-creator1@bypass.com`
6. Verify "Rate Creator" button appears (if not already rated)
7. Tap "Rate Creator" button
8. Verify rating modal opens with:
   - Star rating selector (1-5 stars)
   - Optional feedback text input
   - Submit button
9. Select 5 stars
10. Enter feedback: "Excellent work! Very professional."
11. Tap "Submit Rating"
12. Verify success message appears
13. Verify modal closes
14. Verify application now shows "Rated 5/5" with feedback displayed

**Expected Result:**
- Rating modal displays correctly
- Can select 1-5 stars
- Can submit rating with optional comment
- Rating saved and displayed
- Cannot rate twice (button disappears after rating)

**Database Verification:**
```sql
-- Verify rating saved
SELECT 
  ca.id,
  ca.rating,
  ca.rating_comment,
  ca.rated_at,
  cp.display_name as creator_name
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com'
  AND ca.rating IS NOT NULL
ORDER BY ca.rated_at DESC
LIMIT 1;
-- Should show rating = 5.0, comment, and rated_at timestamp
```

### Test Case CM-16-2: Rating Appears in Browse Creators

**Objective:** Verify creator ratings display correctly in browse creators.

**Prerequisites:**
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)
- **Pre-Test:** Complete CM-16-1 to create a rating

**Pre-Test Setup:**
```sql
-- Ensure creator has at least one rating
-- (Should already exist from CM-16-1)
SELECT 
  cp.id as creator_id,
  COUNT(ca.rating) as rating_count,
  AVG(ca.rating) as avg_rating
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
JOIN campaign_applications ca ON ca.creator_id = cp.id
WHERE u.email = 'test-creator1@bypass.com'
  AND ca.rating IS NOT NULL
GROUP BY cp.id;
-- Should show at least 1 rating
```

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Business → Creators → Browse
3. Find `test-creator1@bypass.com` in the list
4. Verify rating displays:
   - Star icon
   - Rating number (e.g., "4.8")
   - Rating appears next to engagement rate
5. Verify rating is accurate (matches average of all ratings)

**Expected Result:**
- Rating displays correctly
- Rating is accurate (average of all ratings)
- Rating format: "X.X" (1 decimal place)
- No random/fake ratings

**Database Verification:**
```sql
-- Verify rating calculation
SELECT 
  cp.id,
  cp.display_name,
  COUNT(ca.rating) as total_ratings,
  ROUND(AVG(ca.rating)::numeric, 1) as avg_rating
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
JOIN campaign_applications ca ON ca.creator_id = cp.id
WHERE u.email = 'test-creator1@bypass.com'
  AND ca.rating IS NOT NULL
GROUP BY cp.id, cp.display_name;
-- Should match displayed rating
```

### Test Case CM-16-3: Rating Appears in Creator Profile

**Objective:** Verify ratings display in creator profile view.

**Prerequisites:**
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)
- **Pre-Test:** Complete CM-16-1 to create a rating

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Business → Creators → Browse
3. Tap on `test-creator1@bypass.com` card
4. Navigate to creator profile
5. Verify rating displays in stats section:
   - Star icon
   - Rating number (e.g., "4.8")
   - Appears in 4-item stats row (Followers, Engagement, Campaigns, Rating)
6. Verify rating matches average of all ratings

**Expected Result:**
- Rating displays in profile stats
- Rating accurate and matches database
- Rating format consistent with browse view

### Test Case CM-16-4: Cannot Rate Incomplete Campaigns

**Objective:** Verify rating only available for completed campaigns.

**Prerequisites:**
- **Test Accounts:** 
  - `test-business1@bypass.com` (OTP: `000000`)
  - `test-creator1@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Create pending application
DO $$
DECLARE
  business_user_id UUID;
  creator_profile_id UUID;
  campaign_id UUID;
BEGIN
  SELECT id INTO business_user_id FROM auth.users WHERE email = 'test-business1@bypass.com';
  SELECT cp.id INTO creator_profile_id
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email = 'test-creator1@bypass.com';
  
  SELECT id INTO campaign_id
  FROM campaigns
  WHERE restaurant_id IN (
    SELECT id FROM restaurants WHERE claimed_by = business_user_id
  )
  LIMIT 1;

  -- Create pending application
  INSERT INTO campaign_applications (
    campaign_id,
    creator_id,
    status,
    applied_at
  )
  VALUES (
    campaign_id,
    creator_profile_id,
    'pending',
    NOW()
  )
  ON CONFLICT DO NOTHING;
END $$;
```

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Business → Campaigns
3. Open campaign with pending application
4. Navigate to "Applications" tab
5. Find pending application
6. Verify "Rate Creator" button does NOT appear
7. Accept the application
8. Verify "Rate Creator" button now appears

**Expected Result:**
- Rating button only appears for accepted applications
- Cannot rate pending applications
- Cannot rate rejected applications

---

## CM-17: Enhanced Empty States

### Test Case CM-17-1: Browse Creators Empty State

**Objective:** Verify enhanced empty state in browse creators.

**Prerequisites:**
- **Test Account:** `test-business1@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Temporarily hide all creators (for testing)
-- Note: This is just for testing - restore after test
UPDATE creator_profiles
SET open_to_collabs = false
WHERE id IN (
  SELECT cp.id
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.account_type = 'creator'
);
```

**Steps:**
1. Log in as `test-business1@bypass.com`
2. Navigate to Business → Creators → Browse
3. Verify empty state displays:
   - Users icon (gray)
   - Title: "No Creators Found"
   - Message: "No creators are currently available. Check back later for new creators."
4. Enter search query "nonexistent"
5. Verify empty state updates:
   - Message: "Try adjusting your filters or check back later for new creators."
   - "Clear Search" button appears
6. Tap "Clear Search" button
7. Verify search cleared and empty state returns to default

**Expected Result:**
- Empty state displays with icon, title, message
- Message changes based on search state
- CTA button appears when applicable
- Clear search button works

**Post-Test Cleanup:**
```sql
-- Restore creators
UPDATE creator_profiles
SET open_to_collabs = true
WHERE id IN (
  SELECT cp.id
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.account_type = 'creator'
);
```

### Test Case CM-17-2: Campaign Applications Empty State

**Objective:** Verify enhanced empty state in creator campaigns.

**Prerequisites:**
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Ensure creator has no pending applications
DELETE FROM campaign_applications
WHERE creator_id = (
  SELECT cp.id
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email = 'test-creator1@bypass.com'
)
AND status = 'pending';
```

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Creator → My Campaigns
3. Tap "Pending" tab
4. Verify empty state displays:
   - Target icon (gray)
   - Title: "No Pending Applications"
   - Message: "Start applying to campaigns to get matched with restaurants."
   - "Explore Campaigns" button appears
5. Tap "Explore Campaigns" button
6. Verify navigates to `/creator/explore-campaigns`

**Expected Result:**
- Empty state displays correctly
- CTA button appears
- Button navigates to correct screen
- Message is helpful and actionable

### Test Case CM-17-3: Invitations Empty State

**Objective:** Verify empty state for invitations tab.

**Prerequisites:**
- **Test Account:** `test-creator1@bypass.com` (OTP: `000000`)

**Pre-Test Setup:**
```sql
-- Ensure creator has no invitations
DELETE FROM campaign_invitations
WHERE creator_id = (
  SELECT cp.id
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email = 'test-creator1@bypass.com'
);
```

**Steps:**
1. Log in as `test-creator1@bypass.com`
2. Navigate to Creator → My Campaigns
3. Tap "Invitations" tab
4. Verify empty state displays:
   - Target icon (gray)
   - Title: "No Invitations"
   - Message: "You haven't received any campaign invitations yet."

**Expected Result:**
- Empty state displays correctly
- Message is clear and helpful
- No CTA needed (invitations are received, not initiated by creator)

---

## Test Data Cleanup

After testing, clean up test data:

```sql
-- See CREATOR_MARKETPLACE_REVIEW.md Section 7 for cleanup scripts
-- Use email pattern: %@troodieapp.com or %@test.com
```

**Note:** Test data reference files in `data/test-data/dev/` are documentation only and don't need cleanup. They contain queries to find entities, not the entities themselves.

## Test Data Helper Script

Use the helper script to quickly reference test data:

```bash
# View test users
node scripts/test-data-helper.js users

# View test restaurants (includes SQL queries)
node scripts/test-data-helper.js restaurants

# View creator profiles
node scripts/test-data-helper.js creator-profiles

# View other test data types
node scripts/test-data-helper.js campaigns
node scripts/test-data-helper.js applications
node scripts/test-data-helper.js deliverables
node scripts/test-data-helper.js posts
```

The script displays:
- Entity IDs and metadata
- SQL queries to find entities in the database
- Purpose and usage notes
- Relationships and dependencies

---

## Reporting Issues

When reporting bugs, include:
1. Test case number
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots/logs
5. Database state (if applicable)

---

**Last Updated:** January 22, 2025 (Added CM-16 and CM-17 test cases)  
**Status:** Complete - All features (CM-1 through CM-15, ER-001, ER-007, ER-008) implemented and tested

## Quick Reference

### Beta Passcode
**Passcode:** `TROODIE2025` (all uppercase, no spaces)

**When Required:**
- Creator onboarding ("Become a Creator")
- Restaurant claiming ("Claim Your Restaurant")
- Entered automatically when typing in beta gate

### Test Accounts Summary

| Account Type | Email Pattern | Count | Purpose |
|-------------|---------------|-------|---------|
| Consumer | `test-consumer1@troodieapp.com` through `test-consumer10@troodieapp.com` | 10 | Test consumer features, upgrade to creator |
| Creator | `test-creator1@troodieapp.com` through `test-creator7@troodieapp.com` | 7 | Test creator features, campaigns, deliverables, discovery |
| Business | `test-business1@troodieapp.com` (NEW)<br>`test-business2@troodieapp.com` (MEDIUM)<br>`test-business3@troodieapp.com` (HIGH) | 3 | Test business features, restaurant management, scalability |

### Test Restaurants Summary

| Restaurant | Status | Claimed By | Purpose |
|------------|--------|------------|---------|
| Restaurant 1 | Claimed | test-business1@troodieapp.com | New user experience (no campaigns) |
| Restaurant 2 | Claimed | test-business2@troodieapp.com | Medium activity (3 campaigns, ~8 applications) |
| Restaurant 3 | Claimed | test-business3@troodieapp.com | High activity (10 campaigns, ~25 applications) |
| 5 Unclaimed Restaurants | Unclaimed | None | Test restaurant claiming flow |

**Contact:** team@troodieapp.com for access questions

