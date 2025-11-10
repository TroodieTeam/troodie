# Implement Save Restaurant with Context/Intention

- Epic: Restaurant Management
- Priority: High
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Replace generic saving with contextual categories: 'want to try,' 'been there,' 'favorite' plus ability to add notes, links, and tags.

## Business Value
Context makes saves more valuable and actionable. Users can differentiate between places they want to try vs. favorites. This improves recommendation quality and user organization.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Contextual restaurant saves
  As a user
  I want to save restaurants with context
  So that I remember why I saved them

  Scenario: Save as "Want to Try"
    Given I'm viewing a new restaurant
    When I save it and select "Want to Try"
    And I add a note "Saw on IG - great pasta"
    Then the restaurant is saved with that context
    And I can filter my saves by "Want to Try"

  Scenario: Save as "Been There"
    Given I visited a restaurant
    When I save it and select "Been There"
    And I can optionally add visit date
    Then it's saved with visited status
    And appears in my "Places I've Been" collection

  Scenario: Mark as Favorite
    Given I love a restaurant
    When I save it as "Favorite"
    Then it appears in my favorites
    And gets priority in recommendations

  Scenario: Add social media reference
    Given I'm saving a restaurant
    When I add an IG/TikTok link
    Then the link is saved with the restaurant
    And I can see the original post later
```

## Technical Implementation
- Update restaurant_saves schema:
  ```sql
  ALTER TABLE restaurant_saves ADD COLUMN save_type VARCHAR; -- want_to_try, been_there, favorite
  ALTER TABLE restaurant_saves ADD COLUMN notes TEXT;
  ALTER TABLE restaurant_saves ADD COLUMN source_url VARCHAR; -- IG/TikTok link
  ALTER TABLE restaurant_saves ADD COLUMN visited_date TIMESTAMP;
  ALTER TABLE restaurant_saves ADD COLUMN tags TEXT[]; -- flexible tagging
  ```
- Update save modal UI:
  - Add save type selector (3 prominent buttons/pills)
  - Add notes text input
  - Add "Saw on social?" toggle → URL input
  - Add optional visit date picker for "Been There"
  - Add tag input (autocomplete from user's existing tags)
- Update restaurant card/list views:
  - Show save type badge/icon
  - Display snippet of notes if present
  - Show social media icon if source_url exists
- Add filter functionality:
  - Filter by save type
  - Filter by tags
  - Filter by has notes / has social link
- Update restaurant recommendation algorithm to use context
- Add analytics for save types and note usage

## Definition of Done
- [ ] All save types implemented
- [ ] Notes and social links working
- [ ] Tag system functional with autocomplete
- [ ] Filters work correctly
- [ ] Migration for existing saves (default to "want_to_try")
- [ ] UI/UX matches design system
- [ ] Analytics tracking implemented
- [ ] Tested with various save scenarios

## Notes
From feedback: "Save with context/intention feature - implementing 'want to try,' 'been there,' 'favorite' categories instead of generic saving. Add context notes (ex. have been, want to go, saw on IG, link to the IG / TikTok post if applicable, etc.)"

This is a major UX improvement that adds structure to saves.
