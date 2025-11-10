# Troodie Originals & Enhanced Deliverables - Complete Testing Guide

**Date:** October 20, 2025
**Feature:** Enhanced Deliverables System + Troodie Originals Campaign
**Test Environment:** Staging → Production
**Status:** Ready for Testing

---

## 📋 Testing Overview

This guide provides step-by-step instructions to test the complete Troodie Originals and Enhanced Deliverables system, including:

1. **Database Layer** - Schema, functions, views, policies
2. **Campaign Creation** - Troodie Originals campaign setup
3. **Admin UI** - Campaign management and deliverable review
4. **Creator UI** - Campaign discovery and deliverable submission
5. **Restaurant UI** - Deliverable review and approval
6. **Auto-Approval System** - 72-hour auto-approval workflow
7. **Integration Testing** - End-to-end workflows
8. **Performance Testing** - Load and query performance

---

## 🎯 Test Prerequisites

### Required Access
- [ ] Supabase dashboard access (project: `tcultsriqunnxujqiwea`)
- [ ] Admin account in app (kouame@troodieapp.com)
- [ ] Test creator account(s)
- [ ] Test restaurant/business account
- [ ] iOS/Android device or simulator

### Environment Setup
- [ ] Migration deployed to staging database
- [ ] App builds deployed with latest code
- [ ] Test data ready (creators, restaurants)
- [ ] Payment system in test mode (Stripe)

### Documentation Review
- [ ] Read DELIVERABLES_DEPLOYMENT_GUIDE.md
- [ ] Read TROODIE_ORIGINALS_LAUNCH_GUIDE.md
- [ ] Review session plan: SESSION_2025_10_16_TROODIE_ORIGINALS_AND_DELIVERABLES.md

---

## Phase 1: Database Layer Testing

### Test 1.1: Verify Migration Success

**Objective:** Ensure all database objects were created correctly

**Steps:**

1. **Open Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new
   ```

2. **Check Tables Exist**
   ```sql
   -- Verify campaign_deliverables table
   SELECT table_name, column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'campaign_deliverables'
   ORDER BY ordinal_position;
   ```

   **Expected Result:** 16 columns including:
   - id, creator_campaign_id, campaign_id, creator_id
   - deliverable_index, platform, post_url, screenshot_url
   - status, reviewed_by, reviewed_at, auto_approved
   - submitted_at, created_at, updated_at

3. **Check New Columns on Existing Tables**
   ```sql
   -- Check campaigns table
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'campaigns'
   AND column_name = 'deliverable_requirements';

   -- Check creator_campaigns table
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'creator_campaigns'
   AND column_name IN ('deliverables_submitted', 'all_deliverables_submitted',
                       'restaurant_review_deadline', 'auto_approved');
   ```

   **Expected Result:** All columns exist with type `jsonb` or `boolean`/`timestamptz`

4. **Check Functions Exist**
   ```sql
   SELECT proname, pronargs, prorettype::regtype
   FROM pg_proc
   WHERE proname IN (
     'get_auto_approval_deadline',
     'should_auto_approve',
     'time_until_auto_approval',
     'auto_approve_overdue_deliverables',
     'validate_deliverable_requirements',
     'update_creator_campaign_deliverable_status'
   );
   ```

   **Expected Result:** 6 functions listed

5. **Check Views Exist**
   ```sql
   SELECT table_name, view_definition
   FROM information_schema.views
   WHERE table_schema = 'public'
   AND table_name IN ('pending_deliverables_summary', 'deliverable_statistics');
   ```

   **Expected Result:** 2 views exist

6. **Check RLS Policies**
   ```sql
   SELECT policyname, cmd, roles
   FROM pg_policies
   WHERE tablename = 'campaign_deliverables'
   ORDER BY policyname;
   ```

   **Expected Result:** 7 policies (SELECT, INSERT, UPDATE for different roles)

7. **Check Indexes**
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'campaign_deliverables'
   ORDER BY indexname;
   ```

   **Expected Result:** 6 indexes including status, submitted_at, creator_campaign

**Pass Criteria:** ✅ All tables, columns, functions, views, policies, and indexes exist

---

### Test 1.2: Test Database Functions

**Objective:** Verify all helper functions work correctly

**Steps:**

1. **Create Test Deliverable**
   ```sql
   -- First, get a valid creator_campaign_id and campaign_id
   SELECT cc.id as creator_campaign_id, cc.campaign_id, cc.creator_id
   FROM creator_campaigns cc
   WHERE cc.status = 'accepted'
   LIMIT 1;

   -- Insert test deliverable (replace IDs with actual values from above)
   INSERT INTO campaign_deliverables (
     creator_campaign_id,
     campaign_id,
     creator_id,
     deliverable_index,
     platform,
     post_url,
     status,
     submitted_at
   ) VALUES (
     '<creator_campaign_id>',
     '<campaign_id>',
     '<creator_id>',
     1,
     'instagram',
     'https://instagram.com/p/test_post_123',
     'pending',
     NOW()
   )
   RETURNING id, deliverable_id;
   ```

2. **Test Auto-Approval Deadline Function**
   ```sql
   -- Get the deliverable_id from step 1
   SELECT
     id,
     get_auto_approval_deadline(id) as deadline,
     get_auto_approval_deadline(id) - NOW() as time_remaining
   FROM campaign_deliverables
   WHERE post_url = 'https://instagram.com/p/test_post_123';
   ```

   **Expected Result:** Deadline is exactly 72 hours after submitted_at

3. **Test Should Auto-Approve Function**
   ```sql
   SELECT
     id,
     status,
     should_auto_approve(id) as should_approve,
     submitted_at
   FROM campaign_deliverables
   WHERE post_url = 'https://instagram.com/p/test_post_123';
   ```

   **Expected Result:** should_approve = FALSE (not 72 hours old yet)

4. **Test Time Until Auto-Approval Function**
   ```sql
   SELECT
     id,
     time_until_auto_approval(id) as time_remaining
   FROM campaign_deliverables
   WHERE post_url = 'https://instagram.com/p/test_post_123';
   ```

   **Expected Result:** Interval close to 72 hours

5. **Test Validation Function**
   ```sql
   -- Valid requirements
   SELECT validate_deliverable_requirements('{
     "title": "Test Deliverable",
     "goal": "awareness",
     "type": "reel",
     "due_date": "2025-11-01",
     "compensation_type": "cash",
     "compensation_value": 5000,
     "visit_type": "dine_in",
     "payment_timing": "after_post",
     "revisions_allowed": 2
   }'::jsonb) as is_valid;

   -- Invalid requirements (missing required field)
   SELECT validate_deliverable_requirements('{
     "title": "Test Deliverable",
     "goal": "awareness"
   }'::jsonb) as is_valid;
   ```

   **Expected Result:** First returns TRUE, second returns FALSE

6. **Test Auto-Approve Function (Simulate Old Deliverable)**
   ```sql
   -- Update submitted_at to 73 hours ago
   UPDATE campaign_deliverables
   SET submitted_at = NOW() - INTERVAL '73 hours'
   WHERE post_url = 'https://instagram.com/p/test_post_123';

   -- Test if it should be auto-approved
   SELECT should_auto_approve(id)
   FROM campaign_deliverables
   WHERE post_url = 'https://instagram.com/p/test_post_123';
   ```

   **Expected Result:** Returns TRUE

7. **Run Auto-Approve Function**
   ```sql
   SELECT * FROM auto_approve_overdue_deliverables();
   ```

   **Expected Result:** Returns row(s) with approved deliverables

8. **Verify Auto-Approval Worked**
   ```sql
   SELECT
     id,
     status,
     auto_approved,
     reviewed_at
   FROM campaign_deliverables
   WHERE post_url = 'https://instagram.com/p/test_post_123';
   ```

   **Expected Result:**
   - status = 'approved'
   - auto_approved = TRUE
   - reviewed_at is set to NOW()

**Cleanup:**
```sql
DELETE FROM campaign_deliverables
WHERE post_url = 'https://instagram.com/p/test_post_123';
```

**Pass Criteria:** ✅ All functions execute without errors and return expected results

---

### Test 1.3: Test RLS Policies

**Objective:** Verify Row-Level Security works for different user roles

**Steps:**

1. **Test Creator Access**
   ```sql
   -- Set role to creator (replace with actual creator user_id)
   SET LOCAL role TO authenticated;
   SET LOCAL request.jwt.claims TO '{"sub": "<creator_user_id>", "role": "authenticated"}';

   -- Creator should see only their deliverables
   SELECT * FROM campaign_deliverables
   WHERE creator_id = '<creator_user_id>';

   -- Creator should NOT see other creators' deliverables
   SELECT * FROM campaign_deliverables
   WHERE creator_id != '<creator_user_id>';
   ```

   **Expected Result:** First query returns rows, second returns empty

2. **Test Restaurant Access**
   ```sql
   -- Set role to restaurant owner
   SET LOCAL role TO authenticated;
   SET LOCAL request.jwt.claims TO '{"sub": "<restaurant_owner_user_id>", "role": "authenticated"}';

   -- Restaurant should see deliverables for their campaigns
   SELECT cd.*
   FROM campaign_deliverables cd
   JOIN campaigns c ON c.id = cd.campaign_id
   JOIN business_profiles bp ON bp.restaurant_id = c.restaurant_id
   WHERE bp.user_id = '<restaurant_owner_user_id>';
   ```

   **Expected Result:** Returns deliverables for restaurant's campaigns only

3. **Test Admin Access**
   ```sql
   -- Set role to admin
   SET LOCAL role TO authenticated;
   SET LOCAL request.jwt.claims TO '{"sub": "<admin_user_id>", "role": "authenticated", "is_admin": true}';

   -- Admin should see all deliverables
   SELECT COUNT(*) FROM campaign_deliverables;
   ```

   **Expected Result:** Returns all deliverables regardless of owner

**Pass Criteria:** ✅ RLS policies correctly restrict access by user role

---

### Test 1.4: Test Views

**Objective:** Verify views return correct data

**Steps:**

1. **Test Pending Deliverables Summary**
   ```sql
   SELECT * FROM pending_deliverables_summary
   ORDER BY hours_remaining ASC
   LIMIT 10;
   ```

   **Expected Result:**
   - Shows only pending deliverables
   - Correctly calculates hours_remaining
   - Includes creator_name, campaign_title, platform

2. **Test Deliverable Statistics**
   ```sql
   SELECT * FROM deliverable_statistics;
   ```

   **Expected Result:**
   - Shows aggregate stats (total, pending, approved, rejected)
   - Calculates percentages correctly
   - Includes average review time

**Pass Criteria:** ✅ Views return accurate aggregated data

---

## Phase 2: Campaign Creation Testing

### Test 2.1: Create Troodie Originals Campaign

**Objective:** Successfully create the "Local Gems" campaign using the SQL script

**Steps:**

1. **Verify Prerequisites**
   ```sql
   -- Check Troodie system account exists
   SELECT id, email, account_type
   FROM users
   WHERE email = 'kouame@troodieapp.com';

   -- Check Troodie Community restaurant exists
   SELECT id, name, is_platform_managed
   FROM restaurants
   WHERE is_platform_managed = TRUE
   LIMIT 1;
   ```

   **Expected Result:** Both exist

2. **Run Campaign Creation Script**
   ```bash
   # Option A: Via Supabase SQL Editor
   # Copy scripts/create-troodie-originals-campaign.sql
   # Paste in SQL editor and execute

   # Option B: Via psql (if you have credentials)
   psql "postgresql://postgres:PASSWORD@db.tcultsriqunnxujqiwea.supabase.co:5432/postgres" \
     -f scripts/create-troodie-originals-campaign.sql
   ```

3. **Verify Campaign Created**
   ```sql
   SELECT
     id,
     title,
     budget,
     max_creators,
     campaign_source,
     campaign_type,
     is_subsidized,
     status,
     deliverable_requirements
   FROM campaigns
   WHERE title = 'Troodie Creators: Local Gems'
   AND campaign_source = 'troodie_direct';
   ```

   **Expected Result:**
   - Campaign exists
   - budget = 250
   - max_creators = 5
   - campaign_source = 'troodie_direct'
   - status = 'active'
   - deliverable_requirements is valid JSON with all fields

4. **Verify Platform Tracking Record**
   ```sql
   SELECT
     pmc.*,
     c.title as campaign_title
   FROM platform_managed_campaigns pmc
   JOIN campaigns c ON c.id = pmc.campaign_id
   WHERE c.title = 'Troodie Creators: Local Gems';
   ```

   **Expected Result:** Tracking record exists with correct budget and targets

5. **Validate Deliverable Requirements Structure**
   ```sql
   SELECT
     deliverable_requirements->>'title' as title,
     deliverable_requirements->>'goal' as goal,
     deliverable_requirements->>'type' as type,
     deliverable_requirements->>'compensation_type' as comp_type,
     deliverable_requirements->>'compensation_value' as comp_value,
     deliverable_requirements->'creative'->>'tone' as tone,
     deliverable_requirements->'approval'->>'handles' as handles
   FROM campaigns
   WHERE title = 'Troodie Creators: Local Gems';
   ```

   **Expected Result:** All fields populated correctly

**Pass Criteria:** ✅ Campaign created successfully with all required fields

---

### Test 2.2: Verify Campaign Visibility

**Objective:** Ensure campaign appears correctly in the app

**Steps:**

1. **Query Campaign for Creator View**
   ```sql
   -- Simulate what creators would see in marketplace
   SELECT
     c.id,
     c.title,
     c.description,
     c.compensation,
     c.requirements,
     c.campaign_type,
     c.campaign_source,
     r.name as restaurant_name,
     (c.max_creators - COUNT(cc.id)) as spots_remaining
   FROM campaigns c
   JOIN restaurants r ON r.id = c.restaurant_id
   LEFT JOIN creator_campaigns cc ON cc.campaign_id = c.id AND cc.status = 'accepted'
   WHERE c.title = 'Troodie Creators: Local Gems'
   GROUP BY c.id, r.name;
   ```

   **Expected Result:** Campaign shows with 5 spots available

2. **Check Campaign in App (Manual)**
   - Open Troodie app
   - Navigate to Campaign Marketplace
   - Look for "Troodie Creators: Local Gems"
   - Verify all details display correctly
   - Check for "Troodie Original" badge

**Pass Criteria:** ✅ Campaign visible and displays correctly in app

---

## Phase 3: Creator Flow Testing

### Test 3.1: Creator Discovery & Application

**Objective:** Test creator finding and applying to campaign

**Manual Test Steps:**

1. **Open App as Creator**
   - Login with test creator account
   - Navigate to "Marketplace" or "Campaigns" tab

2. **Find Campaign**
   - Scroll to find "Troodie Creators: Local Gems"
   - Verify campaign card shows:
     - ✓ Campaign title
     - ✓ Compensation ($50)
     - ✓ Restaurant name
     - ✓ "Troodie Original" badge
     - ✓ Spots remaining (e.g., "3 of 5 spots left")

3. **View Campaign Details**
   - Tap on campaign card
   - Verify details screen shows:
     - ✓ Full description
     - ✓ Requirements list (7 items)
     - ✓ Compensation details
     - ✓ Timeline/deadline
     - ✓ Deliverable requirements
     - ✓ "Apply" button

4. **Submit Application**
   - Tap "Apply" button
   - Fill out application form (if required)
   - Submit portfolio samples
   - Submit application

5. **Verify Application in Database**
   ```sql
   SELECT
     cc.id,
     cc.campaign_id,
     cc.creator_id,
     cc.status,
     u.display_name as creator_name
   FROM creator_campaigns cc
   JOIN users u ON u.id = cc.creator_id
   WHERE cc.campaign_id = (
     SELECT id FROM campaigns
     WHERE title = 'Troodie Creators: Local Gems'
   )
   ORDER BY cc.created_at DESC
   LIMIT 1;
   ```

   **Expected Result:** Application exists with status = 'pending'

**Pass Criteria:** ✅ Creator can discover, view, and apply to campaign

---

### Test 3.2: Accept Creator Application (Admin)

**Objective:** Test admin accepting creator applications

**Steps:**

1. **Login as Admin**
   - Open app as admin (kouame@troodieapp.com)
   - Navigate to Admin Dashboard
   - Go to "Campaigns" → "Troodie Creators: Local Gems"

2. **View Applications**
   - Click "View Applications" or similar
   - See list of pending applications
   - Verify application details visible

3. **Accept Creator**
   - Select application
   - Click "Accept" or "Approve"
   - Confirm acceptance

4. **Verify in Database**
   ```sql
   UPDATE creator_campaigns
   SET status = 'accepted'
   WHERE campaign_id = (
     SELECT id FROM campaigns WHERE title = 'Troodie Creators: Local Gems'
   )
   AND creator_id = '<test_creator_id>'
   RETURNING id, status, accepted_at;
   ```

5. **Check Notification Sent**
   ```sql
   SELECT * FROM notifications
   WHERE user_id = '<test_creator_id>'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected Result:** Notification of acceptance sent

**Pass Criteria:** ✅ Admin can accept applications and creator is notified

---

### Test 3.3: Creator Deliverable Submission

**Objective:** Test creator submitting deliverable after completion

**Manual Test Steps:**

1. **Login as Accepted Creator**
   - Open app as creator who was accepted
   - Navigate to "My Campaigns"
   - See "Troodie Creators: Local Gems" in active campaigns

2. **Open Campaign Details**
   - Tap on campaign
   - Verify shows:
     - ✓ Campaign requirements
     - ✓ Deliverable requirements
     - ✓ Due date
     - ✓ Status: "Accepted - Ready to Create"
     - ✓ "Submit Deliverable" button (prominent)

3. **Create Content** (Outside app)
   - Create test reel/TikTok (can be placeholder for testing)
   - Post to Instagram/TikTok
   - Copy post URL

4. **Submit Deliverable**
   - Tap "Submit Deliverable" button
   - Verify submission form shows:
     - ✓ Campaign requirements (read-only)
     - ✓ Platform selector (Instagram/TikTok)
     - ✓ Post URL field
     - ✓ Optional screenshot upload
     - ✓ Optional notes field
   - Fill in:
     - Platform: Instagram
     - Post URL: https://instagram.com/p/test_submission_123
     - Notes: "This is a test submission"
   - Tap "Submit"

5. **Verify Submission Confirmation**
   - See success message
   - See confirmation screen with:
     - ✓ "Submitted Successfully!" message
     - ✓ Review timeline (72 hours)
     - ✓ What happens next
     - ✓ Return to campaign button

6. **Check Database**
   ```sql
   SELECT
     id,
     deliverable_id,
     platform,
     post_url,
     status,
     submitted_at,
     get_auto_approval_deadline(id) as auto_approval_deadline
   FROM campaign_deliverables
   WHERE post_url = 'https://instagram.com/p/test_submission_123';
   ```

   **Expected Result:**
   - Deliverable exists
   - status = 'pending'
   - submitted_at is recent
   - auto_approval_deadline is 72 hours from now

7. **Verify Campaign Status Updated**
   ```sql
   SELECT
     id,
     deliverables_submitted,
     all_deliverables_submitted,
     restaurant_review_deadline
   FROM creator_campaigns
   WHERE id = '<creator_campaign_id>';
   ```

   **Expected Result:**
   - deliverables_submitted includes new submission
   - all_deliverables_submitted = TRUE (if all done)
   - restaurant_review_deadline is set

**Pass Criteria:** ✅ Creator can submit deliverable and it's recorded correctly

---

### Test 3.4: Creator Viewing Submission Status

**Objective:** Test creator seeing their submission status

**Steps:**

1. **Open Campaign as Creator**
   - Navigate to "My Campaigns"
   - Open "Troodie Creators: Local Gems"

2. **Verify Submission Status**
   - See status badge: "Under Review"
   - See submission details:
     - ✓ Post URL (clickable)
     - ✓ Submitted date/time
     - ✓ Review deadline countdown
   - See message: "Restaurant has X hours to review"

3. **Check Deliverable History**
   - Verify submission appears in history
   - Can view submitted content

**Pass Criteria:** ✅ Creator can see submission status and timeline

---

## Phase 4: Restaurant/Business Flow Testing

### Test 4.1: Restaurant Viewing Pending Deliverables

**Objective:** Test restaurant owner seeing submissions needing review

**Manual Test Steps:**

1. **Login as Restaurant Owner**
   - Login with business account
   - For Troodie Originals, use admin/system account
   - Navigate to "Campaigns" or "Dashboard"

2. **View Campaign**
   - Open "Troodie Creators: Local Gems" campaign
   - See campaign overview with:
     - ✓ Active creators (5)
     - ✓ Pending deliverables count
     - ✓ "Review Deliverables" button

3. **Open Review Dashboard**
   - Tap "Review Deliverables"
   - See list of pending submissions
   - Each submission shows:
     - ✓ Creator name & avatar
     - ✓ Platform icon (Instagram/TikTok)
     - ✓ Post URL (clickable)
     - ✓ Screenshot thumbnail (if uploaded)
     - ✓ Submission date
     - ✓ Countdown timer (XX hours remaining)
     - ✓ Action buttons (Approve/Request Changes/Reject)

**Database Query to Check:**
```sql
-- View pending deliverables summary
SELECT * FROM pending_deliverables_summary
WHERE campaign_id = (
  SELECT id FROM campaigns WHERE title = 'Troodie Creators: Local Gems'
)
ORDER BY hours_remaining ASC;
```

**Pass Criteria:** ✅ Restaurant can view all pending deliverables with countdown

---

### Test 4.2: Restaurant Approving Deliverable

**Objective:** Test restaurant approving a deliverable

**Steps:**

1. **Select a Deliverable**
   - From review dashboard, select one deliverable
   - View full details

2. **Review Content**
   - Tap URL to open post
   - Verify content meets requirements:
     - ✓ Video length 15-45 seconds
     - ✓ Features restaurant
     - ✓ Tagged @TroodieApp
     - ✓ Uses #TroodieCreatorMarketplace
     - ✓ Includes CTA

3. **Approve Deliverable**
   - Tap "Approve" button
   - Optional: Add feedback note
   - Confirm approval

4. **Verify in Database**
   ```sql
   -- Should be approved
   SELECT
     id,
     status,
     reviewed_by,
     reviewed_at,
     restaurant_feedback,
     auto_approved
   FROM campaign_deliverables
   WHERE post_url = 'https://instagram.com/p/test_submission_123';
   ```

   **Expected Result:**
   - status = 'approved'
   - reviewed_by = <restaurant_user_id>
   - reviewed_at = NOW()
   - auto_approved = FALSE

5. **Check Notification Sent to Creator**
   ```sql
   SELECT * FROM notifications
   WHERE user_id = '<creator_user_id>'
   AND notification_type = 'deliverable_approved'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected Result:** Notification created

6. **Verify Payment Triggered**
   ```sql
   -- Check if payment record created (if payment table exists)
   SELECT * FROM payments
   WHERE creator_campaign_id = '<creator_campaign_id>'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected Result:** Payment initiated

7. **Check Creator Campaign Status**
   ```sql
   SELECT
     status,
     completed_at,
     payment_status
   FROM creator_campaigns
   WHERE id = '<creator_campaign_id>';
   ```

   **Expected Result:**
   - status updated to 'completed'
   - completed_at set
   - payment_status = 'processing' or 'paid'

**Pass Criteria:** ✅ Restaurant can approve, creator notified, payment triggered

---

### Test 4.3: Restaurant Requesting Changes

**Objective:** Test restaurant requesting revisions

**Steps:**

1. **Select a Deliverable**
   - From review dashboard, select deliverable

2. **Request Changes**
   - Tap "Request Changes" button
   - Feedback field appears (required)
   - Enter feedback: "Please add the hashtag #TroodieCreatorMarketplace"
   - Submit

3. **Verify in Database**
   ```sql
   SELECT
     status,
     restaurant_feedback,
     reviewed_by,
     reviewed_at
   FROM campaign_deliverables
   WHERE id = '<deliverable_id>';
   ```

   **Expected Result:**
   - status = 'needs_revision'
   - restaurant_feedback contains message
   - reviewed_by and reviewed_at set

4. **Verify Creator Notified**
   ```sql
   SELECT * FROM notifications
   WHERE user_id = '<creator_user_id>'
   AND notification_type = 'deliverable_revision_requested'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

5. **Verify Creator Can See Feedback**
   - Login as creator
   - Open campaign
   - See status: "Revision Requested"
   - See feedback from restaurant
   - Can resubmit or edit

**Pass Criteria:** ✅ Restaurant can request changes and creator is notified

---

### Test 4.4: Restaurant Rejecting Deliverable

**Objective:** Test restaurant rejecting a deliverable

**Steps:**

1. **Select a Deliverable**
   - Select deliverable to reject

2. **Reject with Reason**
   - Tap "Reject" button
   - Enter reason: "Content does not feature a restaurant as required"
   - Confirm rejection

3. **Verify in Database**
   ```sql
   SELECT
     status,
     restaurant_feedback
   FROM campaign_deliverables
   WHERE id = '<deliverable_id>';
   ```

   **Expected Result:**
   - status = 'rejected'
   - restaurant_feedback contains reason

4. **Verify Creator Notified**
   ```sql
   SELECT * FROM notifications
   WHERE user_id = '<creator_user_id>'
   AND notification_type = 'deliverable_rejected'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

5. **Verify No Payment Triggered**
   ```sql
   SELECT * FROM payments
   WHERE creator_campaign_id = '<creator_campaign_id>';
   ```

   **Expected Result:** No payment record created

**Pass Criteria:** ✅ Restaurant can reject, creator notified, no payment made

---

## Phase 5: Auto-Approval System Testing

### Test 5.1: Test Auto-Approval Countdown

**Objective:** Verify countdown timer shows correctly

**Steps:**

1. **Create Fresh Test Deliverable**
   ```sql
   INSERT INTO campaign_deliverables (
     creator_campaign_id,
     campaign_id,
     creator_id,
     deliverable_index,
     platform,
     post_url,
     status,
     submitted_at
   ) VALUES (
     '<creator_campaign_id>',
     '<campaign_id>',
     '<creator_id>',
     1,
     'instagram',
     'https://instagram.com/p/auto_approval_test',
     'pending',
     NOW()
   )
   RETURNING id, get_auto_approval_deadline(id) as deadline;
   ```

2. **Check Restaurant Dashboard**
   - Login as restaurant
   - Open review dashboard
   - Verify countdown shows:
     - ~72 hours remaining
     - Green color (> 24 hours)

3. **Simulate Time Passing (Option A: Update submitted_at)**
   ```sql
   -- Simulate 48 hours passed
   UPDATE campaign_deliverables
   SET submitted_at = NOW() - INTERVAL '48 hours'
   WHERE post_url = 'https://instagram.com/p/auto_approval_test';
   ```

4. **Check Dashboard Again**
   - Refresh restaurant dashboard
   - Verify countdown shows:
     - ~24 hours remaining
     - Yellow color (12-24 hours)

5. **Simulate More Time**
   ```sql
   -- Simulate 60 hours passed (12 hours remaining)
   UPDATE campaign_deliverables
   SET submitted_at = NOW() - INTERVAL '60 hours'
   WHERE post_url = 'https://instagram.com/p/auto_approval_test';
   ```

6. **Check Dashboard Again**
   - Countdown shows:
     - ~12 hours remaining
     - Red color with pulsing animation (< 12 hours)
     - Warning message visible

**Pass Criteria:** ✅ Countdown displays correctly with color coding

---

### Test 5.2: Test Auto-Approval Execution

**Objective:** Verify deliverables auto-approve after 72 hours

**Steps:**

1. **Simulate Overdue Deliverable**
   ```sql
   -- Set submitted_at to 73 hours ago
   UPDATE campaign_deliverables
   SET submitted_at = NOW() - INTERVAL '73 hours'
   WHERE post_url = 'https://instagram.com/p/auto_approval_test';

   -- Verify it's overdue
   SELECT
     id,
     should_auto_approve(id) as should_approve,
     time_until_auto_approval(id) as time_remaining
   FROM campaign_deliverables
   WHERE post_url = 'https://instagram.com/p/auto_approval_test';
   ```

   **Expected Result:** should_approve = TRUE, time_remaining is negative

2. **Manually Trigger Auto-Approval Function**
   ```sql
   SELECT * FROM auto_approve_overdue_deliverables();
   ```

   **Expected Result:** Function returns row(s) with approved deliverables

3. **Verify Deliverable Auto-Approved**
   ```sql
   SELECT
     id,
     status,
     auto_approved,
     reviewed_at,
     reviewed_by
   FROM campaign_deliverables
   WHERE post_url = 'https://instagram.com/p/auto_approval_test';
   ```

   **Expected Result:**
   - status = 'approved'
   - auto_approved = TRUE
   - reviewed_at is set
   - reviewed_by is NULL (system approved)

4. **Verify Notification Sent**
   ```sql
   SELECT * FROM notifications
   WHERE user_id = '<creator_user_id>'
   AND notification_type IN ('deliverable_approved', 'deliverable_auto_approved')
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected Result:** Notification sent to creator

5. **Verify Payment Triggered**
   ```sql
   SELECT * FROM payments
   WHERE creator_campaign_id = '<creator_campaign_id>'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected Result:** Payment processing initiated

6. **Test Idempotency (Run Function Again)**
   ```sql
   SELECT * FROM auto_approve_overdue_deliverables();
   ```

   **Expected Result:** No rows returned (already approved)

**Cleanup:**
```sql
DELETE FROM campaign_deliverables
WHERE post_url = 'https://instagram.com/p/auto_approval_test';
```

**Pass Criteria:** ✅ Auto-approval executes correctly after 72 hours

---

### Test 5.3: Test Auto-Approval Warning Notifications

**Objective:** Verify restaurants get warned before auto-approval

*Note: This requires notification system to be configured*

**Steps:**

1. **Create Test Deliverable**
   ```sql
   INSERT INTO campaign_deliverables (
     creator_campaign_id,
     campaign_id,
     creator_id,
     deliverable_index,
     platform,
     post_url,
     status,
     submitted_at
   ) VALUES (
     '<creator_campaign_id>',
     '<campaign_id>',
     '<creator_id>',
     1,
     'instagram',
     'https://instagram.com/p/warning_test',
     'pending',
     NOW() - INTERVAL '48 hours'
   )
   RETURNING id;
   ```

2. **Check for Warning Notification**
   ```sql
   -- Check if restaurant received warning (24 hours before auto-approve)
   SELECT * FROM notifications
   WHERE user_id = '<restaurant_owner_id>'
   AND notification_type = 'deliverable_auto_approval_warning'
   AND metadata->>'deliverable_id' = '<deliverable_id>'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. **Simulate More Time (12 hours warning)**
   ```sql
   UPDATE campaign_deliverables
   SET submitted_at = NOW() - INTERVAL '60 hours'
   WHERE post_url = 'https://instagram.com/p/warning_test';
   ```

4. **Check for Second Warning**
   - Verify restaurant receives another warning
   - Dashboard shows red countdown with urgency

**Pass Criteria:** ✅ Restaurants receive timely warnings before auto-approval

---

## Phase 6: Admin UI Testing

### Test 6.1: Admin Campaign Dashboard

**Objective:** Test admin viewing all campaigns and stats

**Steps:**

1. **Login as Admin**
   - Login with kouame@troodieapp.com
   - Navigate to Admin Dashboard

2. **View All Campaigns**
   - Go to Campaigns section
   - See list of all campaigns
   - Verify shows:
     - ✓ Campaign title
     - ✓ Status (active/paused/completed)
     - ✓ Budget
     - ✓ Spots filled (e.g., "3/5")
     - ✓ Deliverables status (e.g., "2 pending, 1 approved")

3. **Filter by Campaign Source**
   - Apply filter: "troodie_direct"
   - Should show "Troodie Creators: Local Gems"
   - Verify "Troodie Original" badge visible

4. **View Campaign Details**
   - Click on "Troodie Creators: Local Gems"
   - See detailed view:
     - ✓ Campaign info
     - ✓ Deliverable requirements
     - ✓ List of accepted creators
     - ✓ Pending applications
     - ✓ Submitted deliverables

**Pass Criteria:** ✅ Admin can view and manage all campaigns

---

### Test 6.2: Admin Deliverables Overview

**Objective:** Test admin viewing all deliverables across campaigns

**Steps:**

1. **Navigate to Deliverables Section**
   - In admin dashboard, go to "Deliverables"
   - See list of all deliverables (all campaigns)

2. **View Deliverable Statistics**
   ```sql
   SELECT * FROM deliverable_statistics;
   ```

   **Verify dashboard shows:**
   - Total deliverables
   - Pending count
   - Approved count
   - Rejected count
   - Average review time
   - Auto-approval rate

3. **Filter Deliverables**
   - Filter by status: "pending"
   - Filter by campaign
   - Filter by auto-approve risk (< 24 hours remaining)

4. **Bulk Actions** (if implemented)
   - Select multiple deliverables
   - Approve/reject in bulk

**Pass Criteria:** ✅ Admin has full visibility into all deliverables

---

## Phase 7: Integration & End-to-End Testing

### Test 7.1: Complete Campaign Workflow

**Objective:** Test full workflow from campaign creation to payment

**Complete Test Scenario:**

1. **Campaign Created** ✓
   - Troodie Originals campaign exists
   - Deliverable requirements set
   - 5 spots available

2. **Creator Discovers & Applies** ✓
   - Creator finds campaign in marketplace
   - Submits application with portfolio
   - Application status: pending

3. **Admin Accepts Creator** ✓
   - Admin reviews application
   - Accepts creator (1 of 5 spots filled)
   - Creator notified

4. **Creator Creates & Submits Content** ✓
   - Creator makes reel/TikTok
   - Posts to Instagram
   - Submits deliverable in app with URL

5. **Restaurant Reviews** ✓
   - Restaurant sees pending deliverable
   - Reviews content against requirements
   - Countdown timer visible (72 hours)

6. **Option A: Manual Approval** ✓
   - Restaurant approves deliverable
   - Creator notified
   - Payment triggered
   - Campaign completion tracked

7. **Option B: Auto-Approval** ✓
   - 72 hours pass with no action
   - Auto-approval function runs
   - Deliverable auto-approved
   - Creator notified
   - Payment triggered

8. **Payment Processed** ✓
   - Stripe Connect transfer initiated
   - Creator receives $50
   - Payment record updated

9. **Campaign Completion** ✓
   - All 5 creators complete deliverables
   - Campaign marked complete
   - Budget fully allocated
   - Stats available in analytics

**Pass Criteria:** ✅ Complete workflow executes without errors

---

### Test 7.2: Multi-Creator Scenario

**Objective:** Test campaign with multiple creators at different stages

**Setup:**

1. Accept 5 creators to campaign
2. Have creators at different stages:
   - Creator 1: Submitted deliverable, pending review
   - Creator 2: Submitted deliverable, approved
   - Creator 3: Submitted deliverable, needs revision
   - Creator 4: Accepted, hasn't submitted yet
   - Creator 5: Application pending

**Verify:**

```sql
-- Check campaign status
SELECT
  c.title,
  c.max_creators,
  COUNT(cc.id) FILTER (WHERE cc.status = 'accepted') as accepted_count,
  COUNT(cc.id) FILTER (WHERE cc.status = 'pending') as pending_count,
  COUNT(cd.id) FILTER (WHERE cd.status = 'pending') as deliverables_pending,
  COUNT(cd.id) FILTER (WHERE cd.status = 'approved') as deliverables_approved,
  COUNT(cd.id) FILTER (WHERE cd.status = 'needs_revision') as deliverables_revision
FROM campaigns c
LEFT JOIN creator_campaigns cc ON cc.campaign_id = c.id
LEFT JOIN campaign_deliverables cd ON cd.campaign_id = c.id
WHERE c.title = 'Troodie Creators: Local Gems'
GROUP BY c.id;
```

**Verify Each Creator Sees Correct Status:**
- Creator 1: "Under Review" + countdown
- Creator 2: "Approved" + payment info
- Creator 3: "Revision Requested" + feedback
- Creator 4: "Ready to Create" + submit button
- Creator 5: "Application Pending"

**Pass Criteria:** ✅ Multiple creators at different stages work correctly

---

## Phase 8: Performance Testing

### Test 8.1: Query Performance

**Objective:** Ensure database queries are fast

**Steps:**

1. **Test Pending Deliverables Query**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM pending_deliverables_summary
   WHERE hours_remaining < 24
   ORDER BY hours_remaining ASC;
   ```

   **Expected Result:** Query executes in < 100ms

2. **Test Auto-Approval Query**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM campaign_deliverables
   WHERE status = 'pending'
   AND submitted_at < NOW() - INTERVAL '72 hours';
   ```

   **Expected Result:**
   - Uses index `idx_deliverables_auto_approval_check`
   - Executes in < 50ms

3. **Test Campaign with Deliverables Join**
   ```sql
   EXPLAIN ANALYZE
   SELECT c.*, COUNT(cd.id) as deliverable_count
   FROM campaigns c
   LEFT JOIN campaign_deliverables cd ON cd.campaign_id = c.id
   WHERE c.status = 'active'
   GROUP BY c.id;
   ```

   **Expected Result:** Executes in < 200ms

**Pass Criteria:** ✅ All queries execute within acceptable time limits

---

### Test 8.2: Load Testing

**Objective:** Test system under load

**Scenarios to Test:**

1. **100 Deliverables Pending Review**
   - Create 100 test deliverables
   - Query pending_deliverables_summary
   - Verify performance acceptable

2. **Auto-Approval with 50 Overdue**
   - Create 50 overdue deliverables
   - Run auto_approve_overdue_deliverables()
   - Verify completes in reasonable time

3. **Multiple Users Viewing Dashboard**
   - Simulate 10 concurrent users
   - Each querying their campaigns/deliverables
   - No lock contention or slowdowns

**Pass Criteria:** ✅ System performs well under expected load

---

## Phase 9: Error Handling & Edge Cases

### Test 9.1: Duplicate Submissions

**Objective:** Prevent duplicate deliverable submissions

**Steps:**

1. **Submit Deliverable**
   - Creator submits deliverable for campaign

2. **Try to Submit Again**
   - Same creator tries to submit again
   - Should be prevented or warned

3. **Verify Constraint**
   ```sql
   -- Try to insert duplicate (should fail)
   INSERT INTO campaign_deliverables (
     creator_campaign_id,
     campaign_id,
     creator_id,
     deliverable_index,
     platform,
     post_url
   ) VALUES (
     '<same_creator_campaign_id>',
     '<campaign_id>',
     '<creator_id>',
     1, -- Same index
     'instagram',
     'https://instagram.com/p/duplicate_test'
   );
   ```

   **Expected Result:** Error due to UNIQUE constraint on (creator_campaign_id, deliverable_index)

**Pass Criteria:** ✅ Duplicate submissions prevented

---

### Test 9.2: Invalid Deliverable Requirements

**Objective:** Test validation of deliverable requirements

**Steps:**

1. **Test Missing Required Fields**
   ```sql
   SELECT validate_deliverable_requirements('{
     "title": "Test"
   }'::jsonb);
   ```

   **Expected Result:** FALSE

2. **Test Invalid Enum Values**
   ```sql
   SELECT validate_deliverable_requirements('{
     "title": "Test",
     "goal": "invalid_goal",
     "type": "invalid_type",
     "compensation_type": "invalid",
     "visit_type": "invalid",
     "payment_timing": "invalid",
     "revisions_allowed": 2
   }'::jsonb);
   ```

   **Expected Result:** FALSE or validation error

3. **Try to Create Campaign with Invalid Requirements**
   - In admin UI, try to create campaign
   - Leave required fields blank
   - Try to save
   - Should show validation errors

**Pass Criteria:** ✅ Invalid requirements are caught and prevented

---

### Test 9.3: Revoked Campaign Access

**Objective:** Test what happens when creator is removed from campaign

**Steps:**

1. **Remove Creator from Campaign**
   ```sql
   UPDATE creator_campaigns
   SET status = 'rejected'
   WHERE id = '<creator_campaign_id>';
   ```

2. **Try to Submit Deliverable**
   - Creator tries to submit deliverable
   - Should be prevented or show error

3. **Try to View Campaign**
   - Creator tries to view campaign details
   - Should see "No longer participating" or similar

**Pass Criteria:** ✅ Removed creators can't submit deliverables

---

### Test 9.4: Campaign Cancellation

**Objective:** Test canceling a campaign with pending deliverables

**Steps:**

1. **Set Campaign to Cancelled**
   ```sql
   UPDATE campaigns
   SET status = 'cancelled'
   WHERE title = 'Troodie Creators: Local Gems';
   ```

2. **Check Pending Deliverables**
   ```sql
   SELECT * FROM campaign_deliverables
   WHERE campaign_id = (SELECT id FROM campaigns WHERE title = 'Troodie Creators: Local Gems')
   AND status = 'pending';
   ```

3. **Decide on Handling:**
   - Auto-reject pending deliverables?
   - Auto-approve as courtesy?
   - Leave as-is for manual review?

4. **Verify Creators Notified**
   - All participants should be notified of cancellation

**Pass Criteria:** ✅ Campaign cancellation handled gracefully

---

## Phase 10: Smoke Test Checklist

**Quick verification that everything works after deployment**

### Database ✓
- [ ] All tables exist
- [ ] All functions work
- [ ] All views return data
- [ ] RLS policies active

### Campaign ✓
- [ ] Troodie Originals campaign exists
- [ ] Campaign visible in app
- [ ] Deliverable requirements set
- [ ] Campaign is active

### Creator Flow ✓
- [ ] Can find campaign
- [ ] Can apply
- [ ] Can submit deliverable
- [ ] Can see status

### Restaurant Flow ✓
- [ ] Can view pending deliverables
- [ ] Can approve
- [ ] Can request changes
- [ ] Can reject

### Auto-Approval ✓
- [ ] Countdown displays
- [ ] Auto-approval function works
- [ ] Notifications sent
- [ ] Payment triggered

### Admin ✓
- [ ] Can view all campaigns
- [ ] Can view all deliverables
- [ ] Can see statistics
- [ ] Can manage applications

---

## 🐛 Known Issues & Limitations

Document any issues found during testing:

1. **Issue:** [Description]
   - **Severity:** High/Medium/Low
   - **Steps to Reproduce:** [Steps]
   - **Workaround:** [If any]
   - **Status:** Open/Fixed

---

## 📊 Test Results Summary

### Test Execution Date: _______________

| Phase | Test Name | Status | Notes |
|-------|-----------|--------|-------|
| 1.1 | Database Migration | ⬜ Pass / ⬜ Fail | |
| 1.2 | Database Functions | ⬜ Pass / ⬜ Fail | |
| 1.3 | RLS Policies | ⬜ Pass / ⬜ Fail | |
| 1.4 | Views | ⬜ Pass / ⬜ Fail | |
| 2.1 | Campaign Creation | ⬜ Pass / ⬜ Fail | |
| 2.2 | Campaign Visibility | ⬜ Pass / ⬜ Fail | |
| 3.1 | Creator Discovery | ⬜ Pass / ⬜ Fail | |
| 3.2 | Creator Application | ⬜ Pass / ⬜ Fail | |
| 3.3 | Deliverable Submission | ⬜ Pass / ⬜ Fail | |
| 3.4 | Submission Status | ⬜ Pass / ⬜ Fail | |
| 4.1 | Restaurant View Pending | ⬜ Pass / ⬜ Fail | |
| 4.2 | Restaurant Approve | ⬜ Pass / ⬜ Fail | |
| 4.3 | Restaurant Request Changes | ⬜ Pass / ⬜ Fail | |
| 4.4 | Restaurant Reject | ⬜ Pass / ⬜ Fail | |
| 5.1 | Auto-Approval Countdown | ⬜ Pass / ⬜ Fail | |
| 5.2 | Auto-Approval Execution | ⬜ Pass / ⬜ Fail | |
| 5.3 | Auto-Approval Warnings | ⬜ Pass / ⬜ Fail | |
| 6.1 | Admin Dashboard | ⬜ Pass / ⬜ Fail | |
| 6.2 | Admin Deliverables | ⬜ Pass / ⬜ Fail | |
| 7.1 | End-to-End Workflow | ⬜ Pass / ⬜ Fail | |
| 7.2 | Multi-Creator Scenario | ⬜ Pass / ⬜ Fail | |
| 8.1 | Query Performance | ⬜ Pass / ⬜ Fail | |
| 8.2 | Load Testing | ⬜ Pass / ⬜ Fail | |
| 9.1 | Duplicate Prevention | ⬜ Pass / ⬜ Fail | |
| 9.2 | Validation | ⬜ Pass / ⬜ Fail | |
| 9.3 | Access Control | ⬜ Pass / ⬜ Fail | |
| 9.4 | Campaign Cancellation | ⬜ Pass / ⬜ Fail | |

### Overall Results:
- **Total Tests:** 24
- **Passed:** ___
- **Failed:** ___
- **Blocked:** ___
- **Pass Rate:** ___%

### Sign-Off:
- **Tested By:** _______________
- **Date:** _______________
- **Environment:** Staging / Production
- **Ready for Production:** ⬜ Yes / ⬜ No

---

## 📚 Additional Resources

- **Migration Guide:** DELIVERABLES_DEPLOYMENT_GUIDE.md
- **Launch Guide:** TROODIE_ORIGINALS_LAUNCH_GUIDE.md
- **Session Plan:** SESSION_2025_10_16_TROODIE_ORIGINALS_AND_DELIVERABLES.md
- **Campaign Script:** scripts/create-troodie-originals-campaign.sql
- **Supabase Dashboard:** https://supabase.com/dashboard/project/tcultsriqunnxujqiwea

---

**Testing Status:** 🟡 **READY FOR TESTING**

*Last Updated: October 20, 2025*
