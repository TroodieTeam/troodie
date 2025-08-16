# In‑App Account Deletion

**Epic**: 12 – App Store Readiness & Compliance  
**Priority**: Critical  
**Estimate**: 1.5 days  
**Status**: 🔍 Needs Review

## Overview
Implement full in‑app account deletion in compliance with Apple Guideline 5.1.1(v). Users must be able to delete their account and associated personal data entirely from within the app.

## Business Value
- Enables App Store approval; prevents rejection.  
- Builds trust and reduces data retention risk.

## Dependencies
- Supabase service role available to Edge Functions  
- Confirm data model for user‑owned content (posts, boards, tokens)

## Blocks
- None

## Acceptance Criteria (Gherkin)
```gherkin
Feature: In‑app account deletion
  As an authenticated user
  I want to permanently delete my account
  So that my data is removed from Troodie without contacting support

  Scenario: Delete account from Settings
    Given I am signed in
    And I open Settings → Account Actions
    When I tap "Delete Account" and confirm twice
    Then my account and personal data are deleted server‑side
    And I am signed out and returned to onboarding
    And local data (AsyncStorage) is cleared

  Scenario: Deletion fails due to network error
    Given I attempt deletion
    And the network request fails
    Then I see an error message and my account remains active
```

## Technical Implementation
- Backend (Supabase Edge Function `delete-account`):
  - Validate auth (user context), require userId from JWT.
  - Use `auth.admin.deleteUser(userId)` (service role).
  - Soft/hard delete or anonymize PII in related tables (posts, boards, push_tokens, profiles).
  - Return JSON { success: true } or error details.
- Frontend (`components/modals/SettingsModal.tsx`):
  - Replace TODO with call to `supabase.functions.invoke('delete-account')`.
  - Double confirmation UI (existing), robust error handling.
  - On success: `signOut()`, clear AsyncStorage keys, navigate to `/onboarding/splash`.
- Telemetry: log deletion event (if used) prior to user removal.

## Definition of Done
- Edge Function deployed; uses service role; integration tested.  
- Settings delete action completes in < 5s with progress UI.  
- All user PII removed/anonymized; orphan data handled.  
- Manual test cases for success and failure pass on iOS/Android.  
- QA verified; App Store guideline 5.1.1(v) satisfied.

## Resources
- Apple 5.1.1(v): https://developer.apple.com/news/?id=mdkbobfo  
- Supabase Admin API (delete user): https://supabase.com/docs/reference/javascript/auth-admin-deleteuser

## Notes
- Consider 7‑day grace window via soft delete only if clearly communicated; Apple still requires in‑app initiation and completion.

## Implementation Status

### ✅ Completed
1. **Edge Function Created** (`supabase/functions/delete-account/index.ts`)
   - JWT token validation for user authentication
   - Comprehensive data deletion across all tables
   - Proper error handling and logging
   - Service role authentication for admin operations
   - Returns success/error responses

2. **Frontend Implementation** (`components/modals/SettingsModal.tsx`)
   - Double confirmation flow for account deletion
   - Loading state with overlay during deletion
   - Calls Edge Function with proper authentication
   - Clears local AsyncStorage data
   - Navigates to onboarding after successful deletion
   - Comprehensive error handling with user feedback

### 📋 Deployment Steps Required
To deploy the Edge Function to production:

```bash
# Login to Supabase CLI (if not already logged in)
supabase login

# Deploy the delete-account function
supabase functions deploy delete-account --project-ref <your-project-ref>

# Verify deployment
supabase functions list --project-ref <your-project-ref>
```

### 🔐 Environment Variables Required
The Edge Function requires the following environment variables to be set in Supabase Dashboard:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations  
- `SUPABASE_JWT_SECRET` - JWT secret for token verification

### ✅ Testing Checklist
- [ ] Test account deletion flow on iOS device
- [ ] Test account deletion flow on Android device
- [ ] Verify all user data is deleted from database
- [ ] Verify user cannot sign in after deletion
- [ ] Test network error handling
- [ ] Test with poor network connection
- [ ] Verify loading states display correctly
- [ ] Test AsyncStorage is cleared properly

