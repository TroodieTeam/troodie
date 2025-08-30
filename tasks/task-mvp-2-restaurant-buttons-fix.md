# Fix Non-Functional Buttons on Restaurant Detail Screen

- Epic: MVP
- Priority: Critical
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Three buttons on the restaurant detail screen are currently non-functional. These need to either be properly implemented or removed to avoid user frustration and confusion.

## Business Value
Non-functional UI elements damage user trust and create a perception of an incomplete product. This directly impacts user retention and satisfaction scores.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Restaurant detail screen actions
  As a user viewing a restaurant
  I want all visible buttons to work
  So that I can interact with the restaurant as expected

  Scenario: All buttons are functional
    Given I am on a restaurant detail screen
    When I see action buttons
    Then each button should either:
      - Perform its intended action when tapped
      - OR not be visible if functionality isn't ready

  Scenario: Button functionality verification
    Given I am viewing restaurant details
    When I tap each action button
    Then I should see appropriate response:
      - Navigation to relevant screen
      - Action confirmation
      - Or appropriate feedback message
```

## Technical Implementation
- Audit all buttons on restaurant detail screen
- Identify the three non-functional buttons
- For each button, determine:
  - Intended functionality
  - Implementation feasibility for MVP
  - Priority for user experience
- Either:
  - Implement the functionality
  - Hide/remove the buttons until ready
  - Replace with "Coming Soon" state if appropriate
- Add proper touch feedback and loading states

## Definition of Done
- [ ] All visible buttons on restaurant detail are functional
- [ ] Removed or hidden any non-ready features
- [ ] Touch feedback works on all interactive elements
- [ ] No console errors when tapping buttons
- [ ] Tested on both iPhone and iPad
- [ ] User can complete all advertised actions

## Notes
- Priority is to not mislead users with non-functional UI
- Consider adding analytics to track button usage
- Document which features were deferred for future releases