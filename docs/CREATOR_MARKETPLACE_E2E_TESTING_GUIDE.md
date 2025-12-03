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
**Testing Confirmed:** ⬜ Not Yet Tested

#### Test Case 1.1: Successful Atomic Upgrade
1. **Setup:** Consumer account with no creator profile
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
4. **Verification SQL:**
   ```sql
   SELECT u.id, u.account_type, u.is_creator, cp.id as profile_id
   FROM users u
   LEFT JOIN creator_profiles cp ON cp.user_id = u.id
   WHERE u.email = 'test-creator1@troodieapp.com';
   -- Should show: account_type='creator', is_creator=true, profile_id NOT NULL
   ```

#### Test Case 1.2: Rollback on Profile Creation Failure
1. **Setup:** Simulate profile creation failure (temporarily break RLS policy)
2. **Steps:**
   - Attempt creator onboarding
   - Profile creation should fail
3. **Expected:**
   - Account remains `consumer` type
   - No partial `creator_profiles` record
   - Error message shown with retry option
4. **Verification:**
   - Check user account_type is still 'consumer'
   - Verify no creator_profiles record exists

---

### CM-2: Portfolio Image Upload

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

#### Test Case 2.1: Successful Image Upload
1. **Setup:** Creator onboarding flow
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
2. **Steps:**
   - Select mix of images and videos (e.g., 2 images, 2 videos)
   - Complete onboarding
3. **Expected:**
   - Both images and videos upload successfully
   - Media type correctly set for each item
   - All items display in portfolio

#### Test Case 2.2: Upload Failure Handling
1. **Setup:** Simulate network failure during upload
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
2. **Steps:**
   - Upload large image
3. **Expected:**
   - Image compressed to < 1MB
   - Quality remains acceptable
   - Upload completes successfully

---

### CM-3: Campaign Application creator_id

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

#### Test Case 3.1: Successful Application Submission
1. **Setup:** Creator account with complete profile
2. **Steps:**
   - Navigate to available campaigns
   - Apply to campaign with:
     - Proposed rate
     - Cover letter
     - Proposed deliverables
   - Submit application
3. **Expected:**
   - Application saved with correct `creator_profiles.id` (not `users.id`)
   - Success confirmation shown
   - Application visible in creator dashboard
4. **Verification SQL:**
   ```sql
   SELECT ca.id, ca.creator_id, cp.id as profile_id, cp.user_id
   FROM campaign_applications ca
   JOIN creator_profiles cp ON ca.creator_id = cp.id
   WHERE cp.user_id IN (SELECT id FROM users WHERE email LIKE 'test-creator%@troodieapp.com');
   -- creator_id should equal profile_id, not user_id
   ```

#### Test Case 3.2: Missing Creator Profile
1. **Setup:** User with `is_creator=true` but no `creator_profiles` record
2. **Steps:**
   - Attempt to apply to campaign
3. **Expected:**
   - Error: "Please complete your creator profile first"
   - Redirect to profile setup

#### Test Case 3.3: Duplicate Application Prevention
1. **Setup:** Creator with existing application to campaign
2. **Steps:**
   - Attempt to apply to same campaign again
3. **Expected:**
   - Error: "You have already applied to this campaign"
   - No duplicate application created

---

### CM-4: Deliverable URL Validation

**Status:** ✅ Implemented  
**Testing Confirmed:** ⬜ Not Yet Tested

#### Test Case 4.1: Instagram URL Patterns
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
Test URLs:
- ✅ `https://www.tiktok.com/@user/video/1234567890`
- ✅ `https://vm.tiktok.com/ABC123/` (Shortened)
- ✅ `https://tiktok.com/t/ABC123/`

**Expected:** All validate as "tiktok"

#### Test Case 4.3: YouTube URL Patterns
Test URLs:
- ✅ `https://youtube.com/watch?v=ABC123`
- ✅ `https://youtube.com/shorts/ABC123` (Shorts)
- ✅ `https://youtu.be/ABC123` (Shortened)
- ✅ `https://youtube.com/live/ABC123` (Live)

**Expected:** All validate as "youtube"

#### Test Case 4.4: New Platforms
Test URLs:
- ✅ `https://www.threads.net/@user/post/ABC123` (Threads)
- ✅ `https://linkedin.com/posts/user_ABC123` (LinkedIn)

**Expected:** Validation passes with platform detection

#### Test Case 4.5: Unknown URLs with Warning
Test URLs:
- `https://example.com/post/123` (Unknown platform)
- `https://instagram.com/unknown-format/123` (Known domain, unknown format)

**Expected:**
- Validation passes (doesn't block)
- Warning shown: "Platform not auto-detected. Please verify the link works."
- User can still submit

#### Test Case 4.6: Invalid URLs
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
1. **Verification:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'auto-approve-deliverables';
   ```
2. **Expected:**
   - Job exists
   - Schedule: `0 * * * *` (every hour)
   - Active status

#### Test Case 5.2: Manual Trigger Test
1. **Steps:**
   ```sql
   SELECT trigger_auto_approval_manually();
   ```
2. **Expected:**
   - Returns JSON with `approved_count`
   - Log entry in `cron_job_logs`
   - Deliverables >72 hours old auto-approved

#### Test Case 5.3: Auto-Approval Execution
1. **Setup:**
   - Create deliverable with `submitted_at` = 73 hours ago
   - Status = `pending_review`
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
2. **Steps:** Run auto-approval
3. **Expected:**
   - Status remains `pending_review`
   - Not auto-approved

#### Test Case 5.5: Already Reviewed Not Affected
1. **Setup:** Deliverable approved manually 80 hours ago
2. **Steps:** Run auto-approval
3. **Expected:**
   - Status remains `approved`
   - Not changed to `auto_approved`

#### Test Case 5.6: Monitoring View
1. **Query:**
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
2. **Steps:**
   - Navigate to Create Campaign
   - Fill all required fields
   - Submit
3. **Expected:**
   - Restaurant name displayed in header
   - Form loads successfully
   - Campaign created with correct `restaurant_id`

#### Test Case 7.2: No Business Profile
1. **Setup:** User without business profile
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
2. **Steps:**
   - Navigate to Create Campaign
3. **Expected:**
   - Error screen: "No Restaurant Linked"
   - Message: "Please claim a restaurant before creating campaigns"
   - "Claim Restaurant" button → redirects to claim flow
   - "Go Back" button available

#### Test Case 7.4: Unverified Restaurant
1. **Setup:** Business profile with unverified restaurant claim
2. **Steps:**
   - Navigate to Create Campaign
3. **Expected:**
   - Error screen: "Something Went Wrong"
   - Message: "Your restaurant claim is pending verification"
   - "Retry" button available

#### Test Case 7.5: Network Error Handling
1. **Setup:** Simulate network failure
2. **Steps:**
   - Navigate to Create Campaign
   - Network fails during restaurant data load
3. **Expected:**
   - Error screen with retry option
   - Clear error message
   - Can retry without leaving screen

#### Test Case 7.6: Submit Button Disabled
1. **Setup:** Campaign form with missing restaurant data
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
2. **Steps:**
   - Have another user save the restaurant
   - Observe dashboard
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
2. **Steps:**
   - Pull down to refresh
3. **Expected:**
   - Refresh indicator shows
   - Data reloads
   - Metrics update
   - Loading state shown during refresh

#### Test Case 6.9: Empty State
1. **Setup:** New restaurant with no saves/posts
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
2. **Steps:**
   - View restaurant you own
   - View restaurant you don't own
3. **Expected:**
   - "Edit Details" button visible for owned restaurant
   - Button hidden for non-owned restaurant
   - Button navigates to edit screen

#### Test Case 8.2: Edit Description
1. **Setup:** Restaurant owner viewing own restaurant
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
2. **Steps:**
   - Tap "Reset" in filter sheet
   - OR remove all active filter badges
3. **Expected:**
   - All filters cleared
   - Full creator list shown
   - Filter count resets to 0

#### Test Case 9.8: Creator Profile View
1. **Setup:** Creators discovery screen
2. **Steps:**
   - Tap a creator card
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
2. **Steps:**
   - Scroll to bottom of list
3. **Expected:**
   - More creators load automatically
   - Loading indicator shown
   - Smooth infinite scroll
   - No duplicates

#### Test Case 9.14: Empty State
1. **Setup:** Filters that return no results
2. **Steps:**
   - Apply strict filters (e.g., 50K+ followers in small city)
3. **Expected:**
   - "No creators found" message
   - "Clear Filters" button shown
   - Helpful empty state

#### Test Case 9.15: Pull-to-Refresh
1. **Setup:** Creators discovery screen
2. **Steps:**
   - Pull down to refresh
3. **Expected:**
   - Refresh indicator shows
   - Creator list reloads
   - New creators appear if available

#### Test Case 9.16: Creator Metrics Update
1. **Setup:** Creator with posts
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
2. **Steps:**
   - Enter search query in search bar
   - Observe results
3. **Expected:**
   - Results filter by name, username, or bio
   - Count updates dynamically
   - Empty state shown if no matches

#### Test Case 9.19: Contact Creator from Browse
1. **Setup:** Browse Creators screen
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

**Last Updated:** January 22, 2025  
**Status:** Complete - All features (CM-1 through CM-9) implemented and tested

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

