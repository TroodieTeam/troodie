# Campaign Deliverables MVP - Complete Testing Guide

**Status:** ✅ Implementation Complete - Ready for UI Testing
**Date:** October 13, 2025
**Phase:** Phase 1 - MVP Core (Foundation Complete)

---

## 🎉 What's Been Implemented

### ✅ Database Schema (`task-cd-001`)
- Complete `campaign_deliverables` table with 7 status states
- Auto-approval function (72-hour window)
- RLS policies for creators and restaurant owners
- Supporting tables for revisions, disputes, and tracking
- Status: **🟡 Needs Review** → Ready for testing

### ✅ Service Layer (`task-cd-002`)
- Complete TypeScript service with 10 methods
- Type-safe interfaces exported
- Error handling and logging
- Status: **🟡 Needs Review** → Ready for testing

### ✅ Creator Deliverable UI (`task-cd-003`)
- **Submission Screen** (`app/creator/deliverables/submit.tsx`)
- **List Screen** (`app/creator/deliverables/index.tsx`)
- Status: **✅ Complete** → Ready for testing

### ✅ Restaurant Review Dashboard (`task-cd-004`)
- **Review Dashboard** (`app/(tabs)/business/deliverables/index.tsx`)
- Status: **✅ Complete** → Ready for testing

---

## 📱 Testing Instructions - Complete Flow

### Test Environment Setup

1. **Database Check**
   ```bash
   # Verify schema migration was successful
   supabase status
   ```

2. **Have Two Test Accounts Ready:**
   - **Creator Account** (has creator_profile)
   - **Restaurant Owner Account** (has business_profile + restaurant)

3. **Prerequisites:**
   - At least one active campaign
   - Creator must have an accepted campaign application

---

## 🎬 Complete User Flow Test

### **FLOW 1: Creator Submits Deliverable**

**Goal:** Test the complete submission flow from creator perspective

#### Step 1: Navigate to Submission Screen
```
1. Log in as Creator
2. Navigate to: Creator Tab → Campaigns → [Select Active Campaign]
3. Find the "Submit Deliverable" button/action
4. OR navigate directly to: /creator/deliverables/submit?applicationId=<ID>
```

**Expected:**
- ✅ Submission screen loads
- ✅ Campaign info card shows restaurant name, campaign name, payout, deadline
- ✅ All form sections visible

#### Step 2: Fill Out Form
```
1. Select Content Type: Photo
2. Tap "Take Photo" or "Upload File"
3. Select an image from gallery
4. Wait for upload to complete
5. Enter Caption: "Loved the amazing tapas at this place! 🍴"
6. Select Platform: Instagram
7. Enter Post URL: https://instagram.com/p/test123
```

**Expected:**
- ✅ Image uploads successfully
- ✅ Uploaded image preview shown
- ✅ Can remove/change image
- ✅ All fields accept input
- ✅ Platform chips toggle correctly

#### Step 3A: Save as Draft
```
1. Tap "Save Draft" button
2. Confirm success alert
3. Navigate back
```

**Expected:**
- ✅ Draft saved successfully
- ✅ Success alert shown
- ✅ Redirects back to previous screen
- ✅ Draft appears in deliverables list with "Draft" status

#### Step 3B: Submit for Review
```
1. Ensure Post URL is filled in
2. Tap "Submit for Review" button
3. Read confirmation message
4. Tap OK
```

**Expected:**
- ✅ Validation passes (content + post URL required)
- ✅ Success alert: "Your deliverable has been submitted for review..."
- ✅ Redirects to deliverables list
- ✅ Deliverable appears with "Pending Review" status

---

### **FLOW 2: Creator Views Deliverables List**

**Goal:** Test deliverable tracking and status display

#### Step 1: Navigate to Deliverables List
```
1. Log in as Creator
2. Navigate to: /creator/deliverables
```

**Expected:**
- ✅ Deliverables list loads
- ✅ Tabs shown: All, Pending, Approved, Draft
- ✅ Recently submitted deliverable appears

#### Step 2: Test Filters
```
1. Tap "Pending" tab
2. Tap "Approved" tab
3. Tap "Draft" tab
4. Tap "All" tab
```

**Expected:**
- ✅ Each tab filters correctly
- ✅ Active tab highlighted (orange background)
- ✅ Deliverable count updates per tab

#### Step 3: View Deliverable Card
```
Observe the deliverable card:
```

**Expected:**
- ✅ Thumbnail image shown
- ✅ Restaurant name displayed
- ✅ Campaign name displayed
- ✅ Status badge with correct color:
  - Draft: Gray
  - Pending Review: Orange
  - Approved: Green
  - Rejected: Red
  - Revision Requested: Orange
- ✅ Payment amount shown: $XX
- ✅ Payment status shown (e.g., "Payment Pending")
- ✅ Submission date shown

#### Step 4: Pull to Refresh
```
1. Pull down on list
2. Release
```

**Expected:**
- ✅ Loading indicator shown
- ✅ List refreshes
- ✅ New data loaded

---

### **FLOW 3: Restaurant Owner Reviews Deliverable**

**Goal:** Test complete review workflow from restaurant perspective

#### Step 1: Navigate to Review Dashboard
```
1. Log in as Restaurant Owner
2. Navigate to: Business Tab → Deliverables
3. OR navigate to: /business/deliverables
```

**Expected:**
- ✅ Review dashboard loads
- ✅ Header: "Deliverable Reviews"
- ✅ Tabs shown: Pending (X), Approved, All
- ✅ Pending deliverable appears in list

#### Step 2: View Deliverable in List
```
Observe the pending deliverable card:
```

**Expected:**
- ✅ Creator avatar shown
- ✅ Creator name displayed
- ✅ Campaign name displayed
- ✅ Content thumbnail displayed
- ✅ Auto-approval countdown shown (e.g., "2d 23h left")
- ✅ Orange border indicates pending
- ✅ Notice bar: "Deliverables auto-approve after 72 hours if not reviewed"

#### Step 3: Open Deliverable Details
```
1. Tap on deliverable card
```

**Expected:**
- ✅ Full-screen modal opens
- ✅ Full-size image shown
- ✅ Caption displayed
- ✅ Platform shown
- ✅ "View on [Platform] →" link shown
- ✅ Three action buttons visible:
  - Approve (green)
  - Request Edit (orange)
  - Reject (red)

---

### **FLOW 4A: Approve Deliverable**

**Goal:** Test approval and payment trigger

#### Step 1: Approve
```
1. Tap "Approve" button
2. Review modal opens
3. (Optional) Enter review notes: "Great content! Thanks!"
4. Tap "Approve & Process Payment"
```

**Expected:**
- ✅ Modal opens with title "Approve Deliverable"
- ✅ Image preview shown in modal
- ✅ Text input for optional notes
- ✅ Info box: "Payment of $XX will be processed to the creator"
- ✅ Submit button enabled

#### Step 2: Confirm Approval
```
1. Confirm approval
2. Wait for success message
```

**Expected:**
- ✅ Success alert: "Deliverable approved! Payment will be processed."
- ✅ Modal closes
- ✅ Redirects back to dashboard
- ✅ Deliverable removed from "Pending" tab
- ✅ Deliverable appears in "Approved" tab

#### Step 3: Verify Creator Side
```
1. Log in as Creator
2. Go to deliverables list
3. Find the deliverable
```

**Expected:**
- ✅ Status changed to "Approved" (green badge)
- ✅ Payment status: "Processing Payment"
- ✅ Review notes visible (if provided)

---

### **FLOW 4B: Request Revision**

**Goal:** Test revision request workflow

#### Step 1: Request Revision
```
1. Tap "Request Edit" button
2. Modal opens
3. Enter revision notes: "Please reshoot with better lighting and include the restaurant logo"
4. Tap "Request Revision"
```

**Expected:**
- ✅ Modal opens with title "Request Revision"
- ✅ Image preview shown
- ✅ Required text input (Revision Notes)
- ✅ Tips shown: "Be specific and constructive"
- ✅ Submit button disabled until notes entered

#### Step 2: Confirm Revision Request
```
1. Confirm request
2. Wait for success message
```

**Expected:**
- ✅ Success alert shown
- ✅ Modal closes
- ✅ Deliverable remains in "Pending" tab but status updated
- ✅ Revision notes stored

#### Step 3: Verify Creator Side
```
1. Log in as Creator
2. Go to deliverables list
3. Find the deliverable
```

**Expected:**
- ✅ Status changed to "Revision Requested" (orange badge)
- ✅ Revision notes card shown with yellow background
- ✅ Notes displayed: "Please reshoot with better lighting..."

---

### **FLOW 4C: Reject Deliverable**

**Goal:** Test rejection workflow

#### Step 1: Reject
```
1. Tap "Reject" button
2. Modal opens
3. Enter rejection reason: "Content does not follow brand guidelines"
4. Tap "Reject Deliverable"
```

**Expected:**
- ✅ Modal opens with title "Reject Deliverable"
- ✅ Image preview shown
- ✅ Required text input (Rejection Reason)
- ✅ Submit button disabled until reason entered

#### Step 2: Confirm Rejection
```
1. Confirm rejection
2. Wait for success message
```

**Expected:**
- ✅ Success alert shown
- ✅ Modal closes
- ✅ Deliverable removed from "Pending" tab
- ✅ No payment processed

#### Step 3: Verify Creator Side
```
1. Log in as Creator
2. Go to deliverables list
3. Find the deliverable
```

**Expected:**
- ✅ Status changed to "Rejected" (red badge)
- ✅ Rejection reason card shown with red background
- ✅ Reason displayed: "Content does not follow brand guidelines"
- ✅ Payment status: "Payment Pending" (no payment)

---

## 🎨 Design System Verification

### Check These Design Elements Match Reference

**Colors:**
- ✅ Primary Orange: `#FFAD27`
- ✅ Background Cream: `#FFFAF2`
- ✅ Border: `rgba(0,0,0,0.1)`
- ✅ Green Success: `#10B981`
- ✅ Orange Warning: `#F59E0B`
- ✅ Red Error: `#EF4444`

**Typography:**
- ✅ Header: 22px, weight 600
- ✅ Subheader: 16px, weight 600
- ✅ Body: 14px, weight 400/500
- ✅ Caption: 12-13px, weight 400

**Components:**
- ✅ Rounded corners: 12-16px
- ✅ Chip/Badge: Rounded 20px
- ✅ Cards: Border 1px, ring style
- ✅ Buttons: 48px height, rounded full
- ✅ Status badges: Proper icon + text

**Icons:**
- ✅ Lucide React Native icons used
- ✅ Consistent sizing (14-20px)

---

## 🐛 Known Issues / Edge Cases to Test

### Test These Scenarios

1. **Missing Data:**
   - [ ] What if no campaign application exists?
   - [ ] What if creator profile missing?
   - [ ] What if restaurant profile missing?

2. **Image Upload:**
   - [ ] Large image files (>5MB)
   - [ ] Different aspect ratios
   - [ ] Upload failure handling
   - [ ] Network interruption during upload

3. **Form Validation:**
   - [ ] Submit without content
   - [ ] Submit without post URL
   - [ ] Submit with invalid URL format

4. **Auto-Approval Timer:**
   - [ ] Test countdown display accuracy
   - [ ] What happens at exactly 72 hours?
   - [ ] Timer updates on refresh

5. **RLS Policies:**
   - [ ] Creator can only see their deliverables
   - [ ] Restaurant can only see their deliverables
   - [ ] Cannot access other restaurant's data

6. **Concurrent Actions:**
   - [ ] Two owners reviewing same deliverable
   - [ ] Creator editing while owner reviewing

---

## 📊 Database Verification Queries

Run these in Supabase SQL Editor to verify data:

```sql
-- Check deliverable was created
SELECT * FROM campaign_deliverables
WHERE campaign_application_id = '<APPLICATION_ID>'
ORDER BY created_at DESC;

-- Check status transitions
SELECT id, status, submitted_at, reviewed_at, payment_status
FROM campaign_deliverables
WHERE creator_id = '<CREATOR_PROFILE_ID>'
ORDER BY created_at DESC;

-- Check auto-approval candidates
SELECT id, status, submitted_at,
  NOW() - submitted_at AS time_elapsed,
  (NOW() - submitted_at) > INTERVAL '72 hours' AS should_auto_approve
FROM campaign_deliverables
WHERE status = 'pending_review'
ORDER BY submitted_at ASC;

-- Check RLS is working
-- (Should only return deliverables for current user's restaurant/creator)
SELECT * FROM campaign_deliverables;
```

---

## 🚀 Next Steps After Testing

Once all flows are tested and working:

1. **Mark tasks as Complete:**
   - Update `task-cd-003-creator-deliverable-ui.md`
   - Update `task-cd-004-restaurant-review-dashboard.md`

2. **Move to Phase 1B (Optional Enhancements):**
   - `task-cd-005` Auto-Approval Cron Job
   - `task-cd-006` Payment Processing
   - `task-cd-007` Deliverable Notifications

3. **Bug Fixes:**
   - Document any issues found
   - Prioritize critical bugs
   - Create fix tasks

---

## 📝 Test Sign-Off Checklist

- [ ] **Creator Submission Flow** - All steps pass
- [ ] **Creator Deliverables List** - Displays correctly
- [ ] **Restaurant Review Dashboard** - Loads and filters correctly
- [ ] **Approve Workflow** - Complete end-to-end
- [ ] **Reject Workflow** - Complete end-to-end
- [ ] **Request Revision Workflow** - Complete end-to-end
- [ ] **Design System** - Matches reference
- [ ] **RLS Policies** - Working correctly
- [ ] **Error Handling** - User-friendly messages
- [ ] **Loading States** - Smooth UX
- [ ] **Mobile Responsive** - Works on different screen sizes
- [ ] **iOS Testing** - Passes on iOS device/simulator
- [ ] **Android Testing** - Passes on Android device/emulator

---

## 🎉 Success Criteria

The implementation is **COMPLETE** when:

✅ Creator can submit deliverables with photos
✅ Creator can save drafts and resume later
✅ Creator can see status of all their deliverables
✅ Restaurant owner can see pending deliverables
✅ Restaurant owner can approve (triggers payment status change)
✅ Restaurant owner can reject (with reason)
✅ Restaurant owner can request revision (with notes)
✅ Status changes reflect on both sides immediately after refresh
✅ Auto-approval countdown displays correctly
✅ All UI matches design system
✅ No critical bugs found

---

## 🙋 Questions or Issues?

If you encounter issues during testing:

1. Check the service logs in browser console
2. Check Supabase logs for RLS policy issues
3. Verify the user has correct profile (creator_profile or business_profile)
4. Ensure campaign application exists and is "accepted" status

**Implementation Notes:**
- All UI screens match the `v1_component_reference.html` design patterns
- Service layer tested and confirmed working in previous conversation
- Database schema migrated successfully
- RLS policies in place

Ready to test! 🚀
