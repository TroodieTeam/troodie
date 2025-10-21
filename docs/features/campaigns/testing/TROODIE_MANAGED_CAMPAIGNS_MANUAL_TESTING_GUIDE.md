# Troodie-Managed Campaigns - Manual Testing Guide

**Version:** 1.0
**Date:** October 13, 2025
**Purpose:** Comprehensive manual testing procedures for Troodie-Managed Campaigns feature

---

## Overview

This guide provides step-by-step manual testing procedures to verify all functionality of the Troodie-Managed Campaigns feature before production deployment. Each test includes:
- Prerequisites
- Step-by-step instructions
- Expected results
- Pass/Fail criteria

**Estimated Testing Time:** 6-8 hours for complete pass

---

## Test Environment Setup

### Prerequisites
1. **Access Requirements:**
   - Admin account credentials (kouame@troodieapp.com or other admin account)
   - Creator account credentials (verified creator)
   - Database access (Supabase dashboard)

2. **Data Setup:**
   - Run TMC-001 database migration
   - Run TMC-002 system account seed script
   - Verify Troodie system account exists

3. **App Build:**
   - Latest app build on iOS/Android device
   - Staging environment configured
   - Network access to Supabase

### Verification Checklist
- [ ] Database migration successful
- [ ] System account created (verify in Supabase)
- [ ] Admin account has role='admin'
- [ ] Creator account has account_type='creator' and is_verified=true
- [ ] App connected to staging database

---

## Test Suite 1: Database Schema & System Account

### Test 1.1: Verify Database Schema

**Objective:** Confirm all new tables, columns, and indexes exist

**Steps:**
1. Open Supabase dashboard → Database → Tables
2. Verify `restaurants` table has new columns:
   - `is_platform_managed` (boolean)
   - `managed_by` (varchar)
3. Verify `campaigns` table has new columns:
   - `campaign_source` (varchar with constraint)
   - `is_subsidized` (boolean)
   - `subsidy_amount_cents` (integer)
4. Verify `platform_managed_campaigns` table exists with all columns
5. Check Table Editor → Indexes → Verify indexes exist:
   - `idx_restaurants_platform_managed`
   - `idx_campaigns_source`
   - `idx_campaigns_subsidized`
   - `idx_platform_campaigns_type`

**Expected Results:**
- All new columns present with correct data types
- All indexes created
- No migration errors in logs

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 1.2: Verify System Account

**Objective:** Confirm Troodie system account is properly configured

**Steps:**
1. Open Supabase → Table Editor → `users`
2. Filter by id = `00000000-0000-0000-0000-000000000001`
3. Verify user row exists with:
   - email: `kouame@troodieapp.com`
   - username: `troodie_official`
   - account_type: `business`
   - role: `admin`
   - is_verified: `true`
4. Navigate to `restaurants` table
5. Filter by id = `00000000-0000-0000-0000-000000000002`
6. Verify restaurant row exists with:
   - name: `Troodie Community`
   - is_platform_managed: `true`
   - managed_by: `troodie`
7. Navigate to `business_profiles` table
8. Filter by user_id = system account ID
9. Verify business profile links user to restaurant

**Expected Results:**
- System user account exists and properly configured
- Troodie restaurant exists and marked as platform-managed
- Business profile correctly links user to restaurant

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 1.3: Verify RLS Policies

**Objective:** Confirm Row Level Security policies work correctly

**Steps:**
1. Log in to app as admin user
2. Open Supabase SQL Editor
3. Run query as admin:
   ```sql
   SELECT * FROM platform_managed_campaigns;
   ```
4. Verify results returned (admin can see data)
5. Log out and log in as creator account
6. Run same query
7. Verify no results (creator cannot see data)

**Expected Results:**
- Admin users can query platform_managed_campaigns
- Non-admin users receive empty result or error
- RLS policies properly restrict access

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 1.4: Verify Triggers

**Objective:** Confirm database triggers update metrics automatically

**Steps:**
1. Create a test platform campaign (see Test 2.1)
2. Create a test creator application to the campaign
3. Open Supabase → `campaign_applications` → Update status to 'accepted'
4. Refresh `platform_managed_campaigns` table
5. Verify `actual_spend_cents` increased by `proposed_rate_cents`
6. Update application status to 'completed'
7. Refresh `platform_managed_campaigns` table
8. Verify `actual_creators` and `actual_content_pieces` incremented

**Expected Results:**
- Trigger fires on application acceptance
- actual_spend_cents updates correctly
- Trigger fires on completion
- Creator/content metrics update correctly

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test Suite 2: Admin Campaign Creation

### Test 2.1: Create Direct Campaign (Happy Path)

**Objective:** Create a Troodie-direct campaign successfully

**Steps:**
1. Log in to app as admin user
2. Navigate: More → Admin Panel → Create Platform Campaign
3. **Step 1 - Select Type:**
   - Tap "Direct (Troodie-branded)"
   - Verify orange styling and description
   - Tap "Next"
4. **Step 2 - Campaign Details:**
   - Title: "Test Direct Campaign"
   - Description: "This is a test campaign for QA"
   - Requirements: "Create Instagram Reel about your favorite dish"
   - Content Guidelines: "Tag @troodie and use #TroodieCommunity"
   - Tap "Next"
5. **Step 3 - Budget:**
   - Budget Source: "Marketing"
   - Approved Budget: "$500" (50000 cents)
   - Target Creators: 10
   - Target Content Pieces: 10
   - Duration: 30 days
   - Max Applications: 50
   - Proposed Rate: "$25"
   - Tap "Next"
6. **Step 4 - Preview:**
   - Verify all details display correctly
   - Verify shows "Troodie Official Campaign" header
   - Tap "Create Campaign"
7. Verify success message appears
8. Tap "View Campaign"
9. Verify redirected to campaign detail screen

**Expected Results:**
- Wizard progresses through all steps smoothly
- All form fields accept valid input
- Preview shows correct information
- Campaign created successfully
- Redirects to campaign detail screen
- Campaign visible in creator feed with "Troodie Official" badge

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 2.2: Create Partnership Campaign

**Objective:** Create a white-label partnership campaign

**Steps:**
1. Create a test restaurant first (or use existing)
2. Navigate: Admin Panel → Create Platform Campaign
3. **Step 1:** Select "Partnership (White-label)"
4. **Step 2:** Enter campaign details
5. **Step 3:** Set budget (Budget Source: "Partnerships")
6. **Step 4 - Partnership Details:**
   - Select partner restaurant from dropdown
   - Subsidy Amount: "$250"
   - Partnership Agreement Signed: Yes
   - Tap "Next"
7. **Step 5 - Preview:**
   - Verify shows as restaurant campaign (NOT Troodie branded)
   - Tap "Create Campaign"

**Expected Results:**
- Partnership details step shows after budget
- Partner restaurant dropdown populated
- Campaign created with campaign_source='troodie_partnership'
- Campaign appears as if from partner restaurant (no Troodie badge)
- is_subsidized=true in database

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 2.3: Create Community Challenge

**Objective:** Create a challenge campaign

**Steps:**
1. Navigate: Admin Panel → Create Platform Campaign
2. **Step 1:** Select "Community Challenge"
3. **Step 2:** Enter challenge details
   - Title: "Best Brunch Spot Challenge"
   - Description: "Show us your favorite brunch spot!"
4. **Step 3:** Set budget (Budget Source: "Content", Prize Pool: "$500")
5. **Step 4 - Preview:**
   - Verify "Challenge" header displayed
   - Tap "Create Campaign"

**Expected Results:**
- Challenge created with campaign_source='community_challenge'
- Shows purple "Challenge" badge in creator feed
- Trophy icon visible

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 2.4: Form Validation

**Objective:** Verify form prevents invalid input

**Test Cases:**

| Field | Invalid Input | Expected Behavior |
|-------|---------------|-------------------|
| Title | Empty | Error: "Title is required" |
| Title | 500 characters | Accept or show char limit |
| Budget | "abc" (non-numeric) | Reject or parse as $0 |
| Budget | $0 | Allow or show min budget error |
| Target Creators | 0 | Allow or show min value error |
| Duration | 0 days | Error: "Min 1 day" |
| Duration | 1000 days | Allow or show max duration |

**For each test case:**
1. Enter invalid input
2. Attempt to proceed to next step
3. Verify appropriate error message
4. Correct the input
5. Verify can proceed

**Expected Results:**
- All validation errors display clearly
- User cannot proceed with invalid data
- Error messages are helpful

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 2.5: Campaign Creation Error Handling

**Objective:** Verify graceful error handling

**Steps:**
1. Start campaign creation wizard
2. Fill out all steps correctly
3. **Before submitting:** Turn off WiFi/network
4. Tap "Create Campaign"
5. Wait for timeout
6. Verify error message displays
7. Turn network back on
8. Verify can retry

**Expected Results:**
- Network error caught gracefully
- User-friendly error message shown
- No partial campaign created in database
- User can retry without losing form data

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test Suite 3: Creator Campaign UI

### Test 3.1: Campaign Badges Display

**Objective:** Verify correct badges show on campaign cards

**Steps:**
1. Log in as creator
2. Navigate to Campaigns tab
3. Verify campaigns display in feed
4. Locate a Troodie-direct campaign
5. Verify shows **orange "Troodie Official" badge** with shield icon
6. Locate a community challenge
7. Verify shows **purple "Challenge" badge** with trophy icon
8. Locate a partnership campaign (if available)
9. Verify shows **NO badge** (appears as regular restaurant campaign)
10. Locate a regular restaurant campaign
11. Verify shows **NO badge**

**Expected Results:**
- Direct campaigns: Orange "Troodie Official" badge
- Challenges: Purple "Challenge" badge
- Partnerships: No badge (appears normal)
- Restaurant campaigns: No badge
- Badges positioned consistently (top-right corner)

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 3.2: Campaign Detail Screen - Troodie Direct

**Objective:** Verify trust indicators show for Troodie campaigns

**Steps:**
1. From Campaigns tab, tap a Troodie-direct campaign
2. Verify Campaign Detail Screen displays:
   - **Header:** "Troodie Official Campaign" in orange
   - **Subheader:** "Platform-managed opportunity with guaranteed payment"
   - **Restaurant Section:** Shows "Troodie Community" with logo
   - **Trust Indicators Section:** "Why This Campaign is Special"
     - ✓ Guaranteed Payment - "Troodie handles all payments directly"
     - ⏱ Fast Approval - "24-48 hour application review"
     - ✓ Platform Managed - "Direct support from Troodie team"
   - **Campaign Details:** Title, description, requirements
   - **Payment:** Shows proposed rate
   - **Apply Button:** Enabled if eligible

**Expected Results:**
- Special Troodie header displays
- Trust indicators section present
- All indicators show with icons
- Apply button works (proceeds to application)

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 3.3: Campaign Detail Screen - Partnership

**Objective:** Verify partnership campaigns appear as restaurant campaigns

**Steps:**
1. Tap a partnership campaign from feed
2. Verify Campaign Detail Screen displays:
   - **NO special header** (no "Troodie Official" branding)
   - **Restaurant Section:** Shows partner restaurant name
   - **NO trust indicators section**
   - Campaign appears identical to normal restaurant campaign
   - Apply button works normally

**Expected Results:**
- No Troodie branding visible
- Appears as authentic restaurant campaign
- Creator cannot tell it's subsidized
- Apply flow identical to restaurant campaigns

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 3.4: Campaign Detail Screen - Challenge

**Objective:** Verify challenge campaigns have special UI

**Steps:**
1. Tap a community challenge from feed
2. Verify Campaign Detail Screen displays:
   - **Header:** "Community Challenge" in purple with trophy icon
   - **Subheader:** "Compete with other creators for prizes and recognition"
   - **Prize Information:** Shows prize pool amount prominently
   - **Challenge Rules:** Special section for rules and judging
   - Apply button enabled

**Expected Results:**
- Purple challenge branding
- Trophy icon visible
- Prize pool highlighted
- Challenge-specific information shown

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 3.5: Campaign Filters

**Objective:** Verify campaign filtering works correctly

**Steps:**
1. From Campaigns tab, tap "Filter" button (top-right)
2. Verify Filter Modal opens
3. **Filter by Troodie Official:**
   - Tap "Troodie Official"
   - Tap "Apply Filters"
   - Verify only shows campaigns with "Troodie Official" badge
   - Verify count accurate
4. Clear filter, tap "Filter" again
5. **Filter by Challenges:**
   - Tap "Challenges"
   - Tap "Apply Filters"
   - Verify only shows campaigns with "Challenge" badge
6. Clear filter, tap "Filter" again
7. **Filter by Restaurant Campaigns:**
   - Tap "Restaurant Campaigns"
   - Tap "Apply Filters"
   - Verify only shows regular + partnership campaigns (no badges)
8. Clear filter
9. **Select "All Campaigns":**
   - Tap "All Campaigns"
   - Tap "Apply Filters"
   - Verify shows all campaigns

**Expected Results:**
- Filter modal opens smoothly
- Each filter correctly filters campaigns
- Filter selection persists until changed
- "Apply Filters" button dismisses modal
- Filtered results accurate

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 3.6: Application Flow - Troodie Campaign

**Objective:** Verify applying to Troodie campaign works identically to restaurant campaigns

**Steps:**
1. Navigate to a Troodie-direct campaign detail
2. Tap "Apply Now"
3. Fill out application (if required)
4. Submit application
5. Verify application submitted successfully
6. Check application status in "My Applications"
7. Verify status shows "pending"

**Expected Results:**
- Application flow identical to restaurant campaigns
- No special steps for Troodie campaigns
- Application recorded in database
- Status visible in My Applications

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test Suite 4: Budget Analytics Dashboard

### Test 4.1: Access Analytics Dashboard

**Objective:** Verify only admins can access analytics

**Steps:**
1. Log in as **creator account**
2. Navigate to More → Admin Panel
3. Verify "Campaign Analytics" option NOT visible or disabled
4. Log out
5. Log in as **admin account**
6. Navigate to More → Admin Panel
7. Verify "Campaign Analytics" option visible
8. Tap "Campaign Analytics"
9. Verify dashboard loads

**Expected Results:**
- Creators cannot access analytics
- Admins can access analytics
- Dashboard loads successfully

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 4.2: Budget Overview Accuracy

**Objective:** Verify budget calculations are correct

**Preparation:**
1. Create 2 test campaigns with known budgets:
   - Campaign A: $500 approved, 5 accepted applications at $25 each = $125 actual spend
   - Campaign B: $300 approved, 3 accepted applications at $50 each = $150 actual spend
2. Total approved: $800
3. Total spent: $275
4. Remaining: $525
5. Utilization: 34.375%

**Steps:**
1. Open Campaign Analytics dashboard
2. View Budget Overview Card
3. **Verify calculations:**
   - Total Approved Budget: $800.00
   - Total Actual Spend: $275.00
   - Remaining Budget: $525.00
   - Budget Utilization: 34.4%
4. Verify progress bar shows ~34% filled
5. Verify utilization text matches

**Expected Results:**
- All budget numbers match expected calculations
- Progress bar visual accurate
- No warning badge (utilization <80%)

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 4.3: Key Metrics Grid

**Objective:** Verify metrics display correctly

**Using same test campaigns from 4.2:**

**Expected Metrics:**
- Total Creators: 8 (5 + 3)
- Total Content Pieces: 0 (none completed yet)
- Cost per Creator: $275 / 8 = $34.38
- Acceptance Rate: Depends on total applications

**Steps:**
1. View Key Metrics Grid (4 cards)
2. Verify each metric card shows:
   - Icon
   - Metric value
   - Label
   - Subtitle
3. **Verify values:**
   - Total Creators: 8
   - Content Pieces: 0
   - Cost per Creator: ~$34
   - Acceptance Rate: Calculate based on applications

**Expected Results:**
- All 4 metric cards display
- Values match expected calculations
- Icons colorful and visible

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 4.4: Budget Source Breakdown

**Objective:** Verify budget breakdown by source

**Preparation:**
1. Ensure test campaigns use different budget sources:
   - Campaign A: Marketing ($500)
   - Campaign B: Growth ($300)

**Steps:**
1. Scroll to Budget Source Breakdown section
2. Verify shows list of budget sources
3. For each source, verify shows:
   - Source name (Marketing, Growth, etc.)
   - Approved budget
   - Actual spend
   - Utilization %
   - Campaign count
4. Verify totals match Budget Overview

**Expected Results:**
- Marketing: $500 approved, spend matches Campaign A
- Growth: $300 approved, spend matches Campaign B
- All other sources: $0
- Total matches Budget Overview

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 4.5: Campaign Performance List

**Objective:** Verify individual campaign performance tracking

**Steps:**
1. Scroll to Campaign Performance List
2. Verify shows all platform campaigns
3. For each campaign, verify shows:
   - Campaign title
   - Budget vs. actual spend
   - Target vs. actual creators/content
   - Application acceptance rate
   - Status badge
4. Tap on a campaign
5. Verify navigates to campaign detail

**Expected Results:**
- All platform campaigns listed
- Metrics accurate for each
- Can tap to view details
- Sorted by most recent first

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 4.6: Date Range Filtering

**Objective:** Verify date filtering works

**Steps:**
1. Open Date Range Selector
2. Select "Last 7 Days"
3. Verify analytics update to show only campaigns from last 7 days
4. Verify budget totals recalculate
5. Select "Last 30 Days"
6. Verify analytics update
7. Select "Custom Range"
8. Pick start date: 30 days ago
9. Pick end date: today
10. Apply
11. Verify analytics update

**Expected Results:**
- Date range selector opens
- Presets work correctly
- Custom range works
- Analytics recalculate based on date filter
- Campaigns outside date range excluded

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 4.7: Export Report

**Objective:** Verify CSV export generates valid data

**Steps:**
1. Tap "Export" button (top-right of analytics screen)
2. Verify CSV file generated
3. Open/download CSV file
4. Verify CSV contains:
   - Header row with column names
   - One row per campaign
   - All campaign data (budget, spend, metrics, status)
   - Dates formatted correctly
   - Dollar amounts in decimal format
5. Verify totals match dashboard

**Expected Results:**
- CSV downloads successfully
- File opens in spreadsheet app
- Data formatted correctly
- All campaigns included
- Numbers accurate

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 4.8: Real-Time Updates

**Objective:** Verify analytics update in real-time

**Steps:**
1. Open analytics dashboard
2. Note current "Actual Spend" value
3. **In another browser/device:** Log in as admin
4. Navigate to campaign applications
5. Accept a pending application
6. Return to analytics dashboard
7. Pull to refresh
8. Verify "Actual Spend" increased by application rate

**Expected Results:**
- Analytics refresh on pull-to-refresh
- Spend updates immediately after acceptance
- Triggers fire correctly
- No need to restart app

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test Suite 5: Deliverables Integration

### Test 5.1: Submit Deliverables - Troodie Campaign

**Objective:** Verify creator can submit deliverables for Troodie campaign

**Prerequisites:**
- Creator has been accepted to a Troodie campaign
- Campaign completed (content created)

**Steps:**
1. Log in as creator
2. Navigate to My Applications → Find accepted application
3. Tap "Submit Deliverables"
4. **Platform Selection:**
   - Select "Instagram"
5. **Content URL:**
   - Enter: "https://instagram.com/p/test123"
6. **Screenshot Upload:**
   - Tap "Upload Screenshot"
   - Select image from gallery
   - Verify image preview shows
7. **Caption (Optional):**
   - Enter: "Had an amazing meal! #TroodieCommunity"
8. **Engagement Metrics (Optional):**
   - Views: 1000
   - Likes: 150
   - Comments: 25
9. Tap "Submit for Review"
10. Verify success message
11. Verify status changes to "Pending Review"

**Expected Results:**
- Form accepts all inputs
- Screenshot uploads successfully
- Submission completes
- Status updates to "pending_review" in database
- 72-hour timer starts

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 5.2: Admin Review Deliverable - Approve

**Objective:** Verify admin can approve deliverable

**Steps:**
1. Log in as admin
2. Navigate: Admin Panel → Review Deliverables
3. Verify pending deliverables list displays
4. Locate deliverable from Test 5.1
5. Verify displays:
   - Campaign title
   - Creator username
   - Screenshot preview
   - Content URL (clickable)
   - Auto-approve timer (shows hours remaining)
6. Tap content URL
7. Verify opens in browser
8. Return to app
9. Tap "Approve" button
10. Verify approval processes
11. Verify deliverable removed from pending list

**Expected Results:**
- Deliverable appears in pending list
- Screenshot loads
- URL clickable
- Timer accurate
- Approve button works
- Status updates to "completed"
- Creator notified (if notifications implemented)

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 5.3: Admin Review Deliverable - Reject

**Objective:** Verify admin can reject deliverable with reason

**Prerequisites:**
- Another deliverable submitted (repeat Test 5.1)

**Steps:**
1. In Review Deliverables dashboard
2. Locate new pending deliverable
3. Tap "Reject" button
4. Verify prompt appears for rejection reason
5. Enter reason: "Content does not meet requirements - please include restaurant name in caption"
6. Submit rejection
7. Verify deliverable removed from pending list
8. **As creator:** Check application status
9. Verify status shows "Revision Requested"
10. Verify rejection reason visible

**Expected Results:**
- Rejection prompt appears
- Rejection reason required
- Status updates to "revision_requested"
- Creator sees rejection reason
- Creator can resubmit

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 5.4: Auto-Approve Timer Display

**Objective:** Verify 72-hour timer displays correctly

**Steps:**
1. Submit a new deliverable (Test 5.1)
2. Admin: Open Review Deliverables
3. Locate new deliverable
4. Verify timer badge shows hours remaining
5. Calculate expected hours: 72 - (hours since submission)
6. Verify timer matches calculation
7. Verify timer badge:
   - Gray background if >24 hours remaining
   - Red background if <24 hours remaining (urgent)

**Expected Results:**
- Timer displays correctly
- Hours calculation accurate
- Color changes at 24-hour mark
- Urgent state visually distinct

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 5.5: Partnership Campaign Deliverables

**Objective:** Verify partnership deliverables route to partner (not Troodie)

**Prerequisites:**
- Creator accepted to partnership campaign
- Creator submits deliverable

**Steps:**
1. **As creator:** Submit deliverable for partnership campaign
2. **As Troodie admin:** Open Review Deliverables dashboard
3. Verify partnership deliverable NOT visible in Troodie admin list
4. **As partner restaurant admin:** Open restaurant dashboard
5. Verify deliverable appears for partner to review

**Expected Results:**
- Partnership deliverables NOT visible to Troodie admin
- Partnership deliverables visible to partner restaurant
- Routing works correctly
- White-label maintained

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 5.6: Deliverable Submission Validation

**Objective:** Verify form validates required fields

**Test Cases:**

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Missing URL | Leave URL empty, tap Submit | Error: "Content URL required" |
| Invalid URL | Enter "not-a-url", tap Submit | Error: "Invalid URL format" |
| Missing Screenshot | Don't upload screenshot, tap Submit | Error: "Screenshot required" |
| Valid Data | Fill all required fields | Submits successfully |

**Expected Results:**
- All validation errors display clearly
- Cannot submit with missing required fields
- Valid submissions succeed

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test Suite 6: Edge Cases & Error Scenarios

### Test 6.1: Campaign with 0 Budget

**Objective:** Test behavior with edge case budget

**Steps:**
1. Create campaign with $0 approved budget
2. Verify warning or error displays
3. If allowed, verify budget tracking works with $0

**Expected Results:**
- System handles $0 budget gracefully
- No division by zero errors
- Analytics show 0% utilization

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 6.2: Campaign with 1000 Max Applications

**Objective:** Test with very high application limit

**Steps:**
1. Create campaign with 1000 max applications
2. Verify campaign creates successfully
3. Verify displays correctly in creator feed

**Expected Results:**
- System accepts high application limit
- No performance issues
- Displays correctly

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 6.3: Very Long Campaign Title

**Objective:** Test UI with long text

**Steps:**
1. Create campaign with 200-character title
2. Verify title in various views:
   - Campaign card in feed
   - Campaign detail screen
   - Analytics dashboard
3. Verify text truncates gracefully with ellipsis

**Expected Results:**
- Long titles truncate with "..."
- No layout breaking
- Full title visible on detail screen

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 6.4: Special Characters in Campaign Text

**Objective:** Test with special characters

**Steps:**
1. Create campaign with title: "Test Campaign! @#$%^&* 🎉🍕"
2. Description with emojis, quotes, and special chars
3. Verify displays correctly
4. Verify saves to database without corruption

**Expected Results:**
- Special characters handled correctly
- Emojis display properly
- No encoding issues

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 6.5: Network Interruption During Deliverable Upload

**Objective:** Test resilience to network issues

**Steps:**
1. Start deliverable submission
2. Fill out form and select screenshot
3. During screenshot upload, disable WiFi
4. Tap "Submit"
5. Wait for timeout
6. Verify error message
7. Re-enable WiFi
8. Tap "Submit" again
9. Verify can retry without re-selecting screenshot

**Expected Results:**
- Network error caught
- User-friendly error message
- Form data preserved
- Can retry upload

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 6.6: Simultaneous Application Acceptance

**Objective:** Test concurrent updates to budget tracking

**Steps:**
1. Create campaign with $100 budget
2. Have 4 pending applications at $25 each
3. **As admin:** Open 4 separate browser tabs
4. Accept all 4 applications simultaneously (click all within 1 second)
5. Wait for processing
6. Check platform_managed_campaigns table
7. Verify actual_spend_cents = $100 (not duplicated)

**Expected Results:**
- Database triggers handle concurrent updates
- No race conditions
- Final spend accurate

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test Suite 7: Performance Testing

### Test 7.1: Campaign Feed Load Time

**Objective:** Verify acceptable performance with many campaigns

**Prerequisites:**
- Database has 100+ total campaigns (mix of all types)

**Steps:**
1. Clear app cache
2. Log in as creator
3. Start timer
4. Navigate to Campaigns tab
5. Stop timer when campaigns visible
6. Record load time

**Expected Results:**
- Load time < 2 seconds
- All campaign images load progressively
- No lag or stuttering

**Load Time:** _______ seconds

**Pass/Fail:** ☐ Pass ☐ Fail (if >2 seconds)

---

### Test 7.2: Analytics Dashboard Load Time

**Objective:** Verify dashboard performance

**Prerequisites:**
- 50+ platform campaigns in database

**Steps:**
1. Log in as admin
2. Start timer
3. Navigate to Campaign Analytics
4. Stop timer when all metrics visible
5. Record load time

**Expected Results:**
- Load time < 3 seconds
- Metrics calculate accurately
- No performance degradation

**Load Time:** _______ seconds

**Pass/Fail:** ☐ Pass ☐ Fail (if >3 seconds)

---

### Test 7.3: Campaign Creation Speed

**Objective:** Verify campaign creation completes quickly

**Steps:**
1. Start timer
2. Complete campaign creation wizard (all steps)
3. Tap "Create Campaign"
4. Stop timer when success message appears
5. Record time

**Expected Results:**
- Total time < 5 seconds
- No noticeable lag
- Immediate feedback

**Creation Time:** _______ seconds

**Pass/Fail:** ☐ Pass ☐ Fail (if >5 seconds)

---

## Test Suite 8: Security Testing

### Test 8.1: Non-Admin Access Prevention

**Objective:** Verify non-admins cannot access admin features

**Steps:**
1. Log in as creator (non-admin)
2. Attempt to access admin URLs directly (if web):
   - /admin/create-platform-campaign
   - /admin/campaign-analytics
   - /admin/review-deliverables
3. Verify redirected or shown access denied
4. Attempt to call admin API endpoints directly
5. Verify API returns 403 Forbidden

**Expected Results:**
- Creators cannot access admin screens
- API rejects non-admin requests
- Graceful error handling

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 8.2: Data Isolation

**Objective:** Verify creators cannot see internal campaign data

**Steps:**
1. Log in as creator
2. Inspect network requests when viewing campaign
3. Verify response does NOT include:
   - platform_managed_campaigns data
   - internal_notes
   - budget_source
   - cost_center
   - actual_spend_cents
4. Verify only public campaign data returned

**Expected Results:**
- Internal data not exposed in API
- RLS policies working
- No data leakage

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 8.3: SQL Injection Prevention

**Objective:** Test for SQL injection vulnerabilities

**Steps:**
1. In campaign creation, try injecting SQL:
   - Title: `'; DROP TABLE campaigns; --`
   - Description: `' OR '1'='1`
2. Submit campaign
3. Verify:
   - Campaign created with literal string (SQL not executed)
   - No database errors
   - Tables still exist

**Expected Results:**
- SQL injection blocked
- Parameterized queries used
- No security breach

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 8.4: XSS Prevention

**Objective:** Test for cross-site scripting vulnerabilities

**Steps:**
1. Create campaign with title: `<script>alert('XSS')</script>`
2. View campaign in creator feed
3. View campaign detail screen
4. Verify script does NOT execute
5. Verify displays as plain text

**Expected Results:**
- HTML/JS escaped properly
- No script execution
- Content displayed safely

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test Suite 9: Accessibility Testing

### Test 9.1: Touch Target Sizes

**Objective:** Verify buttons are large enough

**Steps:**
1. Measure touch targets for key buttons:
   - "Create Campaign" button
   - "Apply Now" button
   - "Approve/Reject" buttons
   - Campaign cards
2. Verify all are at least 44x44 pixels

**Expected Results:**
- All interactive elements ≥44x44px
- Comfortable tapping
- No accidental taps

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 9.2: Text Readability

**Objective:** Verify text is readable at default size

**Steps:**
1. View all screens at default font size
2. Verify all text readable without zooming
3. Check color contrast for:
   - Body text on white background
   - White text on colored backgrounds
   - Badge text

**Expected Results:**
- All text readable
- Contrast ratio ≥4.5:1 for body text
- Contrast ratio ≥3:1 for large text

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 9.3: Screen Reader Support (if applicable)

**Objective:** Verify key actions have proper labels

**Steps:**
1. Enable screen reader (iOS VoiceOver or Android TalkBack)
2. Navigate to campaign creation wizard
3. Verify all buttons announced
4. Verify form labels read correctly

**Expected Results:**
- All interactive elements labeled
- Context clear from audio alone
- Logical navigation order

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test Summary & Sign-Off

### Overall Results

**Total Tests:** 53
**Passed:** _____
**Failed:** _____
**Blocked:** _____
**Pass Rate:** _____%

### Critical Issues Found
1. _______________________________________
2. _______________________________________
3. _______________________________________

### Blockers
1. _______________________________________
2. _______________________________________

### Recommendations
☐ Ready for production deployment
☐ Ready with minor fixes
☐ Not ready - major issues found

### Tester Sign-Off

**Tester Name:** _______________________
**Date Tested:** _______________________
**Environment:** _______________________
**App Version:** _______________________
**Signature:** _________________________

---

## Appendix: Test Data Cleanup

After testing, clean up test data:

```sql
-- Delete test campaigns
DELETE FROM campaigns WHERE title LIKE 'Test%';

-- Delete test deliverables
DELETE FROM campaign_applications WHERE status = 'pending_review' AND deliverables_submitted IS NOT NULL;

-- Reset system account test data (if needed)
-- (Do NOT delete system account itself)
```

---

**End of Testing Guide**
