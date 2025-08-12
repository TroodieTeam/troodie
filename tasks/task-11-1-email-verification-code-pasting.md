# Task 11.1: Email Verification Code Pasting

## Epic: User Experience Enhancements
**Priority**: High  
**Estimate**: 1 day  
**Status**: 🟡 Needs Review  
**Assignee**: –  
**Dependencies**: None  

---

## Overview
Implement clipboard pasting functionality for the email verification screen to allow users to paste a 6-digit verification code directly into the first input field, automatically populating all inputs and enabling the verify button.

## Business Value
- **Improved User Experience**: Eliminates the need to manually type each digit, reducing friction during the critical onboarding flow
- **Reduced Abandonment**: Faster verification process increases completion rates
- **Mobile-First Design**: Leverages common mobile user behavior of copying codes from emails/messages
- **Accessibility**: Provides an alternative input method for users who prefer copy-paste workflows

## Dependencies
- Existing email verification screen implementation
- Clipboard access functionality

## Blocks
- Enhanced user onboarding experience
- Improved verification flow efficiency

---

## Acceptance Criteria

### Feature: Email Verification Code Pasting
As a user completing email verification
I want to paste a 6-digit verification code from my clipboard
So that I can quickly complete the verification process without manual typing

#### Scenario: Pasting full verification code
Given I am on the email verification screen
And I have a 6-digit code copied to my clipboard
When I paste the code into the first input
Then all digits populate across the inputs in order
And the "Verify" button becomes enabled

#### Scenario: Pasting partial verification code
Given I am on the email verification screen
And I have a 4-digit code copied to my clipboard
When I paste the code into the first input
Then the first 4 inputs are populated
And the 5th input receives focus
And the "Verify" button remains disabled

#### Scenario: Pasting invalid characters
Given I am on the email verification screen
And I have "ABC123" copied to my clipboard
When I paste the code into the first input
Then only the numeric characters "123" are accepted
And the first 3 inputs are populated with "1", "2", "3"
And the 4th input receives focus

#### Scenario: Pasting empty clipboard
Given I am on the email verification screen
And my clipboard is empty
When I paste into the first input
Then no changes occur to the verification inputs
And the current focus remains unchanged

---

## Technical Implementation

### Clipboard Integration
```typescript
import * as Clipboard from 'expo-clipboard';

const handlePaste = async () => {
  try {
    const clipboardContent = await Clipboard.getStringAsync();
    if (clipboardContent) {
      processPastedCode(clipboardContent);
    }
  } catch (error) {
    console.warn('Failed to read clipboard:', error);
  }
};
```

### Code Processing Logic
```typescript
const processPastedCode = (pastedText: string) => {
  // Extract only numeric characters
  const numericCode = pastedText.replace(/\D/g, '');
  
  if (numericCode.length === 0) return;
  
  // Limit to 6 digits maximum
  const limitedCode = numericCode.slice(0, 6);
  
  // Update state
  const newCode = [...code];
  limitedCode.split('').forEach((digit, index) => {
    if (index < 6) {
      newCode[index] = digit;
    }
  });
  
  setCode(newCode);
  
  // Update validation state
  const fullCode = newCode.join('');
  setIsValid(fullCode.length === 6);
  
  // Focus appropriate input
  const nextFocusIndex = Math.min(limitedCode.length, 5);
  inputRefs.current[nextFocusIndex]?.focus();
};
```

### Input Enhancement
```typescript
<TextInput
  // ... existing props
  onPaste={handlePaste} // Add paste handler
  contextMenuHidden={false} // Enable context menu for paste option
/>
```

### Platform-Specific Considerations
- **iOS**: Use `onPaste` prop for TextInput
- **Android**: Implement long-press gesture to show paste option
- **Web**: Ensure clipboard API compatibility

---

## Definition of Done

- [ ] Clipboard pasting functionality implemented for verification code inputs
- [ ] Full 6-digit codes automatically populate all inputs
- [ ] Partial codes populate available inputs and focus next empty input
- [ ] Non-numeric characters are filtered out during paste
- [ ] Verify button state updates correctly after paste operations
- [ ] Paste functionality works on both iOS and Android
- [ ] Error handling implemented for clipboard access failures
- [ ] User testing confirms intuitive paste workflow
- [ ] No regression in existing manual input functionality
- [ ] Accessibility considerations addressed (screen reader support)

---

## Resources

- [Expo Clipboard Documentation](https://docs.expo.dev/versions/latest/sdk/clipboard/)
- [React Native TextInput onPaste](https://reactnative.dev/docs/textinput#onpaste)
- [Current verification screen implementation](app/onboarding/verify.tsx)

---

## Notes

### Implementation Considerations
- **Clipboard Permissions**: Ensure clipboard access doesn't require additional permissions on mobile
- **Performance**: Clipboard operations should be non-blocking and handle large content gracefully
- **User Feedback**: Consider subtle visual feedback when paste operation completes
- **Edge Cases**: Handle clipboard content that exceeds expected length or contains mixed content types

### Testing Scenarios
- Test with various clipboard content types (text, mixed content, empty)
- Verify behavior across different iOS and Android versions
- Test accessibility with screen readers
- Validate integration with existing auto-focus and validation logic

### Future Enhancements
- **Smart Paste**: Detect verification codes in longer text and extract them automatically
- **Paste History**: Remember recently pasted codes for quick re-use
- **Auto-verification**: Automatically submit when a valid 6-digit code is pasted
