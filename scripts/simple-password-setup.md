# Simple Password Setup for Review Account

Since Edge Function deployment requires database password, let's use the Supabase Dashboard instead:

## Easy Setup (via Dashboard):

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard/project/cacrjcekanesymdzpjtt/auth/users

2. **Find the user**
   - Look for: `kouamendri1@gmail.com`
   - UUID: `175b77a2-4a54-4239-b0ce-9d1351bbb6d0`

3. **Set Password**
   - Click the three dots menu (⋮) next to the user
   - Select "Send password recovery"
   - OR select "Update password" if available
   - Set password to: `ReviewPass000000`

## Alternative: Use SQL Editor

Go to SQL Editor in Supabase Dashboard and run:

```sql
-- This will update the user to allow password auth
UPDATE auth.users 
SET 
  encrypted_password = crypt('ReviewPass000000', gen_salt('bf')),
  updated_at = now()
WHERE id = '175b77a2-4a54-4239-b0ce-9d1351bbb6d0';
```

## Test It

After setting the password, test in your app:

1. Open the app
2. Enter email: `kouamendri1@gmail.com`
3. Enter OTP: `000000`
4. The app will automatically use password auth behind the scenes
5. You should be logged in with a real session!

## How It Works

When the app sees:
- Email: `kouamendri1@gmail.com`
- OTP code: `000000`

It automatically calls:
```javascript
supabase.auth.signInWithPassword({
  email: 'kouamendri1@gmail.com',
  password: 'ReviewPass000000'
})
```

This creates a **real authenticated session** that works with all RLS policies!