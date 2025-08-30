# Fix "Top Rated in..." Text Spacing Issues

- Epic: MVP
- Priority: High
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
The "Top Rated in..." section has spacing issues, particularly with "Winston-Salem" where the text and spacing push buttons off screen. This creates a broken UI appearance.

## Business Value
UI layout issues make the app appear unprofessional and can prevent users from accessing important functionality when buttons are pushed off-screen.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Proper text layout in Top Rated section
  As a user viewing top rated restaurants
  I want all text and buttons to be properly visible
  So that I can read and interact with all content

  Scenario: Long city names display correctly
    Given I am viewing the "Top Rated in Winston-Salem" section
    When the section renders
    Then the city name should wrap or truncate appropriately
    And all buttons should remain on screen
    And spacing should be consistent

  Scenario: Various city name lengths
    Given the app displays "Top Rated in [City]"
    When city names vary in length
    Then short names (SF, LA) should display normally
    And long names should handle gracefully:
      - Wrap to next line if needed
      - OR truncate with ellipsis
      - Never push UI elements off screen
```

## Technical Implementation
- Audit all instances of "Top Rated in..." display
- Implement text handling strategy:
  - Add numberOfLines prop with ellipsis
  - OR implement text wrapping with proper container
  - OR use responsive font sizing
- Fix Winston-Salem specific issue:
  - Check for hard-coded width constraints
  - Ensure flexible layout containers
- Test with various city names:
  - Short: SF, LA, NYC
  - Medium: San Francisco, Chicago
  - Long: Winston-Salem, Los Angeles
  - Very long: Check international cities
- Add proper flex properties to containers
- Ensure buttons have minimum touch targets

## Definition of Done
- [ ] Winston-Salem displays without breaking layout
- [ ] All buttons remain fully on screen
- [ ] Text handles all city name lengths gracefully
- [ ] Consistent spacing across different cities
- [ ] Works on all screen sizes (iPhone SE to iPad)
- [ ] No horizontal scrolling required
- [ ] Touch targets meet iOS guidelines (44x44)

## Notes
- Consider implementing a max character limit for display
- May need different layouts for phone vs tablet
- Check if issue exists in other text sections

## Implementation Status
✅ **Implemented on 8/30/2025**
- Added `numberOfLines={1}` and `ellipsizeMode="tail"` to section title in `app/(tabs)/index.tsx`
- Updated styles with `flexShrink: 1` and `marginRight` for proper spacing
- Title container uses flex layout to prevent button overflow
- Text truncates with ellipsis for long city names

## Manual Test Cases

### Test Case 1: Long City Names
```gherkin
Feature: Long city name display
  As a user in a city with a long name
  I want the UI to remain functional
  So that I can access all features

  Scenario: Winston-Salem display
    Given I am viewing the home screen
    When the city is set to "Winston-Salem"
    Then I should see "Top Rated in Winston-Salem"
    And the text should fit on one line
    And if it's too long, it should show "Top Rated in Winston-Sal..."
    And the city selector button should be fully visible
    And the button should be tappable

  Scenario: Very long city names
    Given I test with various long city names
    When I set the city to <city>
    Then the text should truncate with ellipsis
    And the city selector should remain on screen
    And no horizontal scrolling should occur

    Examples:
      | city                          |
      | San Francisco Bay Area        |
      | Washington, District of Columbia |
      | Saint-Paul-de-Vence          |
      | Llanfairpwllgwyngyll         |
```

### Test Case 2: Different Screen Sizes
```gherkin
Feature: Responsive text layout
  As a user on different devices
  I want consistent text display
  So that the UI works on all screens

  Scenario Outline: Device-specific testing
    Given I am using <device>
    When I view "Top Rated in Winston-Salem"
    Then the text should display appropriately
    And the city selector should be visible
    And buttons should have proper touch targets (44x44)
    And no UI elements should overlap

    Examples:
      | device         | screen_width |
      | iPhone SE 2020 | 375px       |
      | iPhone 12 Mini | 375px       |
      | iPhone 14      | 390px       |
      | iPhone 14 Plus | 428px       |
      | iPad Mini      | 768px       |
      | iPad Pro 12.9  | 1024px      |
```

### Test Case 3: City Selector Interaction
```gherkin
Feature: City selector functionality
  As a user wanting to change cities
  I want the selector to be accessible
  So that I can browse different locations

  Scenario: Selector remains accessible
    Given I have a long city name displayed
    When I look at the city selector button
    Then it should be fully visible on screen
    And it should not be cut off or pushed off screen
    And the touch target should be at least 44x44 points
    And tapping it should open the city selection modal

  Scenario: Button interaction with truncated text
    Given the city name is truncated with ellipsis
    When I tap the city selector
    Then the selector should respond immediately
    And the full city name should be visible in the modal
    And I should be able to select a different city
```

### Test Case 4: Layout Consistency
```gherkin
Feature: Consistent section headers
  As a user browsing the app
  I want consistent header layouts
  So that the UI feels cohesive

  Scenario: All section headers
    Given I scroll through the home screen
    When I view different sections
    Then all section titles should have consistent spacing
    And long titles should truncate consistently
    And action buttons should align properly
    And no text should push elements off screen

  Scenario: Dynamic content updates
    Given I am viewing "Top Rated in Charlotte"
    When I change to "Winston-Salem"
    Then the layout should update smoothly
    And no visual jumps should occur
    And the button should remain in the same position
```

### Test Case 5: Accessibility
```gherkin
Feature: Accessible text display
  As a user with accessibility needs
  I want text to be readable
  So that I can use the app effectively

  Scenario: VoiceOver compatibility
    Given VoiceOver is enabled
    When I navigate to "Top Rated in Winston-Salem"
    Then VoiceOver should read the full city name
    And the truncation should not affect accessibility
    And the city selector should be announced properly

  Scenario: Dynamic Type support
    Given I have Large Text enabled in iOS settings
    When I view the home screen
    Then text should scale appropriately
    And long city names should still truncate
    And buttons should remain accessible
    And layout should not break
```

### Test Case 6: Edge Cases
```gherkin
Feature: Handle edge cases gracefully
  As a QA tester
  I want to verify edge case handling
  So that the app is robust

  Scenario: Single character city
    Given the city is set to "X"
    When I view the home screen
    Then "Top Rated in X" should display normally
    And extra space should not cause layout issues

  Scenario: Empty or null city
    Given the city data is missing
    When the section renders
    Then it should show "Top Rated" or default text
    And the layout should not break
    And no errors should occur

  Scenario: Special characters
    Given the city contains special characters
    When displaying "Top Rated in Zürich"
    Then special characters should render correctly
    And text should truncate if needed
    And no encoding issues should occur
```

### Test Verification Steps
1. **Test with Winston-Salem** specifically as mentioned in task
2. **Check multiple devices** especially iPhone SE (smallest)
3. **Verify button accessibility** with touch target size
4. **Test text truncation** with very long city names
5. **Rotate device** to test landscape orientation
6. **Enable accessibility features** and verify functionality
7. **Test rapid city switching** to check for layout stability

### Expected Results
- ✅ Winston-Salem displays without breaking layout
- ✅ City selector button always visible and tappable
- ✅ Text truncates with ellipsis when too long
- ✅ No horizontal scrolling required
- ✅ Consistent spacing across all devices
- ✅ 44x44 point minimum touch targets maintained
- ✅ Smooth transitions when changing cities