# Enhanced Deliverables System - Manual Testing Checklist

**Date:** October 16, 2025
**Feature:** Enhanced Deliverables System
**Status:** Ready for Manual Testing
**Environment:** [ ] Staging [ ] Production

---

## 📋 Pre-Testing Setup

### Environment Preparation
- [ ] Database migration deployed successfully
- [ ] All verification queries passed
- [ ] Test accounts created:
  - [ ] Admin account (kouame@troodieapp.com)
  - [ ] Restaurant/business account
  - [ ] Creator account (at least 2)
- [ ] App builds deployed:
  - [ ] iOS (TestFlight or dev build)
  - [ ] Android (internal testing or dev build)

### Test Data Requirements
- [ ] At least 1 restaurant with business profile
- [ ] At least 2 creator accounts with portfolios
- [ ] Test campaign ready to use
- [ ] Valid social media posts for URL testing

---

## 🧪 Test Suite 1: Database Layer

### Test 1.1: Verify Database Schema
```sql
-- Run all verification queries from deployment guide
SELECT * FROM campaign_deliverables LIMIT 1;
SELECT * FROM pending_deliverables_summary LIMIT 1;
SELECT * FROM deliverable_statistics LIMIT 1;
```

**Expected:** All queries execute without errors

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 1.2: Test Helper Functions
```sql
-- Test time calculations
SELECT
  get_auto_approval_deadline('test-id'),
  time_until_auto_approval('test-id'),
  should_auto_approve('test-id');
```

**Expected:** Functions return expected data types

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 1.3: Test RLS Policies
- [ ] Creator can view own deliverables
- [ ] Creator cannot view other creators' deliverables
- [ ] Restaurant can view deliverables for their campaigns
- [ ] Restaurant cannot view deliverables for other restaurants
- [ ] Admin can view all deliverables

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

---

## 🧪 Test Suite 2: Admin - Campaign Creation

### Test 2.1: Create Campaign with Deliverable Requirements

**Steps:**
1. Login as admin (kouame@troodieapp.com)
2. Navigate to campaign creation
3. Fill out DeliverableRequirementsForm:
   - **Basic Details (Required)**
     - [ ] Title: "Test Campaign 1"
     - [ ] Goal: "Brand Awareness"
     - [ ] Type: "Reel"
     - [ ] Due Date: "Post within 2 weeks"
     - [ ] Compensation Type: "Cash"
     - [ ] Compensation Value: "$50"
     - [ ] Visit Type: "Dine-In"
     - [ ] Payment Timing: "After Post"
     - [ ] Revisions Allowed: "2"
   - **Creative Guidelines (Optional)**
     - [ ] Expand section
     - [ ] Select tone: "Fun", "Trendy"
     - [ ] Select themes: "Food Close-ups"
     - [ ] Collapse section
   - **Approval & Attribution (Optional)**
     - [ ] Expand section
     - [ ] Toggle pre-approval: OFF
     - [ ] Add handle: "@TestRestaurant"
     - [ ] Add hashtag: "#TestCampaign"
     - [ ] Toggle repost rights: ON
     - [ ] Collapse section
4. Verify progress indicator shows "9 of 9 required fields complete"
5. Save campaign

**Expected:**
- Progress bar fills to 100%
- All sections expand/collapse smoothly
- Form validates required fields
- Campaign saves with deliverable_requirements JSON

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 2.2: Use Troodie Originals Preset

**Steps:**
1. Navigate to campaign creation
2. Click "Use Template" or "Troodie Originals"
3. Verify all fields pre-populated:
   - [ ] Title: "Troodie Creators: Local Gems"
   - [ ] Compensation: $50
   - [ ] Requirements: 7 items
   - [ ] Deliverable requirements: all filled

**Expected:** Preset loads all values correctly

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

---

## 🧪 Test Suite 3: Creator - Deliverable Submission

### Test 3.1: Submit Valid Instagram URL

**Steps:**
1. Login as creator
2. Navigate to active campaign
3. Tap "Submit Deliverable"
4. View campaign requirements card
5. Paste Instagram URL: `https://instagram.com/p/test123/`
6. Wait for validation (500ms)
7. Verify:
   - [ ] URL validates (checkmark icon)
   - [ ] Platform detected: "Instagram"
   - [ ] Platform badge appears
8. Optionally upload screenshot
9. Add caption (optional)
10. Add notes (optional)
11. Tap "Submit for Review"

**Expected:**
- URL validates in <1 second
- Platform detection accurate
- Submit button enables when URL valid
- Submission succeeds
- Confirmation message shown
- Returns to campaign detail

**Result:** [ ] Pass [ ] Fail
**Screenshot:** ___________________________________
**Notes:** ___________________________________

### Test 3.2: Submit Invalid URL

**Steps:**
1. In submit deliverable screen
2. Paste invalid URL: `not-a-url`
3. Wait for validation

**Expected:**
- Red X icon appears
- Error message: "Invalid URL format"
- Submit button disabled

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 3.3: Submit Unsupported Platform

**Steps:**
1. Paste LinkedIn URL: `https://linkedin.com/posts/123`
2. Wait for validation

**Expected:**
- Error message: "Unsupported platform"
- Submit button disabled

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 3.4: Submit TikTok URL

**Steps:**
1. Paste TikTok URL: `https://www.tiktok.com/@user/video/123`
2. Verify platform detected as "TikTok"
3. Submit deliverable

**Expected:**
- Platform badge shows "TikTok detected"
- Musical notes icon
- Submission succeeds

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 3.5: Upload Screenshot

**Steps:**
1. In submit screen, tap "Upload Screenshot"
2. Select image from gallery
3. Verify:
   - [ ] Image preview shows
   - [ ] Aspect ratio maintained (9:16)
   - [ ] Remove button (X) appears
4. Tap remove button
5. Verify image removed

**Expected:**
- Image picker opens
- Image displays in preview
- Remove button functional

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

---

## 🧪 Test Suite 4: Restaurant - Review Dashboard

### Test 4.1: View Pending Deliverables

**Steps:**
1. Login as restaurant owner
2. Navigate to campaign dashboard
3. Open campaign with pending deliverables
4. Tap "Review Deliverables"
5. Verify:
   - [ ] Pending count banner shows correct number
   - [ ] Deliverable cards display
   - [ ] Creator info shown (name, username, avatar)
   - [ ] Platform icon shown
   - [ ] Countdown timer visible
   - [ ] Post preview or placeholder shown

**Expected:**
- All pending deliverables listed
- Most urgent at top (lowest hours remaining)
- Countdown timer accurate

**Result:** [ ] Pass [ ] Fail
**Screenshot:** ___________________________________
**Notes:** ___________________________________

### Test 4.2: Countdown Timer - Normal (>24h)

**Steps:**
1. View deliverable submitted <48 hours ago
2. Check timer display

**Expected:**
- Timer shows "X days Y hours remaining"
- Background color: Green (#D1FAE5)
- Text color: Dark green (#065F46)
- No URGENT badge

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 4.3: Countdown Timer - Warning (12-24h)

**Steps:**
1. View deliverable submitted 50-60 hours ago
2. Check timer display

**Expected:**
- Timer shows "X hours remaining"
- Background color: Yellow (#FEF3C7)
- Text color: Dark yellow (#92400E)
- No URGENT badge yet

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 4.4: Countdown Timer - Urgent (<12h)

**Steps:**
1. View deliverable submitted 61+ hours ago
2. Check timer display

**Expected:**
- Timer shows "X hours remaining"
- Background color: Red (#FEE2E2)
- Text color: Dark red (#991B1B)
- "URGENT" badge visible

**Result:** [ ] Pass [ ] Fail
**Screenshot:** ___________________________________
**Notes:** ___________________________________

### Test 4.5: View Post Content

**Steps:**
1. Tap on post preview/screenshot
2. Verify:
   - [ ] Post URL opens in browser
   - [ ] Browser/in-app browser shows post
   - [ ] Can view full content

**Expected:**
- URL opens correctly
- Post is viewable

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 4.6: Approve Deliverable

**Steps:**
1. Tap "Approve" button
2. Review modal:
   - [ ] Creator info shows
   - [ ] Green checkmark icon
   - [ ] Message: "Approve This Deliverable?"
3. Add optional feedback: "Great work!"
4. Tap "Approve"
5. Verify:
   - [ ] Loading spinner shows
   - [ ] Success message appears
   - [ ] Deliverable removed from pending list
   - [ ] Pending count decreases

**Expected:**
- Modal shows correct info
- Approval succeeds
- UI updates immediately
- Creator notified (check notifications)

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 4.7: Request Changes

**Steps:**
1. Tap "Request Changes" button
2. Review modal:
   - [ ] Yellow refresh icon
   - [ ] Message: "Request Changes?"
3. Leave feedback empty, tap "Request Changes"
4. Verify: Error "Feedback is required"
5. Add feedback: "Please add restaurant name in caption"
6. Tap "Request Changes"
7. Verify success

**Expected:**
- Feedback validation works
- Request succeeds with feedback
- Creator notified with feedback
- Deliverable status = "needs_revision"

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 4.8: Reject Deliverable

**Steps:**
1. Tap "Reject" button
2. Review modal:
   - [ ] Red X icon
   - [ ] Warning message
3. Leave feedback empty, tap "Reject"
4. Verify: Error "Feedback is required"
5. Add feedback: "Does not meet requirements"
6. Tap "Reject"
7. Verify success

**Expected:**
- Feedback validation works
- Rejection succeeds
- Creator notified
- Deliverable status = "rejected"

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 4.9: Pull to Refresh

**Steps:**
1. In review dashboard
2. Pull down to refresh
3. Verify:
   - [ ] Loading indicator shows
   - [ ] List updates
   - [ ] Countdown timers refresh

**Expected:**
- Refresh animation smooth
- Data updates correctly

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 4.10: Empty State

**Steps:**
1. Approve/reject all pending deliverables
2. Verify:
   - [ ] Green checkmark icon
   - [ ] "All Caught Up!" message
   - [ ] Refresh button visible

**Expected:**
- Empty state displays correctly
- Refresh button functional

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

---

## 🧪 Test Suite 5: Auto-Approval Workflow

### Test 5.1: Simulate Auto-Approval (Database)

**Steps:**
1. Create test deliverable
2. Set `submitted_at` to 73 hours ago:
   ```sql
   UPDATE campaign_deliverables
   SET submitted_at = NOW() - INTERVAL '73 hours'
   WHERE id = 'test-deliverable-id';
   ```
3. Run auto-approval function:
   ```sql
   SELECT * FROM auto_approve_overdue_deliverables();
   ```
4. Verify:
   - [ ] Deliverable status = 'approved'
   - [ ] auto_approved = TRUE
   - [ ] reviewed_at set to NOW()

**Expected:**
- Function returns approved deliverable
- Status updated correctly
- Timestamps accurate

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 5.2: Check Auto-Approval Status

**Steps:**
1. Query deliverable near deadline:
   ```sql
   SELECT
     id,
     should_auto_approve(id),
     time_until_auto_approval(id)
   FROM campaign_deliverables
   WHERE status = 'pending';
   ```

**Expected:**
- `should_auto_approve` returns TRUE for >72h old
- `time_until_auto_approval` returns accurate interval

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

---

## 🧪 Test Suite 6: End-to-End Workflow

### Test 6.1: Complete Happy Path

**Steps:**
1. **Admin:** Create campaign with deliverable requirements
2. **Creator:** Apply to campaign (existing flow)
3. **Admin:** Accept creator application
4. **Creator:** Navigate to "My Campaigns"
5. **Creator:** Tap "Submit Deliverable"
6. **Creator:** Submit valid URL + screenshot
7. **Restaurant:** Navigate to campaign
8. **Restaurant:** Review pending deliverable
9. **Restaurant:** Approve deliverable
10. **Creator:** Check notifications
11. **Creator:** Verify payment processing (future)

**Expected:**
- Complete flow works end-to-end
- No errors at any step
- Notifications sent at key points
- Data consistent across roles

**Result:** [ ] Pass [ ] Fail
**Time Taken:** _____ minutes
**Notes:** ___________________________________

### Test 6.2: Complete Rejection Path

**Steps:**
1. Creator submits deliverable
2. Restaurant rejects with feedback
3. Creator views feedback
4. Creator updates deliverable
5. Creator resubmits
6. Restaurant approves

**Expected:**
- Rejection feedback visible to creator
- Resubmission updates revision number
- Status transitions correctly

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 6.3: Complete Request Changes Path

**Steps:**
1. Creator submits deliverable
2. Restaurant requests changes with specific feedback
3. Creator views changes required
4. Creator updates and resubmits
5. Restaurant reviews again
6. Restaurant approves

**Expected:**
- Changes required list visible
- Resubmission allowed
- Second review works correctly

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

---

## 🧪 Test Suite 7: Edge Cases & Error Handling

### Test 7.1: Network Error During Submission

**Steps:**
1. Turn off WiFi/data
2. Attempt to submit deliverable
3. Verify error message shown
4. Turn on WiFi/data
5. Retry submission

**Expected:**
- Error message: "Failed to submit"
- Retry button or instruction
- Submission succeeds after reconnection

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 7.2: Invalid Image Upload

**Steps:**
1. Try to upload non-image file (if possible)
2. Try to upload very large image (>10MB)

**Expected:**
- Appropriate error messages
- Upload fails gracefully

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

### Test 7.3: Concurrent Reviews

**Steps:**
1. Two restaurant users review same deliverable
2. First user approves
3. Second user tries to approve

**Expected:**
- Second action fails or shows "already reviewed"
- No duplicate approvals

**Result:** [ ] Pass [ ] Fail
**Notes:** ___________________________________

---

## 📊 Test Summary

### Overall Results

| Test Suite | Pass | Fail | Skip | Notes |
|------------|------|------|------|-------|
| Database Layer | [ ] | [ ] | [ ] | |
| Admin - Campaign Creation | [ ] | [ ] | [ ] | |
| Creator - Submission | [ ] | [ ] | [ ] | |
| Restaurant - Review | [ ] | [ ] | [ ] | |
| Auto-Approval | [ ] | [ ] | [ ] | |
| End-to-End | [ ] | [ ] | [ ] | |
| Edge Cases | [ ] | [ ] | [ ] | |

### Critical Issues Found

1. ___________________________________
2. ___________________________________
3. ___________________________________

### Blockers for Production

1. ___________________________________
2. ___________________________________
3. ___________________________________

### Nice-to-Have Improvements

1. ___________________________________
2. ___________________________________
3. ___________________________________

---

## ✅ Sign-Off

- [ ] All critical tests passed
- [ ] No blockers remaining
- [ ] All edge cases handled
- [ ] Performance acceptable
- [ ] Ready for production deployment

**Tested By:** ___________________________________
**Date:** ___________________________________
**Environment:** [ ] Staging [ ] Production
**Build Version:** ___________________________________

**Approval:**
- [ ] Product Manager
- [ ] Engineering Lead
- [ ] QA Lead

---

**Next Steps:**
1. Fix any critical issues found
2. Re-test failed cases
3. Deploy to production
4. Monitor metrics for 48 hours
