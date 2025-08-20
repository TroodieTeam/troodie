# Remove Login Wall for Restaurant Browsing

- Epic: APPLE (Apple Review Compliance)
- Priority: Critical
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Allow users to browse restaurants and view basic content without requiring account creation, per Apple's Guideline 5.1.1. Only require authentication for personalized features.

## Business Value
- **Compliance:** Required to pass Apple review and launch on App Store
- **User Acquisition:** Reduces friction for new users exploring the app
- **Conversion:** Users can experience value before committing to signup
- **Market Access:** Unlocks iOS market (60% of potential users)

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Anonymous Restaurant Browsing
  As a new user
  I want to browse restaurants without creating an account
  So that I can explore the app before committing to signup

  Scenario: Browse without account
    Given I am a new user who has not signed in
    When I open the app
    Then I can skip the login screen
    And I can browse all restaurants
    And I can view restaurant details
    And I can search for restaurants

  Scenario: Prompt for login on protected features
    Given I am browsing anonymously
    When I try to save a restaurant to a board
    Then I see a prompt to sign in or create account
    And I am redirected to the feature after signing in

  Scenario: View public content anonymously
    Given I am not logged in
    When I view a restaurant with reviews
    Then I can read all public reviews and posts
    But I cannot create posts or leave reviews
```

## Technical Implementation

### 1. Authentication State Management
- Update `useAuth` hook to support anonymous state
- Add `isAnonymous` flag to user context
- Implement `skipAuth` function for onboarding

### 2. Navigation Changes
- Add "Skip" or "Browse as Guest" button to login screen
- Update RootNavigator to allow anonymous access to main tabs
- Protect specific routes that require auth

### 3. Protected Features (Require Auth)
- Saving restaurants to boards
- Creating/editing boards
- Writing reviews or posts
- Following users
- Editing profile
- Notification settings

### 4. Anonymous Access Features
- Browse all restaurants
- Search and filter
- View restaurant details
- Read reviews and posts
- View user profiles (read-only)
- Access help/support

### 5. Auth Prompts
- Create reusable `AuthRequiredModal` component
- Show when anonymous user tries protected action
- Options: "Sign In" or "Create Account"
- Remember intended action and redirect after auth

### 6. Backend Changes
- Update Supabase RLS policies for public read access
- Ensure restaurant data is accessible without auth
- Keep write operations auth-protected

### 7. Analytics
- Track anonymous vs authenticated users
- Monitor conversion from anonymous to registered
- Track which features trigger signup

## Definition of Done
- [ ] Anonymous users can browse all restaurants
- [ ] Search and filters work without auth
- [ ] Auth prompt appears for protected features
- [ ] "Skip" option visible on login screen
- [ ] Smooth transition from anonymous to authenticated
- [ ] No regression in authenticated user experience
- [ ] Analytics tracking implemented
- [ ] Tested on iPhone and iPad
- [ ] Performance acceptable for anonymous users
- [ ] Apple review guidelines compliance verified

## Testing Checklist
- [ ] Fresh install - can skip login
- [ ] Browse restaurants anonymously
- [ ] Search works without auth
- [ ] Auth prompt on save attempt
- [ ] Successful login after prompt redirects correctly
- [ ] Existing users unaffected
- [ ] Deep links work for anonymous users

## Notes
- Reference: Apple Guideline 5.1.1 - Apps may not require users to enter personal information to function, except when directly relevant to core functionality
- Consider implementing progressive disclosure to encourage signup
- Monitor impact on signup rates after implementation