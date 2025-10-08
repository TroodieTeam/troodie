# App Store Submission Notes for Troodie

## App Description

Troodie is a restaurant discovery and social dining app that helps you find the best local spots, save places to organized boards, and follow trusted foodies and friends. Discover location‑aware recommendations, keep track of where you want to go (and where you’ve been), and share quick tips, photos, and lists with your community.

### Keywords (Suggested)

restaurant discovery, food recommendations, local gems, best restaurants, city guide, foodie, restaurant lists, save places, boards, want to try, been there, dining, brunch, coffee shops, bars, tips, reviews, follow friends, communities, activity feed, maps, Google Places

## App Review Login Information

### Authentication Method: Passwordless (Email OTP)

Our app uses passwordless authentication with email One-Time Password (OTP). We have implemented a special bypass for App Store Review to simplify the testing process.

### Test Account Credentials

**Email:** `review@troodieapp.com`  
**Password/OTP Code:** `000000` (six zeros)

### How to Login

1. Launch the app
2. Tap "Sign In" on the welcome screen
3. Enter email: `review@troodieapp.com`
4. Tap "Continue" or "Send Code"
5. Enter the test code: `000000`
6. The app will authenticate and proceed to the main experience

### Important Notes

- **No email access required**: The code `000000` will always work for the review account
- **Pre-populated data**: The review account has sample restaurants, boards, and social content for testing
- **Full access**: All features are available with the review account
- **Bypass is secure**: This bypass ONLY works for `review@troodieapp.com` and the exact code `000000`

## Key Features to Test

1. **Restaurant Discovery**
   - Search for restaurants
   - View restaurant details
   - Save restaurants to lists

2. **Organization Features**
   - Create custom boards
   - Save restaurants to "Want to Try" or "Been There"
   - Add personal notes to saves

3. **Social Features**
   - Follow other users
   - View activity feed
   - Join communities
   - Create and share posts

4. **User Management**
   - Profile editing
   - Settings and preferences
   - Account deletion (Settings > Delete Account)

## Permissions

The app requests the following optional permissions:

- **Push Notifications**: For activity updates (optional, can be enabled in Settings)
- **Camera/Photo Library**: For profile pictures and post images (optional)

## Third-Party Services

- **Google Places API**: Restaurant data and search
- **Supabase**: Backend and authentication
- **Sentry**: Crash reporting and performance monitoring

## Privacy & Compliance

- Privacy Policy: https://www.troodieapp.com/privacy-policy
- Terms of Service: https://www.troodieapp.com/terms-of-service
- Support Email: team@troodieapp.com
- In-app account deletion: Settings > Delete Account
- UGC reporting: Long press on any post or comment to report
- User blocking: Available on user profiles

## App Store Version Release

We recommend "Automatically release this version" for the initial release.

## Contact Information

If you need any assistance during the review process:
- Email: team@troodieapp.com
- We monitor this email actively during business hours

## Technical Implementation Notes

The App Review bypass is implemented in:
- `/services/authService.ts`: Special handling for review@troodieapp.com
- `/contexts/AuthContext.tsx`: Mock session creation for review account
- `/supabase/functions/app-review-login`: Edge function for review authentication (optional fallback)

This bypass ensures a smooth review process without requiring real-time OTP verification.

---

Last Updated: January 2025