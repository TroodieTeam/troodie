# Admin Account Setup Guide

**Date:** December 17, 2025  
**Purpose:** Complete guide for creating admin accounts with bypass OTP authentication  
**Status:** Ready for Setup

---

## Overview

This guide walks you through creating a new admin account (`team@troodieapp.com`) that:
- ✅ Uses bypass OTP authentication (code: `000000`)
- ✅ Has admin privileges (can approve restaurant claims, creator applications)
- ✅ Follows the same pattern as test accounts but with admin access

---

## Quick Reference

| Email | OTP | Password | Account Type | Admin Access |
|-------|-----|----------|--------------|--------------|
| `team@troodieapp.com` | `000000` | `BypassPassword123` | `business` | ✅ Yes |

**Bypass Domain:** `@troodieapp.com` is already configured as a bypass domain in `authService.ts`

---

## Step-by-Step Setup

### Step 1: Create Auth User in Supabase Dashboard

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **"Add user"** button
3. Fill in:
   - **Email:** `team@troodieapp.com`
   - **Password:** `BypassPassword123`
   - **Auto Confirm User:** ✅ Check this (sets `email_confirm: true`)
4. In **App Metadata**, add:
   ```json
   {
     "provider": "email",
     "providers": ["email"]
   }
   ```
5. In **User Metadata**, add:
   ```json
   {
     "name": "Troodie Team Admin",
     "account_type": "business"
   }
   ```
6. Click **"Create user"**
7. **Copy the generated UUID** - you'll need this for the next steps

---

### Step 2: Create Public User Record

Run this SQL in Supabase SQL Editor (replace `CREATED_UUID` with the UUID from Step 1):

```sql
-- Create public.users record for admin account
-- Replace CREATED_UUID with the actual UUID from Supabase Dashboard

INSERT INTO public.users (
  id,
  email,
  name,
  account_type,
  role,
  is_restaurant,
  is_verified,
  created_at,
  updated_at
)
VALUES (
  '5373475d-b6b5-4abd-bd47-8ec515c44a47'::uuid,  -- Replace with actual UUID from Step 1
  'team@troodieapp.com',
  'Troodie Team Admin',
  'business',
  'user',  -- Note: Admin access is via UUID, not role field
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  account_type = EXCLUDED.account_type,
  is_verified = true,
  updated_at = NOW();
```

---

### Step 3: Add Admin UUID to Code

**⚠️ IMPORTANT:** Admin access is controlled by hardcoded UUIDs in `services/adminReviewService.ts`

1. **Open:** `services/adminReviewService.ts`
2. **Find:** The `ADMIN_USER_IDS` array (around line 36-39)
3. **Add** your new admin UUID:

```typescript
private readonly ADMIN_USER_IDS = [
  'b08d9600-358d-4be9-9552-4607d9f50227',  // Admin 1 (taydav37@gmail.com)
  '31744191-f7c0-44a4-8673-10b34ccbb87f',  // Admin 2 (kouamendri@outlook.com)
  '5373475d-b6b5-4abd-bd47-8ec515c44a47'                // Admin 3 (team@troodieapp.com)
];
```

4. **Save** the file
5. **Restart** your development server if running

---

### Step 4: Verify Setup

**Test Login:**
1. Open the app
2. Enter email: `team@troodieapp.com`
3. Enter OTP: `000000` (six zeros)
4. Should log in successfully ✅

**Verify Admin Access:**
```sql
-- Check admin account exists
SELECT 
  u.id,
  u.email,
  u.name,
  u.account_type,
  u.role,
  u.is_verified,
  CASE 
    WHEN u.id = 'b08d9600-358d-4be9-9552-4607d9f50227' THEN 'Admin 1'
    WHEN u.id = '31744191-f7c0-44a4-8673-10b34ccbb87f' THEN 'Admin 2'
    WHEN u.id = '5373475d-b6b5-4abd-bd47-8ec515c44a47' THEN 'Admin 3 (Team)'
    ELSE 'Not Admin'
  END as admin_label
FROM users u
WHERE u.email = 'team@troodieapp.com';
```

**Expected Result:**
- ✅ Account exists
- ✅ `account_type = 'business'`
- ✅ `is_verified = true`
- ✅ Admin label shows "Admin 3 (Team)"

---

## Complete Setup Script

For convenience, here's a complete SQL script that does Steps 1-2 (you still need to add UUID to code manually):

```sql
-- ============================================================================
-- Admin Account Setup: team@troodieapp.com
-- ============================================================================
-- Run this AFTER creating the auth user in Supabase Dashboard
-- Replace CREATED_UUID with the actual UUID from auth.users
-- ============================================================================

DO $$
DECLARE
  v_admin_uuid UUID := 'CREATED_UUID'::uuid;  -- ⚠️ REPLACE WITH ACTUAL UUID
BEGIN
  -- Create public.users record
  INSERT INTO public.users (
    id,
    email,
    name,
    account_type,
    role,
    is_restaurant,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    v_admin_uuid,
    'team@troodieapp.com',
    'Troodie Team Admin',
    'business',
    'user',
    false,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    account_type = EXCLUDED.account_type,
    is_verified = true,
    updated_at = NOW();

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Admin Account Created';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email: team@troodieapp.com';
  RAISE NOTICE 'UUID: %', v_admin_uuid;
  RAISE NOTICE 'OTP Code: 000000';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEP: Add UUID to adminReviewService.ts';
  RAISE NOTICE '   File: services/adminReviewService.ts';
  RAISE NOTICE '   Add this UUID to ADMIN_USER_IDS array:';
  RAISE NOTICE '   %', v_admin_uuid;
  RAISE NOTICE '';

END $$;

-- Verification query
SELECT 
  u.id,
  u.email,
  u.name,
  u.account_type,
  u.is_verified,
  '✅ Ready for admin access' as status
FROM users u
WHERE u.email = 'team@troodieapp.com';
```

---

## Current Admin Accounts

| UUID | Email | Admin Label | Status |
|------|-------|-------------|--------|
| `b08d9600-358d-4be9-9552-4607d9f50227` | `taydav37@gmail.com` | Admin 1 | ✅ Active |
| `31744191-f7c0-44a4-8673-10b34ccbb87f` | `kouamendri@outlook.com` | Admin 2 | ✅ Active |
| `[NEW_UUID]` | `team@troodieapp.com` | Admin 3 (Team) | ⏳ To be created |

---

## How Bypass OTP Works

### Authentication Flow

1. **User enters email:** `team@troodieapp.com`
2. **App detects bypass domain:** `@troodieapp.com` is in bypass list
3. **User enters OTP:** `000000` (six zeros)
4. **App bypasses OTP:** Uses password auth instead (`BypassPassword123`)
5. **Creates real Supabase session** ✅

### Why This Works

- `@troodieapp.com` is configured as a bypass domain in `authService.ts`
- When OTP code `000000` is entered, app uses password authentication
- Password `BypassPassword123` is stored in `auth.users.encrypted_password`
- Creates a real authenticated session (not a mock)

---

## Admin Capabilities

Once set up, the admin account can:

### Restaurant Claims
- ✅ View all pending restaurant claims
- ✅ Approve/reject restaurant claims
- ✅ Trigger account upgrades (consumer → business)
- ✅ Review claim verification documents

### Creator Applications
- ✅ View all pending creator applications
- ✅ Approve/reject creator applications
- ✅ Review application details

### Admin Tools Access
- ✅ Access "Admin Tools" section in More tab
- ✅ View admin review queue
- ✅ Manage pending reviews

---

## Troubleshooting

### "Not authenticated" Error

**Cause:** Auth user not created or UUID mismatch

**Fix:**
```sql
-- Verify auth user exists
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'team@troodieapp.com';

-- Verify public.users UUID matches
SELECT id, email
FROM public.users
WHERE email = 'team@troodieapp.com';
```

### "Admin access required" Error

**Cause:** UUID not added to `adminReviewService.ts`

**Fix:**
1. Check UUID is in `ADMIN_USER_IDS` array
2. Restart development server
3. Verify UUID matches exactly (case-sensitive)

### OTP Code Not Working

**Cause:** Bypass domain not recognized or password mismatch

**Fix:**
```sql
-- Verify password is set correctly
SELECT 
  email,
  email_confirmed_at,
  encrypted_password IS NOT NULL as has_password
FROM auth.users
WHERE email = 'team@troodieapp.com';
-- Should show: email_confirmed_at NOT NULL, has_password = true
```

### Account Not Found

**Cause:** Public user record not created

**Fix:**
```sql
-- Create public.users record
INSERT INTO public.users (id, email, name, account_type, is_verified)
SELECT 
  au.id,
  au.email,
  'Troodie Team Admin',
  'business',
  true
FROM auth.users au
WHERE au.email = 'team@troodieapp.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  account_type = 'business',
  is_verified = true;
```

---

## Verification Checklist

After setup, verify:

- [ ] Auth user created in Supabase Dashboard
- [ ] Password set to `BypassPassword123`
- [ ] Auto Confirm checked (email_confirmed_at set)
- [ ] App Metadata includes `providers: ["email"]`
- [ ] Public user record created with matching UUID
- [ ] UUID added to `adminReviewService.ts` ADMIN_USER_IDS array
- [ ] Can log in with email + OTP `000000`
- [ ] Admin Tools visible in More tab
- [ ] Can access admin review queue

---

## Related Files

| File | Purpose |
|------|---------|
| `services/adminReviewService.ts` | Admin access control (UUID list) |
| `services/authService.ts` | Bypass domain configuration |
| `docs/TEST_USERS_SETUP.md` | Reference for test account pattern |
| `data/test-data/prod/01-production-test-users-setup.sql` | Example SQL setup |

---

## Quick Setup Command Reference

```sql
-- 1. After creating auth user, get UUID:
SELECT id, email FROM auth.users WHERE email = 'team@troodieapp.com';

-- 2. Create public.users (replace UUID):
INSERT INTO public.users (id, email, name, account_type, is_verified)
VALUES ('YOUR_UUID', 'team@troodieapp.com', 'Troodie Team Admin', 'business', true);

-- 3. Verify:
SELECT id, email, account_type, is_verified FROM users WHERE email = 'team@troodieapp.com';
```

---

**Last Updated:** December 17, 2025  
**Created By:** Troodie Development Team
