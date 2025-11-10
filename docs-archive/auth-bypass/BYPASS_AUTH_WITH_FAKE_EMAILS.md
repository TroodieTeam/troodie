# Bypass Auth with Fake Emails - Complete Solution

## 🎯 The Challenge

**Problem:** Need to test with fake emails (@bypass.com) that can't receive real OTP codes.

**Solution:** Use **password authentication** instead of OTP for bypass accounts.

## ✅ How It Works

```
User enters: consumer2@bypass.com
         ↓
App shows OTP screen (user enters 000000)
         ↓
App detects @bypass.com and uses PASSWORD auth instead
         ↓
Authenticates with password: "BypassPassword123"
         ↓
Real Supabase session created ✅
         ↓
auth.uid() works, RLS works ✅
```

## 📋 Setup Steps (One-Time)

### Step 1: Disable Email Confirmation in Supabase

1. Go to: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/settings/auth

2. Find **"Email"** section

3. Set **"Confirm email"** to **DISABLED**

4. **Enable "Email provider"** if not already enabled

5. Click **Save**

**Why:** This allows creating auth users without sending confirmation emails.

---

### Step 2: Enable Password Authentication

1. Still in Settings → Auth

2. Find **"Auth Providers"** section

3. Ensure **"Email"** provider is enabled

4. Check that **"Enable email signup"** is ON

5. Click **Save**

---

### Step 3: Run SQL Script

1. Go to: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new

2. Copy and paste the **entire contents** of: `SETUP_BYPASS_WITH_PASSWORDS.sql`

3. Click **"Run"**

4. **Expected output:**
   ```
   ✓ Creating auth user: consumer1@bypass.com
   ✓ Creating auth user: consumer2@bypass.com
   ...
   ========================================
   SUMMARY
   ========================================
   Accounts created: 8
   Password for all accounts: BypassPassword123
   ```

5. If you see an error, check that email confirmation is disabled (Step 1)

---

### Step 4: Test Authentication

1. **Restart your app:**
   ```bash
   npx expo start --clear
   ```

2. **Login:**
   - Email: `consumer2@bypass.com`
   - OTP: `000000`

3. **Expected logs:**
   ```
   [AuthService] Bypass account detected - will use password auth
   [AuthService] Bypass account found - skipping OTP email
   [AuthService] Bypass account - using password auth instead of OTP
   [AuthService] Bypass account authenticated successfully!
   [AuthService] Session user ID: abc-123-def-456
   ```

4. **Verify features work:**
   - ✅ Save a restaurant
   - ✅ Create a board
   - ✅ Create a post
   - ✅ Create a community

---

## 🔧 How It Works Internally

### Authentication Flow:

**signInWithEmail (when user taps "Send Code"):**
```typescript
// Detects @bypass.com email
// Returns success WITHOUT sending email
// User sees OTP input screen
```

**verifyOtp (when user enters 000000):**
```typescript
// Detects @bypass.com + token "000000"
// Uses signInWithPassword instead of verifyOtp
// Password: "BypassPassword123"
// Creates real Supabase session
```

### Why This Works:

1. ✅ **No real emails needed** - Uses password auth
2. ✅ **Works with fake emails** - @bypass.com emails don't need to exist
3. ✅ **Real auth sessions** - Uses actual Supabase authentication
4. ✅ **RLS policies work** - auth.uid() returns correct user ID
5. ✅ **Works with Maestro** - Can be automated

---

## 📝 Available Test Accounts

All accounts use:
- **OTP Code:** `000000` (triggers password auth)
- **Password:** `BypassPassword123` (internal, not shown to user)

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

**Special:**
- multi_role@bypass.com

---

## 🎭 Maestro Testing

Works perfectly with automated tests:

```yaml
# .maestro/login-test.yaml
- tapOn: "Log in"
- inputText: "consumer2@bypass.com"
- tapOn: "Send Code"
- inputText: "0"  # OTP: 000000
- inputText: "0"
- inputText: "0"
- inputText: "0"
- inputText: "0"
- inputText: "0"
# Now authenticated with real session!
# All features work
```

---

## 🐛 Troubleshooting

### Error: "Password auth failed"

**Cause:** Auth users don't exist or password not set

**Fix:**
1. Run `SETUP_BYPASS_WITH_PASSWORDS.sql` again
2. Check Supabase Dashboard → Auth → Users to verify accounts exist
3. Verify email confirmation is DISABLED in settings

---

### Error: "Database error creating new user"

**Cause:** Email confirmation is still ENABLED

**Fix:**
1. Go to: Settings → Auth → Email
2. Set "Confirm email" to **DISABLED**
3. Save and run SQL script again

---

### Error: "Auth user may not exist"

**Cause:** SQL script didn't create auth users

**Fix:**
1. Check SQL script output for errors
2. Verify you have the correct permissions
3. Try creating one user manually in Dashboard → Auth → Users
   - Email: consumer2@bypass.com
   - Password: BypassPassword123
   - Auto-confirm: YES

---

### Users can login but features don't work

**Cause:** Profile doesn't exist in `public.users`

**Fix:**
```bash
node scripts/seed-test-accounts.js
```

This creates profiles in `public.users` (ignore auth.users errors - we handle that separately)

---

## 🔒 Security Notes

- ⚠️ Only use @bypass.com in development/testing
- ⚠️ Never deploy this pattern to production
- ⚠️ Password is hardcoded - only safe for test accounts
- ✅ RLS policies still protect data
- ✅ Each user can only access their own data

---

## 📊 Summary

| Aspect | Status |
|--------|--------|
| Works with fake emails | ✅ Yes |
| Real auth sessions | ✅ Yes |
| RLS policies work | ✅ Yes |
| Maestro compatible | ✅ Yes |
| Setup time | ⏱️ 5 minutes |
| Maintenance | ✅ One-time |

---

## 🚀 Ready to Test

After completing the setup steps above:

1. ✅ Email confirmation disabled
2. ✅ SQL script run successfully
3. ✅ Auth users created with passwords
4. ✅ App code updated to use password auth

**Just restart your app and test!**

```bash
npx expo start --clear
```

Login with `consumer2@bypass.com` + OTP `000000` → Should work! 🎉
