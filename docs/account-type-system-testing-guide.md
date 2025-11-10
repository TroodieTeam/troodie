# Account Type System - Manual Testing Guide

**Task:** CM-001 Setup Account Type System  
**Status:** Ready for Testing  
**Date:** September 11, 2025

## Pre-Testing Setup

### 1. Database Migration
```bash
# Run the migration in your Supabase instance
# File: supabase/migrations/20250911000001_add_account_type_system.sql
```

### 2. Required Test Data
- At least 3 test user accounts
- 2-3 restaurant records in the database
- Test device with latest app build

## Test Scenarios

### Scenario 1: Consumer Account (Default Experience)

**Given:** I am a new user who just signed up  
**When:** I complete onboarding and navigate the app  
**Then:** I should see the default consumer experience

#### Test Steps:
1. **Sign up for new account**
   - Open app and go through sign-up flow
   - Complete onboarding process
   
2. **Verify consumer account type**
   - Navigate to More tab
   - Profile card should show "Food Explorer" badge
   - Should see "Grow with Troodie" section
   - Should see "Become a Creator" option (with BETA badge)
   - Should see "Claim Your Restaurant" option
   
3. **Verify consumer features work**
   - Can explore restaurants
   - Can save restaurants to boards
   - Can create posts and reviews
   - Can follow other users
   - Can access communities

#### Expected Results:
- ✅ Account type shows as "Food Explorer"
- ✅ More tab shows Growth Opportunities section
- ✅ All consumer features accessible
- ✅ No creator or business sections visible

### Scenario 2: Account Upgrade to Creator

**Given:** I am a consumer user  
**When:** I complete creator onboarding  
**Then:** My account should upgrade to creator type

#### Test Steps:
1. **Start creator upgrade**
   - Go to More tab
   - Tap "Become a Creator" 
   - Complete creator onboarding flow
   
2. **Provide creator information**
   - Enter bio and specialties
   - Add social media links (optional)
   - Submit creator profile
   
3. **Verify creator upgrade**
   - Navigate back to More tab
   - Profile card should show "Content Creator" badge
   - Should see new "Creator Tools" section at top
   - Should see creator-specific options:
     - Creator Dashboard
     - My Campaigns  
     - Earnings
     - Creator Analytics
     
4. **Verify consumer features retained**
   - Can still explore restaurants
   - Can still save and create posts
   - All previous functionality intact

#### Expected Results:
- ✅ Account type badge changes to "Content Creator"
- ✅ Creator Tools section appears at top of More tab
- ✅ Growth section now only shows "Claim Restaurant"
- ✅ All consumer features still work
- ✅ Database shows account_type = 'creator'
- ✅ Creator profile record created

### Scenario 3: Business Account via Restaurant Claiming

**Given:** I am a consumer or creator user  
**When:** I successfully claim and verify a restaurant  
**Then:** My account should upgrade to business type

#### Test Steps:
1. **Start restaurant claiming**
   - Go to More tab  
   - Tap "Claim Your Restaurant"
   - Search for and select restaurant to claim
   
2. **Complete verification process**
   - Choose verification method (email/phone/document)
   - Complete verification steps
   - Provide business information
   
3. **Verify business upgrade**  
   - Navigate back to More tab
   - Profile card should show "Business Owner" badge
   - Should see new "Business Tools" section
   - Should see business-specific options:
     - Business Dashboard
     - Manage Campaigns
     - Analytics  
     - Restaurant Settings
     
4. **Verify restaurant association**
   - Business profile should show restaurant name
   - Restaurant should be marked as claimed
   - Business tools should reference specific restaurant

#### Expected Results:
- ✅ Account type badge changes to "Business Owner" 
- ✅ Business Tools section appears at top
- ✅ Restaurant name shown in Business Dashboard subtitle
- ✅ Growth section disappears (no more upgrades)
- ✅ All discovery features still accessible
- ✅ Database shows account_type = 'business'
- ✅ Business profile record created with restaurant link

### Scenario 4: Multi-Role User (Creator + Business)

**Given:** I am a creator who also owns a restaurant  
**When:** I claim a restaurant  
**Then:** I should see both creator and business sections

#### Test Steps:
1. **Start with creator account** (from Scenario 2)
2. **Claim restaurant** (follow Scenario 3 steps)
3. **Verify both role sections**
   - Creator Tools section still visible
   - Business Tools section added above it  
   - Both sections fully functional
   - Account type should be "Business Owner" (highest level)

#### Expected Results:
- ✅ Both Creator Tools and Business Tools sections visible
- ✅ Account badge shows "Business Owner"
- ✅ All creator features remain accessible
- ✅ All business features available
- ✅ Proper section ordering (business first, then creator)

### Scenario 5: Permission System Validation

**Given:** Users with different account types  
**When:** They try to access various features  
**Then:** Access should be granted/denied based on account type

#### Test Steps:
1. **Consumer permission tests**
   - Try accessing creator dashboard → Should fail/redirect
   - Try accessing business dashboard → Should fail/redirect  
   - Access regular features → Should work
   
2. **Creator permission tests**
   - Access creator dashboard → Should work
   - Try business features → Should fail
   - Access consumer features → Should work
   
3. **Business permission tests**
   - Access business dashboard → Should work
   - Access creator features (if multi-role) → Should work based on profile
   - Access consumer features → Should work

#### Expected Results:
- ✅ Users can only access features for their account type
- ✅ Higher account types include lower-level permissions
- ✅ Graceful handling of unauthorized access attempts

### Scenario 6: Account Type Persistence

**Given:** User with any account type  
**When:** They close and reopen the app  
**Then:** Account type and features should persist

#### Test Steps:
1. **Note current account type** in More tab
2. **Force close the app** completely
3. **Reopen the app**
4. **Verify account type maintained**
   - Same badge in profile card
   - Same sections in More tab
   - Same feature access

#### Expected Results:
- ✅ Account type badge unchanged
- ✅ More tab sections identical
- ✅ Feature access preserved
- ✅ No unexpected navigation or errors

### Scenario 7: Prevent Account Downgrades

**Given:** User with creator or business account  
**When:** System attempts to downgrade account type  
**Then:** Downgrade should be prevented

#### Test Steps:
1. **Manual API test** (using Supabase or API client)
   - Try to set creator account_type to 'consumer'  
   - Try to set business account_type to 'creator' or 'consumer'
   
2. **Verify protection**
   - API calls should return error
   - Account type should remain unchanged
   - User experience unaffected

#### Expected Results:
- ✅ Database function prevents downgrades
- ✅ Error returned for invalid upgrade attempts
- ✅ Account type remains at current level

### Scenario 8: Error Handling

**Given:** Various error conditions  
**When:** Account operations encounter issues  
**Then:** Errors should be handled gracefully

#### Test Steps:
1. **Network failure during upgrade**
   - Start upgrade process
   - Disconnect network mid-process
   - Reconnect and retry
   
2. **Invalid restaurant claim**
   - Try to claim already-claimed restaurant
   - Try to claim non-existent restaurant
   
3. **Database errors**
   - Force database connection issues
   - Verify graceful degradation

#### Expected Results:
- ✅ Clear error messages shown to user
- ✅ App remains stable during errors  
- ✅ Retry mechanisms work where appropriate
- ✅ No data corruption or inconsistent states

## Database Verification Queries

Use these SQL queries to verify database state:

```sql
-- Check user account types
SELECT id, email, account_type, account_status, account_upgraded_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- Check creator profiles
SELECT cp.*, u.email 
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id;

-- Check business profiles
SELECT bp.*, u.email, r.name as restaurant_name
FROM business_profiles bp
JOIN users u ON bp.user_id = u.id
JOIN restaurants r ON bp.restaurant_id = r.id;

-- Verify no downgrades occurred
SELECT id, email, account_type, 
       CASE 
         WHEN is_creator = true AND account_type = 'consumer' THEN 'MISMATCH'
         WHEN is_restaurant = true AND account_type IN ('consumer', 'creator') THEN 'MISMATCH'
         ELSE 'OK'
       END as consistency_check
FROM users;
```

## Performance Testing

### Load Testing Steps:
1. **Rapid account type checks** - Navigate quickly between tabs
2. **Multiple concurrent upgrades** - Test upgrade process under load
3. **Permission checking performance** - Verify no UI lag during permission checks

### Expected Performance:
- ✅ Tab navigation < 100ms
- ✅ Account upgrades complete within 5 seconds
- ✅ Permission checks cause no noticeable delay
- ✅ More tab renders smoothly with all sections

## Accessibility Testing

### Screen Reader Testing:
1. **Enable VoiceOver (iOS) or TalkBack (Android)**
2. **Navigate More tab with screen reader**
3. **Verify account type badges are announced**
4. **Confirm all menu items are accessible**

### Expected Accessibility:
- ✅ Account type badge text announced correctly
- ✅ All menu items have proper labels
- ✅ Section headings provide navigation structure
- ✅ Beta badges announced appropriately

## Edge Cases to Test

### Data Edge Cases:
- User with no email address
- User with extremely long name/bio
- Restaurant with missing/invalid data
- Network timeouts during upgrade

### UI Edge Cases:
- Very small screen sizes
- Large accessibility text
- Dark mode compatibility
- Different orientations

## Success Criteria Checklist

- ✅ Consumer accounts work identically to before
- ✅ Creator upgrade path is smooth and intuitive
- ✅ Business claiming process is clear and functional
- ✅ Multi-role users see appropriate sections
- ✅ Permission system prevents unauthorized access
- ✅ Account types persist across sessions
- ✅ No downgrades are possible
- ✅ Error handling is user-friendly
- ✅ Performance remains acceptable
- ✅ Accessibility standards maintained

## Test Data Cleanup

After testing, clean up test data:

```sql
-- Remove test creator profiles
DELETE FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');

-- Remove test business profiles  
DELETE FROM business_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');

-- Reset test user account types
UPDATE users SET account_type = 'consumer', account_upgraded_at = NULL 
WHERE email LIKE '%test%';
```

## Reporting Issues

When reporting issues, include:
1. **Account type** being tested (consumer/creator/business)
2. **Exact steps** to reproduce
3. **Expected vs actual** behavior
4. **Screenshots** of any UI issues
5. **Database state** if relevant (use verification queries)
6. **Device/platform** information

## Test Sign-off

**Tester:** ________________________  
**Date:** __________________________  
**Overall Result:** ✅ Pass / ❌ Fail  
**Notes:** _________________________