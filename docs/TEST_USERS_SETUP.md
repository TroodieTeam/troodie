# Test Users Setup Guide

This document lists all test users that need to be created manually in Supabase Admin Dashboard, along with their passwords and metadata settings.

## Current Status

✅ **10 users created** (ready for seed data):
- 5 Consumers
- 3 Creators  
- 2 Businesses

⏳ **10 users remaining** (optional - can add later):
- 5 Consumers (test-consumer6 through test-consumer10)
- 4 Creators (test-creator4 through test-creator7)
- 1 Business (test-business3)

## Overview

- **Total Users:** 20 test accounts
- **Created So Far:** 10 users (5 Consumers, 3 Creators, 2 Businesses) ✅
- **Remaining:** 5 Consumers, 4 Creators, 1 Business
- **Password for ALL accounts:** `BypassPassword123`
- **OTP Code in app:** `000000` (triggers password auth)
- **Account Types:** 10 Consumers, 7 Creators, 3 Businesses
- **Email Domain:** `@bypass.com` (all test accounts use this domain)
- **AuthService Support:** ✅ `@bypass.com` is already configured in `authService.ts` - no changes needed!

## Quick Query: Get All Created UUIDs

Run this in Supabase SQL Editor to get all test user UUIDs:

```sql
-- Get all test user UUIDs
SELECT 
  au.id as uuid,
  au.email,
  COALESCE(pu.account_type, 'unknown') as account_type
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE 'test-%@bypass.com'
ORDER BY 
  CASE 
    WHEN pu.account_type = 'consumer' THEN 1
    WHEN pu.account_type = 'creator' THEN 2
    WHEN pu.account_type = 'business' THEN 3
    ELSE 4
  END,
  au.email;
```

Or see the full query in: `scripts/get-test-user-uuids.sql`

## Setup Instructions

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **"Add user"** button
3. For each user below:
   - Set **Email**
   - Set **Password** to `BypassPassword123`
   - Check **"Auto Confirm User"** (this sets `email_confirm: true`)
   - In **App Metadata**, add:
     ```json
     {
       "provider": "email",
       "providers": ["email"]
     }
     ```
   - In **User Metadata**, add the account-specific metadata shown below
4. Copy the **generated UUID** from the created user
5. Fill in the UUID in the table below
6. Update `public.users` table with the same UUID (see SQL section at bottom)

---

## Consumers (10 users)

| # | Email | Name | Expected UUID | Created UUID | Password | Account Type |
|---|-------|------|---------------|--------------|----------|--------------|
| 1 | `test-consumer1@bypass.com` | Test Consumer 1 | `a1b2c3d4-e5f6-4789-a012-345678901234` | `273eb12a-09c8-47f9-894b-58c4861fa651` ✅ | `BypassPassword123` | consumer |
| 2 | `test-consumer2@bypass.com` | Test Consumer 2 | `b2c3d4e5-f6a7-4890-b123-456789012345` | `5ed86604-5b63-47aa-9d30-2ea0b0c3a6c2` ✅ | `BypassPassword123` | consumer |
| 3 | `test-consumer3@bypass.com` | Test Consumer 3 | `c3d4e5f6-a7b8-4901-c234-567890123456` | `6c1eeeb9-4be4-4129-bfca-19b4a163a45e` ✅ | `BypassPassword123` | consumer |
| 4 | `test-consumer4@bypass.com` | Test Consumer 4 | `d4e5f6a7-b8c9-4012-d345-678901234567` | `87464291-d9b2-4935-b29f-416328bdd43e` ✅ | `BypassPassword123` | consumer |
| 5 | `test-consumer5@bypass.com` | Test Consumer 5 | `e5f6a7b8-c9d0-4123-e456-789012345678` | `ec03ddc6-c3f2-4c82-9d4d-620928284bca` ✅ | `BypassPassword123` | consumer |
| 6 | `test-consumer6@bypass.com` | Test Consumer 6 | `f6a7b8c9-d0e1-4234-f567-890123456789` | `________-____-____-____-____________` | `BypassPassword123` | consumer |
| 7 | `test-consumer7@bypass.com` | Test Consumer 7 | `a7b8c9d0-e1f2-4345-a678-901234567890` | `________-____-____-____-____________` | `BypassPassword123` | consumer |
| 8 | `test-consumer8@bypass.com` | Test Consumer 8 | `b8c9d0e1-f2a3-4456-b789-012345678901` | `________-____-____-____-____________` | `BypassPassword123` | consumer |
| 9 | `test-consumer9@bypass.com` | Test Consumer 9 | `c9d0e1f2-a3b4-4567-c890-123456789012` | `________-____-____-____-____________` | `BypassPassword123` | consumer |
| 10 | `test-consumer10@bypass.com` | Test Consumer 10 | `d0e1f2a3-b4c5-4678-d901-234567890123` | `________-____-____-____-____________` | `BypassPassword123` | consumer |

**User Metadata for all Consumers:**
```json
{
  "name": "Test Consumer [1-10]",
  "account_type": "consumer"
}
```

---

## Creators (7 users)

| # | Email | Name | Expected UUID | Created UUID | Password | Account Type |
|---|-------|------|---------------|--------------|----------|--------------|
| 1 | `test-creator1@bypass.com` | Test Creator 1 | `e1f2a3b4-c5d6-4789-e012-345678901234` | `4a797077-116e-4a3a-bc43-a71ae18963d8` ✅ | `BypassPassword123` | creator |
| 2 | `test-creator2@bypass.com` | Test Creator 2 | `f2a3b4c5-d6e7-4890-f123-456789012345` | `381d705b-d5d1-4e44-85fc-b772d68921ba` ✅ | `BypassPassword123` | creator |
| 3 | `test-creator3@bypass.com` | Test Creator 3 | `a3b4c5d6-e7f8-4901-a234-567890123456` | `e50f6c6f-9487-4ff2-acd0-3542fdd46dd1` ✅ | `BypassPassword123` | creator |
| 4 | `test-creator4@bypass.com` | Test Creator 4 | `b4c5d6e7-f8a9-4012-b345-678901234567` | `________-____-____-____-____________` | `BypassPassword123` | creator |
| 5 | `test-creator5@bypass.com` | Test Creator 5 | `c5d6e7f8-a9b0-4123-c456-789012345678` | `________-____-____-____-____________` | `BypassPassword123` | creator |
| 6 | `test-creator6@bypass.com` | Test Creator 6 | `d6e7f8a9-b0c1-4234-d567-890123456789` | `________-____-____-____-____________` | `BypassPassword123` | creator |
| 7 | `test-creator7@bypass.com` | Test Creator 7 | `e7f8a9b0-c1d2-4345-e678-901234567890` | `________-____-____-____-____________` | `BypassPassword123` | creator |

**User Metadata for all Creators:**
```json
{
  "name": "Test Creator [1-7]",
  "account_type": "creator"
}
```

---

## Businesses (3 users)

| # | Email | Name | Expected UUID | Created UUID | Password | Account Type |
|---|-------|------|---------------|--------------|----------|--------------|
| 1 | `test-business1@bypass.com` | Test Business 1 (New) | `f8a9b0c1-d2e3-4456-f789-012345678901` | `8e7df4ee-e180-427b-ad8d-e6ffcf41a03a` ✅ | `BypassPassword123` | business |
| 2 | `test-business2@bypass.com` | Test Business 2 (Medium) | `a9b0c1d2-e3f4-4567-a890-123456789012` | `f456d1ea-96f0-4245-b420-4db4e6456def` ✅ | `BypassPassword123` | business |
| 3 | `test-business3@bypass.com` | Test Business 3 (High) | `b0c1d2e3-f4a5-4678-b901-234567890123` | `________-____-____-____-____________` | `BypassPassword123` | business |

**User Metadata for Businesses:**
```json
{
  "name": "Test Business 1 (New)" / "Test Business 2 (Medium)" / "Test Business 3 (High)",
  "account_type": "business"
}
```

---

## Important Settings

For **each user**, you **MUST** set:

### App Metadata
```json
{
  "provider": "email",
  "providers": ["email"]
}
```

**Why:** This enables password authentication. Without this, the root-level `providers` field will be empty and password auth won't work.

### User Metadata
Set the appropriate metadata based on account type (see tables above).

### Password
- Set to: `BypassPassword123` for all accounts

### Auto Confirm
- **Check "Auto Confirm User"** - This sets `email_confirm: true` so users can sign in immediately

---

## After Creating Users

### Step 1: Update public.users Table

After creating all users in auth, you need to update the `public.users` table to use the **actual UUIDs** from auth (not the expected ones).

Run this SQL in Supabase SQL Editor (replace `CREATED_UUID` with the actual UUID from Dashboard):

```sql
-- Update public.users to match auth UUIDs
-- Replace CREATED_UUID with the actual UUID from Supabase Dashboard

UPDATE public.users
SET id = 'CREATED_UUID'
WHERE email = 'test-consumer1@bypass.com';
```

Repeat for each user with their created UUID.

### Step 2: Verify Authentication

Test login with:
- **Email:** `test-consumer1@bypass.com`
- **OTP:** `000000` (will use password auth)

You should be able to sign in successfully!

---

## Quick Reference

**All accounts use:**
- Password: `BypassPassword123`
- OTP in app: `000000`
- Email domain: `@bypass.com`

**Authentication Flow:**
1. User enters email
2. User enters OTP: `000000`
3. App detects bypass account and uses password auth instead
4. Authenticates with password `BypassPassword123`
5. Creates real Supabase session ✅

---

## UUID Mapping Reference

Quick reference for created users:

### Created Users (10 total)

**Consumers:**
- test-consumer1: `273eb12a-09c8-47f9-894b-58c4861fa651`
- test-consumer2: `5ed86604-5b63-47aa-9d30-2ea0b0c3a6c2`
- test-consumer3: `6c1eeeb9-4be4-4129-bfca-19b4a163a45e`
- test-consumer4: `87464291-d9b2-4935-b29f-416328bdd43e`
- test-consumer5: `ec03ddc6-c3f2-4c82-9d4d-620928284bca`

**Creators:**
- test-creator1: `4a797077-116e-4a3a-bc43-a71ae18963d8`
- test-creator2: `381d705b-d5d1-4e44-85fc-b772d68921ba`
- test-creator3: `e50f6c6f-9487-4ff2-acd0-3542fdd46dd1`

**Businesses:**
- test-business1: `8e7df4ee-e180-427b-ad8d-e6ffcf41a03a`
- test-business2: `f456d1ea-96f0-4245-b420-4db4e6456def`

For the full query to get all UUIDs, see `scripts/get-test-user-uuids.sql`

## Notes

- The "Expected UUID" column shows UUIDs from the SQL file, but Supabase Admin API will generate new UUIDs
- You **must** update `public.users.id` to match the **created UUID** from auth
- Make sure to set **App Metadata** with `providers: ["email"]` - this is critical for password auth to work
- All seed files have been updated with the 10 created user UUIDs

