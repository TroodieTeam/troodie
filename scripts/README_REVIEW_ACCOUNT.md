# Setting Up Apple App Store Review Account

## Quick Setup Instructions

The app has a special bypass for Apple's review team to login without needing real email OTP verification.

**Review Account Credentials:**
- Email: `review@troodieapp.com`
- OTP Code: `000000` (six zeros)

## How to Create the Review Account in Supabase

### Option 1: Using Supabase Dashboard (Recommended)

1. **Create the Auth User:**
   - Go to your Supabase Dashboard
   - Navigate to `Authentication` > `Users`
   - Click `Invite User` or `Create User`
   - Enter email: `review@troodieapp.com`
   - The system will create the user (ignore the magic link email)

2. **Run the Setup Script:**
   - Go to `SQL Editor` in Supabase Dashboard
   - Copy and paste the contents of `setup-review-account-simple.sql`
   - Click `Run`
   - You should see success messages in the output

### Option 2: Using Supabase CLI

If you have the Supabase CLI configured:

```bash
# Run the migration
supabase migration up --local

# Or run directly
supabase db push --local < scripts/create-review-account.sql
```

### Option 3: Manual SQL (Advanced)

If you have direct database access:

```sql
-- First create the auth user
SELECT auth.admin_create_user(
    email := 'review@troodieapp.com',
    email_confirm := true
);

-- Then run the setup script
-- Copy contents from setup-review-account-simple.sql
```

## How the Bypass Works

1. **In the App Code (`authService.ts`):**
   - When email `review@troodieapp.com` is entered, the app skips the actual OTP request
   - When OTP code `000000` is entered, it's automatically accepted
   - A mock session is created for the review account

2. **Security:**
   - The bypass ONLY works for the exact email `review@troodieapp.com`
   - The bypass ONLY accepts the code `000000`
   - No other accounts can use this bypass

## Verification

After setup, verify the account exists:

```sql
SELECT 
    u.email,
    u.username,
    u.display_name,
    u.onboarding_completed
FROM public.users u
WHERE u.email = 'review@troodieapp.com';
```

Expected output:
- email: `review@troodieapp.com`
- username: `app_reviewer`
- display_name: `App Reviewer`
- onboarding_completed: `true`

## Testing the Account

1. Open your app
2. Tap "Sign In"
3. Enter email: `review@troodieapp.com`
4. Tap "Send Code" (no actual email will be sent)
5. Enter code: `000000`
6. The app should log in successfully

## Troubleshooting

### "User not found" error
- The auth user doesn't exist yet
- Solution: Create the user via Supabase Dashboard first

### "Signups not allowed" error
- Your Supabase project has signups disabled
- Solution: Create the user manually via Dashboard, not through the app

### Profile not showing
- The user profile wasn't created in the public.users table
- Solution: Run the setup script again

### Can't see sample data
- Sample data creation might have failed
- Solution: Check if you have the required tables (boards, posts, etc.)

## Important Notes

1. **For App Store Submission:**
   - Include these credentials in your App Review Information
   - Mention it's a passwordless OTP system with a test bypass
   - The code `000000` always works for this account

2. **Security:**
   - This bypass should ONLY be used for App Store review
   - Consider removing or disabling it after app approval
   - Never use this pattern for real user accounts

3. **Sample Data:**
   - The script creates sample boards, saves, and posts
   - This helps reviewers see the app with content
   - You can customize the sample data in the SQL scripts

## Files Included

- `create-review-account.sql` - Full migration with auth user creation
- `setup-review-account-simple.sql` - Simple script for Dashboard users
- `README_REVIEW_ACCOUNT.md` - This documentation

## Support

If you encounter issues setting up the review account:
1. Check the Supabase logs for errors
2. Verify your database schema matches the expected structure
3. Ensure you have proper permissions to create users

Remember: The bypass is implemented in the app code, so make sure you're using the latest version with the review account handling in `authService.ts` and `AuthContext.tsx`.