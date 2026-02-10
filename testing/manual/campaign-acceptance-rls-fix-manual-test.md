# Manual Test Script: Campaign Acceptance RLS Fix

> Feature: campaign-acceptance-rls-fix
> Spec: `specs/features/campaign-acceptance-rls-fix/spec.md`
> Date: 2026-02-09

## Prerequisites

- [ ] Admin account: `team@troodieapp.com` (production) or `kouame@troodieapp.com` (dev)
- [ ] At least one campaign with pending applications
- [ ] At least one campaign with submitted deliverables (creator has uploaded content)
- [ ] Migration `20260209_fix_campaign_acceptance_rls.sql` has been deployed

## Test Scenarios

### Scenario 1: Admin Accepts Campaign Application (TRO-148)

**Steps:**
1. Log in as admin (`team@troodieapp.com`)
2. Navigate to a campaign with pending applications (e.g., "Festive Cocktails Tour")
3. Tap the "Applications" tab
4. Find a PENDING application
5. Press "Accept"

**Expected Result:**
- Success alert: "Application accepted"
- Application status changes from PENDING to ACCEPTED
- No error dialog

**Verification SQL:**
```sql
SELECT id, status, reviewed_at, reviewer_id
FROM campaign_applications
WHERE status = 'accepted'
ORDER BY reviewed_at DESC
LIMIT 5;
```

### Scenario 2: Admin Approves Deliverable (TRO-149)

**Steps:**
1. Log in as admin (`team@troodieapp.com`)
2. Navigate to a campaign where a creator has submitted content
3. View the submitted deliverable
4. Press "Approve"

**Expected Result:**
- Success alert: "Deliverable approved! Payment will be processed."
- Deliverable status changes to APPROVED
- No error dialog

**Verification SQL:**
```sql
SELECT id, status, reviewed_at, reviewer_id, restaurant_feedback
FROM campaign_deliverables
WHERE status = 'approved'
ORDER BY reviewed_at DESC
LIMIT 5;
```

### Scenario 3: Admin Rejects Application

**Steps:**
1. Log in as admin
2. Navigate to a campaign with pending applications
3. Press "Reject" on a pending application

**Expected Result:**
- Success alert: "Application rejected"
- Application status changes to REJECTED
- No error dialog

### Scenario 4: Business Owner Accepts Application (Own Campaign)

**Steps:**
1. Log in as a business owner who has created campaigns
2. Navigate to one of their campaigns
3. Tap Applications tab
4. Press "Accept" on a pending application

**Expected Result:**
- Success alert: "Application accepted"
- Works correctly for campaigns where the user is `owner_id`

### Scenario 5: Creator Cannot Accept Others' Applications (Negative Test)

**Steps:**
1. Log in as a creator account (not admin, not campaign owner)
2. Attempt to directly call the update API on a campaign application (via dev tools if possible)

**Expected Result:**
- Update should be blocked by RLS
- No unauthorized access

### Scenario 6: Error Messages Are Descriptive

**Steps:**
1. Temporarily cause an error (e.g., disconnect network)
2. Attempt to accept an application

**Expected Result:**
- Console shows `[CampaignActions] Failed to update application:` with actual error details
- User sees a descriptive error message, not just "Failed to update application"

## Cleanup

No test data cleanup needed — accepting/approving applications is normal workflow behavior.
