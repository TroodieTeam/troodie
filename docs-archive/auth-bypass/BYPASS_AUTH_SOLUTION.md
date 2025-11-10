# Bypass Account Authentication - Complete Solution

## Overview

This document explains how @bypass.com test accounts authenticate with **real Supabase sessions** (not mock sessions) while using magic link (OTP-only) authentication.

## The Problem

Your Supabase project uses **magic link authentication** (email OTP only, no passwords). The previous approach tried to use `signInWithPassword()`, which doesn't work because:

1. ❌ Password authentication is not enabled in your Supabase project
2. ❌ Bypass accounts only existed in `public.users`, not in `auth.users`
3. ❌ Mock sessions had `auth.uid()` = null, breaking RLS policies

## The Solution

We use a **3-part solution**:

1. **Seed Script** - Creates real auth users using Supabase Admin API
2. **Edge Function** - Generates magic link tokens for bypass accounts
3. **Auth Service** - Verifies tokens to create real Supabase sessions

### Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (authService)  │
└────────┬────────┘
         │ 1. Login with consumer2@bypass.com + OTP 000000
         ▼
┌─────────────────────────────────────┐
│  Supabase Edge Function             │
│  /functions/bypass-auth             │
│                                     │
│  1. Validates @bypass.com email     │
│  2. Checks OTP = 000000             │
│  3. Finds user in auth.users        │
│  4. Generates magic link token      │
│     using admin.generateLink()      │
└────────┬────────────────────────────┘
         │ 2. Returns token
         ▼
┌─────────────────┐
│  Auth Service   │
│                 │
│  1. Receives    │
│     token       │
│  2. Calls       │
│     verifyOtp   │
│     with token  │
└────────┬────────┘
         │ 3. Real Supabase session created
         ▼
┌─────────────────┐
│  Authenticated  │
│  User Session   │
│  ✅ auth.uid()  │
│  ✅ RLS works   │
└─────────────────┘
```

## Setup Instructions

### Step 1: Add Service Role Key to Environment

1. Go to Supabase Dashboard → Settings → API
2. Copy the `service_role` secret key (NOT the anon key)
3. Add it to your `.env.development`:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 2: Run the Seed Script

This will create bypass accounts in **both** `auth.users` and `public.users`:

```bash
node scripts/seed-test-accounts.js
```

**Expected Output:**
```
📝 Creating test users...

Creating auth user: consumer2@bypass.com
✅ Created auth user: consumer2@bypass.com (ID: abc-123-def)
✅ Created consumer profile: consumer2@bypass.com

Creating auth user: creator1@bypass.com
✅ Created auth user: creator1@bypass.com (ID: xyz-456-uvw)
✅ Created creator profile: creator1@bypass.com

...
```

### Step 3: Deploy the Edge Function

Deploy the `bypass-auth` edge function to Supabase:

```bash
npx supabase functions deploy bypass-auth
```

### Step 4: Test Authentication

1. Restart your app:
   ```bash
   npx expo start --clear
   ```

2. Login with:
   - Email: `consumer2@bypass.com`
   - OTP: `000000`

3. Check logs for:
   ```
   [AuthService] Bypass account detected, using edge function authentication
   [AuthService] Calling bypass-auth edge function
   [AuthService] Edge function returned token, verifying with Supabase
   [AuthService] Bypass account authenticated successfully!
   [AuthService] Session user ID: abc-123-def-456
   ```

## How It Works

### 1. Seed Script (`scripts/seed-test-accounts.js`)

**Uses:** Supabase Admin API with service role key

```javascript
// Creates auth user
const { data: authData } = await supabaseAdmin.auth.admin.createUser({
  email: 'consumer2@bypass.com',
  email_confirm: true, // Auto-confirm email
  user_metadata: {
    name: 'Test Consumer Two',
    username: 'test_consumer_2'
  }
})

// Creates profile in public.users
await supabase.from('users').insert({
  id: authData.user.id, // Same UUID!
  email: 'consumer2@bypass.com',
  name: 'Test Consumer Two',
  // ...
})
```

**Result:** Account exists in both `auth.users` and `public.users` with matching UUIDs

### 2. Edge Function (`supabase/functions/bypass-auth/index.ts`)

**Runs on:** Supabase server with service role permissions

```typescript
// Validates bypass account
if (!email.endsWith('@bypass.com') || token !== '000000') {
  return error
}

// Finds user in auth.users
const authUser = users.find(u => u.email === email)

// Generates magic link token using Admin API
const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: email,
})

// Extracts and returns the token
return { success: true, token: linkData.token }
```

**Result:** Returns a valid magic link token that can be used to create a session

### 3. Auth Service (`services/authService.ts`)

**Runs on:** Client app (React Native)

```typescript
// Calls edge function
const { data: bypassData } = await supabase.functions.invoke('bypass-auth', {
  body: { email, token: '000000' }
})

// Uses the token to create a real session
const { data: sessionData } = await supabase.auth.verifyOtp({
  email: email,
  token: bypassData.token,
  type: 'magiclink',
})

// Returns real Supabase session
return { success: true, session: sessionData.session }
```

**Result:** Real authenticated session with working `auth.uid()` and RLS policies

## Why This Works

### ✅ Magic Link Compatible
- Uses Supabase's `generateLink()` API designed for email-based auth
- No password required
- Works with your existing OTP-only configuration

### ✅ Real Auth Sessions
- Creates actual Supabase sessions via `verifyOtp()`
- `auth.uid()` returns the correct user ID
- RLS policies work perfectly

### ✅ Secure
- Edge function validates @bypass.com emails
- Service role key never exposed to client
- Only works for test accounts

### ✅ Fast
- Fixed OTP code (000000) - no email delay
- Direct token generation - no SMS/email costs
- Perfect for Maestro automated testing

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
- review@troodieapp.com (App Store review account)

## Troubleshooting

### Error: "Edge function error"

**Cause:** Edge function not deployed or not accessible

**Fix:**
```bash
npx supabase functions deploy bypass-auth
```

### Error: "Account not found. Please run the seed script..."

**Cause:** Auth user doesn't exist in `auth.users`

**Fix:**
```bash
# Make sure SUPABASE_SERVICE_ROLE_KEY is in .env.development
node scripts/seed-test-accounts.js
```

### Error: "Failed to create session with bypass token"

**Cause:** Token expired or invalid

**Fix:**
- Restart your app
- Try logging in again
- Check edge function logs in Supabase Dashboard

### Warning: "Using anon key instead of service role key"

**Cause:** Seed script can't find service role key

**Fix:**
1. Get service role key from Supabase Dashboard → Settings → API
2. Add to `.env.development`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Testing with Maestro

The bypass accounts work perfectly with Maestro:

```yaml
# .maestro/01-auth-and-save-restaurant.yaml
- tapOn: "Log in"
- inputText: "consumer2@bypass.com"
- tapOn: "Send Code"
- inputText: "0"  # OTP code: 000000
- inputText: "0"
- inputText: "0"
- inputText: "0"
- inputText: "0"
- inputText: "0"
- waitForAnimationToEnd
# Now authenticated with real session!
- tapOn: "Explore"
- tapOn: "Save" # Works because RLS policies work!
```

## Comparison: Before vs After

### Before (BROKEN)

```
User logs in
  ↓
Create MOCK session (client-side)
  ↓
auth.uid() = null ❌
  ↓
RLS policies fail ❌
  ↓
Can't save restaurants ❌
Can't create boards ❌
Can't create posts ❌
```

### After (WORKING)

```
User logs in with 000000
  ↓
Call bypass-auth edge function
  ↓
Generate magic link token (server-side)
  ↓
Verify token with Supabase
  ↓
Create REAL session ✅
  ↓
auth.uid() = user.id ✅
  ↓
RLS policies work ✅
  ↓
Can save restaurants ✅
Can create boards ✅
Can create posts ✅
Can create communities ✅
```

## Security Notes

- ⚠️ **Never use @bypass.com pattern in production**
- ⚠️ Edge function only accepts @bypass.com emails
- ⚠️ Service role key must be kept secret (never commit to git)
- ✅ Real authentication ensures audit trails are accurate
- ✅ RLS policies protect data - each user can only access their own data

## Summary

This solution provides:

1. ✅ Real Supabase authentication (not mock)
2. ✅ Works with magic link (OTP-only) auth
3. ✅ Proper `auth.uid()` for RLS policies
4. ✅ All features work (save, boards, posts, communities)
5. ✅ Fast login with fixed OTP (000000)
6. ✅ Perfect for Maestro automated testing
7. ✅ Maintains data isolation through RLS

**No SQL scripts needed.** Just run the seed script once with the service role key, deploy the edge function, and you're done!
