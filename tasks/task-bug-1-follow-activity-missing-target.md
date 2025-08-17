# Fix: Follow Activity Missing Target User Name

- Epic: bug
- Priority: High
- Estimate: 0.5 days
- Status: ✅ Completed
- Assignee: -
- Dependencies: -

## Overview
In the Activity feed, "started following" items do not display the user who was followed. The copy should read "<actor> started following <target>" and both names should be tappable.

## Business Value
Clearer social signals drive discovery and engagement; users should see who followed whom.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Follow activity shows target user
  As a user
  I want to see who someone followed
  So that I can discover new accounts

  Scenario: Show target user name
    Given there is a follow event in my activity feed
    When the item renders
    Then it shows "<actor> started following <target>"
    And the <actor> link navigates to /user/<actor_id>
    And the <target> link navigates to /user/<target_id>

  Scenario: Fallback to username when name is missing
    Given the target user has no display name
    When the item renders
    Then it shows the target's @username instead of a blank

  Scenario: Default avatar
    Given either actor or target has no avatar
    Then the default avatar image is displayed
```

## Technical Implementation
- UI: `components/activity/ActivityFeedItem.tsx`
  - In `renderActivityContent`, the target display currently uses `activity.target_name` only.
  - Update to prefer `activity.target_name || activity.related_user_name || activity.related_user_username`.
  - Ensure taps on target call `handleTargetPress` and route to `/user/<related_user_id>` when `target_type === 'user'`.
- Service: `services/activityFeedService.ts`
  - In `transformFollowToActivity`, set safe fallbacks:
    - `target_name = followingResult.data.name || followingResult.data.username`
    - `related_user_name` similarly
  - Ensure `related_user_avatar` is passed; UI already falls back to default avatar.

## Definition of Done
- [x] Activity shows target user for all follow events (new and cached)
- [x] Username fallback works when name is null/empty
- [x] Actor and target taps navigate correctly
- [x] Visual QA on iOS and Android
- [x] No console errors; TypeScript passes

## Notes
Related files: `components/FollowButton.tsx`, `hooks/useFollowState.ts`, `services/userService.ts`. The attached screenshot shows missing target on "started following" items.
