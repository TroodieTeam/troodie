# Creator Marketplace Manual Testing Guide

## Overview
This guide provides step-by-step instructions for manually testing the Creator Onboarding and Restaurant Claiming features implemented for the Troodie MVP.

## Prerequisites

### Test Accounts Available
Use these pre-seeded test accounts (password for all: `000000`):

#### Consumer Accounts (Can become creators)
- `consumer1@bypass.com` - John Smith
- `consumer2@bypass.com` - Jane Doe  
- `consumer3@bypass.com` - Alice Johnson

#### Creator Accounts (Already creators)
- `creator1@bypass.com` - Sarah Wilson (Food Blogger)
- `creator2@bypass.com` - Mike Chen (Food Photographer)

#### Business Accounts (Already claimed restaurants)
- `business1@bypass.com` - The Local Kitchen
- `business2@bypass.com` - Sunset Grill

#### Multi-Role Account
- `multirole@bypass.com` - Emily Davis (Creator + Business)

### Test Restaurants
30+ restaurants are seeded, including:
- **Claimed**: The Local Kitchen, Sunset Grill
- **Unclaimed**: All others (Pizza Place, Burger Joint, Sushi Bar, etc.)
- **With websites**: Taco Stand (tacostand.com), Cafe Mocha (cafemocha.com)

## Test Scenarios

### Scenario 1: Creator Onboarding (Happy Path)

**Objective**: Convert a consumer account to creator

**Test Account**: `consumer1@bypass.com`

**Steps**:
1. **Login**
   - Open app
   - Enter email: `consumer1@bypass.com`
   - Enter OTP: `000000`
   - Verify login successful

2. **Navigate to Creator Onboarding**
   - Go to "More" tab
   - Look for "Become a Creator" option
   - Tap to start onboarding

3. **Complete Welcome Screen**
   - Read "How it works" section
   - Verify 4 steps are shown
   - Tap "Get Started"

4. **Fill Profile Information**
   - Display Name: Enter "Test Creator"
   - Bio: Enter "Passionate food lover and content creator"
   - Specialties: Select at least 3 (Brunch, Fine Dining, Desserts)
   - Location: Enter "Los Angeles"
   - Tap "Continue to Portfolio"

5. **Upload Portfolio**
   - Tap "Add Photos"
   - Select 3-5 food images from gallery
   - Add captions to each image
   - Check "I agree to Creator Guidelines"
   - Tap "Complete Setup"

6. **Verify Success**
   - ✅ Success message appears
   - ✅ Redirected to More tab
   - ✅ "Creator Tools" section visible
   - ✅ Account type shows "Creator"

### Scenario 2: Restaurant Claiming with Domain Match (Instant)

**Objective**: Claim restaurant with matching domain email

**Test Account**: `consumer2@bypass.com`
**Test Restaurant**: Taco Stand (website: tacostand.com)

**Steps**:
1. **Login** as `consumer2@bypass.com`

2. **Find Restaurant**
   - Go to Explore tab
   - Search for "Taco Stand"
   - Open restaurant details

3. **Start Claiming Process**
   - Look for "Claim This Restaurant" button
   - Tap to open claiming flow

4. **Enter Matching Email**
   - Enter email: `owner@tacostand.com`
   - Note the green "instant verification" message
   - Tap "Verify Ownership"

5. **Verify Instant Success**
   - ✅ "Success! Your restaurant has been verified instantly!"
   - ✅ Account upgraded to "Business"
   - ✅ Restaurant shows as "Claimed"
   - ✅ Business tools appear in More tab

### Scenario 3: Restaurant Claiming with Email Code

**Objective**: Claim restaurant using email verification code

**Test Account**: `consumer3@bypass.com`
**Test Restaurant**: Pizza Place (no website)

**Steps**:
1. **Login** as `consumer3@bypass.com`

2. **Find Restaurant**
   - Search for "Pizza Place"
   - Open restaurant details

3. **Start Claiming**
   - Tap "Claim This Restaurant"

4. **Enter Business Email**
   - Enter: `manager@pizzaplace.com`
   - Tap "Verify Ownership"

5. **Enter Verification Code**
   - In dev mode: Code shown as "Test Code: XXXXXX"
   - Enter the 6-digit code
   - Tap "Verify Code"

6. **Verify Success**
   - ✅ "Success! Your restaurant has been successfully claimed!"
   - ✅ Account type changes to "Business"
   - ✅ Restaurant marked as claimed

### Scenario 4: Edge Cases and Error Handling

#### 4.1 Already a Creator
**Test**: Try to access onboarding as `creator1@bypass.com`
**Expected**: "Become a Creator" option not shown in More tab

#### 4.2 Already Claimed Restaurant
**Test**: Try to claim "The Local Kitchen"
**Expected**: "Claim This Restaurant" button not shown

#### 4.3 Invalid Email Format
**Test**: Enter "notanemail" in claiming flow
**Expected**: Error: "Please enter a valid email address"

#### 4.4 Expired Verification Code
**Test**: Wait 10+ minutes before entering code
**Expected**: Error: "Invalid or expired verification code"

#### 4.5 Insufficient Portfolio
**Test**: Try to complete onboarding with < 3 images
**Expected**: "Complete Setup" button disabled

#### 4.6 Wrong Verification Code
**Test**: Enter wrong 6-digit code
**Expected**: Error: "Invalid verification code"

### Scenario 5: Multi-Role Testing

**Objective**: Test account with both creator and business roles

**Test Account**: `multirole@bypass.com`

**Steps**:
1. **Login** as `multirole@bypass.com`

2. **Verify More Tab**
   - ✅ Creator Tools section visible
   - ✅ Business Tools section visible
   - ✅ No "Become a Creator" option
   - ✅ Account shows both roles

3. **Test Restaurant Interaction**
   - View any unclaimed restaurant
   - ❌ "Claim This Restaurant" not shown (already business)

## Testing Checklist

### Creator Onboarding
- [ ] Consumer can see "Become a Creator" option
- [ ] Welcome screen displays correctly
- [ ] Profile form validates required fields
- [ ] Specialties selection works (multi-select)
- [ ] Portfolio upload accepts 3-5 images
- [ ] Images display with captions
- [ ] Terms checkbox required
- [ ] Account upgrades to creator on completion
- [ ] Creator tools appear in More tab
- [ ] Cannot re-enter onboarding as creator

### Restaurant Claiming
- [ ] Unclaimed restaurants show claim button
- [ ] Claimed restaurants don't show claim button
- [ ] Email validation works
- [ ] Domain match shows instant verification message
- [ ] Domain match completes instantly
- [ ] Non-matching domain triggers code flow
- [ ] Verification code displays in dev mode
- [ ] Code entry accepts 6 digits only
- [ ] Code expiration timer shows
- [ ] Expired codes are rejected
- [ ] Wrong codes show error
- [ ] Successful claim upgrades account
- [ ] Restaurant marked as claimed after success
- [ ] Business tools appear in More tab

### Error Handling
- [ ] Invalid email shows error
- [ ] Empty required fields disable buttons
- [ ] Network errors handled gracefully
- [ ] Upload failures show error message
- [ ] Form data persists during navigation

### UI/UX
- [ ] Progress indicators show current step
- [ ] Back navigation works correctly
- [ ] Loading states display during operations
- [ ] Success messages are clear
- [ ] Error messages are helpful
- [ ] Forms are keyboard-friendly
- [ ] Images load and display correctly
- [ ] Responsive on different screen sizes

## Database Verification Queries

Run these in Supabase SQL editor to verify data:

```sql
-- Check creator profiles created
SELECT u.email, cp.* 
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
ORDER BY cp.created_at DESC;

-- Check portfolio items
SELECT * FROM creator_portfolio_items
ORDER BY created_at DESC;

-- Check restaurant claims
SELECT rc.*, r.name as restaurant_name, u.email
FROM restaurant_claims rc
JOIN restaurants r ON rc.restaurant_id = r.id
JOIN users u ON rc.user_id = u.id
ORDER BY rc.created_at DESC;

-- Check business profiles
SELECT bp.*, r.name as restaurant_name, u.email
FROM business_profiles bp
JOIN restaurants r ON bp.restaurant_id = r.id
JOIN users u ON bp.user_id = u.id;

-- Check account type changes
SELECT email, account_type, is_creator, is_restaurant, account_upgraded_at
FROM users
WHERE account_upgraded_at IS NOT NULL
ORDER BY account_upgraded_at DESC;
```

## Troubleshooting

### Common Issues

#### "Become a Creator" not showing
- Check user is logged in
- Verify account_type is 'consumer'
- Check user doesn't have creator profile

#### Verification code not working
- Ensure code hasn't expired (10 min)
- Check exact 6-digit match
- Verify claim status is 'pending'

#### Portfolio upload fails
- Check file size < 10MB
- Verify image format (jpg/png/webp)
- Ensure storage bucket has public access

#### Account type not updating
- Check database migrations ran successfully
- Verify RPC functions exist
- Check for any SQL errors in logs

## Dev Mode Features

### Bypass Authentication
- All `@bypass.com` emails use OTP: `000000`
- No real email sending required

### Verification Codes
- Codes display in UI during dev mode
- Look for "Test Code: XXXXXX" message
- Real implementation would send via email

### Quick Testing
- Use browser dev tools to check network requests
- Monitor Supabase logs for RPC function calls
- Check browser console for any errors

## Reporting Issues

When reporting issues, include:
1. Test account used
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots if applicable
5. Any console errors
6. Network request failures

## Next Steps

After testing these scenarios:
1. Mark tasks as "Needs Review" if all pass
2. Document any bugs found
3. Create issues for failures
4. Test on different devices/browsers
5. Verify with real email service when available