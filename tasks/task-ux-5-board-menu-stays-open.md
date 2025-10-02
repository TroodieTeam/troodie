# Fix Board Three-Dot Menu Stays Open

- Epic: UX
- Priority: Medium
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
The three-dot menu in the top right (Edit board, Delete board) stays open even when tapping outside. Users have to leave the board screen to close it.

## Business Value
Poor UX creates frustration. Users expect menus to close when tapping outside (standard mobile behavior). This makes the app feel unpolished.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Board menu dismiss behavior
  As a user
  I want the three-dot menu to close when I tap outside
  So that I don't have to leave the screen

  Scenario: Tap outside to close menu
    Given the three-dot menu is open
    When I tap anywhere outside the menu
    Then the menu closes
    And I remain on the board screen

  Scenario: Tap menu item
    Given the three-dot menu is open
    When I tap a menu item (Edit/Delete)
    Then the menu closes
    And the selected action executes

  Scenario: Back button closes menu
    Given the three-dot menu is open
    When I press the device back button (Android)
    Then the menu closes
    And I remain on the board screen
```

## Technical Implementation
- Identify the menu component being used (likely a custom modal or ActionSheet)
- If using Modal:
  - Wrap content in TouchableWithoutFeedback
  - Add onPress to overlay that calls closeMenu
- If using ActionSheet/BottomSheet:
  - Ensure enablePanDownToClose is true
  - Ensure backdrop is tappable
- Add proper onBackdropPress handler
- Consider using @gorhom/bottom-sheet or react-native-action-sheet for better behavior
- Add Android hardware back button handler
- Test gesture interactions

## Definition of Done
- [ ] Menu closes when tapping outside
- [ ] Menu closes when selecting an option
- [ ] Android back button closes menu
- [ ] No visual glitches during close animation
- [ ] Consistent with other menus in the app
- [ ] Tested on iOS and Android

## Notes
Likely a simple fix - just need to add backdrop press handler. Common issue with custom modal implementations.
