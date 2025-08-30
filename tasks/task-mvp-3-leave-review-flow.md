# Implement Leave a Review Flow

- Epic: MVP
- Priority: High
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: task-mvp-2-restaurant-buttons-fix

## Overview
The "Leave a Review" functionality needs to be properly implemented, allowing users to write and submit reviews for restaurants. This is a core feature for user engagement.

## Business Value
Reviews are essential for community engagement and provide value to other users making dining decisions. This feature drives user-generated content and increases app stickiness.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Restaurant review submission
  As a user who has visited a restaurant
  I want to leave a review
  So that I can share my experience with the community

  Scenario: Successfully leaving a review
    Given I am on a restaurant detail page
    When I tap "Leave a Review"
    Then I should see a review form with:
      - Rating selector (stars or similar)
      - Text input for review content
      - Optional photo upload
      - Submit and Cancel buttons

  Scenario: Submitting a review
    Given I have filled out the review form
    When I tap Submit
    Then my review should be saved
    And I should see a success confirmation
    And the review should appear on the restaurant page
    And I should remain on the current screen

  Scenario: Review validation
    Given I am on the review form
    When I try to submit without required fields
    Then I should see appropriate validation messages
    And the form should highlight missing fields
```

## Technical Implementation
- Create review form component with:
  - Star rating component (1-5 stars)
  - Multiline text input with character limit
  - Photo upload capability (optional)
  - Form validation
- Implement review submission API endpoint
- Add review to restaurant's review list
- Update restaurant rating calculation
- Add optimistic UI updates
- Implement proper error handling
- Consider draft saving for longer reviews

## Definition of Done
- [ ] Review form is fully functional
- [ ] Reviews save to database successfully
- [ ] Reviews appear immediately after submission
- [ ] Validation prevents empty reviews
- [ ] Character limits are enforced
- [ ] Photos can be attached (if implemented)
- [ ] Success feedback is clear
- [ ] Error states are handled gracefully
- [ ] Works on all device sizes

## Notes
- Consider implementing a minimum character count
- May want to add review editing capability in future
- Think about moderation queue for reviews