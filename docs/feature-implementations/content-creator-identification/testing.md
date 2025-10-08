# Manual Testing Guide: Content Creator Self-Identification

## Test Scenarios

### Scenario 1: Access Content Creator Settings
**Pre-conditions:**
- User is logged in
- User is on any screen

**Steps:**
1. Navigate to Profile tab (rightmost tab)
2. Tap the Settings icon (gear icon in top right)
3. In the Settings modal, look for "Content Creator" option (with star icon)
4. Tap on "Content Creator"

**Expected Result:**
- Settings modal closes
- Content Creator settings screen opens
- Toggle switch shows current status
- Benefits and guidelines are visible

### Scenario 2: Enable Content Creator Status
**Pre-conditions:**
- User is not currently a content creator
- User is on Content Creator settings screen

**Steps:**
1. Read through the information provided
2. Toggle the "I'm a Content Creator" switch to ON
3. Wait for the save operation

**Expected Result:**
- Toggle switches to orange (enabled)
- Success toast: "You are now identified as a content creator! 🎉"
- Green status badge appears: "You're identified as a content creator"
- Creator stats section appears at bottom

### Scenario 3: Disable Content Creator Status
**Pre-conditions:**
- User is currently identified as content creator
- Toggle is ON

**Steps:**
1. Toggle the "I'm a Content Creator" switch to OFF
2. Wait for the save operation

**Expected Result:**
- Toggle switches to gray (disabled)
- Success toast: "Content creator status removed"
- Status badge disappears
- Creator stats section disappears

### Scenario 4: Verify Benefits Section
**Pre-conditions:**
- User is on Content Creator settings screen

**Steps:**
1. Scroll down to "Creator Benefits" section
2. Review all four benefit items

**Expected Result:**
Should see these benefits with icons:
- Creator Badge (with checkmark icon)
- Content Priority (with camera icon)
- Creator Insights (with award icon)
- Professional Tools (with pen icon)

### Scenario 5: Check Guidelines
**Pre-conditions:**
- User is on Content Creator settings screen

**Steps:**
1. Scroll to "Creator Guidelines" section
2. Read all guidelines

**Expected Result:**
Guidelines displayed:
- Share authentic, original content
- Engage respectfully with the community
- Provide honest reviews and recommendations
- Help others discover great food experiences

### Scenario 6: Creator Statistics
**Pre-conditions:**
- User has enabled content creator status

**Steps:**
1. Scroll to bottom of screen
2. View "Your Creator Stats" section

**Expected Result:**
- Shows three stat cards:
  - Reviews count
  - Followers count
  - Saves count
- Numbers should match user's actual stats

### Scenario 7: Network Error Handling
**Pre-conditions:**
- User is on Content Creator settings screen

**Steps:**
1. Turn on Airplane mode
2. Try to toggle the creator status
3. Turn off Airplane mode

**Expected Result:**
- Error toast: "Failed to update creator status"
- Toggle reverts to previous state
- No crash or freeze

### Scenario 8: Loading States
**Pre-conditions:**
- Fresh app launch

**Steps:**
1. Navigate quickly to Content Creator settings
2. Observe initial load

**Expected Result:**
- Loading spinner appears while fetching profile
- "Loading..." text displayed
- Screen loads smoothly once data arrives

### Scenario 9: Navigation Flow
**Pre-conditions:**
- User is on Content Creator settings

**Steps:**
1. Tap back arrow (top left)
2. Navigate back to Settings
3. Close Settings modal

**Expected Result:**
- Back arrow returns to previous screen
- Settings modal can be reopened
- Content Creator option still accessible

### Scenario 10: Persistence Check
**Pre-conditions:**
- User has toggled creator status

**Steps:**
1. Enable/disable creator status
2. Navigate away from the screen
3. Close the app completely
4. Reopen app and return to Content Creator settings

**Expected Result:**
- Toggle state persists across app sessions
- Status matches what was last set
- No data loss

## Edge Cases to Test

### Multiple Rapid Toggles
**Steps:**
1. Toggle switch rapidly multiple times

**Expected Result:**
- Only one request processes at a time
- Final state matches last toggle
- No errors or crashes

### Long Bio/Name Users
**Steps:**
1. Test with users who have very long names or bios

**Expected Result:**
- UI remains intact
- Text truncates appropriately
- Layout doesn't break

## Verification Checklist
- [ ] Settings entry point works
- [ ] Screen loads without errors
- [ ] Toggle switch functions properly
- [ ] Success messages appear
- [ ] Error messages appear on failure
- [ ] Status badge shows when enabled
- [ ] Benefits section displays correctly
- [ ] Guidelines are readable
- [ ] Creator stats show (when enabled)
- [ ] Navigation works smoothly
- [ ] State persists across sessions
- [ ] Loading states appear appropriately
- [ ] Network errors handled gracefully

## Platform Testing
- Test on iOS devices
- Test on Android devices
- Verify smooth animations
- Check text scaling with system font sizes

## Performance Testing
- Screen loads quickly (< 2 seconds)
- Toggle response is immediate
- No lag when scrolling
- Smooth transitions

## Accessibility Testing
- Screen reader compatibility
- Touch targets are adequate size
- Color contrast is sufficient
- Text is readable

## Notes for Testers
- The creator badge on posts/profile is a future feature
- Analytics mentioned in benefits are planned features
- Creator status is stored per user account
- Multiple accounts can each have different creator status