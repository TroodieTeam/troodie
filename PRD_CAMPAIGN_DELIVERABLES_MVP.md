# Product Requirements Document: Campaign Deliverables MVP

**Version:** 1.0
**Date:** 2025-10-13
**Status:** Implementation Ready
**Owner:** Engineering Team

---

## Executive Summary

The Campaign Deliverables MVP enables creators to submit content deliverables for active campaigns, restaurants to review and approve submissions, and automated payment processing with dispute resolution. This system reduces payment friction through auto-approval after 72 hours while maintaining quality control through restaurant review.

### Goals
1. **Creator Payment Velocity:** Ensure creators get paid within 72 hours maximum
2. **Quality Control:** Enable restaurants to approve/reject/request revisions
3. **Trust & Safety:** Dispute system for conflict resolution
4. **Automation:** Reduce manual overhead through automated workflows

### Success Metrics
- **Payment Speed:** 95% of payments processed within 72 hours
- **Dispute Rate:** < 10% of deliverables disputed
- **Creator Satisfaction:** > 85% satisfaction with payment process
- **Review Rate:** > 60% of deliverables reviewed before auto-approval

---

## Epics Breakdown

### Epic 1: Deliverable Submission & Review (Phase 1 - Weeks 1-4)

**Goal:** Enable end-to-end deliverable lifecycle from submission to payment

#### Epic User Stories

**As a Creator:**
- I can submit content deliverables (photo/video/reel/story) for my active campaigns
- I can save deliverables as drafts and submit them later
- I can see the status of all my submitted deliverables
- I can view rejection reasons and revision requests
- I can resubmit improved content after revision requests
- I can track payment status for approved deliverables
- I can update performance metrics (views, likes, engagement)

**As a Restaurant Owner:**
- I can see all pending deliverables for my campaigns in a review queue
- I can see a 72-hour countdown timer for each deliverable
- I can view full deliverable details (content, caption, creator info)
- I can approve deliverables to trigger payment
- I can reject deliverables with specific reasons
- I can request revisions with detailed notes
- I can perform bulk actions (approve/reject multiple at once)
- I receive urgent notifications when auto-approval approaches

**As the System:**
- Deliverables auto-approve after 72 hours if not reviewed
- Payments process automatically for approved deliverables
- Notifications sent for all status changes
- Metrics and counters update automatically

#### Features

**1.1 Creator Deliverable Submission**
- Upload content (image/video)
- Add caption (optional but recommended)
- Select social platform (Instagram, TikTok, YouTube, Twitter)
- Add post URL (optional)
- Save as draft or submit for review
- View all deliverables with status badges

**1.2 Restaurant Review Dashboard**
- Pending deliverables queue (sorted by submission date)
- 72-hour countdown timer per deliverable
- Deliverable detail view with full content
- Three action buttons: Approve, Request Revision, Reject
- Bulk selection and actions
- Filter tabs: Pending, Approved, Rejected, All

**1.3 Auto-Approval System**
- Cron job runs every 6 hours
- Identifies deliverables > 72 hours old
- Auto-approves and triggers payment
- Sends notifications to creators
- Logs execution for monitoring

**1.4 Payment Processing**
- Stripe Connect integration
- Creator onboarding flow
- Automatic payment transfers
- Payment retry logic (3 attempts)
- Payment history and tracking

**1.5 Notification System**
- Submission confirmation (creator)
- New deliverable alert (restaurant)
- Approval notification (creator)
- Rejection notification with reason (creator)
- Revision request with notes (creator)
- Auto-approval notification (creator)
- Payment completed notification (creator)
- 24-hour warning before auto-approval (restaurant)

---

### Epic 2: Trust & Safety (Phase 2 - Weeks 5-8)

**Goal:** Add quality controls and dispute resolution

#### Features

**2.1 Dispute System**
- Creators can dispute rejections
- Restaurants can dispute auto-approved deliverables (within 7 days)
- Evidence submission (images, videos, screenshots)
- Admin review queue
- Resolution with payment/refund actions

**2.2 Content Verification** (Future)
- Automated quality checks
- Duplicate content detection
- Brand guideline compliance

**2.3 Quality Scoring** (Future)
- Engagement rate calculation
- Quality score based on metrics
- Creator reputation system

---

### Epic 3: Optimization (Phase 3 - Weeks 9-12)

**Goal:** Polish experience and add advanced features

#### Features

**3.1 Advanced Operations**
- Batch approve/reject
- Advanced search and filters
- Performance analytics dashboard

**3.2 Communication**
- Direct messaging between creators and restaurants
- Revision threads
- Q&A before submission

---

## Technical Architecture

### Database Schema

#### Core Tables

**campaign_deliverables**
- Primary table for all deliverables
- Tracks status workflow (draft → pending_review → approved/rejected/revision_requested)
- Stores payment information
- Handles dispute status

**deliverable_revisions**
- Revision history when creators resubmit
- Links to original deliverable
- Tracks revision number

**deliverable_disputes**
- Dispute management
- Filed by creator or restaurant
- Evidence URLs array
- Resolution tracking

**dispute_messages**
- Communication thread for disputes
- Supports admin, creator, restaurant roles

**cron_job_logs**
- Monitoring for automated jobs
- Tracks success/failure rates

### Services

**deliverableService.ts**
- Submit deliverable (draft or pending_review)
- Approve/reject/request revision
- Get deliverables by creator/restaurant/campaign
- Update metrics

**paymentService.ts** (Future - Phase 1, Week 4)
- Stripe Connect account creation
- Payment transfer processing
- Onboarding link generation
- Retry logic

**deliverableNotificationService.ts** (Phase 1, Week 5)
- All notification types
- Push and in-app notifications
- Batch notifications for warnings

**disputeService.ts** (Phase 2)
- File dispute
- Add evidence
- Admin resolution
- Payment adjustments

### Edge Functions

**auto-approve-deliverables** (Cron: every 6 hours)
- Finds deliverables > 72 hours
- Auto-approves with status change
- Triggers payment processing
- Logs execution metrics

**auto-approval-warnings** (Cron: every 6 hours)
- Finds deliverables < 24 hours to auto-approval
- Sends urgent notifications to restaurants

**retry-failed-payments** (Cron: daily)
- Retries failed payments (max 3 attempts)
- Admin alerts on final failure

---

## User Flows

### Flow 1: Happy Path - Deliverable Approved by Restaurant

```
1. Creator submits deliverable
   ↓
2. Restaurant receives notification
   ↓
3. Restaurant reviews within 72h
   ↓
4. Restaurant approves with optional notes
   ↓
5. Payment processing triggered
   ↓
6. Creator receives approval + payment notification
   ↓
7. Payment completes (Stripe transfer)
   ↓
8. Creator receives payment completion notification
```

### Flow 2: Auto-Approval Path

```
1. Creator submits deliverable
   ↓
2. Restaurant receives notification
   ↓
3. 48 hours pass (no review)
   ↓
4. Restaurant receives "24h warning" notification
   ↓
5. 72 hours pass (still no review)
   ↓
6. System auto-approves deliverable
   ↓
7. Payment processing triggered
   ↓
8. Creator receives auto-approval notification
   ↓
9. Payment completes
```

### Flow 3: Revision Request Path

```
1. Creator submits deliverable
   ↓
2. Restaurant reviews
   ↓
3. Restaurant requests revision with notes
   ↓
4. Creator receives revision request notification
   ↓
5. Creator views revision notes
   ↓
6. Creator resubmits improved content
   ↓
7. Back to Flow 1 or Flow 2
```

### Flow 4: Rejection Path

```
1. Creator submits deliverable
   ↓
2. Restaurant reviews
   ↓
3. Restaurant rejects with reason
   ↓
4. Creator receives rejection notification
   ↓
5. Creator can:
   - Accept rejection (no payment)
   - File dispute (see Flow 5)
```

### Flow 5: Dispute Path

```
1. Creator disputes rejection OR Restaurant disputes auto-approval
   ↓
2. Dispute filed with reason and evidence
   ↓
3. Other party notified
   ↓
4. Admin reviews evidence
   ↓
5. Admin resolves (favor creator/restaurant/split)
   ↓
6. Payment processed/refunded based on resolution
   ↓
7. Both parties notified of outcome
```

---

## Manual Testing Guide

### Prerequisites

**IMPORTANT: Schema Migration Note**
The existing `campaign_deliverables` table in the database has a different structure than required. The migration file `20251013_campaign_deliverables_schema_fixed.sql` will **DROP and RECREATE** this table. Any existing data in `campaign_deliverables` will be lost. If you need to preserve data, back it up first.

**Test Accounts Required:**
- 1 Creator account (with accepted campaign application)
- 1 Restaurant/Business account (with active campaign)
- Test campaign with active status
- Test campaign application (status: accepted)

**Tools Needed:**
- Supabase Studio (for database inspection)
- Expo Go or development build
- Image editing tool (for test content)

---

### Test Suite 1: Database Schema Validation

**Objective:** Verify all tables, indexes, and functions exist

#### Test 1.1: Verify Tables Created

**Steps:**
1. Open Supabase Studio
2. Navigate to Database → Tables
3. Verify these tables exist:
   - `campaign_deliverables`
   - `deliverable_revisions`
   - `deliverable_disputes`
   - `dispute_messages`
   - `cron_job_logs`

**Expected Result:**
- ✅ All 5 tables exist
- ✅ Each table has proper columns as per schema

#### Test 1.2: Verify Indexes Created

**Steps:**
1. In Supabase Studio, go to Database → Indexes
2. Check for deliverables indexes:
   - `idx_deliverables_application`
   - `idx_deliverables_creator`
   - `idx_deliverables_restaurant`
   - `idx_deliverables_campaign`
   - `idx_deliverables_status`
   - `idx_deliverables_payment_status`
   - `idx_deliverables_submitted_at`
   - `idx_deliverables_auto_approval`

**Expected Result:**
- ✅ All indexes exist
- ✅ Auto-approval index has WHERE clause for status = 'pending_review'

#### Test 1.3: Verify RLS Policies

**Steps:**
1. In Supabase Studio, select `campaign_deliverables` table
2. Click on "Policies" tab
3. Verify policies exist:
   - "Creators can view own deliverables"
   - "Creators can submit deliverables"
   - "Creators can update draft deliverables"
   - "Restaurant owners can view campaign deliverables"
   - "Restaurant owners can review deliverables"

**Expected Result:**
- ✅ All 5 policies exist and enabled

#### Test 1.4: Test Auto-Approval Function

**Steps:**
1. In Supabase Studio, go to SQL Editor
2. Run: `SELECT auto_approve_deliverables();`
3. Check result (returns INTEGER count)

**Expected Result:**
- ✅ Function executes without error
- ✅ Returns 0 (no deliverables > 72h old yet)

**SQL to manually test:**
```sql
-- Create a test deliverable > 72h old
INSERT INTO campaign_deliverables (
  campaign_application_id,
  creator_id,
  restaurant_id,
  campaign_id,
  content_type,
  content_url,
  status,
  submitted_at
) VALUES (
  '[valid_application_id]',
  '[valid_creator_id]',
  '[valid_restaurant_id]',
  '[valid_campaign_id]',
  'photo',
  'https://example.com/test.jpg',
  'pending_review',
  NOW() - INTERVAL '73 hours'
);

-- Run auto-approval
SELECT auto_approve_deliverables();

-- Verify it was auto-approved
SELECT id, status, auto_approved_at, payment_status
FROM campaign_deliverables
WHERE status = 'auto_approved';
```

**Expected Result:**
- ✅ Function returns 1
- ✅ Deliverable status changed to 'auto_approved'
- ✅ auto_approved_at timestamp set
- ✅ payment_status changed to 'processing'

---

### Test Suite 2: Service Layer Validation

**Objective:** Verify deliverableService.ts methods work correctly

#### Test 2.1: Submit Deliverable

**Steps:**
1. In app or via code, call:
```typescript
const result = await deliverableService.submitDeliverable({
  campaign_application_id: '[test_application_id]',
  content_type: 'photo',
  content_url: 'https://example.com/test-photo.jpg',
  thumbnail_url: 'https://example.com/test-photo-thumb.jpg',
  caption: 'Test deliverable submission',
  social_platform: 'instagram',
  platform_post_url: 'https://instagram.com/p/test123',
});
```
2. Check console logs
3. Query database:
```sql
SELECT * FROM campaign_deliverables ORDER BY created_at DESC LIMIT 1;
```

**Expected Result:**
- ✅ Console shows: "[DeliverableService] Deliverable submitted successfully: [uuid]"
- ✅ Function returns deliverable object with id
- ✅ Database record exists with:
  - status = 'pending_review'
  - submitted_at = current timestamp
  - payment_status = 'pending'
  - All provided fields match

#### Test 2.2: Save as Draft

**Steps:**
1. Call:
```typescript
const draft = await deliverableService.saveDraftDeliverable({
  campaign_application_id: '[test_application_id]',
  content_type: 'video',
  content_url: 'https://example.com/test-video.mp4',
  caption: 'Draft deliverable',
});
```
2. Verify in database

**Expected Result:**
- ✅ Deliverable created with status = 'draft'
- ✅ submitted_at is NULL or same as created_at

#### Test 2.3: Approve Deliverable

**Steps:**
1. Create test deliverable (pending_review status)
2. Call:
```typescript
const approved = await deliverableService.approveDeliverable(
  '[deliverable_id]',
  'Great work! Approved.'
);
```
3. Check database

**Expected Result:**
- ✅ status changed to 'approved'
- ✅ reviewed_at timestamp set
- ✅ review_notes = "Great work! Approved."
- ✅ payment_status = 'processing'

#### Test 2.4: Reject Deliverable

**Steps:**
1. Create test deliverable (pending_review status)
2. Call:
```typescript
const rejected = await deliverableService.rejectDeliverable(
  '[deliverable_id]',
  'Does not meet campaign requirements'
);
```
3. Check database

**Expected Result:**
- ✅ status = 'rejected'
- ✅ reviewed_at timestamp set
- ✅ rejection_reason stored

#### Test 2.5: Request Revision

**Steps:**
1. Create test deliverable (pending_review status)
2. Call:
```typescript
const revision = await deliverableService.requestRevision(
  '[deliverable_id]',
  'Please improve lighting and add restaurant logo'
);
```
3. Check database

**Expected Result:**
- ✅ status = 'revision_requested'
- ✅ revision_notes stored

#### Test 2.6: Get Pending Deliverables (Restaurant View)

**Steps:**
1. Create 3 test deliverables for same restaurant (all pending_review)
2. Call:
```typescript
const pending = await deliverableService.getPendingDeliverables('[restaurant_id]');
```

**Expected Result:**
- ✅ Returns array of 3 deliverables
- ✅ Sorted by submitted_at (oldest first)
- ✅ Includes campaign and creator details

#### Test 2.7: Get My Deliverables (Creator View)

**Steps:**
1. Create deliverables for test creator (various statuses)
2. Call:
```typescript
const myDeliverables = await deliverableService.getMyDeliverables('[creator_id]');
```

**Expected Result:**
- ✅ Returns all deliverables for that creator
- ✅ Sorted by created_at (newest first)
- ✅ Includes campaign details

#### Test 2.8: Update Metrics

**Steps:**
1. Create test deliverable
2. Call:
```typescript
const updated = await deliverableService.updateMetrics('[deliverable_id]', {
  views_count: 1000,
  likes_count: 85,
  comments_count: 12,
  shares_count: 3,
});
```
3. Check database

**Expected Result:**
- ✅ Metrics updated
- ✅ engagement_rate calculated automatically: (85+12+3)/1000 * 100 = 10.00%

---

### Test Suite 3: RLS Policy Validation

**Objective:** Verify Row Level Security works correctly

#### Test 3.1: Creator Can Only See Their Own Deliverables

**Steps:**
1. Login as Creator A
2. Create deliverable for Creator A
3. Login as Creator B
4. Try to query Creator A's deliverable:
```typescript
const result = await deliverableService.getDeliverableById('[creator_a_deliverable_id]');
```

**Expected Result:**
- ✅ Creator A can see their deliverable
- ✅ Creator B cannot see Creator A's deliverable (returns null)

#### Test 3.2: Restaurant Can Only See Their Campaign Deliverables

**Steps:**
1. Create deliverable for Restaurant A's campaign
2. Login as Restaurant B
3. Try to fetch pending deliverables:
```typescript
const pending = await deliverableService.getPendingDeliverables('[restaurant_a_id]');
```

**Expected Result:**
- ✅ Restaurant A sees their deliverables
- ✅ Restaurant B sees empty array (no access to Restaurant A's deliverables)

#### Test 3.3: Only Creators Can Submit Deliverables

**Steps:**
1. Login as Restaurant account
2. Try to submit deliverable:
```typescript
const result = await deliverableService.submitDeliverable({...});
```

**Expected Result:**
- ✅ Insert fails (RLS violation)
- ✅ Error indicates permission denied

#### Test 3.4: Creators Can Only Update Draft Deliverables

**Steps:**
1. Create deliverable with status = 'pending_review'
2. Login as creator (owner of deliverable)
3. Try to update:
```typescript
const updated = await deliverableService.updateDraftDeliverable(
  '[deliverable_id]',
  { caption: 'Updated caption' }
);
```

**Expected Result:**
- ✅ Update fails because status is not 'draft'
- ✅ Only drafts can be updated by creators

---

### Test Suite 4: End-to-End User Flows

**Objective:** Test complete workflows from user perspective

#### Test 4.1: Happy Path - Restaurant Approves

**Scenario:** Creator submits → Restaurant approves → Payment processes

**Steps:**
1. **Creator Side:**
   - Login as creator
   - Navigate to active campaign
   - Tap "Submit Deliverable"
   - Upload test image
   - Add caption: "Delicious food at [restaurant name]!"
   - Select platform: Instagram
   - Tap "Submit for Review"

2. **Verify Submission:**
   - Check console logs for success message
   - Check database for new deliverable (status: pending_review)
   - Verify campaign counters updated

3. **Restaurant Side:**
   - Login as restaurant owner
   - Navigate to "Content Review" dashboard
   - See deliverable in pending queue
   - Tap on deliverable to view details
   - See full image, caption, creator info
   - Tap "Approve"
   - Add optional review notes: "Looks great!"
   - Confirm approval

4. **Verify Approval:**
   - Check database: status = 'approved'
   - Check database: payment_status = 'processing'
   - reviewed_at timestamp set
   - Campaign counters updated

**Expected Result:**
- ✅ Creator successfully submits
- ✅ Restaurant sees deliverable immediately
- ✅ Approval changes status and triggers payment
- ✅ All timestamps and counters correct

#### Test 4.2: Auto-Approval Path (Simulated)

**Scenario:** Creator submits → No review → Auto-approval after 72h

**Steps:**
1. Create test deliverable with submitted_at = 73 hours ago:
```sql
INSERT INTO campaign_deliverables (
  campaign_application_id,
  creator_id,
  restaurant_id,
  campaign_id,
  content_type,
  content_url,
  caption,
  status,
  submitted_at,
  payment_amount_cents
) VALUES (
  '[valid_application_id]',
  '[valid_creator_id]',
  '[valid_restaurant_id]',
  '[valid_campaign_id]',
  'photo',
  'https://example.com/test.jpg',
  'Auto-approval test',
  'pending_review',
  NOW() - INTERVAL '73 hours',
  5000
);
```

2. Run auto-approval function:
```sql
SELECT auto_approve_deliverables();
```

3. Verify results:
```sql
SELECT id, status, auto_approved_at, payment_status
FROM campaign_deliverables
WHERE caption = 'Auto-approval test';
```

**Expected Result:**
- ✅ Function returns 1 (1 deliverable auto-approved)
- ✅ status = 'auto_approved'
- ✅ auto_approved_at timestamp set
- ✅ payment_status = 'processing'

#### Test 4.3: Revision Request Flow

**Scenario:** Restaurant requests revision → Creator resubmits

**Steps:**
1. **Initial Submission:**
   - Creator submits deliverable
   - Verify status = 'pending_review'

2. **Revision Request:**
   - Restaurant reviews deliverable
   - Taps "Request Revision"
   - Enters notes: "Please add restaurant logo in bottom right corner"
   - Submits revision request

3. **Verify Revision Request:**
   - Check database: status = 'revision_requested'
   - revision_notes stored correctly

4. **Creator Resubmission:**
   - Creator views deliverable
   - Sees revision notes
   - Uploads new improved content
   - Submits again

5. **Verify Resubmission:**
   - New deliverable created OR original updated
   - Status back to 'pending_review'
   - Revision history tracked

**Expected Result:**
- ✅ Revision request stores notes
- ✅ Creator can see revision notes
- ✅ Resubmission creates new pending deliverable

#### Test 4.4: Rejection Flow

**Scenario:** Restaurant rejects deliverable with reason

**Steps:**
1. Creator submits deliverable
2. Restaurant reviews and taps "Reject"
3. Enters rejection reason: "Does not follow brand guidelines"
4. Confirms rejection

**Verify:**
- Check database: status = 'rejected'
- rejection_reason stored
- reviewed_at timestamp set
- payment_status remains 'pending'

**Expected Result:**
- ✅ Rejection recorded with reason
- ✅ No payment triggered

---

### Test Suite 5: Auto-Approval Timing Tests

**Objective:** Verify 72-hour auto-approval logic

#### Test 5.1: Deliverable at 71 Hours (Should NOT Auto-Approve)

**Steps:**
1. Create deliverable with submitted_at = 71 hours ago
2. Run auto_approve_deliverables()
3. Check status

**Expected Result:**
- ✅ Function returns 0 (no approvals)
- ✅ Deliverable still 'pending_review'

#### Test 5.2: Deliverable at Exactly 72 Hours (Should Auto-Approve)

**Steps:**
1. Create deliverable with submitted_at = 72 hours ago
2. Run auto_approve_deliverables()
3. Check status

**Expected Result:**
- ✅ Function returns 1
- ✅ status = 'auto_approved'

#### Test 5.3: Multiple Deliverables at Different Times

**Steps:**
1. Create 5 deliverables:
   - Deliverable A: 50 hours old (pending_review)
   - Deliverable B: 73 hours old (pending_review)
   - Deliverable C: 75 hours old (pending_review)
   - Deliverable D: 80 hours old (already approved manually)
   - Deliverable E: 90 hours old (pending_review)

2. Run auto_approve_deliverables()

**Expected Result:**
- ✅ Function returns 3 (B, C, E auto-approved)
- ✅ A remains pending_review (< 72h)
- ✅ D remains approved (already reviewed)
- ✅ B, C, E changed to 'auto_approved'

---

### Test Suite 6: Counter and Trigger Tests

**Objective:** Verify triggers update campaign and application counters

#### Test 6.1: Campaign Counters Update on Deliverable Insert

**Steps:**
1. Get initial campaign counters:
```sql
SELECT
  deliverables_submitted,
  deliverables_pending,
  deliverables_approved
FROM campaigns WHERE id = '[test_campaign_id]';
```

2. Submit new deliverable for that campaign

3. Check counters again

**Expected Result:**
- ✅ deliverables_submitted increased by 1
- ✅ deliverables_pending increased by 1
- ✅ deliverables_approved unchanged

#### Test 6.2: Campaign Counters Update on Deliverable Approval

**Steps:**
1. Get initial counters
2. Approve a pending deliverable
3. Check counters

**Expected Result:**
- ✅ deliverables_pending decreased by 1
- ✅ deliverables_approved increased by 1
- ✅ deliverables_submitted unchanged

#### Test 6.3: Application Counters Update

**Steps:**
1. Get application counters:
```sql
SELECT
  deliverables_submitted,
  deliverables_approved,
  total_earned_cents
FROM campaign_applications WHERE id = '[test_application_id]';
```

2. Submit deliverable (payment_amount_cents = 5000)
3. Approve deliverable
4. Mark payment as 'completed'
5. Check counters

**Expected Result:**
- ✅ deliverables_submitted = 1
- ✅ deliverables_approved = 1
- ✅ total_earned_cents = 5000

---

### Test Suite 7: Engagement Rate Calculation

**Objective:** Verify automatic engagement rate calculation

#### Test 7.1: Engagement Rate Triggers on Metrics Update

**Steps:**
1. Create deliverable
2. Update metrics:
```typescript
await deliverableService.updateMetrics('[deliverable_id]', {
  views_count: 1000,
  likes_count: 50,
  comments_count: 10,
  shares_count: 5,
});
```

3. Query deliverable:
```sql
SELECT engagement_rate FROM campaign_deliverables WHERE id = '[deliverable_id]';
```

**Expected Result:**
- ✅ engagement_rate = ((50 + 10 + 5) / 1000) * 100 = 6.50%

#### Test 7.2: Zero Views Handling

**Steps:**
1. Update metrics with views_count = 0
2. Check engagement_rate

**Expected Result:**
- ✅ engagement_rate = NULL (avoid division by zero)

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests in Test Suite 1 pass (database schema)
- [ ] All tests in Test Suite 2 pass (service layer)
- [ ] All tests in Test Suite 3 pass (RLS policies)
- [ ] All tests in Test Suite 4 pass (end-to-end flows)
- [ ] Code review completed
- [ ] Database migration tested on staging

### Deployment Steps

1. **Run Migration:**
```bash
# Connect to Supabase project
npx supabase db push

# OR manually run the migration file in Supabase Studio
# Copy contents of supabase/migrations/20251013_campaign_deliverables_schema.sql
# Paste into SQL Editor and execute
```

2. **Verify Migration:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%deliverable%';

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%deliverable%';

-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('campaign_deliverables', 'deliverable_revisions');
```

3. **Test Auto-Approval Function:**
```sql
SELECT auto_approve_deliverables();
```

4. **Deploy Code:**
   - Push deliverableService.ts to repo
   - Trigger app rebuild (if using EAS)
   - OR restart development server

### Post-Deployment

- [ ] Smoke test: Submit one real deliverable
- [ ] Verify notifications work
- [ ] Check all counters update correctly
- [ ] Monitor logs for errors
- [ ] Run auto-approval function manually once

---

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Deliverable Volume:**
   - Submissions per day
   - Pending queue size
   - Average review time

2. **Auto-Approval Rate:**
   - % of deliverables auto-approved vs manually reviewed
   - Should aim for < 40% auto-approved (meaning > 60% reviewed)

3. **Payment Success Rate:**
   - % of payments that complete successfully
   - Should be > 95%

4. **Error Rates:**
   - Failed deliverable submissions
   - RLS policy violations
   - Auto-approval function failures

### Monitoring Queries

**Pending Queue Size:**
```sql
SELECT COUNT(*) as pending_count
FROM campaign_deliverables
WHERE status = 'pending_review';
```

**Auto-Approval Rate (Last 7 Days):**
```sql
SELECT
  COUNT(CASE WHEN status = 'auto_approved' THEN 1 END) as auto_approved,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as manually_approved,
  ROUND(
    COUNT(CASE WHEN status = 'auto_approved' THEN 1 END)::DECIMAL /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as auto_approval_rate
FROM campaign_deliverables
WHERE created_at > NOW() - INTERVAL '7 days'
AND status IN ('approved', 'auto_approved');
```

**Average Review Time:**
```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at)) / 3600) as avg_hours_to_review
FROM campaign_deliverables
WHERE reviewed_at IS NOT NULL
AND submitted_at > NOW() - INTERVAL '7 days';
```

**Cron Job Health:**
```sql
SELECT
  job_name,
  status,
  success_count,
  failure_count,
  created_at
FROM cron_job_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## Known Limitations (MVP)

1. **No email notifications** - Only in-app and push notifications
2. **No bulk upload** - One deliverable at a time
3. **No video preview** - Full video must be downloaded to view
4. **No revision limits** - Unlimited revision requests allowed
5. **Simple metrics** - No advanced analytics dashboard yet
6. **Manual metric updates** - Creators must manually enter engagement stats

---

## Future Enhancements (Post-MVP)

1. **Phase 2 Features:**
   - Automated quality scoring
   - Duplicate content detection
   - Advanced analytics dashboard
   - Email notifications

2. **Phase 3 Features:**
   - Direct creator-restaurant messaging
   - Revision threading
   - Batch operations
   - Export reports
   - Multi-currency support

---

## Appendix A: Test Data Setup

### SQL Script to Create Test Campaign and Application

```sql
-- Insert test campaign
INSERT INTO campaigns (
  id,
  restaurant_id,
  owner_id,
  name,
  description,
  status,
  budget_cents,
  start_date,
  end_date,
  max_creators
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '[your_test_restaurant_id]',
  '[your_test_user_id]',
  'Test Campaign for Deliverables',
  'This is a test campaign for testing deliverable submissions',
  'active',
  100000,
  NOW(),
  NOW() + INTERVAL '30 days',
  5
);

-- Insert test campaign application (accepted)
INSERT INTO campaign_applications (
  id,
  campaign_id,
  creator_id,
  status,
  proposed_rate_cents
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '[your_test_creator_profile_id]',
  'accepted',
  5000
);
```

### Test Image URLs (Placeholder)

Use these placeholder URLs for testing:
- Photo: `https://picsum.photos/800/600`
- Video: `https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4`

---

## Appendix B: Error Codes and Troubleshooting

### Common Errors

**Error:** "Application not found"
- **Cause:** Invalid campaign_application_id
- **Fix:** Verify application exists and is 'accepted' status

**Error:** "RLS policy violation"
- **Cause:** User doesn't have permission
- **Fix:** Check user is logged in as creator/restaurant owner

**Error:** "Cannot update non-draft deliverable"
- **Cause:** Trying to update deliverable that's already submitted
- **Fix:** Only drafts can be updated; submitted deliverables cannot be edited

**Error:** "Auto-approval function failed"
- **Cause:** Database trigger error or missing foreign key
- **Fix:** Check campaign_application_id exists and creator/restaurant profiles valid

---

**Document Version History:**
- v1.0 (2025-10-13): Initial PRD creation with comprehensive testing guide

