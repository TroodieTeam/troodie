# Apple App Store Review Submission Guide

## Test Account for Apple Review Team

### Login Credentials
- **Email**: `review@troodieapp.com`
- **Verification Code**: `000000` (six zeros)

### Instructions for Apple Reviewers

1. **Sign In Process**:
   - Launch the app
   - Tap "Sign In" button
   - Enter email: `review@troodieapp.com`
   - Tap "Continue"
   - When prompted for verification code, enter: `000000`
   - The app will automatically authenticate and log you in

2. **No Email Access Required**:
   - The verification code `000000` is hardcoded for this test account
   - No actual email verification is needed
   - This bypass only works for the review@troodieapp.com account

3. **Full Feature Access**:
   Once logged in, you can test all app features including:
   - Browse and search restaurants
   - Save restaurants to boards
   - Create new boards and collections
   - Create and share posts
   - Follow other users
   - Access all settings and preferences
   - Test account deletion feature
   - Report content and block users

## App Store Connect Submission Notes

### Add this to "App Review Information" section:

**Demo Account:**
- Username: `review@troodieapp.com`
- Password: `000000`

**Notes:**
We use passwordless authentication (OTP). For the review account, enter the email above and use `000000` as the verification code. This special code only works for the review account and allows testing without email access.

### Add this to "Additional Information":

```
Test Account Setup:
1. Sign in with email: review@troodieapp.com
2. Enter verification code: 000000
3. Full app access is granted

The app uses passwordless authentication via email OTP for security. The review account has a hardcoded bypass to facilitate testing without requiring actual email access. This bypass is only active for the specific review@troodieapp.com account.

All compliance features are accessible from Settings:
- Account deletion (Settings > Account > Delete Account)
- Report content (long press on any post)
- Block users (user profile > three dots menu)
- Privacy Policy & Terms (Settings > Legal)
- Support contact: team@troodieapp.com
```

## Compliance Features Checklist

✅ **Account Deletion** (Guideline 5.1.1)
- Location: Settings > Account > Delete Account
- Permanently removes all user data

✅ **Content Reporting** (Guideline 1.2)
- Long press on any post to report
- Multiple report categories available

✅ **User Blocking** (Guideline 1.2)
- Access from user profile menu
- Blocked users cannot interact with the account

✅ **Privacy Policy**
- URL: https://www.troodieapp.com/privacy-policy
- Accessible from Settings and onboarding

✅ **Terms of Service**
- URL: https://www.troodieapp.com/terms
- Accessible from Settings and onboarding

✅ **Google Places Attribution**
- Displayed on all restaurant data
- Complies with Google Places API requirements

✅ **Support Contact**
- Email: team@troodieapp.com
- Accessible from Settings > Support

## Technical Implementation Details

The review account uses a dual authentication system:
- Frontend shows standard OTP flow
- Backend uses password authentication when detecting review@troodieapp.com + 000000
- Creates a real authenticated session that works with all Row Level Security policies
- Account UUID: `175b77a2-4a54-4239-b0ce-9d1351bbb6d0`

## Important Notes

1. **Security**: The OTP bypass ONLY works for review@troodieapp.com
2. **Real Account**: This is a fully functional account with complete feature access
3. **Data Persistence**: All actions are saved to the production database
4. **Password**: Backend uses hidden password authentication (ReviewPass000000)
5. **Session**: Creates real JWT tokens that pass all security checks

## Contact Information

**Developer Support**: team@troodieapp.com
**Technical Issues**: Please contact us immediately if you encounter any issues during review

## Testing Recommendations

We recommend testing the following key flows:
1. **Onboarding**: Complete the sign-up process
2. **Restaurant Discovery**: Browse and search for restaurants
3. **Saving**: Save restaurants to boards
4. **Social Features**: Create a post, follow users
5. **Settings**: Test notification preferences, privacy settings
6. **Account Management**: Test the account deletion feature

All features are fully functional with the review account.