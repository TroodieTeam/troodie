# Task 3.6: Profile Data Shape Updates & Onboarding Flow Enhancement

## Epic: Core Social Features
- **Priority**: High
- **Estimate**: 3 days
- **Status**: 🔴 Not Started
- **Depends on**: Task 3.4 (User Profile Implementation)

## Overview
Update the profile data structure and EditProfileModal to remove unnecessary fields, then enhance the onboarding flow with dedicated profile setup screens. This will streamline the profile editing experience and ensure users complete essential profile information during onboarding.

## Business Value
- Simplified profile editing experience
- Higher profile completion rates through guided onboarding
- Better user engagement with essential profile fields
- Reduced cognitive load during profile setup

## Dependencies
- Task 3.4: User Profile Implementation
- Onboarding flow components
- ProfileService integration

## Blocks
- Task 3.5: Fix Edit Profile Modal Bug (if not resolved)
- Any features depending on removed profile fields

## Acceptance Criteria

```gherkin
Feature: Simplified Profile Data Structure
  As a developer
  I want to remove unnecessary profile fields
  So that the profile editing experience is streamlined

  Scenario: EditProfileModal Has Simplified Fields
    Given I am editing my profile
    When I open the EditProfileModal
    Then I should see only essential fields:
      | username |
      | bio |
      | profile image |
    And I should NOT see:
      | website |
      | instagram |
      | email preferences |

  Scenario: Profile Data Shape Updated
    Given I am working with profile data
    When I access profile information
    Then the data structure should exclude:
      | website |
      | instagram_handle |
      | email_preferences |
    And the database schema should be updated accordingly

Feature: Onboarding Profile Setup Flow
  As a new user
  I want to set up my profile during onboarding
  So that I have a complete profile from the start

  Scenario: Profile Image Upload Screen
    Given I am in the onboarding flow
    When I reach the profile setup section
    Then I should see a dedicated screen for profile image
    And I should be able to upload an image or skip
    And the screen should have clear instructions

  Scenario: Username Setup Screen
    Given I am setting up my profile during onboarding
    When I reach the username screen
    Then I should see a dedicated screen for username
    And I should be able to enter a unique username
    And the system should validate username availability
    And I should see clear error messages for invalid usernames

  Scenario: Bio Setup Screen
    Given I am setting up my profile during onboarding
    When I reach the bio screen
    Then I should see a dedicated screen for bio
    And I should be able to enter a bio (optional)
    And I should see character count and limits
    And I should be able to skip if desired

  Scenario: Onboarding Flow Integration
    Given I am completing the onboarding flow
    When I finish the persona quiz
    Then I should be guided through profile setup screens
    And each screen should have clear navigation
    And I should be able to go back and edit previous screens
    And the flow should save progress appropriately
```

## Technical Implementation

### Profile Data Structure Changes

#### Remove Fields from Profile Interface
```typescript
// Remove from Profile interface:
- website?: string;
- instagram_handle?: string;
- email_preferences?: {
  marketing: boolean;
  social: boolean;
  notifications: boolean;
};
```

#### Update Database Schema
```sql
-- Remove columns from users table:
ALTER TABLE public.users 
DROP COLUMN IF EXISTS website,
DROP COLUMN IF EXISTS instagram_handle,
DROP COLUMN IF EXISTS email_preferences;
```

#### Update EditProfileModal Component
- Remove website input field
- Remove Instagram handle input field
- Remove email preferences section
- Update form validation
- Update save functionality

### Onboarding Flow Enhancement

#### New Onboarding Screens
1. **Profile Image Upload Screen** (`app/onboarding/profile-image.tsx`)
   - Image picker with camera/library options
   - Skip button
   - Preview of selected image
   - Clear instructions

2. **Username Setup Screen** (`app/onboarding/username.tsx`)
   - Username input with validation
   - Real-time availability checking
   - Error messages for invalid usernames
   - Character limits and formatting rules

3. **Bio Setup Screen** (`app/onboarding/bio.tsx`)
   - Bio text input with character count
   - Optional field with skip option
   - Clear instructions and examples

#### Onboarding Flow Integration
- Update onboarding navigation to include new screens
- Add progress tracking for profile setup
- Ensure data persistence between screens
- Add back navigation to previous screens
- Update completion logic

#### Screen Features
- **Consistent Design**: Match existing onboarding screen design
- **Progress Indicator**: Show progress through profile setup
- **Data Persistence**: Save progress between screens
- **Validation**: Real-time validation with clear error messages
- **Skip Options**: Allow users to skip optional fields
- **Navigation**: Back/forward navigation between screens

## Definition of Done
- [ ] Profile data structure updated (website, instagram, email_preferences removed)
- [ ] Database schema updated to remove unused columns
- [ ] EditProfileModal simplified with only essential fields
- [ ] Profile image upload onboarding screen implemented
- [ ] Username setup onboarding screen implemented
- [ ] Bio setup onboarding screen implemented
- [ ] Onboarding flow updated to include new screens
- [ ] Progress tracking and navigation working correctly
- [ ] Data persistence between onboarding screens
- [ ] Validation and error handling implemented
- [ ] Skip options working for optional fields
- [ ] All screens match existing onboarding design
- [ ] Tests written for new functionality
- [ ] Code reviewed and approved

## Notes
- Consider impact on existing users with data in removed fields
- Plan migration strategy for existing profile data
- Ensure new onboarding screens don't break existing flow
- Test on both iOS and Android platforms
- Consider accessibility requirements for new screens

## Related Files
- `components/modals/EditProfileModal.tsx`
- `services/profileService.ts`
- `types/core.ts`
- `app/onboarding/profile-image.tsx` (new)
- `app/onboarding/username.tsx` (new)
- `app/onboarding/bio.tsx` (new)
- `app/onboarding/_layout.tsx`
- `contexts/OnboardingContext.tsx` 