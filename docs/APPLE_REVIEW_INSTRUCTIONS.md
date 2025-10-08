# Apple App Store Review Instructions

## Review Account Access

We have created a special test account for the Apple review team that bypasses email verification requirements.

### Login Credentials
- **Email**: review@troodieapp.com
- **OTP Code**: 000000 (use six zeros as the verification code)

### How to Sign In

1. Launch the app
2. Tap "Sign In" or "Sign Up"
3. Enter email: `review@troodieapp.com`
4. When prompted for the verification code, enter: `000000`
5. The app will automatically log you in without requiring actual email access

### Account Features

The review account has been pre-configured with:
- Complete user profile  
- 3 pre-populated boards with sample restaurant saves:
  - **Your Saves** (3 restaurants)
  - **Favorites** (1 restaurant)
  - **Want to Try** (2 restaurants)
- 3 sample posts
- Full access to view and browse all app features

### Test Features

You can test all major app functionality including:
- **Browsing**: Explore restaurants and user posts
- **Viewing**: Browse pre-saved restaurants in boards
- **Social**: View posts, comments, and user profiles
- **Settings**: Access all settings including:
  - Account deletion
  - Report content
  - Block users
  - Privacy settings
  - Notification preferences
  - Support contact

**Note**: Due to authentication limitations with the test account, creating new saves may not work. However, all existing data and features can be fully tested.

### Important Notes

1. **OTP Bypass**: The code `000000` only works for the review@troodieapp.com account
2. **Data Persistence**: All actions are saved to our production database
3. **Support**: Contact team@troodieapp.com for any issues

### Database Setup

To set up or reset the review account, run this SQL script:

1. `scripts/review-account-complete-setup.sql` - Creates the complete review account with pre-populated data

This script creates:
- User profile with all required fields
- 3 boards with sample restaurant saves  
- Sample posts for testing
- All necessary relationships

### Technical Details

- **User UUID**: a15d68b9-65c2-4782-907e-bfd11de0f612
- **Auth Provider**: Supabase Auth (passwordless OTP)
- **Special Functions**: The review account uses dedicated database functions that bypass RLS for testing purposes

### Compliance Features Implemented

All required App Store compliance features are fully implemented:

1. **Account Deletion** (Guideline 5.1.1): Users can permanently delete their account from Settings
2. **Content Reporting** (Guideline 1.2): Users can report inappropriate content and posts
3. **User Blocking** (Guideline 1.2): Users can block other users
4. **Privacy Policy & Terms**: Accessible from Settings and onboarding
5. **Google Places Attribution**: Properly displayed for restaurant data
6. **Notification Permissions**: Requested at appropriate times with clear explanations
7. **Support Contact**: Available at team@troodieapp.com
8. **Data Privacy Labels**: Documented in `docs/PRIVACY_NUTRITION_LABELS.md`

All features can be tested using the review account.