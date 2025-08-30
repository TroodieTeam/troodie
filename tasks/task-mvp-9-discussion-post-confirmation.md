# Improve Discussion Post Confirmation Flow

- Epic: MVP
- Priority: High
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: task-mvp-5-review-confirmation-flow

## Overview
After posting a discussion in communities, users see a full-screen confirmation prompting them to go back home. Users prefer a toast notification to stay on the community screen and see their post.

## Business Value
Keeping users engaged in community discussions increases participation and content creation. Forcing navigation away disrupts the community browsing experience.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Discussion post confirmation
  As a community member posting content
  I want to stay in the community after posting
  So that I can see responses and continue participating

  Scenario: Successful discussion post
    Given I am on a community screen
    When I successfully post a discussion
    Then I should see a brief toast saying "Posted!"
    And I should remain on the community screen
    And my post should appear in the feed immediately
    And the toast should auto-dismiss after 3 seconds

  Scenario: Continuing community engagement
    Given I just posted a discussion
    When the confirmation appears
    Then I can immediately see my post in the feed
    And I can read other discussions
    And I can interact with other posts
    And I don't lose my scroll position
```

## Technical Implementation
- Reuse toast notification system from review confirmation
- Remove full-screen confirmation modal
- Implement for discussion posts:
  - Keep user on current community screen
  - Refresh feed to show new post
  - Optimistic UI update for instant feedback
  - Maintain scroll position if possible
- Ensure consistency with review posting flow
- Add subtle animation for new post appearance
- Handle edge cases:
  - Network failures
  - Duplicate post prevention
  - Rate limiting

## Definition of Done
- [ ] Full-screen confirmation removed
- [ ] Toast notification shows on success
- [ ] User stays on community screen
- [ ] New post appears immediately
- [ ] Scroll position maintained
- [ ] Consistent with review posting UX
- [ ] Error handling for failed posts
- [ ] Works across all community types

## Notes
- This should match the pattern from task-mvp-5
- Consider adding engagement prompt in toast
- May want to highlight user's new post briefly

## Implementation Status
✅ **Implemented on 8/30/2025**
- Uses same toast system as MVP.5 (restaurant reviews)
- Fixed `ToastService.success()` method by adding alias in `services/toastService.ts`
- All community posts now use toast confirmations
- Navigation returns to community screen via `router.back()`
- Consistent behavior across all post types

## Manual Test Cases

### Test Case 1: Community Discussion Posting
```gherkin
Feature: Community discussion confirmation
  As a community member posting content
  I want to stay in the community after posting
  So that I can see responses and continue participating

  Scenario: Post discussion from community
    Given I am viewing a specific community feed
    When I tap the create post button
    And I create a "Share to Community" post
    And I submit the post
    Then I should see a toast notification saying "Posted!"
    And the subtitle should say "Your post is now live in the community"
    And I should return to the community feed
    And I should NOT see a full-screen confirmation
    And I should NOT be navigated to home

  Scenario: New post visibility
    Given I just posted a discussion
    When I return to the community feed
    Then my post should appear at the top of the feed
    And it should show "just now" as timestamp
    And other members should see it immediately
    And I can interact with my own post
```

### Test Case 2: Cross-Community Posting
```gherkin
Feature: Multi-community discussions
  As a user in multiple communities
  I want to cross-post efficiently
  So that I can share with relevant groups

  Scenario: Select multiple communities
    Given I am creating a discussion post
    When I tap the community selector
    And I select 3 different communities
    And I submit the post
    Then I should see a toast confirming the post
    And I should return to my origin screen
    And the post should appear in all 3 communities

  Scenario: Community pre-selection
    Given I start posting from "Charlotte Foodies" community
    When the create post screen opens
    Then "Charlotte Foodies" should be pre-selected
    And I can add more communities if desired
    And after posting, I return to "Charlotte Foodies"
```

### Test Case 3: Different Post Types in Communities
```gherkin
Feature: Various community content types
  As a community member
  I want to share different content
  So that I can engage appropriately

  Scenario: Text-only discussion
    Given I create a text-only discussion
    When I post to a community
    Then I see "Posted!" toast
    And I return to the community
    And my text post appears in the feed

  Scenario: Photo post
    Given I create a post with photos
    When I share to community
    Then I see "Posted!" toast
    And photos upload in background
    And I can continue browsing while uploading

  Scenario: Link sharing
    Given I share an external link
    When I post to community
    Then I see "Posted!" toast
    And link preview appears in my post
    And I stay in the community feed
```

### Test Case 4: Toast Consistency
```gherkin
Feature: Consistent toast behavior
  As a user posting content
  I want predictable confirmations
  So that I know my posts succeeded

  Scenario: Toast appearance
    Given I post any community discussion
    When the post succeeds
    Then the toast appears at screen bottom
    And it's positioned above the tab bar
    And it shows for exactly 3 seconds
    And it doesn't block any UI elements

  Scenario: Rapid posting
    Given I quickly post multiple discussions
    When toasts would overlap
    Then only the most recent toast shows
    And each replaces the previous one
    And no toast queue builds up
```

### Test Case 5: Error Scenarios
```gherkin
Feature: Discussion post failures
  As a user experiencing issues
  I want helpful error messages
  So that I can resolve problems

  Scenario: Network failure
    Given I have no internet connection
    When I try to post a discussion
    Then I see an error alert
    And it says "Failed to create post. Please try again."
    And I remain on create post screen
    And my content is preserved

  Scenario: Community permissions
    Given I lose posting permissions
    When I try to post
    Then I see appropriate error message
    And I'm not removed from the community
    And I can try again later
```

### Test Case 6: Navigation Flow
```gherkin
Feature: Contextual navigation
  As a user posting from various places
  I want to return to my origin
  So that my flow isn't disrupted

  Scenario Outline: Post from different origins
    Given I start from <origin>
    When I create and post a discussion
    Then I see success toast
    And I return to <origin>
    And my post is visible there if applicable

    Examples:
      | origin                    |
      | Community feed            |
      | Community info page       |
      | My profile posts          |
      | Activity feed             |
      | Search results            |

  Scenario: Deep link posting
    Given I open the app from a notification
    When I post in response
    Then I see the success toast
    And I stay in the relevant context
    And back navigation works correctly
```

### Test Case 7: Real-time Updates
```gherkin
Feature: Live community updates
  As a community member
  I want to see new content immediately
  So that discussions feel dynamic

  Scenario: Immediate post appearance
    Given I post a discussion
    When the toast appears
    Then my post is immediately visible
    And vote/comment counts start at 0
    And other online members see it instantly

  Scenario: Engagement tracking
    Given I just posted a discussion
    When other users interact with it
    Then I see real-time engagement updates
    And notifications work properly
    And the post remains visible in feed
```

### Test Verification Steps
1. **Post from various communities** and verify toast
2. **Test cross-posting** to multiple communities
3. **Verify immediate visibility** in feeds
4. **Test toast timing** (3 seconds)
5. **Check navigation flow** back to origin
6. **Test offline posting** behavior
7. **Verify no full-screen** success page
8. **Test with different content types** (text, photo, link)

### Expected Results
- ✅ Toast confirmation for all community posts
- ✅ Return to community feed after posting
- ✅ Posts appear immediately in feed
- ✅ Cross-posting works with single confirmation
- ✅ No full-screen success interruption
- ✅ Consistent 3-second toast duration
- ✅ Proper error handling with content preservation
- ✅ Real-time updates in community feeds