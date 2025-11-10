# Pending State Testing Guide

## Overview

This guide provides comprehensive testing procedures for the Pending State system, including manual testing steps, test data creation, and verification procedures.

## Test Environment Setup

### Prerequisites
1. React Native development environment (Expo)
2. iOS Simulator or Android Emulator
3. Admin account with review permissions
4. Test user accounts for submissions
5. Access to Supabase database
6. Push notification setup (optional)

### Admin Test Accounts (Bypass Auth)
```sql
-- Create admin users in auth.users (bypasses email verification)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES
  (
    'admin-test-001',
    'admin@troodie.test',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Test Admin", "account_type": "admin", "is_admin": true}',
    'authenticated',
    'authenticated'
  ),
  (
    'admin-test-002',
    'reviewer@troodie.test',
    crypt('Reviewer123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Test Reviewer", "account_type": "admin", "is_admin": true}',
    'authenticated',
    'authenticated'
  );

-- Create corresponding user profiles
INSERT INTO public.users (
  id,
  email,
  name,
  account_type,
  is_verified,
  created_at,
  updated_at
) VALUES
  ('admin-test-001', 'admin@troodie.test', 'Test Admin', 'admin', true, NOW(), NOW()),
  ('admin-test-002', 'reviewer@troodie.test', 'Test Reviewer', 'admin', true, NOW(), NOW());

-- Create regular test users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES
  (
    'user-test-001',
    'owner@restaurant.test',
    crypt('Owner123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Restaurant Owner"}',
    'authenticated',
    'authenticated'
  ),
  (
    'user-test-002',
    'creator@social.test',
    crypt('Creator123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Content Creator"}',
    'authenticated',
    'authenticated'
  );

INSERT INTO public.users (
  id,
  email,
  name,
  account_type,
  created_at,
  updated_at
) VALUES
  ('user-test-001', 'owner@restaurant.test', 'Restaurant Owner', 'consumer', NOW(), NOW()),
  ('user-test-002', 'creator@social.test', 'Content Creator', 'consumer', NOW(), NOW());

-- Create test restaurant
INSERT INTO restaurants (id, name, address, cuisine_type) VALUES
  ('test-restaurant-1', 'Test Restaurant', '123 Test St', 'Italian');

-- Create test claims
INSERT INTO restaurant_claims (user_id, restaurant_id, ownership_proof_type, email, status) VALUES
  ('test-user-1', 'test-restaurant-1', 'business_email', 'owner@testrestaurant.com', 'pending');

-- Create test applications
INSERT INTO creator_applications (user_id, follower_count, instagram_handle, status) VALUES
  ('test-user-2', 5000, '@testcreator', 'pending');
```

## Manual Testing Procedures

### 1. Admin Review Flow (React Native)

#### Test Case: Access Admin Tools
**Steps:**
1. Log in as admin (admin@troodie.test / Admin123!)
2. Navigate to More tab
3. Verify "Admin Tools" section appears at top
4. Tap "Review Queue"

**Expected Results:**
- Admin Tools section visible only for admin users
- Review Queue shows badge with pending count
- Navigation to review screen works

#### Test Case: View Pending Queue
**Steps:**
1. Open Review Queue from More tab
2. Check filter tabs (All/Restaurants/Creators)
3. Pull down to refresh
4. Tap on queue items to expand

**Expected Results:**
- Queue loads with loading indicator
- Filter tabs scroll horizontally
- Pull-to-refresh works
- Items expand/collapse on tap
- Time stamps show relative time

#### Test Case: Approve Restaurant Claim (Mobile)
**Steps:**
1. Expand a pending restaurant claim
2. Tap "Review" button
3. In modal, tap "Approve" button
4. Add optional review notes
5. Tap "Submit Review"

**Expected Results:**
- Modal slides up from bottom
- Approve button turns green when selected
- Keyboard appears for notes input
- Loading state during submission
- Success alert shown
- Modal dismisses
- Queue refreshes automatically
- User gets push/email notification

#### Test Case: Reject Creator Application
**Steps:**
1. Select pending creator application
2. Click "Review" button
3. Select "Reject" action
4. Select rejection reason
5. Add review notes
6. Submit review

**Expected Results:**
- Application status changes to rejected
- Rejection reason saved
- Notification sent with reason
- Can resubmit flag set correctly
- Review logged in audit trail

#### Test Case: Bulk Operations
**Steps:**
1. Select multiple pending items
2. Click "Bulk Approve" or "Bulk Reject"
3. Confirm action
4. Check results

**Expected Results:**
- All selected items processed
- Individual notifications sent
- Errors reported for failures
- Queue refreshes automatically

### 2. User Submission Flow (React Native)

#### Test Case: Submit Restaurant Claim
**Steps:**
1. Log in as regular user (owner@restaurant.test)
2. Go to More tab
3. Tap "Claim Your Restaurant"
4. Complete claim flow
5. View success screen

**Expected Results:**
- Claim flow navigates correctly
- Success screen shows pending status
- "Track Status" button works
- Submission appears in "My Submissions"

#### Test Case: View Submission Status
**Steps:**
1. Go to More tab
2. Tap "My Submissions"
3. Check submission cards
4. Tap to expand details
5. Pull to refresh

**Expected Results:**
- All submissions load
- Status badges show correct color/icon
- Relative timestamps display
- Cards expand on tap
- Pull-to-refresh updates status

#### Test Case: Pending State Success Screen
**Steps:**
1. Complete a claim or application
2. View success screen
3. Check all elements display
4. Test navigation buttons

**Expected Results:**
- Clock icon animation
- "Pending Review" badge with pulse
- Timeline shows "24-48 hours"
- Three checkmark steps listed
- "Track Status" navigates to My Submissions
- "Return to Home" goes to More tab

#### Test Case: Handle Rejection
**Steps:**
1. View rejected submission
2. Read rejection reason
3. Click resubmit (if allowed)
4. Contact support option

**Expected Results:**
- Rejection reason clearly displayed
- Resubmit button if can_resubmit = true
- Support contact available
- Previous data prefilled on resubmit

### 3. Notification Testing

#### Test Case: In-App Notifications
**Steps:**
1. Trigger status change
2. Check notification bell
3. View notification
4. Mark as read

**Expected Results:**
- Badge count updates
- Notification appears immediately
- Correct title and message
- Links to submission
- Read state persists

#### Test Case: Email Notifications
**Steps:**
1. Trigger approval/rejection
2. Check email queue
3. Verify email sent
4. Check content accuracy

**Expected Results:**
- Email queued immediately
- Correct template used
- Personalized content
- Action links work
- Unsubscribe option present

## Automated Testing

### Mobile App Testing

#### Device Testing Matrix
- **iOS**: iPhone 12+ (iOS 14+)
- **Android**: Pixel 4+ (Android 11+)
- **Tablets**: iPad/Android tablets

#### Navigation Testing
```javascript
// Test navigation flow
1. More Tab → Admin Tools → Review Queue
2. More Tab → My Submissions
3. More Tab → Claim Restaurant → Success → Track
4. Back navigation at each level
5. Deep linking to submissions
```

#### Performance Testing
- App launch to More tab: < 2 seconds
- Review queue load: < 3 seconds
- Pull-to-refresh: < 2 seconds
- Modal open/close: < 500ms
- Submission load: < 2 seconds
```

### React Native Component Tests
```typescript
// Test React Native components
import { render, fireEvent } from '@testing-library/react-native';

describe('Admin Review Screen', () => {
  it('should render queue items', () => {
    const { getByText } = render(<AdminReviewsScreen />);
    expect(getByText('Review Queue')).toBeTruthy();
  });

  it('should handle pull to refresh', async () => {
    const { getByTestId } = render(<AdminReviewsScreen />);
    const scrollView = getByTestId('queue-scroll');
    fireEvent.refresh(scrollView);
    // Assert refresh called
  });
});

describe('My Submissions Screen', () => {
  it('should expand submission on tap', () => {
    const { getByText } = render(<MySubmissionsScreen />);
    const card = getByText('Restaurant: Test Restaurant');
    fireEvent.press(card);
    expect(getByText('Submission Details')).toBeTruthy();
  });
});
```

## Performance Testing

### Load Testing
- Queue with 100+ items
- Bulk operations with 50+ items
- Notification sending for 100+ users
- Concurrent admin reviews

### Response Time Targets
- Queue load: < 2 seconds
- Single approval: < 1 second
- Bulk operation (10 items): < 5 seconds
- Notification delivery: < 500ms

## Edge Cases

### Test Scenarios
1. **Duplicate submissions** - Should be prevented
2. **Invalid status transitions** - Should error gracefully
3. **Missing required fields** - Should show validation
4. **Network failures** - Should retry/queue
5. **Concurrent reviews** - Should handle conflicts
6. **Expired sessions** - Should redirect to login
7. **Large bulk operations** - Should process in batches
8. **Notification failures** - Should not block approval

## Verification Queries

### Check Review Status
```sql
-- Pending items count
SELECT type, COUNT(*)
FROM pending_review_queue
GROUP BY type;

-- Recent reviews
SELECT * FROM review_logs
ORDER BY created_at DESC
LIMIT 10;

-- User submission status
SELECT * FROM restaurant_claims
WHERE user_id = 'user-id';

SELECT * FROM creator_applications
WHERE user_id = 'user-id';
```

### Notification Verification
```sql
-- Check notifications created
SELECT * FROM notifications
WHERE user_id = 'user-id'
ORDER BY created_at DESC;

-- Check email queue
SELECT * FROM notification_emails
WHERE to_email = 'user@email.com';

-- Check push tokens
SELECT * FROM push_tokens
WHERE user_id = 'user-id';
```

## Troubleshooting

### Common Issues

#### Issue: Notifications not sending
**Check:**
- User has valid email
- Notification service running
- Email queue processing
- No errors in logs

#### Issue: Status not updating
**Check:**
- Database transaction committed
- RLS policies correct
- User permissions valid
- Cache cleared

#### Issue: Bulk operations failing
**Check:**
- Individual item errors
- Database constraints
- Timeout settings
- Memory limits

## Testing Checklist

### Pre-Release
- [ ] All manual test cases pass
- [ ] Automated tests pass
- [ ] Performance targets met
- [ ] Edge cases handled
- [ ] Security review complete
- [ ] Documentation updated

### Post-Release
- [ ] Monitor error rates
- [ ] Check notification delivery
- [ ] Verify queue processing
- [ ] Review user feedback
- [ ] Update test cases

## Test Data Cleanup

```sql
-- Clean test data (including auth users)
DELETE FROM public.review_logs WHERE actor_id IN ('admin-test-001', 'admin-test-002', 'user-test-001', 'user-test-002');
DELETE FROM public.notifications WHERE user_id IN ('admin-test-001', 'admin-test-002', 'user-test-001', 'user-test-002');
DELETE FROM public.restaurant_claims WHERE user_id IN ('user-test-001', 'user-test-002');
DELETE FROM public.creator_applications WHERE user_id IN ('user-test-001', 'user-test-002');
DELETE FROM public.users WHERE id IN ('admin-test-001', 'admin-test-002', 'user-test-001', 'user-test-002');
DELETE FROM auth.users WHERE id IN ('admin-test-001', 'admin-test-002', 'user-test-001', 'user-test-002');

-- Clean test restaurants
DELETE FROM public.restaurants WHERE id LIKE 'test-%';
```

## Test Credentials Summary

### Admin Accounts
- **Admin 1**: admin@troodie.test / Admin123!
- **Admin 2**: reviewer@troodie.test / Reviewer123!

### User Accounts
- **Restaurant Owner**: owner@restaurant.test / Owner123!
- **Content Creator**: creator@social.test / Creator123!

### Mobile Testing Tips
1. Use these accounts to bypass email OTP
2. Admin accounts show "Admin Tools" in More tab
3. Regular users can submit claims/applications
4. Test on both iOS and Android
5. Check offline behavior
6. Verify push notifications (if configured)