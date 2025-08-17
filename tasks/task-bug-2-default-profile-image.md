# Fix: Default Profile Image When None Provided

- Epic: bug
- Priority: Medium
- Estimate: 0.5 days
- Status: ✅ Completed
- Assignee: -
- Dependencies: -

## Overview
When a user creates a profile with no image, the UI should display a default profile image instead of an empty/placeholder state.

## Business Value
Prevents broken or low-quality visuals, keeps lists consistent, and avoids confusion.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Default profile image
  As a user
  I want profiles without images to show a default avatar
  So that UI remains consistent

  Scenario: Render default avatar
    Given a profile with no avatar_url and no profile_image_url
    When the avatar component is rendered
    Then a default avatar image is displayed

  Scenario: Format relative storage paths
    Given a profile avatar path like "/storage/v1/object/public/avatars/<file>"
    Then the component renders it as a valid https URL

  Scenario: Backfill activity feed
    Given activity feed items reference actor or related_user avatars
    Then they display default avatar when null
```

## Technical Implementation
- Utils: `utils/avatarUtils.ts`
  - Already exposes `getAvatarUrl` and `formatAvatarUrl`. Verify handling for null and relative paths.
- Constants: `constants/images.ts`
  - Ensure `DEFAULT_IMAGES.avatar` is exported with a valid URL.
- Components:
  - `components/activity/ActivityFeedItem.tsx`: ensure actor and related_user use `DEFAULT_IMAGES.avatar` fallback.
  - `components/UserSearchResult.tsx`, `components/FollowButton.tsx`, any profile chips: use a shared avatar utility or prop fallback.

## Definition of Done
- [x] All screens that render user avatars show a default image when no URL is present
- [x] Relative paths are formatted to absolute URLs
- [x] Visual QA on Find Friends, Activity, and Profile
- [x] Lint/types pass

## Notes
Screenshot shows many Anonymous entries with missing avatars. Consider adding initials fallback later as enhancement.

## Implementation
- Updated DEFAULT_IMAGES to use reliable services (ui-avatars.com for avatars, Unsplash for other images)
- Enhanced getAvatarUrlWithFallback to accept a name parameter for generating initials
- Added generateInitialsAvatar function to create personalized default avatars
- Updated components to pass user names for better default avatars:
  - UserSearchResult
  - User profile page
  - ActivityFeedItem
- Default avatars now show user initials with Troodie's orange brand color
