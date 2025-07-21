# Testing Email Authentication Flow

This guide helps you test the complete email OTP authentication implementation.

## Prerequisites

1. Supabase project is running
2. Email templates are configured (see supabase-email-templates.md)
3. App is running on device/simulator

## Test Scenarios

### 1. New User Signup

**Steps:**
1. Open the app and tap "Get Started"
2. Choose "Individual" or "Business" account type
3. Enter a valid email address (use a real email you can access)
4. Tap "Next"
5. Check your email for the 6-digit code
6. Enter the code in the app
7. Complete the onboarding quiz
8. Fill in profile information

**Expected Results:**
- Email arrives within 1-2 minutes
- Code is 6 digits
- Code entry auto-submits when complete
- User is logged in after verification
- Profile is created in database

### 2. Existing User Login

**Steps:**
1. Open the app and tap "Sign In"
2. Enter your registered email address
3. Tap "Send Code"
4. Check email for new code
5. Enter the code

**Expected Results:**
- Email arrives with new code
- Previous session is replaced
- User data is loaded correctly

### 3. Rate Limiting

**Steps:**
1. Request a code (signup or login)
2. Immediately try to request another code
3. Observe the countdown timer

**Expected Results:**
- Second request is blocked
- Countdown shows 60 seconds
- Button is disabled during countdown
- After countdown, new request works

### 4. Invalid Code Entry

**Steps:**
1. Request a code
2. Enter wrong code (e.g., 000000)
3. Try to verify

**Expected Results:**
- Error message appears
- Code fields are cleared
- User can try again
- Original code still works

### 5. Code Expiry

**Steps:**
1. Request a code
2. Wait 61+ minutes
3. Try to use the code

**Expected Results:**
- Error: "Code has expired"
- User must request new code
- New code works correctly

### 6. Resend Code

**Steps:**
1. On verify screen, tap "Resend code"
2. Check email for new code
3. Try both old and new codes

**Expected Results:**
- New email arrives
- New code works
- Old code may still work (Supabase allows multiple valid codes)

### 7. Email Validation

**Steps:**
1. Try invalid emails:
   - Missing @ (userexample.com)
   - Missing domain (user@)
   - Invalid format (user@@example.com)
   - With spaces (user @example.com)

**Expected Results:**
- "Next" button stays disabled
- No network request made
- Clear validation feedback

### 8. Network Errors

**Steps:**
1. Turn on Airplane Mode
2. Try to request a code
3. Observe error handling

**Expected Results:**
- Error: "Network error"
- User can retry when connected
- App doesn't crash

### 9. Account Not Found

**Steps:**
1. Go to login screen
2. Enter unregistered email
3. Request code

**Expected Results:**
- Error: "Account not found"
- Prompt to sign up
- Redirects to signup if accepted

### 10. Session Persistence

**Steps:**
1. Log in successfully
2. Close the app completely
3. Reopen the app

**Expected Results:**
- User remains logged in
- No need to re-authenticate
- Profile data is available

## Backend Verification

### Check Supabase Dashboard

1. **Authentication > Users**
   - New users appear after signup
   - Email is verified
   - Last sign in updates

2. **Table Editor > profiles**
   - Profile created for new users
   - Email field is populated
   - profile_completion updates

3. **Logs > Auth Logs**
   - OTP requests are logged
   - Success/failure events recorded
   - Rate limit violations shown

### Database Queries

```sql
-- Check user creation
SELECT * FROM auth.users WHERE email = 'test@example.com';

-- Check profile creation
SELECT * FROM public.profiles WHERE email = 'test@example.com';

-- Check auth audit log
SELECT * FROM auth.audit_log_entries 
WHERE payload->>'actor_email' = 'test@example.com'
ORDER BY created_at DESC;
```

## Common Issues

### Emails in Spam
- Check spam/junk folders
- Add Supabase sender to contacts
- Configure custom SMTP for better delivery

### Slow Email Delivery
- Default Supabase emails can be slow
- Consider custom SMTP provider
- Check Supabase status page

### Code Not Working
- Ensure entering all 6 digits
- Check for extra spaces
- Verify email matches exactly

## Performance Testing

1. **Load Time**: Auth screens should load instantly
2. **Response Time**: Code request < 2 seconds
3. **Email Delivery**: < 2 minutes average
4. **Code Entry**: Auto-submit is instant
5. **Verification**: < 1 second after code entry