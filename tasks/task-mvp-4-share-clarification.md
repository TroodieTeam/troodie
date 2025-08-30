# Clarify Share vs Restaurant Review Options

- Epic: MVP
- Priority: Medium
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
The prompt "What would you like to share?" is confusing when it presents both 'Share' and 'Restaurant Review' options. Users need clear distinction between sharing content and writing reviews.

## Business Value
Clear UX copy reduces user confusion and increases successful task completion. This improves overall user satisfaction and reduces support requests.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Clear sharing options
  As a user wanting to share content
  I want clear options that explain what each does
  So that I can choose the right action

  Scenario: Viewing sharing options
    Given I want to share something about a restaurant
    When I see the sharing menu
    Then I should see clearly labeled options:
      - "Write a Review" with description about rating/reviewing
      - "Share to Community" with description about posting
      - Icons that differentiate each action

  Scenario: Understanding the difference
    Given I see the sharing options
    When I read the labels and descriptions
    Then I should immediately understand:
      - Reviews are for rating and detailed feedback
      - Shares are for quick posts or recommendations
```

## Technical Implementation
- Update sharing menu UI copy:
  - Change "Restaurant Review" to "Write a Review"
  - Change "Share" to "Share to Community" or "Create Post"
- Add descriptive subtitles under each option
- Consider adding icons to visually differentiate
- Update any related help text or tooltips
- Ensure consistency across the app
- A/B test if possible to validate improvements

## Definition of Done
- [ ] New copy is implemented in sharing menu
- [ ] Options are clearly differentiated
- [ ] Icons added if applicable
- [ ] Copy is consistent throughout app
- [ ] User testing shows reduced confusion
- [ ] No grammatical or spelling errors
- [ ] Translations updated if applicable

## Notes
- Consider user research on terminology
- May need to update onboarding to explain difference
- Track metrics on option selection to validate improvement

## Implementation Status
✅ **Implemented on 8/30/2025**
- Updated strings in `constants/strings.ts`: "Share to Community" instead of "Create a Post"
- Changed create-post screen: "Share to Community" vs "Restaurant Review" toggle
- Added "Write Review" button text on restaurant detail screen
- Clearer distinction between sharing content and writing reviews

## Manual Test Cases

### Test Case 1: Add Tab Options
```gherkin
Feature: Clear options in Add tab
  As a user on the Add tab
  I want to understand the difference between options
  So that I can choose the right action

  Scenario: Viewing Add tab options
    Given I am logged into the app
    When I tap the Add tab (+ icon)
    Then I should see "Share to Community" with description "Post photos, stories, or recommendations"
    And I should NOT see confusing text like "Create a Post"
    And the "Add Restaurant" option should be clearly separate
    And each option should have a distinct icon
```

### Test Case 2: Create Post Screen Toggle
```gherkin
Feature: Post type selection clarity
  As a user creating content
  I want clear post type options
  So that I know what kind of content I'm creating

  Scenario: Selecting post type
    Given I tap "Share to Community" from the Add tab
    When I see the create post screen
    Then I should see two toggle options:
      | Option              | Icon               |
      | Share to Community  | create-outline     |
      | Restaurant Review   | restaurant         |
    And "Share to Community" should be selected by default
    And the options should be visually distinct with different colors when active

  Scenario: Restaurant Review requirements
    Given I am on the create post screen
    When I toggle to "Restaurant Review"
    Then I should see required fields appear:
      | Field      | Required |
      | Restaurant | Yes      |
      | Rating     | Yes      |
    And these fields should NOT appear for "Share to Community"
```

### Test Case 3: Restaurant Detail Actions
```gherkin
Feature: Restaurant page actions
  As a user viewing a restaurant
  I want clear action buttons
  So that I know how to interact

  Scenario: Restaurant detail buttons
    Given I am viewing any restaurant detail page
    When I look at the action buttons
    Then I should see a "Save" button with bookmark icon
    And I should see a "Write Review" button with message icon
    And the "Write Review" text should be visible next to the icon
    And tapping "Write Review" should open create post with "Restaurant Review" selected

  Scenario: Pre-populated review
    Given I am on a restaurant detail page
    When I tap "Write Review"
    Then the create post screen should open
    And "Restaurant Review" should be pre-selected
    And the restaurant should be pre-filled
    And I should NOT need to search for the restaurant again
```

### Test Case 4: Context-Appropriate Language
```gherkin
Feature: Contextual clarity throughout app
  As a user navigating the app
  I want consistent, clear language
  So that I'm never confused about actions

  Scenario: Community posting
    Given I am in any community
    When I tap the create post button
    Then the screen should show "Share to Community" as the default
    And the community should be pre-selected
    And the language should emphasize sharing/discussing

  Scenario: Restaurant context
    Given I am anywhere with restaurant context
    When I initiate a post about a restaurant
    Then the language should emphasize "review" and "rating"
    And required fields should make the review nature clear
```

### Test Case 5: User Flow Validation
```gherkin
Feature: Complete user journeys
  As different types of users
  I want to complete my intended actions
  So that I achieve my goals without confusion

  Scenario: Casual sharer flow
    Given I want to share a food photo
    When I go to Add tab
    Then I tap "Share to Community"
    And I stay in "Share to Community" mode
    And I add my photo and caption
    And I post without needing a restaurant or rating

  Scenario: Restaurant reviewer flow
    Given I want to review a restaurant I visited
    When I search for the restaurant
    Then I tap on the restaurant
    And I tap "Write Review"
    And the form clearly shows I'm writing a review
    And I must add a rating to submit
```

### Test Verification Steps
1. **Navigate to Add tab** and verify all copy changes
2. **Create both types of posts** to ensure distinction
3. **Check restaurant detail page** for "Write Review" button
4. **Verify pre-selection** when coming from restaurant context
5. **Test with new users** who haven't seen old copy
6. **Check all entry points** to create content

### Expected Results
- ✅ No more "What would you like to share?" confusion
- ✅ Clear distinction between community posts and reviews
- ✅ "Write Review" visible on restaurant pages
- ✅ Appropriate fields show for each post type
- ✅ Users select correct option first time
- ✅ Reduced support tickets about sharing vs reviewing