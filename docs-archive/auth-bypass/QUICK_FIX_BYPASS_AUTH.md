# Quick Fix - Bypass Auth 404 Error

## Issue
The edge function returns 404 because it was just deployed. The function is now ACTIVE and ready to use.

## Solution

### Step 1: Run the Seed Script First

Before testing authentication, you need to create the auth users:

```bash
# Make sure you have the service role key in .env.development
node scripts/seed-test-accounts.js
```

**Expected output:**
```
📝 Creating test users...

Creating auth user: consumer2@bypass.com
✅ Created auth user: consumer2@bypass.com (ID: abc-123-def)
✅ Created consumer profile: consumer2@bypass.com
```

If you see a warning about "Using anon key instead of service role key", you need to add the service role key:

1. Go to: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/settings/api
2. Copy the `service_role` secret key (NOT the anon key - it's much longer)
3. Add to `.env.development`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdWx0c3JpcXVubnh1anFpd2VhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY4MTkzMywiZXhwIjoyMDcyMjU3OTMzfQ...
   ```
4. Run the seed script again

### Step 2: Restart Your App

```bash
# Stop current Expo server (Ctrl+C)
npx expo start --clear
```

### Step 3: Test Login

1. Open your app
2. Tap "Log in"
3. Enter email: `consumer2@bypass.com`
4. Tap "Send Code"
5. Enter OTP: `000000` (six zeros)
6. Tap "Verify"

### Step 4: Check Logs

You should see:
```
[AuthService] Bypass account detected, using edge function authentication
[AuthService] Calling bypass-auth edge function
[AuthService] Edge function returned token, verifying with Supabase
[AuthService] Bypass account authenticated successfully!
[AuthService] Session user ID: <actual-uuid>
```

## Troubleshooting

### Error: "Account not found. Please run the seed script..."

**Cause:** The user doesn't exist in `auth.users` table

**Fix:**
```bash
node scripts/seed-test-accounts.js
```

Make sure you see "✅ Created auth user: consumer2@bypass.com"

### Error: "Bypass authentication failed. Ensure edge function is deployed."

**Cause:** Edge function call failed

**Fix:**
```bash
# Redeploy the function
npx supabase functions deploy bypass-auth --project-ref tcultsriqunnxujqiwea
```

### Error: "Failed to create session with bypass token"

**Cause:** Token verification failed

**Possible causes:**
1. Auth user doesn't exist - run seed script
2. Email mismatch between auth.users and public.users
3. Token expired (shouldn't happen with generated tokens)

**Fix:**
```bash
# Recreate auth users
node scripts/seed-test-accounts.js
# Restart app
npx expo start --clear
```

### Check Function Status

```bash
npx supabase functions list --project-ref tcultsriqunnxujqiwea
```

You should see:
```
bypass-auth  | bypass-auth  | ACTIVE | 1 | 2025-10-12 05:46:49
```

### View Function Logs

Go to: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/functions

Click on `bypass-auth` → "Logs" tab to see real-time logs

## Environment Variables Check

The edge function automatically has access to:
- `SUPABASE_URL` - Set automatically by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Set automatically by Supabase

You don't need to configure these - they're provided by the platform.

## Quick Test

Try this in your browser console or Postman:

```bash
curl -X POST \
  "https://tcultsriqunnxujqiwea.supabase.co/functions/v1/bypass-auth" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"consumer2@bypass.com","token":"000000"}'
```

Replace `YOUR_ANON_KEY` with your anon key from `.env.development`

**Expected response:**
```json
{
  "success": true,
  "token": "pkce_1234567890abcdef...",
  "user_id": "abc-123-def-456",
  "email": "consumer2@bypass.com",
  "message": "Bypass auth token generated successfully"
}
```

## Summary

The 404 error was because the function wasn't deployed yet. Now that it's deployed:

1. ✅ Function is ACTIVE (confirmed)
2. ⏳ Need to run seed script to create auth users
3. ⏳ Need to test authentication in the app

**Next step:** Run `node scripts/seed-test-accounts.js` with the service role key in `.env.development`
