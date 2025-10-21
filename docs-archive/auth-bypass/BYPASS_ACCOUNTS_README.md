# Bypass Accounts - Quick Start

This folder contains scripts and documentation for setting up @bypass.com test accounts with real Supabase authentication.

## 🚀 Quick Fix - Start Here

If your bypass accounts are not working (getting "Invalid login credentials"), follow these steps:

### 1. Run the Fix Script

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new
2. Copy and paste the **entire contents** of: `CREATE_AND_FIX_BYPASS_ACCOUNTS.sql`
3. Click **Run**
4. Verify you see output showing accounts were created/updated

### 2. Restart Your App

```bash
# Stop current Expo server (Ctrl+C)
npx expo start --clear
```

### 3. Test Login

- Email: `consumer2@bypass.com`
- OTP Code: `000000`

You should see successful authentication and be able to save restaurants, create boards, etc.

## 📁 Files Overview

### SQL Scripts (Use This Order)

1. **`CREATE_AND_FIX_BYPASS_ACCOUNTS.sql`** ⭐ **START HERE**
   - Most comprehensive solution
   - Creates missing accounts in `auth.users`
   - Sets passwords for all bypass accounts
   - Confirms emails
   - Use this if you're getting "Invalid login credentials"

2. **`CHECK_BYPASS_ACCOUNTS_STATUS.sql`** (Diagnostic Only)
   - Use this to check current state of accounts
   - Helps troubleshoot issues
   - Doesn't modify anything

3. **`VERIFY_AND_FIX_BYPASS_ACCOUNTS.sql`** (Older Version)
   - Only updates existing accounts
   - Use `CREATE_AND_FIX_BYPASS_ACCOUNTS.sql` instead

4. **`SET_BYPASS_PASSWORDS.sql`** (Deprecated)
   - Old version with bugs
   - Don't use this

### Documentation

- **`BYPASS_ACCOUNTS_SETUP_GUIDE.md`** - Complete setup guide with troubleshooting
- **`BYPASS_ACCOUNTS_README.md`** - This file (quick reference)

### Code Files

- **`services/authService.ts`** - Authentication service with bypass account logic

## ✅ Expected Behavior After Fix

Once you run `CREATE_AND_FIX_BYPASS_ACCOUNTS.sql`, bypass accounts will:

1. ✅ Use real Supabase authentication (not mock sessions)
2. ✅ Have working `auth.uid()` for RLS policies
3. ✅ Be able to save restaurants
4. ✅ Be able to create boards
5. ✅ Be able to create posts
6. ✅ Be able to create communities
7. ✅ Work with Maestro automated testing

## 🔍 How to Verify It Worked

After running the SQL script, you should see output like:

```sql
STEP 3: Creating missing accounts and setting passwords
Creating auth account for: consumer2@bypass.com (ID: abc-123-def)
Creating auth account for: creator1@bypass.com (ID: xyz-456-uvw)
...
=== SUMMARY ===
Accounts created in auth.users: 8
Accounts updated in auth.users: 0
Total processed: 8
```

Then in Step 4, you should see all accounts with `has_password = true`:

```
email                      | email_confirmed | has_password | password_hash_length
---------------------------+-----------------+--------------+---------------------
consumer2@bypass.com       | true            | true         | 60
creator1@bypass.com        | true            | true         | 60
```

## ⚠️ Common Issues

### "Invalid login credentials"
**Solution:** Run `CREATE_AND_FIX_BYPASS_ACCOUNTS.sql` - accounts don't exist in auth.users

### "Test account not found"
**Solution:** Account doesn't exist in `public.users` - you need to seed test accounts first

### Script runs but nothing happens
**Solution:** Check that accounts exist in `public.users` table first

## 🔐 Technical Details

- **Password:** `BypassTestPassword000000` (hardcoded for all @bypass.com accounts)
- **OTP Code:** `000000` (fixed code to bypass OTP verification)
- **Authentication Method:** `signInWithPassword()` instead of `verifyOtp()`
- **Why:** Mock sessions don't work with RLS policies because `auth.uid()` returns null

## 📞 Need Help?

See `BYPASS_ACCOUNTS_SETUP_GUIDE.md` for detailed troubleshooting and setup instructions.
