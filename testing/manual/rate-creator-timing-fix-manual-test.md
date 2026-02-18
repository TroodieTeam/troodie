# Manual Test Script: Rate Creator Timing Fix

> Feature: rate-creator-timing-fix
> Spec: `specs/features/rate-creator-timing-fix/spec.md`
> Date: 2026-02-18

## Prerequisites

- [ ] Account type: Business owner with an active campaign
- [ ] Campaign has at least one accepted application with deliverables
- [ ] Environment: dev/staging

## Test Scenarios

### Scenario 1: Rate Creator Button Hidden on Fresh Acceptance

**Steps:**
1. Navigate to Business > Campaigns > [Campaign with pending applications]
2. Go to the Applications tab
3. Accept a pending application
4. Observe the application card after acceptance

**Expected Result:**
- "Rate Creator" button is NOT visible
- Status shows "Awaiting Content" (since no deliverables submitted)
- Status badge shows "ACCEPTED" in green

### Scenario 2: Partial Deliverable Approval Shows Progress

**Steps:**
1. Navigate to a campaign with an accepted application
2. Have the creator submit 3 deliverables
3. Approve 1 of 3 deliverables
4. Go to the Applications tab

**Expected Result:**
- "Rate Creator" button is NOT visible
- Status shows "1/3 Deliverables Approved"
- No "Rate Creator" on any deliverable card in the Deliverables tab

### Scenario 3: All Deliverables Approved Shows Rate Creator

**Steps:**
1. Approve all remaining deliverables for an application
2. Go to the Applications tab

**Expected Result:**
- "Rate Creator" button IS visible on the application card
- Button has orange styling with star icon
- No "Rate Creator" buttons appear on individual deliverable cards

### Scenario 4: Rate Creator on Application Detail Screen

**Steps:**
1. Navigate to an accepted application where all deliverables are approved
2. Tap on the application card to open the detail screen

**Expected Result:**
- Deliverable Progress section shows a full progress bar
- Text reads "All deliverables approved"
- "Rate Creator" button is visible

### Scenario 5: Application Detail Shows Awaiting Content

**Steps:**
1. Navigate to an accepted application with 0 deliverables submitted
2. Open the application detail screen

**Expected Result:**
- Deliverable Progress section shows "Awaiting Content"
- No "Rate Creator" button visible

### Scenario 6: Rating Persists After Submission

**Steps:**
1. From Scenario 3, tap "Rate Creator"
2. Submit a rating (e.g., 4/5 with a comment)
3. Observe the application card

**Expected Result:**
- "Rate Creator" button is replaced with "Rated 4/5"
- Rating is shown with star icon
- Application detail screen also shows the rating

### Scenario 7: Deliverables Tab Has No Rate Creator Buttons

**Steps:**
1. Navigate to the Deliverables tab of any campaign
2. Scroll through all deliverable cards (approved and pending)

**Expected Result:**
- No "Rate Creator" button appears on any deliverable card
- Only Approve/Reject actions for pending deliverables

## Cleanup

No cleanup needed - ratings are per-application and don't affect other features.
