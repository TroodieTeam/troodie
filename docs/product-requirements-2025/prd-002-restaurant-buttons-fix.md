# PRD-002: Restaurant Detail Screen Button Fixes

## Problem Statement
Three buttons on restaurant detail screen are non-functional, preventing users from taking key actions.

## Priority
**Critical** - MVP Pre-pitch (By 9/3)

## Current Behavior
- Buttons appear clickable but don't respond
- No feedback when tapped
- Users may think app is broken

## Assumptions
1. Buttons are UI placeholders without implementation
2. May be feature flags that aren't enabled
3. Could be permission-based features not properly gated
4. Buttons might be: "Leave a Review", "Share", "Call"

## Questions for Founder
1. Which specific three buttons aren't working?
2. What should each button do when functional?
3. Are these features planned for MVP or future release?
4. Should non-ready features be hidden or show "Coming Soon"?
5. Any buttons that require user authentication?

## Proposed Solution
1. Implement functionality for MVP-critical buttons
2. Hide or disable buttons for future features
3. Add proper error handling and user feedback
4. Ensure consistent button behavior across app

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Restaurant Detail Actions
  As a user viewing a restaurant
  I want all visible buttons to be functional
  So that I can interact with the restaurant

  Background:
    Given I am viewing a restaurant detail page
    And the restaurant data is fully loaded

  Scenario: Leave a Review button functionality
    Given I am authenticated as a user
    When I tap the "Leave a Review" button
    Then I should be taken to the review creation screen
    And the restaurant context should be maintained
    And I can submit a review successfully

  Scenario: Share Restaurant button
    Given the share button is visible
    When I tap the "Share" button
    Then the system share sheet should appear
    And it should include restaurant name and link
    And I can share via any installed app
    And the share action should be tracked

  Scenario: Call Restaurant button
    Given the restaurant has a phone number
    When I tap the "Call" button
    Then I should see a confirmation dialog
    And selecting "Call" opens the phone dialer
    And the correct number is pre-filled

  Scenario: Directions button
    Given the restaurant has an address
    When I tap the "Directions" button
    Then the default maps app should open
    And the restaurant location should be the destination
    And current location should be the starting point

  Scenario: Save Restaurant button
    Given I am authenticated
    When I tap the "Save" button
    Then the board selection modal should appear
    And I can select or create a board
    And the save is confirmed with a toast

  Scenario: Non-implemented button handling
    Given a button feature is not yet available
    When I tap the button
    Then I should see a "Coming Soon" message
    And the button should be visually disabled
    And no error should occur

  Scenario: Authentication required buttons
    Given I am not logged in
    And a button requires authentication
    When I tap the button
    Then I should see the login prompt
    And after login, the action should complete
```

## Technical Implementation

### Required Changes

1. **Review Button Implementation**
   ```typescript
   - Navigate to review creation screen
   - Pass restaurant ID and details
   - Handle authentication check
   - Track analytics event
   ```

2. **Share Button Implementation**
   ```typescript
   - Generate shareable link
   - Include restaurant name and image
   - Use React Native Share API
   - Track share events
   ```

3. **Call Button Implementation**
   ```typescript
   - Check for phone number availability
   - Format phone number properly
   - Use Linking API for phone dialer
   - Handle permission if needed
   ```

4. **Button State Management**
   - Disabled state for non-ready features
   - Loading state during actions
   - Error state handling
   - Success feedback

### Code Areas to Review
- Restaurant detail screen component
- Button action handlers
- Navigation configuration
- Authentication gates
- Analytics tracking

## Success Metrics
- 100% of visible buttons are functional
- Zero error reports for button taps
- Increased user engagement with restaurant actions
- Reduced support tickets about broken features

## Testing Requirements
1. Test each button with authenticated user
2. Test each button with guest user
3. Test error scenarios (no network, missing data)
4. Test on both iOS and Android
5. Verify analytics tracking

## Edge Cases
- Restaurant without phone number
- Restaurant without address
- User without necessary permissions
- Offline mode behavior
- Deep linking to actions

## Dependencies
- Navigation system
- Authentication service
- Share API integration
- Phone/Maps linking
- Analytics service

## Rollback Plan
1. Quick fix: Hide non-functional buttons
2. Show toast explaining feature in development
3. Revert to previous version if critical issues

## Future Enhancements
- Add haptic feedback on button press
- Implement button loading states
- Add confirmation dialogs for destructive actions
- Cache button states for performance

## Notes
- Critical for demo - all visible UI must work
- Consider adding button tooltips
- Ensure consistent button styling
- Test with real restaurant data

---
*PRD Version: 1.0*
*Created: 2025-01-13*
*Target Completion: 9/3 (Pre-pitch)*