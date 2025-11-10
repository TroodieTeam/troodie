# Fix Onboarding UI on iPhone 16

- Epic: Onboarding
- Priority: Critical
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Onboarding UI appears jumbled on iPhone 16 - elements feel zoomed in, can't scroll to bottom answer choices in quiz, overall feels too large.

## Business Value
Broken onboarding = lost users. First impression is critical. iPhone 16 is a new flagship device, many new users will have it.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: iPhone 16 compatible onboarding
  As a new user with iPhone 16
  I want the onboarding to display correctly
  So that I can complete sign up

  Scenario: Quiz answer visibility
    Given I'm on a quiz question
    When there are 5+ answer choices
    Then I can scroll to see all options
    And the bottom answers aren't cut off

  Scenario: Proper scaling
    Given I'm on any onboarding screen
    When I view the content
    Then text is readable (not too large)
    And elements fit within the viewport
    And spacing is appropriate

  Scenario: Safe area handling
    Given iPhone 16 has specific safe areas
    When I view onboarding screens
    Then content respects safe area insets
    And buttons aren't covered by home indicator
```

## Technical Implementation

### Debug iPhone 16 Specific Issues
- iPhone 16 Pro: 393 x 852 points (@3x)
- iPhone 16 Pro Max: 430 x 932 points (@3x)
- Check if SafeAreaView is properly configured
- Verify ScrollView configuration

### Fixes Needed

1. **Quiz ScrollView**
   ```tsx
   // Ensure quiz answers are in ScrollView
   <ScrollView
     contentContainerStyle={{ paddingBottom: 100 }}
     showsVerticalScrollIndicator={false}
   >
     {answers.map(answer => (
       <AnswerButton key={answer.id} {...answer} />
     ))}
   </ScrollView>
   ```

2. **Safe Area Handling**
   ```tsx
   import { useSafeAreaInsets } from 'react-native-safe-area-context';

   const insets = useSafeAreaInsets();

   <View style={{
     paddingTop: insets.top,
     paddingBottom: insets.bottom,
     flex: 1
   }}>
   ```

3. **Font Scaling**
   - Check if Dynamic Type is causing oversized text
   - Set `allowFontScaling={false}` on critical Text components
   - Or handle large text sizes gracefully

4. **Layout Debugging**
   - Add layout boundaries in dev mode
   - Use React Native Debugger to inspect view hierarchy
   - Test with accessibility text sizes

### Device-Specific Testing
- Test on iPhone 16 simulator
- Test on actual iPhone 16 device if possible
- Test with different text size settings
- Test in landscape mode

### Related Screens to Check
- Welcome screen
- Sign up form
- Quiz questions (all of them)
- Permission requests
- Profile setup

## Definition of Done
- [ ] All onboarding screens display correctly on iPhone 16
- [ ] Quiz answers fully scrollable
- [ ] No content cutoff
- [ ] Text sizes appropriate
- [ ] Safe areas respected
- [ ] Tested on iPhone 16 simulator
- [ ] Tested on actual device (if available)
- [ ] Works with large text accessibility settings
- [ ] No regressions on other devices

## Notes
From feedback: "UI looks jumbled on iPhone 16 during onboarding. Quiz UI: too large, can't scroll to bottom answer choices. Feels zoomed in (might be related to iPhone magnification settings)"

May be related to system accessibility settings, not just device size. Need to handle both cases.
