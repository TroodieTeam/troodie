# Improve Restaurant Review Post Confirmation Flow

- Epic: MVP
- Priority: High
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: task-mvp-3-leave-review-flow

## Overview
After posting a restaurant review, users see a full-screen "Post Published" confirmation that prompts them to go back to home. Users prefer a toast notification and to stay on the current community screen to see their post.

## Business Value
Keeping users in context after actions reduces friction and improves engagement. Users want to see their contribution immediately without unnecessary navigation.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Review post confirmation
  As a user who just posted a review
  I want to stay on the current screen
  So that I can see my review in context

  Scenario: Successful review submission
    Given I am on a community/restaurant screen
    When I successfully submit a review
    Then I should see a brief toast notification saying "Review posted!"
    And I should remain on the current screen
    And my review should be visible in the feed
    And the toast should auto-dismiss after 3 seconds

  Scenario: Viewing my posted review
    Given I just posted a review
    When the toast appears
    Then I can immediately see my review in the list
    And I can continue browsing without interruption
    And other users' content remains visible
```

## Technical Implementation
- Replace full-screen confirmation with toast component
- Implement toast notification system if not exists:
  - Success variant for confirmations
  - Auto-dismiss after 3 seconds
  - Non-blocking UI element
- Keep user on current screen after post
- Refresh the feed to show new review immediately
- Add optimistic UI update for instant feedback
- Ensure smooth scroll to show new review if needed

## Definition of Done
- [ ] Full-screen confirmation removed
- [ ] Toast notification implemented
- [ ] User stays on current screen after posting
- [ ] New review appears immediately in feed
- [ ] Toast auto-dismisses appropriately
- [ ] No navigation jumps or flashes
- [ ] Works for all review submission flows
- [ ] Accessibility compliant (announcements)

## Notes
- This pattern should be consistent for all post types
- Consider adding haptic feedback on success
- May want "View" button in toast for navigation option

## Implementation Status
✅ **Implemented on 8/30/2025**
- Replaced full-screen post-success navigation in `app/add/create-post.tsx`
- Uses `ToastService.success()` for confirmation messages
- Navigation changed from `router.replace('/add/post-success')` to `router.back()`
- Toast shows "Review posted!" or "Posted!" based on post type
- Removed unused success overlay component and styles

## Manual Test Cases

### Test Case 1: Restaurant Review Posting
```gherkin
Feature: Restaurant review confirmation
  As a user posting a restaurant review
  I want to stay on the current screen after posting
  So that I can see my review in context

  Scenario: Post review from restaurant page
    Given I am on a restaurant detail page
    When I tap "Write Review"
    And I fill in my review with rating and text
    And I tap "Post"
    Then I should see a toast notification saying "Review posted!"
    And the toast should appear at the bottom of the screen
    And I should be returned to the restaurant detail page
    And I should NOT see a full-screen success page
    And I should NOT be navigated to the home screen

  Scenario: Review appears immediately
    Given I just posted a review
    When the toast appears
    Then I should be able to scroll and see my review in the restaurant's review list
    And the review should show my profile picture and name
    And the timestamp should show "just now"
```

### Test Case 2: Community Post Confirmation
```gherkin
Feature: Community post confirmation
  As a user sharing to a community
  I want to stay in the community after posting
  So that I can continue engaging

  Scenario: Post from community
    Given I am in a specific community screen
    When I create and submit a "Share to Community" post
    Then I should see a toast saying "Posted!"
    And the subtitle should say "Your post is now live in the community"
    And I should return to the community screen
    And my post should appear at the top of the feed
    And I should NOT see a full-screen confirmation

  Scenario: Cross-posting to multiple communities
    Given I am creating a post
    When I select multiple communities
    And I submit the post
    Then I should see a toast confirming the post
    And I should return to my previous screen
    And the post should appear in all selected communities
```

### Test Case 3: Toast Behavior
```gherkin
Feature: Toast notification behavior
  As a user seeing confirmations
  I want toasts to be non-intrusive
  So that they don't block my view

  Scenario: Toast positioning
    Given I have just posted content
    When the toast appears
    Then it should appear at the bottom of the screen
    And it should be above the tab bar (100px offset)
    And it should not cover important content
    And it should be centered horizontally

  Scenario: Toast auto-dismiss
    Given a toast notification is showing
    When 3 seconds have passed
    Then the toast should automatically disappear
    And it should fade out smoothly
    And I should be able to continue using the app

  Scenario: Multiple toasts
    Given I quickly post multiple items
    When multiple toasts would appear
    Then only the latest toast should be visible
    And previous toasts should be replaced
```

### Test Case 4: Error Handling
```gherkin
Feature: Post submission errors
  As a user experiencing issues
  I want clear error feedback
  So that I know what went wrong

  Scenario: Network error during post
    Given I have no internet connection
    When I try to submit a post
    Then I should see an error alert
    And the alert should say "Failed to create post. Please try again."
    And I should remain on the create post screen
    And my content should not be lost

  Scenario: Server error
    Given the server returns an error
    When I submit a post
    Then I should see an appropriate error message
    And I should stay on the create post screen
    And I should be able to retry
```

### Test Case 5: Navigation Context
```gherkin
Feature: Contextual navigation after posting
  As a user posting from different screens
  I want to return to where I was
  So that my flow isn't interrupted

  Scenario Outline: Post from different contexts
    Given I am on <origin_screen>
    When I create and post content
    Then I should see a success toast
    And I should return to <origin_screen>
    And I should see my new content if applicable

    Examples:
      | origin_screen           |
      | Restaurant detail page  |
      | Community feed          |
      | User profile            |
      | Home screen            |
      | Explore screen         |
```

### Test Case 6: Edit Mode
```gherkin
Feature: Editing existing posts
  As a user editing my content
  I want appropriate confirmation
  So that I know my changes were saved

  Scenario: Edit existing post
    Given I am editing an existing post
    When I save my changes
    Then I should see an alert saying "Post updated successfully"
    And I should be returned to the previous screen
    And the updated content should be visible
```

### Test Verification Steps
1. **Post from restaurant pages** and verify toast appears
2. **Post from communities** and check return navigation
3. **Time the toast duration** (should be 3 seconds)
4. **Test toast positioning** on different devices
5. **Verify no full-screen success** page appears
6. **Check immediate visibility** of posted content
7. **Test with slow network** to verify error handling
8. **Test rapid posting** to check toast queuing

### Expected Results
- ✅ Toast notifications instead of full-screen success
- ✅ Users stay on current screen after posting
- ✅ Posted content visible immediately in feed
- ✅ Toast auto-dismisses after 3 seconds
- ✅ Appropriate messages for reviews vs posts
- ✅ No navigation to home screen
- ✅ Content preserved on error