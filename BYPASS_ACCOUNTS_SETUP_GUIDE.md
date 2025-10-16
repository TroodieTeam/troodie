# @bypass.com Test Accounts Setup Guide

## Problem Summary

The @bypass.com test accounts were using **mock authentication sessions** instead of real Supabase authentication. This caused:
- ❌ RLS (Row Level Security) policies to fail because `auth.uid()` returned null
- ❌ Users couldn't save restaurants, create boards, or create posts
- ❌ Database operations were blocked by security policies

## Solution Overview

We've fixed the authentication to use **real Supabase password authentication** for @bypass.com accounts:
- ✅ Real auth sessions with proper `auth.uid()`
- ✅ RLS policies work correctly
- ✅ All database operations function normally
- ✅ Fast login with fixed OTP code (000000)

## Setup Steps

### Step 1: Create and Fix Accounts in Supabase

1. Go to your Supabase SQL Editor: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new
2. Copy and paste the entire contents of `CREATE_AND_FIX_BYPASS_ACCOUNTS.sql`
3. Click "Run"
4. Review the output to ensure:
   - All @bypass.com accounts from `public.users` are shown
   - Missing accounts are CREATED in `auth.users` (you'll see "Creating auth account for..." messages)
   - Existing accounts are UPDATED with passwords (you'll see "Updating password for..." messages)
   - All accounts have passwords set (`has_password = true`)
   - All accounts are email confirmed (`email_confirmed = true`)

**Expected Output:**
```
STEP 1: Shows all bypass accounts in public.users
STEP 2: Shows current bypass accounts in auth.users (may be empty initially)
STEP 3: Creates missing accounts and sets passwords
  - "Creating auth account for: consumer2@bypass.com" (if new)
  - "Updating password for existing account: consumer2@bypass.com" (if exists)
  - Summary: "Accounts created: X, Accounts updated: Y"
STEP 4: Verification shows all accounts now in auth.users with has_password = true
STEP 5: Final summary - all counts should match
```

**Important Notes:**
- This script will CREATE accounts in `auth.users` if they only exist in `public.users`
- The script uses the same UUID from `public.users` to ensure data consistency
- If you see "Accounts created: 0" and you expected accounts to be created, it means they already exist in `auth.users`
- If you see any errors, check that the `pgcrypto` extension is enabled in your Supabase project

### Step 2: Restart Your App

```bash
# Stop the current Expo server (Ctrl+C)
# Clear cache and restart
npx expo start --clear
```

### Step 3: Test Login

1. Open your app
2. Tap "Log in"
3. Enter email: `consumer2@bypass.com`
4. Tap "Send Code"
5. Enter OTP: `000000`
6. Tap "Verify"

**Expected Logs:**
```
[AuthService] Bypass account detected, OTP will be bypassed with code 000000
[AuthService] Bypass account found: consumer2@bypass.com
[AuthService] Authenticating bypass account with password
[AuthService] Bypass account authenticated successfully with password
[AuthService] Session user ID: <actual-user-id>
```

### Step 4: Test Features

Try these actions:
- ✅ Save a restaurant (should show "Added to Your Saves")
- ✅ Create a board (should succeed)
- ✅ Create a post (should succeed)
- ✅ Create a community (should succeed)

## How It Works

### Authentication Flow

**Before (BROKEN):**
```
User enters email → Skips OTP → Creates MOCK session → auth.uid() = null → RLS fails ❌
```

**After (FIXED):**
```
User enters email → Enters OTP 000000 → Password auth → Real Supabase session → auth.uid() = user.id → RLS works ✅
```

### Code Changes

1. **signInWithEmail**: Validates bypass account exists before proceeding
2. **verifyOtp**: Uses `signInWithPassword()` with preset password `BypassTestPassword000000`
3. **No mock sessions**: All bypass accounts get real Supabase authentication

### Password Details

- **Password**: `BypassTestPassword000000`
- **Set for**: All emails ending in `@bypass.com`
- **Storage**: Encrypted in `auth.users.encrypted_password`
- **Method**: bcrypt with default salt

## Available Test Accounts

All accounts use OTP code: `000000`

**Consumer Accounts:**
- consumer1@bypass.com
- consumer2@bypass.com
- consumer3@bypass.com

**Creator Accounts:**
- creator1@bypass.com
- creator2@bypass.com

**Business Accounts:**
- business1@bypass.com
- business2@bypass.com

**Special Accounts:**
- multi_role@bypass.com (creator + business)
- business_complete@bypass.com (full test data)

## Troubleshooting

### Error: "Invalid login credentials"

**Cause**: Account doesn't exist in `auth.users` or password not set correctly

**Fix**:
1. Run `CREATE_AND_FIX_BYPASS_ACCOUNTS.sql` (this will CREATE missing accounts)
2. Check Step 4 output - `has_password` should be `true` for all accounts
3. Verify Step 3 shows "Creating auth account for..." or "Updating password for..." messages
4. If no accounts were created/updated, check that accounts exist in `public.users`

### Error: "Test account not found"

**Cause**: Account doesn't exist in `public.users` table

**Fix**:
1. Run the test account seeding script
2. Or create the account manually in Supabase

### Error: "Bypass account authentication failed"

**Cause**: Account exists but password auth is failing

**Fix**:
1. Check account exists in both `auth.users` AND `public.users`
2. Run `CREATE_AND_FIX_BYPASS_ACCOUNTS.sql` to create/update account with password
3. Ensure password is exactly: `BypassTestPassword000000`
4. Check that email is confirmed (`email_confirmed_at` is not null)

## Maestro Testing

The @bypass.com accounts now work perfectly with Maestro automated testing:

```yaml
# Login flow in Maestro
- tapOn: "Log in"
- tapOn: "user@example.com"
- inputText: "consumer2@bypass.com"
- tapOn: "Send Code"
- inputText: "0"
- inputText: "0"
- inputText: "0"
- inputText: "0"
- inputText: "0"
- inputText: "0"
- waitForAnimationToEnd
```

All features (save, boards, posts, communities) will work because the account has a real auth session.

## Security Notes

- ⚠️ **Never use @bypass.com pattern in production**
- ⚠️ These accounts are for testing only
- ⚠️ Password is hardcoded and should only be used in test/staging environments
- ✅ RLS policies protect data - each user can only access their own data
- ✅ Real authentication ensures audit trails are accurate

## Summary

The fix ensures @bypass.com test accounts:
1. ✅ Use real Supabase authentication (not mock sessions)
2. ✅ Have working `auth.uid()` for RLS policies
3. ✅ Can perform all database operations
4. ✅ Work with automated testing (Maestro)
5. ✅ Maintain data isolation through RLS

All you need to do is:
1. Run the SQL script once
2. Restart your app
3. Test accounts will work like real users!
