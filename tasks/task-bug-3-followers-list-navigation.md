# Fix: Followers/Following Navigation Shows Wrong Screen

- Epic: bug
- Priority: High
- Estimate: 0.75 days
- Status: ✅ Completed
- Assignee: -
- Dependencies: -

## Overview
From the Profile screen, tapping Followers/Following navigates back to the Find Friends discovery instead of showing the followers/following list.

## Business Value
Users expect to view lists of accounts; current behavior blocks social graph exploration.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Followers / Following lists
  As a user
  I want to view actual followers/following lists
  So that I can manage and explore connections

  Scenario: Navigate to followers list
    Given I am on a user's profile
    When I tap the Followers count
    Then I see a list of that user's followers

  Scenario: Navigate to following list
    Given I am on a user's profile
    When I tap the Following count
    Then I see a list of accounts that user follows

  Scenario: Back behavior
    Given I am viewing followers
    When I press back
    Then I return to the previous profile screen
```

## Technical Implementation
- Check routes: `app/(tabs)/profile.tsx`, `app/user/[id].tsx`, `app/find-friends.tsx`
- Implement dedicated list screens if missing:
  - `app/user/[id]/followers.tsx`
  - `app/user/[id]/following.tsx`
- Data: use `services/followService.ts` to fetch `followers` and `following` for target user id.
- Ensure header title and counts match service results.

## Definition of Done
- [x] Tapping Followers/Following opens the correct lists with pagination
- [x] Back returns to Profile
- [x] Works for self and other users
- [x] Lint/types pass

## Notes
Screenshot shows navigation returning to discovery list instead of the specific lists.

## Fix Applied
The issue was that `followService` was exported as a class (`FollowService`) but imported as an instance. Added an export of the class as `followService` for consistency:
```typescript
// Export an instance for convenience
export const followService = FollowService
```

This allows the followers and following screens to properly access the static methods of the FollowService class.
