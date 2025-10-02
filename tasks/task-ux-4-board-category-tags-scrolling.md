# Fix Board Category & Tags - Make Optional and Scrollable

- Epic: UX
- Priority: Medium
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Board creation has two issues:
1. Category and tags are mandatory but shouldn't be
2. Category buttons/pills don't scroll, limiting selection to first 3 options

## Business Value
Mandatory fields create friction in board creation. Users should be able to create boards quickly without being forced to categorize. Limited category visibility prevents users from selecting appropriate categories.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Optional board categories and tags
  As a user
  I want to create boards without mandatory categorization
  So that I can save restaurants quickly

  Scenario: Create board without category
    Given I am creating a new board
    When I skip the category selection
    Then I can still create the board successfully
    And the board has no category assigned

  Scenario: Create board without tags
    Given I am creating a new board
    When I skip the tags field
    Then I can still create the board successfully

Feature: Scrollable category selection
  As a user
  I want to see all available categories
  So that I can choose the most appropriate one

  Scenario: Scroll through categories
    Given I am on the category selection screen
    When there are more than 3 categories
    Then I can horizontally scroll to see all options
    And all categories are selectable
```

## Technical Implementation
- Update board creation form validation
  - Remove required validation from category field
  - Remove required validation from tags field
- Wrap category pills in horizontal ScrollView
  - Set showsHorizontalScrollIndicator={false}
  - Add proper spacing/padding
- Update UI to show category/tags as optional
  - Change label text to "Category (optional)"
  - Change tags label to "Tags (optional)"
- Update database schema if category is NOT NULL
  - Make category nullable in boards table
- Update any queries that assume category exists

## Definition of Done
- [ ] Category and tags are optional
- [ ] All categories visible via scrolling
- [ ] Form validation updated
- [ ] Database schema updated if needed
- [ ] Existing boards with no category handled gracefully
- [ ] UI labels indicate optional fields
- [ ] Tested on both iOS and Android

## Notes
Quick win that removes friction from core user flow.
