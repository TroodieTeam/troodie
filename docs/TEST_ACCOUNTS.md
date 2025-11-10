# Troodie Test Accounts Documentation

## Overview

This document describes the test account system implemented for Troodie, which allows bypassing OTP verification for testing and development purposes. The implementation follows the pattern from commit `b9453544424d657b722cd9101f37972011649ab3`.

## Test Account Credentials

All test accounts use the same OTP bypass code: **`000000`**

### Available Test Accounts

| Email | Username | Role | Description | Onboarding |
|-------|----------|------|-------------|------------|
| `test.foodie@troodieapp.com` | test_foodie | Regular User | Food enthusiast with saves and reviews | ✅ Complete |
| `test.owner@troodieapp.com` | test_restaurant | Business Account | Restaurant owner with business features | ✅ Complete |
| `test.critic@troodieapp.com` | test_critic | Verified Critic | Professional food critic with verified badge | ✅ Complete |
| `test.newuser@troodieapp.com` | test_newuser | New User | Fresh account for testing onboarding flow | ❌ Incomplete |
| `review@troodieapp.com` | app_reviewer | App Store Reviewer | Official account for App Store review process | ✅ Complete |

## How It Works

### Authentication Flow

1. **Email Entry**: User enters test account email
2. **OTP Request Bypass**: App detects test account and skips actual OTP request
3. **Code Entry**: User enters `000000`
4. **Mock Session**: App creates a mock session for the test account
5. **App Login**: User is logged in with test account data

### Implementation Details

#### Frontend (`services/authService.ts`)

```typescript
// Test accounts configuration
const testAccounts = [
  'test.foodie@troodieapp.com',
  'test.owner@troodieapp.com',
  'test.critic@troodieapp.com',
  'test.newuser@troodieapp.com'
]

// OTP bypass for test accounts
if (testAccounts.includes(email.toLowerCase())) {
  // Skip OTP request
  return { success: true, messageId: null }
}

// Verification with code 000000
if (testAccounts.includes(email) && token === '000000') {
  // Create mock session for test account
  const mockSession = {
    access_token: 'test-token-' + userData.id,
    user: { id: userData.id, email: userData.email }
  }
  return { success: true, session: mockSession }
}
```

#### Backend (Supabase)

- Auth users created with confirmed emails
- No passwords needed - pure OTP bypass
- User profiles populated with test data
- RLS policies respect test accounts like regular users

## Setup Instructions

### Quick Setup (All Accounts)

```bash
# Run the bulk creation script
./scripts/bulk-create-test-accounts.sh
```

### Manual Setup

1. **Create Auth Users**
```sql
-- Run scripts/create-test-accounts.sql
SELECT create_test_accounts();
```

2. **Generate Test Data**
```bash
node scripts/generate-test-restaurant-data.js
```

## Test Data Structure

### Each Test Account Includes:

#### Foodie Account
- 3 boards (Pizza Places, Brunch Adventures, Hidden Gems)
- 6 restaurant saves (mix of been_there and want_to_try)
- 4 posts about food experiences
- Ratings and reviews

#### Restaurant Owner Account
- Business profile setup
- 2 promotional posts
- Restaurant management features enabled
- Business analytics access

#### Food Critic Account
- Verified badge
- 4 professional boards
- 8 restaurant saves with detailed reviews
- 5 critical posts
- High engagement metrics

#### New User Account
- No boards created
- Onboarding not completed
- Clean slate for testing signup flow

## Security Considerations

⚠️ **Important Security Notes:**

1. **Development Only**: These accounts should NEVER be deployed to production
2. **Mock Sessions**: Uses mock sessions instead of real authentication
3. **No Real OTP**: Bypasses actual email verification
4. **Fixed Code**: Always accepts `000000` as valid

### Best Practices

- Use environment variables to enable/disable test accounts
- Remove test account logic before production deployment
- Regularly rotate test account passwords
- Monitor test account usage in logs

## Testing Scenarios

### 1. New User Onboarding
```
Email: test.newuser@troodieapp.com
OTP: 000000
Expected: Onboarding flow should trigger
```

### 2. Business Features
```
Email: test.owner@troodieapp.com
OTP: 000000
Expected: Business dashboard and features available
```

### 3. Verified User Features
```
Email: test.critic@troodieapp.com
OTP: 000000
Expected: Verified badge and enhanced features
```

### 4. Regular User Flow
```
Email: test.foodie@troodieapp.com
OTP: 000000
Expected: Standard user experience with existing data
```

## Troubleshooting

### Common Issues

#### "User not found" Error
- **Cause**: Auth user doesn't exist in Supabase
- **Fix**: Run `create-test-accounts.sql`

#### "Session creation failed" Error
- **Cause**: Mock session not handled properly
- **Fix**: Verify authService.ts has the test account bypass logic

#### No Test Data
- **Cause**: Data generation script not run
- **Fix**: Run `node scripts/generate-test-restaurant-data.js`

#### OTP Still Being Sent
- **Cause**: Email not matching exactly (case sensitive)
- **Fix**: Use lowercase emails

### Verification Query

```sql
-- Check test accounts status
SELECT
    email,
    username,
    onboarding_completed,
    is_business,
    verified
FROM public.users
WHERE email LIKE 'test.%@troodieapp.com'
   OR email = 'review@troodieapp.com';
```

## Files Reference

| File | Purpose |
|------|---------|
| `services/authService.ts` | Frontend OTP bypass logic |
| `scripts/create-test-accounts.sql` | Creates auth users and profiles |
| `scripts/generate-test-restaurant-data.js` | Creates realistic test data |
| `scripts/bulk-create-test-accounts.sh` | One-command setup script |
| `docs/TEST_ACCOUNTS.md` | This documentation |

## Maintenance

### Adding New Test Accounts

1. Add email to `testAccounts` array in `authService.ts`
2. Add account creation in `create-test-accounts.sql`
3. Update documentation

### Removing Test Accounts

```sql
-- Clean up test accounts
DELETE FROM public.users
WHERE email IN (
    'test.foodie@troodieapp.com',
    'test.owner@troodieapp.com',
    'test.critic@troodieapp.com',
    'test.newuser@troodieapp.com'
);

-- Also remove from auth.users
DELETE FROM auth.users
WHERE email IN (
    'test.foodie@troodieapp.com',
    'test.owner@troodieapp.com',
    'test.critic@troodieapp.com',
    'test.newuser@troodieapp.com'
);
```

## App Store Submission

For App Store review, use the dedicated review account:

**Email**: `review@troodieapp.com`
**OTP Code**: `000000`

Include these credentials in your App Review Information with a note:
> "This is a passwordless OTP authentication system. For testing purposes, use the email review@troodieapp.com and enter 000000 as the verification code."

---

**Last Updated**: 2025-01-18
**Author**: Troodie Development Team
**Version**: 1.0