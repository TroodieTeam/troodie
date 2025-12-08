# Fixing Auth User Providers Field

## The Problem

When a user exists in `auth.users` but has an **empty root-level `providers` array**, password authentication fails even though:
- `raw_app_meta_data.providers` is set to `["email"]`
- Password is set correctly
- Email is confirmed

## Root Cause

The root-level `providers` field is what Supabase uses to determine which authentication methods are enabled. If it's empty, password authentication won't work.

**Working user:**
```json
{
  "providers": ["email"],  // ✅ Root level - this is what matters
  "raw_app_meta_data": {
    "providers": ["email"]
  }
}
```

**Non-working user:**
```json
{
  "providers": [],  // ❌ Empty - prevents password auth
  "raw_app_meta_data": {
    "providers": ["email"]  // ✅ Set but not enough
  }
}
```

## Solution

Use the **Supabase Admin API** to update the user. The Admin API properly sets both:
1. `raw_app_meta_data.providers`
2. Root-level `providers` field (computed/denormalized)

### Method 1: Using Admin API (Recommended)

Run the script:
```bash
./scripts/fix-user-root-providers.sh
```

Or use curl directly:
```bash
curl -X PUT \
  "YOUR_SUPABASE_URL/auth/v1/admin/users/USER_UUID" \
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
      "sub": "USER_UUID",
      "name": "Test Consumer 1",
      "account_type": "consumer",
      "email": "test-consumer1@troodieapp.com",
      "email_verified": true
    }
  }'
```

### Method 2: Using Supabase Dashboard

1. Go to **Authentication → Users**
2. Find the user by email or UUID
3. Click the **three dots (⋮)** → **Edit user**
4. Manually add to **App Metadata**:
   ```json
   {
     "provider": "email",
     "providers": ["email"]
   }
   ```
5. Click **Save**

After saving, Supabase should automatically populate the root-level `providers` field.

## Why This Happens

The root-level `providers` field is typically:
- A **computed/denormalized field** based on `raw_app_meta_data.providers`
- Set automatically by Supabase when users are created via the Admin API
- **NOT** set automatically when users are created directly in the database

If a user was created via SQL or migrated, they might have `raw_app_meta_data.providers` set but not the root-level `providers` field.

## Additional Fields

Also ensure `user_metadata` has:
- `sub`: User's UUID (matches `id`)
- `email`: User's email
- `email_verified`: `true`

These fields help with compatibility and are set automatically by Supabase when using Admin API.

## Verification

After fixing, verify the user has:
1. ✅ Root-level `providers: ["email"]`
2. ✅ `raw_app_meta_data.providers: ["email"]`
3. ✅ Password set (can test login)
4. ✅ Email confirmed

You can check in Supabase Dashboard or via SQL:
```sql
SELECT 
    id,
    email,
    providers,
    raw_app_meta_data->>'providers' as app_meta_providers
FROM auth.users
WHERE email = 'test-consumer1@troodieapp.com';
```

