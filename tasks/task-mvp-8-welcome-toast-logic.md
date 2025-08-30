# Update Welcome Toast Display Logic

- Epic: MVP
- Priority: Medium
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
The "Welcome to Troodie" toast currently shows indefinitely. It should disappear after the first three uses or be replaced with more relevant CTAs based on user behavior.

## Business Value
Repetitive welcome messages annoy returning users and waste valuable screen real estate that could promote engagement with contextual CTAs.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Smart welcome message management
  As a returning user
  I want relevant messages instead of repetitive welcomes
  So that I get value from notifications

  Scenario: New user sees welcome toast
    Given I am a new user
    When I open the app for the 1st, 2nd, or 3rd time
    Then I should see "Welcome to Troodie" toast
    And it should display for 3-5 seconds

  Scenario: Returning user experience
    Given I have opened the app more than 3 times
    When I open the app again
    Then I should NOT see "Welcome to Troodie"
    And I should see either:
      - No toast at all
      - OR a contextual CTA based on my activity

  Scenario: Contextual CTAs for engaged users
    Given I am a returning user (>3 sessions)
    When I haven't completed certain actions
    Then I might see relevant prompts like:
      - "Discover trending restaurants"
      - "Share your first review"
      - "Follow food lovers like you"
```

## Technical Implementation
- Implement session counter in AsyncStorage:
  - Track app open count
  - Persist across app sessions
- Create toast display logic:
  - Show welcome for sessions 1-3
  - Hide after session 3
- Implement contextual CTA system:
  - Check user activity flags
  - Determine most relevant CTA
  - Rotate CTAs to avoid repetition
- CTA examples based on user state:
  - No saves: "Save your first restaurant"
  - No reviews: "Share your dining experience"
  - No follows: "Connect with foodies"
  - Inactive: "Check out what's trending"
- Add analytics to track CTA effectiveness

## Definition of Done
- [ ] Session counter implemented and persisted
- [ ] Welcome toast stops after 3rd session
- [ ] Contextual CTAs implemented (at least 3)
- [ ] CTAs are relevant to user state
- [ ] Toast timing is consistent (3-5 seconds)
- [ ] Analytics events track toast impressions
- [ ] No toast spam for power users
- [ ] Clean migration for existing users

## Notes
- Consider A/B testing different CTA messages
- May want to add "Don't show again" option
- Could tie into push notification preferences