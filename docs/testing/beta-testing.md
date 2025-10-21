# Beta Testing Guide - Creator Marketplace MVP

## Quick Start

### Test Credentials
- **Beta Passcode:** `2468`
- **Contact Email:** taylor@troodieapp.com
- **Admin User IDs:**
  - `b08d9600-358d-4be9-9552-4607d9f50227`
  - `31744191-f7c0-44a4-8673-10b34ccbb87f`

## Test Scenarios

### 1. Beta Access Gate - Creator Application

**Steps:**
1. Open the app and log in as a regular user (not admin)
2. Navigate to More tab (bottom navigation)
3. Scroll to "Grow with Troodie" section
4. Tap "Become a Creator" (shows BETA badge)
5. Beta access gate should appear with:
   - Title: "Become a Creator"
   - Message about beta and contact email
   - 4 passcode input fields
   - Lock icon

**Test Cases:**
- ✅ Enter wrong code (e.g., 1234) → Should show error and clear
- ✅ Enter correct code (2468) → Should dismiss gate and show onboarding
- ✅ Tap X button → Should navigate back to More tab
- ✅ Message shows taylor@troodieapp.com

### 2. Beta Access Gate - Restaurant Claim

**Steps:**
1. Open the app and log in as a regular user
2. Navigate to More tab
3. Scroll to "Grow with Troodie" section
4. Tap "Claim Your Restaurant"
5. Beta access gate should appear with:
   - Title: "Claim Your Restaurant"
   - Message about beta and contact email
   - 4 passcode input fields

**Test Cases:**
- ✅ Enter wrong code → Shows error
- ✅ Enter correct code (2468) → Shows claim flow
- ✅ Close without code → Returns to More tab

### 3. Creator Application Flow (After Beta Access)

**Steps:**
1. Pass beta gate with code 2468
2. Fill out creator application:
   - Add Instagram handle (optional)
   - Add follower count (minimum 1000)
   - Upload content samples (minimum 3)
   - Write bio (100-500 characters)
   - Select cuisine preferences
   - Agree to terms
3. Submit application

**Expected Behavior:**
- ✅ Application submits successfully
- ✅ Shows success message
- ✅ Navigates back to More tab
- ✅ Database record created in `creator_applications` with status 'pending'
- ✅ Cannot submit duplicate application

**Check Database:**
```sql
SELECT * FROM creator_applications
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC LIMIT 1;
```

### 4. Restaurant Claim Flow (After Beta Access) - SIMPLIFIED

**Steps:**
1. Pass beta gate with code 2468
2. **Step 1 of 3 - Search Restaurant:**
   - Search by name
   - Select from results OR click "Can't find your restaurant? Add new"
3. **Step 2 of 3 - Contact Information:**
   - Enter email OR phone number (at least one required)
   - See selected restaurant displayed
4. **Step 3 of 3 - Pending Confirmation:**
   - Submit claim
   - See success screen with "What happens next?"

**Expected Behavior:**
- ✅ Simple 3-step flow (no complex verification)
- ✅ Only asks for email OR phone
- ✅ Claim submits successfully
- ✅ Shows friendly pending message
- ✅ Database record created in `restaurant_claims` with status 'pending'
- ✅ Cannot claim already claimed restaurant

**Check Database:**
```sql
SELECT * FROM restaurant_claims
WHERE user_id = 'YOUR_USER_ID'
ORDER BY submitted_at DESC LIMIT 1;
```

### 5. Admin Review Queue

**Steps:**
1. Log in as admin user (use one of the admin IDs)
2. Navigate to More tab
3. Look for "Admin Tools" section (should be at top)
4. Tap "Review Queue"
5. See list of pending submissions

**Expected Behavior:**
- ✅ "Admin Tools" section only visible to admin users
- ✅ Badge shows pending count
- ✅ Review queue shows all pending items
- ✅ Can filter by type: All / Restaurants / Creators
- ✅ Can expand items to see details

**Test Review Actions:**
1. Tap on a pending item to expand
2. Tap "Review" button
3. Review modal opens showing:
   - Submission details
   - User information
   - Approve/Reject buttons

**Approve Flow:**
1. Select "Approve"
2. Add optional notes
3. Tap "Submit Review"
4. ✅ Item disappears from queue
5. ✅ User's account_type updates in database
6. ✅ User receives notification

**Reject Flow:**
1. Select "Reject"
2. Enter rejection reason (required)
3. Add optional notes
4. Tap "Submit Review"
5. ✅ Item disappears from queue
6. ✅ Status updates to 'rejected'
7. ✅ User receives notification with reason

## Database Verification

### Check Pending Applications
```sql
-- Creator applications
SELECT
  ca.id,
  ca.status,
  ca.submitted_at,
  u.name as user_name,
  u.email
FROM creator_applications ca
JOIN users u ON ca.user_id = u.id
WHERE ca.status = 'pending'
ORDER BY ca.submitted_at DESC;

-- Restaurant claims
SELECT
  rc.id,
  rc.status,
  rc.submitted_at,
  u.name as user_name,
  r.name as restaurant_name
FROM restaurant_claims rc
JOIN users u ON rc.user_id = u.id
LEFT JOIN restaurants r ON rc.restaurant_id = r.id
WHERE rc.status = 'pending'
ORDER BY rc.submitted_at DESC;
```

### Check Admin Users
```sql
SELECT id, email, name
FROM auth.users
WHERE id IN (
  'b08d9600-358d-4be9-9552-4607d9f50227',
  '31744191-f7c0-44a4-8673-10b34ccbb87f'
);
```

### Verify Approval Updates User
```sql
-- After approving creator application
SELECT id, email, name, account_type
FROM users
WHERE id = 'USER_ID_THAT_WAS_APPROVED';
-- account_type should be 'creator'

-- After approving restaurant claim
SELECT id, email, name, account_type
FROM users
WHERE id = 'USER_ID_THAT_WAS_APPROVED';
-- account_type should be 'business'
```

## Edge Cases to Test

### 1. Duplicate Submissions
- ✅ Try submitting creator application twice → Should show error
- ✅ Try claiming same restaurant twice → Should show error

### 2. Already Approved
- ✅ Approved creator tries to apply again → Should be blocked
- ✅ User who claimed restaurant tries again → Should show already claimed

### 3. Rejected User
- ✅ Rejected user can see rejection reason
- ✅ Rejected user must wait 30 days to reapply
- ✅ After 30 days, can reapply

### 4. Access Control
- ✅ Non-admin users don't see Admin Tools section
- ✅ Non-admin users can't access /admin/reviews directly
- ✅ Admin service rejects non-admin API calls

## Common Issues & Solutions

### Issue: Beta gate doesn't appear
**Solution:** Check that you're navigating from More tab, not directly to route

### Issue: Passcode doesn't work
**Solution:** Verify passcode is exactly "2468" (4 digits)

### Issue: Admin Tools not showing
**Solution:**
- Check user ID matches admin IDs
- Verify logged in correctly
- Check console for errors

### Issue: Review queue empty
**Solution:**
- Create test submissions as regular user first
- Check database for pending items
- Verify RLS policies allow admin to read

### Issue: Approval doesn't update user
**Solution:**
- Check adminReviewService logs
- Verify user exists in public.users table
- Check account_type column exists

## Success Criteria

### Beta Access
- [x] Password protection works on both flows
- [x] Friendly message displays
- [x] Contact email visible
- [x] Easy to enter 4-digit code

### Creator Flow
- [x] Application goes to pending state
- [x] Cannot submit duplicates
- [x] Shows in admin queue
- [x] Approval upgrades user to creator

### Restaurant Flow
- [x] Claim goes to pending state
- [x] Cannot claim already claimed restaurant
- [x] Shows in admin queue
- [x] Approval upgrades user to business

### Admin Tools
- [x] Only visible to admin users
- [x] Shows all pending submissions
- [x] Can approve/reject with notes
- [x] Updates propagate correctly
- [x] Notifications sent to users

## Next Test Phase

After MVP testing passes:
1. Test with real users (provide passcode)
2. Monitor admin queue for submissions
3. Test approval/rejection workflow
4. Gather feedback on user experience
5. Iterate on messaging and flow

## Contact

Issues or questions during testing:
- taylor@troodieapp.com
- Document bugs in testing notes
- Check database directly if issues occur
