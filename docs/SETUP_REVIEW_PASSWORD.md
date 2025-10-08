# Setup Password Authentication for Apple Review Account

This guide explains how to enable password authentication for the Apple review account while keeping OTP for all other users.

## Setup Steps

### Option 1: Using Edge Function (Recommended)

1. Deploy the setup function:
```bash
supabase functions deploy setup-review-password
```

2. Run the function once to set the password:
```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/setup-review-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

This will set the password to: `ReviewPass000000`

### Option 2: Using Supabase Dashboard

1. Go to Supabase Dashboard > Authentication > Users
2. Find the user: `kouamendri1@gmail.com`
3. Click the three dots menu > Reset password
4. Set password to: `ReviewPass000000`
5. Click Save

## How It Works

The app now supports **dual authentication**:

1. **Regular Users**: Continue using OTP (email verification)
2. **Review Account Only**: Uses password authentication

When the Apple reviewer enters:
- Email: `kouamendri1@gmail.com`
- OTP Code: `000000`

The app:
1. Detects this is the review account
2. Automatically signs in using password: `ReviewPass000000`
3. Creates a **real authenticated session**
4. All features work including saving (RLS passes)

## Testing

To test the setup:

1. Open the app
2. Sign in with:
   - Email: `kouamendri1@gmail.com`
   - OTP: `000000`
3. The app should log you in successfully
4. Try saving a restaurant - it should work!

## Security

- Only the specific email/OTP combination triggers password auth
- The password is never exposed to the user
- All other accounts continue using OTP only
- The password auth is completely hidden from the UI

## Benefits

✅ **Real Session**: Full authenticated session that works with RLS
✅ **All Features Work**: Saving, creating boards, posts, etc.
✅ **Simple for Apple**: They just enter email and `000000`
✅ **Secure**: Password is hardcoded and hidden from users
✅ **No UI Changes**: Looks exactly like OTP flow

## Troubleshooting

If you get "Invalid login credentials":
1. The password hasn't been set yet
2. Run the setup-review-password function
3. Or set it manually in Supabase Dashboard

If you get RLS errors after login:
1. Check that the session was created properly
2. Verify the UUID matches: `175b77a2-4a54-4239-b0ce-9d1351bbb6d0`
3. Check browser console for session details

## Important Notes

- The password `ReviewPass000000` is hardcoded in `authService.ts`
- Change it if you set a different password
- This only works for `kouamendri1@gmail.com`
- All other users continue using OTP normally