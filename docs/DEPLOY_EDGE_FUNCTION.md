# Deploy App Review Login Edge Function

This Edge Function creates a real authenticated session for the Apple review account, bypassing OTP verification with code `000000`.

## Deployment Steps

### 1. Deploy the Edge Function

Run this command from your project root:

```bash
supabase functions deploy app-review-login
```

### 2. Set Required Secrets

The Edge Function needs the JWT secret to create valid tokens. Set it using:

```bash
supabase secrets set JWT_SECRET=your-jwt-secret-here
```

For example:
```bash
supabase secrets set JWT_SECRET="3y7M2qqbWWsazzHT9yhkB0fWCjTXn8cT4xbO+cilhGKtuY0YpF2HdUwHGJLDHaxoP5mIbo3girxZD5IaC2cspA=="
```

You can find your JWT secret in:
- Supabase Dashboard > Settings > API > JWT Secret
- Or in your `.env` file if you have it locally

**Note**: Do NOT use the name `SUPABASE_JWT_SECRET` as it's reserved. Use `JWT_SECRET` instead.

### 3. Verify Deployment

Test the function:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/app-review-login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"kouamendri1@gmail.com","token":"000000"}'
```

Should return:
```json
{
  "success": true,
  "session": { ... }
}
```

## How It Works

1. **Validates Input**: Only accepts `kouamendri1@gmail.com` with token `000000`
2. **Verifies User**: Checks that UUID `175b77a2-4a54-4239-b0ce-9d1351bbb6d0` exists
3. **Creates JWT**: Generates a valid JWT token signed with your Supabase JWT secret
4. **Returns Session**: Provides a complete session object that the app can use

## Security

- Only works for the specific email/token combination
- Creates real, valid sessions that work with RLS
- Sessions expire after 1 hour (refresh token lasts 7 days)
- All other emails/tokens are rejected

## Testing in App

1. Sign in with email: `kouamendri1@gmail.com`
2. Enter OTP: `000000`
3. The app will call the Edge Function
4. A real session is created
5. User can now save restaurants, create boards, etc. with proper RLS

## Troubleshooting

If you get errors:

1. **"Review bypass failed"**: Check Edge Function logs in Supabase Dashboard
2. **"Failed to set session"**: Ensure JWT secret is set correctly
3. **RLS errors persist**: Verify the UUID matches in the Edge Function

View logs:
```bash
supabase functions logs app-review-login
```

## Important Notes

- This bypass ONLY works for `kouamendri1@gmail.com`
- The UUID must match exactly: `175b77a2-4a54-4239-b0ce-9d1351bbb6d0`
- The Edge Function creates real sessions that pass all RLS checks
- Sessions are indistinguishable from normal OTP logins