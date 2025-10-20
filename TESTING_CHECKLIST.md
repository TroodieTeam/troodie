# Troodie Originals - Quick Testing Checklist

**Use this checklist to quickly verify all functionality works as expected**

---

## 🚀 Quick Start Testing (30 minutes)

### Step 1: Deploy Database Migration (5 min)
```bash
# Run in Supabase SQL Editor
# Copy contents of: supabase/migrations/20251016_enhanced_deliverables_system.sql
# Paste and execute
```

- [ ] Migration completes successfully
- [ ] See success message: "ENHANCED DELIVERABLES SYSTEM MIGRATION COMPLETE"

### Step 2: Create Test Campaign (5 min)
```bash
# Run in Supabase SQL Editor
# Copy contents of: scripts/create-troodie-originals-campaign.sql
# Paste and execute
```

- [ ] Campaign created successfully
- [ ] Campaign ID returned
- [ ] Success message shows campaign details

### Step 3: Verify in Database (5 min)
```sql
-- Check campaign exists
SELECT id, title, budget, max_creators, deliverable_requirements
FROM campaigns
WHERE title = 'Troodie Creators: Local Gems';

-- Check deliverables table exists
SELECT COUNT(*) FROM campaign_deliverables;

-- Check functions work
SELECT validate_deliverable_requirements('{"title":"Test","goal":"awareness","type":"reel","compensation_type":"cash","compensation_value":5000,"visit_type":"dine_in","payment_timing":"after_post","revisions_allowed":2}'::jsonb);
```

- [ ] Campaign exists with correct details
- [ ] deliverables table is queryable
- [ ] Validation function returns TRUE

### Step 4: Test in App - Creator Flow (10 min)

**Login as Creator:**
- [ ] Navigate to Campaigns/Marketplace
- [ ] Find "Troodie Creators: Local Gems"
- [ ] See "Troodie Original" badge
- [ ] View campaign details (shows requirements)
- [ ] Apply to campaign
- [ ] Get accepted (admin approves)
- [ ] Submit test deliverable:
  - Platform: Instagram
  - URL: https://instagram.com/p/test123
  - Notes: "Test submission"
- [ ] See confirmation screen
- [ ] Status shows "Under Review"

### Step 5: Test in App - Restaurant Flow (5 min)

**Login as Restaurant/Admin:**
- [ ] Open campaign dashboard
- [ ] See "Troodie Creators: Local Gems"
- [ ] Click "Review Deliverables"
- [ ] See pending deliverable with countdown timer
- [ ] Click deliverable to view details
- [ ] Click "Approve"
- [ ] See success confirmation
- [ ] Creator gets notification

---

## 📋 Comprehensive Testing Checklist

### Database Layer ✓

#### Tables
- [ ] `campaign_deliverables` table exists with all columns
- [ ] `campaigns.deliverable_requirements` column exists (jsonb)
- [ ] `creator_campaigns.deliverables_submitted` column exists (jsonb)
- [ ] `creator_campaigns.all_deliverables_submitted` column exists (boolean)
- [ ] `creator_campaigns.restaurant_review_deadline` column exists (timestamptz)
- [ ] `creator_campaigns.auto_approved` column exists (boolean)

#### Functions
- [ ] `get_auto_approval_deadline(UUID)` works
- [ ] `should_auto_approve(UUID)` works
- [ ] `time_until_auto_approval(UUID)` works
- [ ] `auto_approve_overdue_deliverables()` works
- [ ] `validate_deliverable_requirements(JSONB)` works
- [ ] `update_creator_campaign_deliverable_status()` trigger works

#### Views
- [ ] `pending_deliverables_summary` returns data
- [ ] `deliverable_statistics` returns aggregated stats

#### RLS Policies
- [ ] Creators can view only their own deliverables
- [ ] Creators can insert their own deliverables
- [ ] Restaurants can view deliverables for their campaigns
- [ ] Restaurants can update deliverables for their campaigns
- [ ] Admins can view all deliverables
- [ ] Admins can update all deliverables

#### Indexes
- [ ] `idx_deliverables_creator_campaign` exists
- [ ] `idx_deliverables_campaign` exists
- [ ] `idx_deliverables_creator` exists
- [ ] `idx_deliverables_status` exists
- [ ] `idx_deliverables_submitted` exists
- [ ] `idx_deliverables_auto_approval_check` exists

---

### Campaign Creation ✓

- [ ] Troodie Originals campaign created successfully
- [ ] Campaign title: "Troodie Creators: Local Gems"
- [ ] Budget: $250 (25000 cents)
- [ ] Max creators: 5
- [ ] Campaign source: troodie_direct
- [ ] Campaign type: sponsored
- [ ] Status: active
- [ ] is_subsidized: TRUE
- [ ] deliverable_requirements JSONB is valid
- [ ] platform_managed_campaigns tracking record exists
- [ ] Campaign visible in database queries

---

### Creator Flow ✓

#### Discovery
- [ ] Campaign appears in marketplace/campaigns list
- [ ] Campaign card shows title, budget, restaurant
- [ ] "Troodie Original" badge visible
- [ ] Campaign tappable to view details

#### Campaign Details
- [ ] Full description visible
- [ ] Requirements list displayed (7 items)
- [ ] Compensation clearly shown ($50)
- [ ] Deliverable requirements visible
- [ ] Timeline/due date shown
- [ ] "Apply" button prominent

#### Application
- [ ] Can submit application
- [ ] Application form works (if exists)
- [ ] Application submitted successfully
- [ ] Application appears in database (status: pending)
- [ ] Confirmation message shown

#### Acceptance
- [ ] Admin can see pending applications
- [ ] Admin can accept creator
- [ ] Creator receives acceptance notification
- [ ] Campaign status updates to "accepted"
- [ ] Campaign moves to "My Campaigns"

#### Deliverable Submission
- [ ] "Submit Deliverable" button visible
- [ ] Submission form opens
- [ ] Campaign requirements shown at top
- [ ] Platform selector works (Instagram/TikTok)
- [ ] Post URL field accepts input
- [ ] URL validation works
- [ ] Screenshot upload works (optional)
- [ ] Notes field works (optional)
- [ ] Submit button works
- [ ] Submission confirmation screen appears
- [ ] Deliverable recorded in database (status: pending)
- [ ] Auto-approval deadline calculated correctly

#### Status Tracking
- [ ] Campaign status shows "Under Review"
- [ ] Submission details visible (URL, date)
- [ ] Countdown timer displays correctly
- [ ] Can view submitted content

---

### Restaurant/Business Flow ✓

#### Dashboard
- [ ] Can view all campaigns
- [ ] "Troodie Creators: Local Gems" visible
- [ ] Campaign stats shown (creators, deliverables)
- [ ] "Review Deliverables" button visible

#### Review Dashboard
- [ ] List of pending deliverables displayed
- [ ] Each deliverable shows:
  - [ ] Creator name and avatar
  - [ ] Platform icon
  - [ ] Post URL (clickable)
  - [ ] Screenshot thumbnail (if uploaded)
  - [ ] Submission date
  - [ ] Countdown timer
  - [ ] Time remaining color-coded:
    - [ ] Green (> 24 hours)
    - [ ] Yellow (12-24 hours)
    - [ ] Red (< 12 hours)
- [ ] Action buttons visible (Approve/Request Changes/Reject)

#### Approve Deliverable
- [ ] Can click "Approve"
- [ ] Optional feedback field works
- [ ] Approval confirmation shown
- [ ] Database updated (status: approved)
- [ ] reviewed_by set to restaurant user_id
- [ ] reviewed_at timestamp set
- [ ] auto_approved = FALSE
- [ ] Creator receives notification
- [ ] Payment triggered
- [ ] Creator campaign status updated

#### Request Changes
- [ ] Can click "Request Changes"
- [ ] Feedback field appears (required)
- [ ] Can enter feedback message
- [ ] Submit works
- [ ] Database updated (status: needs_revision)
- [ ] Feedback saved to restaurant_feedback
- [ ] Creator receives notification
- [ ] Creator can see feedback
- [ ] Creator can resubmit

#### Reject Deliverable
- [ ] Can click "Reject"
- [ ] Reason field appears (required)
- [ ] Can enter rejection reason
- [ ] Confirm rejection
- [ ] Database updated (status: rejected)
- [ ] Reason saved to restaurant_feedback
- [ ] Creator receives notification
- [ ] No payment triggered

---

### Auto-Approval System ✓

#### Countdown Timer
- [ ] Timer displays on pending deliverables
- [ ] Time calculated correctly (72 hours from submission)
- [ ] Timer updates in real-time
- [ ] Color coding works:
  - [ ] Green > 24 hours
  - [ ] Yellow 12-24 hours
  - [ ] Red < 12 hours with pulsing animation
- [ ] Warning message appears when < 12 hours

#### Auto-Approval Execution
- [ ] Test deliverable set to 73 hours old
- [ ] should_auto_approve() returns TRUE
- [ ] auto_approve_overdue_deliverables() approves it
- [ ] Status changes to 'approved'
- [ ] auto_approved flag set to TRUE
- [ ] reviewed_at timestamp set
- [ ] reviewed_by is NULL
- [ ] Creator notified of approval
- [ ] Payment triggered
- [ ] Function is idempotent (doesn't re-approve)

#### Warning Notifications
- [ ] Restaurant receives 24-hour warning
- [ ] Restaurant receives 12-hour warning
- [ ] Restaurant receives 1-hour warning
- [ ] Warnings show in dashboard
- [ ] Warnings sent via push notification (if enabled)

---

### Admin UI ✓

#### Campaign Management
- [ ] Can view all campaigns
- [ ] Can filter by campaign_source (troodie_direct)
- [ ] "Troodie Original" badge visible on filtered campaigns
- [ ] Can view campaign details
- [ ] Can see accepted creators
- [ ] Can see pending applications
- [ ] Can accept/reject applications
- [ ] Can see deliverable submissions

#### Deliverables Overview
- [ ] Can view all deliverables across campaigns
- [ ] deliverable_statistics view shows:
  - [ ] Total deliverables
  - [ ] Pending count
  - [ ] Approved count
  - [ ] Rejected count
  - [ ] Average review time
  - [ ] Auto-approval rate
- [ ] Can filter by status
- [ ] Can filter by campaign
- [ ] Can filter by auto-approve risk (< 24 hours)
- [ ] Can view individual deliverable details

---

### Integration Testing ✓

#### Complete Workflow (Manual Approval)
1. [ ] Campaign created
2. [ ] Creator applies
3. [ ] Admin accepts creator
4. [ ] Creator creates content (outside app)
5. [ ] Creator submits deliverable
6. [ ] Restaurant receives notification
7. [ ] Restaurant reviews within 72 hours
8. [ ] Restaurant approves
9. [ ] Creator notified of approval
10. [ ] Payment processed
11. [ ] Creator campaign marked complete
12. [ ] Campaign stats updated

#### Complete Workflow (Auto-Approval)
1. [ ] Campaign created
2. [ ] Creator applies
3. [ ] Admin accepts creator
4. [ ] Creator submits deliverable
5. [ ] Restaurant does not review
6. [ ] 24-hour warning sent
7. [ ] 12-hour warning sent
8. [ ] 72 hours pass
9. [ ] Auto-approval function runs
10. [ ] Deliverable auto-approved
11. [ ] Creator notified
12. [ ] Payment processed
13. [ ] Creator campaign marked complete

#### Multi-Creator Scenario
- [ ] 5 creators accepted to campaign
- [ ] Creator 1: submitted, pending review
- [ ] Creator 2: submitted, approved
- [ ] Creator 3: submitted, needs revision
- [ ] Creator 4: accepted, not submitted yet
- [ ] Creator 5: application pending
- [ ] Each creator sees correct status
- [ ] Restaurant sees all submissions
- [ ] Campaign stats accurate

---

### Performance Testing ✓

#### Query Performance
- [ ] pending_deliverables_summary query < 100ms
- [ ] Auto-approval check query < 50ms (uses index)
- [ ] Campaign + deliverables join < 200ms
- [ ] All queries use appropriate indexes

#### Load Testing
- [ ] 100 pending deliverables query performs well
- [ ] Auto-approval with 50 overdue completes quickly
- [ ] Multiple concurrent users don't cause issues
- [ ] No database lock contention

---

### Error Handling ✓

#### Duplicate Prevention
- [ ] Cannot submit same deliverable twice
- [ ] UNIQUE constraint enforced (creator_campaign_id, deliverable_index)
- [ ] Error message shown to user

#### Validation
- [ ] Invalid deliverable requirements rejected
- [ ] Missing required fields caught
- [ ] Invalid enum values rejected
- [ ] UI shows validation errors

#### Access Control
- [ ] Creators can't view others' deliverables
- [ ] Non-participants can't submit to campaign
- [ ] Removed creators lose access
- [ ] RLS policies enforce permissions

#### Edge Cases
- [ ] Campaign cancellation handled gracefully
- [ ] Already-approved deliverable can't be re-approved
- [ ] Already-rejected deliverable can't be edited
- [ ] Expired campaigns don't accept submissions

---

## ⚡ Smoke Test (Post-Deployment, 10 minutes)

**Run these tests immediately after deploying to verify basic functionality:**

### Database
```sql
-- 1. Tables exist
SELECT COUNT(*) FROM campaign_deliverables;

-- 2. Campaign exists
SELECT id FROM campaigns WHERE title = 'Troodie Creators: Local Gems';

-- 3. Functions work
SELECT validate_deliverable_requirements('{"title":"Test","goal":"awareness","type":"reel","compensation_type":"cash","compensation_value":5000,"visit_type":"dine_in","payment_timing":"after_post","revisions_allowed":2}'::jsonb);

-- 4. Views work
SELECT * FROM pending_deliverables_summary LIMIT 1;
```

- [ ] All queries execute successfully

### App UI
- [ ] Login works (creator, restaurant, admin)
- [ ] Campaign visible in marketplace
- [ ] Can navigate to campaign details
- [ ] Can submit test deliverable (as creator)
- [ ] Can view pending deliverables (as restaurant)
- [ ] No console errors

---

## 🐛 Bug Tracking

| # | Description | Severity | Status | Notes |
|---|-------------|----------|--------|-------|
| 1 | | High/Med/Low | Open/Fixed | |
| 2 | | High/Med/Low | Open/Fixed | |
| 3 | | High/Med/Low | Open/Fixed | |

---

## ✅ Final Sign-Off

### Pre-Production Checklist
- [ ] All database tests pass
- [ ] All UI tests pass
- [ ] All integration tests pass
- [ ] Performance acceptable
- [ ] No high-severity bugs
- [ ] Edge cases handled
- [ ] Error messages user-friendly
- [ ] Notifications working
- [ ] Payment flow tested (test mode)
- [ ] Documentation complete

### Sign-Off
- **Tested By:** _______________
- **Test Date:** _______________
- **Environment:** Staging / Production
- **Overall Status:** ✅ Pass / ❌ Fail
- **Ready for Production:** ⬜ Yes / ⬜ No

### Notes:
```
[Add any final notes, caveats, or follow-up items here]
```

---

**Quick Links:**
- Full Testing Guide: [TROODIE_ORIGINALS_TESTING_GUIDE.md](./TROODIE_ORIGINALS_TESTING_GUIDE.md)
- Deployment Guide: [DELIVERABLES_DEPLOYMENT_GUIDE.md](./DELIVERABLES_DEPLOYMENT_GUIDE.md)
- Launch Guide: [TROODIE_ORIGINALS_LAUNCH_GUIDE.md](./TROODIE_ORIGINALS_LAUNCH_GUIDE.md)

*Last Updated: October 20, 2025*
