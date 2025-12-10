# Complete Fix for Auth User Providers Field

## Problem Summary

User `test-consumer1@troodieapp.com` exists in `auth.users` but:
- ❌ Root-level `providers: []` is **empty** (blocks password auth)
- ✅ `raw_app_meta_data.providers: ["email"]` is set
- ❌ Missing `sub` field in `raw_user_meta_data`
- ✅ Password is set

**Root-level `providers` field is what Supabase uses for authentication!**

## The Solution

The root-level `providers` field is computed/denormalized by Supabase. You need to:

1. **Update via Supabase Admin API** - This triggers the recompute automatically
2. **OR edit in Dashboard** - Just opening and saving triggers recompute

### Option 1: Use Supabase Dashboard (Easiest)

1. Go to **Supabase Dashboard → Authentication → Users**
2. Search for `test-consumer1@troodieapp.com` by **UID** (not email filter)
3. Click on the user
4. Click **"Edit user"** or **"Update user"**
5. In **App Metadata**, ensure it has:
   ```json
   {
     "provider": "email",
     "providers": ["email"]
   }
   ```
6. Click **Save**

This will trigger Supabase to recompute the root-level `providers` field.

### Option 2: Use Admin API (Recommended for Scripts)

Use the curl command or script. The Admin API automatically sets the root-level field:

```bash
# First, get the correct UUID from Dashboard or SQL
USER_UUID="a1b2c3d4-e5f6-4789-a012-345678901234"

curl -X PUT \
  "YOUR_SUPABASE_URL/auth/v1/admin/users/${USER_UUID}" \
  -H "apikey: YOUR_SERVICE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "BypassPassword123",
    "email_confirm": true,
    "app_metadata": {
      "provider": "email",
      "providers": ["email"]
    },
    "user_metadata": {
      "sub": "'${USER_UUID}'",
      "name": "Test Consumer 1",
      "account_type": "consumer",
      "email": "test-consumer1@troodieapp.com",
      "email_verified": true
    }
  }'
```

### Option 3: SQL Update (Prepares data, but requires Dashboard/API to trigger)

Run `scripts/fix-root-providers-field.sql` to prepare the data, then:

- Use Dashboard to edit/save the user, OR
- Use Admin API to update (will trigger recompute)

## How Auth Service Works

The `authService.ts` calls `supabase.auth.signInWithPassword()` which:

1. Checks root-level `providers` field
2. If empty `[]`, password auth is **disabled** → fails with "Invalid login credentials"
3. If contains `["email"]`, password auth is **enabled** → succeeds

The root-level field is what Supabase's auth system uses, not just `raw_app_meta_data.providers`.

## Verification

After fixing, check in Dashboard or SQL:

```sql
SELECT 
    id,
    email,
    providers,  -- Root level - should be ["email"]
    raw_app_meta_data->>'providers' as app_meta_providers,
    raw_user_meta_data->>'sub' as has_sub
FROM auth.users
WHERE email = 'test-consumer1@troodieapp.com';
```

Expected:
- ✅ `providers: ["email"]` (root level - critical!)
- ✅ `app_meta_providers: ["email"]`
- ✅ `has_sub: <uuid>`

## Why This Happens

When users are created:
- ✅ Via Admin API → Root `providers` set automatically
- ✅ Via Dashboard → Root `providers` set automatically  
- ❌ Via SQL directly → Root `providers` might not be set (computed field)

The root-level `providers` is a denormalized field that Supabase maintains. Direct SQL updates might not trigger the recompute.

