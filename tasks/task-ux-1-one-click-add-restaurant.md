# Fix One-Click Add Restaurant Behavior

- Epic: UX
- Priority: High
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Currently users need to click twice to add a restaurant (first adds, then shortlist). This needs to be condensed to one click that adds directly to a list or board.

## Business Value
Reduces friction in the core user action of saving restaurants. Every extra click reduces conversion and creates frustration. This directly impacts user engagement and satisfaction.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: One-click restaurant save
  As a user
  I want to save a restaurant with one tap
  So that I can quickly build my collection

  Scenario: First-time save shows selection menu
    Given I am viewing a restaurant that I haven't saved
    When I tap the save/add button
    Then I see a bottom sheet with my boards/lists
    And I can select where to save it
    And the restaurant is immediately added to the selected board

  Scenario: Quick save to recent board
    Given I recently saved a restaurant to a board
    When I tap save on another restaurant
    Then it's added to the most recent board
    And I see a confirmation toast with "Saved to [Board Name]"

  Scenario: Change save location
    Given I just saved a restaurant
    When I tap the save button again within 3 seconds
    Then I can change which board it's saved to
```

## Technical Implementation
- Update the restaurant card/detail save button component
- Implement bottom sheet for board selection on first tap
- Add "last used board" preference to user state/context
- Create toast notification component for save confirmation
- Remove the intermediate "shortlist" step entirely
- Add haptic feedback on successful save
- Track analytics: save_restaurant event with board_id

## Definition of Done
- [ ] Meets all acceptance criteria
- [ ] Works on both restaurant cards and detail pages
- [ ] Haptic feedback implemented
- [ ] Toast notifications show correct board name
- [ ] Analytics tracking verified
- [ ] Tested on iOS and Android
- [ ] No regression in existing save functionality

## Notes
User mentioned: "Currently need to click twice to add a restaurant (first adds, then shortlist). Condense to one click → adds directly"
