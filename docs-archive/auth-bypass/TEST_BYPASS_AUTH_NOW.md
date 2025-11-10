# Test Bypass Auth - Ready Now!

## The Solution

The `bypass-auth` edge function now **automatically creates auth users on-the-fly** during login!

You don't need to run the seed script anymore - the function will:
1. Find the user in `public.users` (they already exist from your original seed)
2. Check if they exist in `auth.users`
3. If not, create them in `auth.users` with the same UUID
4. Generate a magic link token
5. Return it to the app for session creation

## Test It Now

### Step 1: Restart Your App

```bash
npx expo start --clear
```

### Step 2: Try to Login

1. Open your app
2. Tap "Log in"
3. Enter email: `consumer2@bypass.com`
4. Tap "Send Code"
5. Enter OTP: `000000`
6. Tap "Verify"

### Step 3: Watch the Logs

You should see in the Edge Function logs:
```
[bypass-auth] Request for email: consumer2@bypass.com
[bypass-auth] Found user in public.users: abc-123-def
[bypass-auth] Auth user not found, creating it...
[bypass-auth] Created auth user: abc-123-def
[bypass-auth] Generated magic link successfully
```

And in your app logs:
```
[AuthService] Bypass account detected, using edge function authentication
[AuthService] Calling bypass-auth edge function
[AuthService] Edge function returned token, verifying with Supabase
[AuthService] Bypass account authenticated successfully!
[AuthService] Session user ID: abc-123-def-456
```

## What Changed

**Before:**
- ❌ Seed script fails with "Database error creating new user"
- ❌ Had to pre-create auth users
- ❌ Complex setup process

**After:**
- ✅ Auth users created automatically on first login
- ✅ Uses existing `public.users` accounts
- ✅ No seed script needed
- ✅ Just login and it works!

## How It Works

```
User logs in with consumer2@bypass.com
         ↓
App calls bypass-auth edge function
         ↓
Function checks public.users (✅ exists)
         ↓
Function checks auth.users (❌ doesn't exist)
         ↓
Function creates auth.users with same UUID (✅ created)
         ↓
Function generates magic link token
         ↓
App verifies token with Supabase
         ↓
Real session created! ✅
```

## Available Accounts

All these accounts exist in `public.users` and will have auth users created automatically on first login:

- consumer1@bypass.com
- consumer2@bypass.com
- consumer3@bypass.com
- creator1@bypass.com
- creator2@bypass.com
- business1@bypass.com
- business2@bypass.com
- multi_role@bypass.com

All use OTP: `000000`

## Troubleshooting

### Error: "Account not found in database"

**Cause:** User doesn't exist in `public.users`

**Fix:** Your original seed script already created these users. If they don't exist, run:
```bash
node scripts/seed-test-accounts.js
```

This will create profiles in `public.users` (ignore the auth user creation errors - they're not needed anymore!)

### Error: "Failed to create auth account"

**Cause:** Edge function couldn't create auth user

**Possible reasons:**
1. Email confirmations are strictly enforced in Supabase settings
2. Email provider is blocking bypass.com domain

**Fix:** Check Supabase Dashboard → Authentication → Settings:
- Enable "Confirm email" should be OFF or set to "optional"
- Or use a different email domain

### Check Edge Function Logs

1. Go to: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/functions
2. Click "bypass-auth"
3. Click "Logs" tab
4. See real-time logs of what's happening

## Try It Now!

Just restart your app and try logging in. The edge function will handle everything automatically!

```bash
npx expo start --clear
```

Then login with `consumer2@bypass.com` + OTP `000000`

It should work! 🎉
