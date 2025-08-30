# Fix Index Flash When Downloading App

- Epic: MVP
- Priority: High
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
The app's index screen flashes or shows briefly when users download and first open the app, creating a poor first impression. This should transition smoothly without visual glitches.

## Business Value
First impressions matter - a flashing index screen makes the app feel buggy and unprofessional to new users. Fixing this improves perceived app quality and reduces early abandonment.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Smooth app launch experience
  As a new user downloading the app
  I want a smooth launch without visual glitches
  So that I have confidence in the app's quality

  Scenario: First app launch after download
    Given I have just downloaded the app
    When I open it for the first time
    Then I should see a smooth loading sequence
    And no index screen should flash or appear briefly
    And the app should transition directly to onboarding or home

  Scenario: Subsequent app launches
    Given I have already opened the app before
    When I launch the app again
    Then the launch should be smooth without flashing
    And I should go directly to the appropriate screen
```

## Technical Implementation
- Review app initialization sequence and splash screen timing
- Check for race conditions in navigation stack initialization
- Ensure proper async/await handling during app boot
- Verify splash screen dismissal timing matches content readiness
- Consider implementing a proper loading state manager
- Test on various device speeds (older/slower devices especially)

## Definition of Done
- [ ] No visible flash of index screen on first launch
- [ ] Smooth transition from splash to first screen
- [ ] Tested on multiple iOS devices (iPhone 12-15, various iPads)
- [ ] Loading states properly managed
- [ ] No regression in subsequent app launches
- [ ] Performance metrics show improved launch time

## Notes
- This is a critical UX issue affecting every new user
- May require adjusting React Navigation initialization
- Consider implementing a proper splash screen library if not already used

## Implementation Status
✅ **Implemented on 8/30/2025**
- Coordinated splash screen hiding with both font and auth loading states in `app/_layout.tsx`
- Index screen now returns null instead of loading indicator in `app/index.tsx`
- Splash screen remains visible until both fonts and authentication are ready

## Manual Test Cases

### Test Case 1: Fresh App Install
```gherkin
Feature: Smooth app launch on first install
  As a new user installing the app for the first time
  I want a smooth launch experience
  So that I don't see any flashing screens

  Scenario: First launch after fresh install
    Given I have deleted the app if previously installed
    And I install the app fresh from TestFlight/App Store
    When I tap to open the app for the first time
    Then I should see the native splash screen with Troodie logo
    And the splash screen should remain visible for 1-2 seconds
    And I should NOT see any white flash or loading indicator
    And I should transition directly to the onboarding splash screen
    And the transition should be smooth without any flicker
```

### Test Case 2: Slow Network Launch
```gherkin
Feature: App launch with slow network
  As a user with slow internet connection
  I want the app to launch smoothly
  So that I don't see loading states flash

  Scenario: Launch with throttled network
    Given I enable Network Link Conditioner with "3G" profile
    When I launch the app
    Then the splash screen should stay visible while loading
    And I should NOT see the index screen flash
    And I should NOT see any loading spinner briefly appear
    And the app should wait for auth check before hiding splash
```

### Test Case 3: Authenticated User Launch
```gherkin
Feature: App launch for returning users
  As a logged-in user
  I want to launch directly to home
  So that I can quickly access the app

  Scenario: Launch with existing session
    Given I am already logged into the app
    And I force quit the app
    When I relaunch the app
    Then I should see the splash screen briefly
    And I should NOT see any index screen flash
    And I should transition directly to the home tabs
    And the transition should be seamless
```

### Test Case 4: Anonymous User Launch
```gherkin
Feature: App launch for anonymous users
  As an anonymous user browsing the app
  I want smooth app launches
  So that my experience isn't interrupted

  Scenario: Launch as anonymous user
    Given I have previously browsed anonymously
    And I force quit the app
    When I relaunch the app
    Then I should see the splash screen
    And I should NOT see the index screen flash
    And I should go directly to the home tabs
    And no authentication prompt should appear
```

### Test Case 5: Multiple Device Testing
```gherkin
Feature: Consistent launch across devices
  As a QA tester
  I want consistent behavior across all iOS devices
  So that all users have the same experience

  Scenario Outline: Launch on different devices
    Given I have the app installed on <device>
    When I launch the app for the first time
    Then I should NOT see an index screen flash
    And the splash screen timing should feel natural
    And fonts should be loaded before content appears

    Examples:
      | device          |
      | iPhone SE 2020  |
      | iPhone 12       |
      | iPhone 14 Pro   |
      | iPhone 15       |
      | iPad Air        |
      | iPad Pro 12.9   |
```

### Test Verification Steps
1. **Delete app and reinstall** to test fresh install experience
2. **Use Network Link Conditioner** to simulate slow connections
3. **Test on multiple devices** especially older/slower ones
4. **Record screen** during launch to review frame-by-frame
5. **Test both light and dark mode** system settings
6. **Force quit and relaunch** multiple times rapidly

### Expected Results
- ✅ No white flash between splash and first screen
- ✅ No brief appearance of loading indicators
- ✅ Smooth transition from splash to onboarding/home
- ✅ Consistent behavior across all devices
- ✅ Splash screen visible for appropriate duration (1-2 seconds minimum)