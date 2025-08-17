# Test Guide: Fix Share Link Post Creation Flow

## Overview
This test guide covers the fix for the "Share a link" feature in the Create Post flow, which previously caused overlapping modals and buggy interactions.

## Prerequisites
- App installed and running on iOS or Android device/simulator
- User account created and logged in
- Access to test URLs (provided below)

## Test URLs to Use
```
TikTok: https://www.tiktok.com/@gordon_ramsay/video/7234567890
Instagram: https://www.instagram.com/p/CL1234567/
YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Twitter/X: https://x.com/elonmusk/status/1234567890
Generic: https://www.foodnetwork.com/recipes/best-pasta
Invalid: not-a-valid-url
Malformed: htp://missing-protocol.com
```

---

## Test Scenarios

### 1. Basic Link Attachment Flow
**Objective:** Verify the link modal opens without overlapping issues

**Steps:**
1. Tap the "+" button in bottom navigation
2. On Create Post screen, select "Share" as post type
3. Select "External Content" from content type options
4. Observe the "Share a link" option appears with a red link icon (indicating required)
5. Tap "Share a link" button

**Expected Results:**
- [ ] Link input modal slides up from bottom
- [ ] No other modals are visible behind it
- [ ] Modal has clear header "Add Link" with X button and Done button
- [ ] Input field is auto-focused with keyboard visible
- [ ] Placeholder text reads "Paste a link from TikTok, Instagram, YouTube..."
- [ ] Supported platforms list is visible at bottom

**Screenshot Points:** Modal open state, keyboard visible

---

### 2. Community Selector Conflict Test
**Objective:** Ensure community selector and link modal don't overlap

**Steps:**
1. Start creating a new post
2. Tap the community selector (Users icon section)
3. While community selector is open, tap "Share a link"

**Expected Results:**
- [ ] Community selector closes automatically
- [ ] Link modal opens cleanly
- [ ] No visual overlap or stuck UI elements
- [ ] Can close link modal and reopen community selector without issues

**Screenshot Points:** Transition between modals

---

### 3. URL Validation - Valid URLs
**Objective:** Test URL validation and normalization

**Steps:**
1. Open link modal
2. Test each valid URL from the list above:
   - Paste the URL
   - Tap the arrow button or press enter

**For each URL, verify:**
- [ ] URL is accepted without errors
- [ ] Loading indicator appears briefly
- [ ] Preview section appears with "Preview" label
- [ ] Correct platform icon shows (TikTok, Instagram, YouTube, etc.)
- [ ] Mock title and description appear
- [ ] URL is properly formatted in preview

**Special cases to test:**
- [ ] URL without https:// (should auto-add protocol)
- [ ] URL with spaces (should trim)
- [ ] Very long URL (should handle gracefully)

**Screenshot Points:** Each platform preview

---

### 4. URL Validation - Invalid URLs
**Objective:** Test error handling for invalid URLs

**Steps:**
1. Open link modal
2. Enter "not-a-valid-url"
3. Tap arrow button

**Expected Results:**
- [ ] Red error message appears with alert icon
- [ ] Error text: "Please enter a valid URL"
- [ ] Input field remains editable
- [ ] Can clear and try again

**Additional invalid URLs to test:**
- [ ] Empty string (tap arrow with empty field)
- [ ] Just "http://" with nothing else
- [ ] Random text like "check this out"
- [ ] Malformed URL like "htp://site.com"

**Screenshot Points:** Error states

---

### 5. Link Preview Interaction
**Objective:** Test preview functionality and editing

**Steps:**
1. Add a valid TikTok URL
2. Wait for preview to load
3. Observe preview card
4. Tap "Done" button

**Expected Results:**
- [ ] Preview shows with thumbnail placeholder
- [ ] Title shows platform-specific text (e.g., "TikTok Video")
- [ ] Platform source is capitalized correctly
- [ ] After tapping Done, modal closes
- [ ] Main form shows "🔗 Link added" in green
- [ ] Link preview appears below in main form

**Screenshot Points:** Preview in modal, preview in main form

---

### 6. Edit Existing Link
**Objective:** Test editing an already added link

**Steps:**
1. Add a TikTok link and confirm
2. Tap "Share a link" again to edit
3. Observe the modal state

**Expected Results:**
- [ ] Modal opens with previously added URL in input field
- [ ] Can clear and add a different URL
- [ ] Can modify existing URL
- [ ] Done button updates the link
- [ ] X button cancels without changes

**Screenshot Points:** Edit state

---

### 7. Cancel Operations
**Objective:** Test various cancel methods

**Steps - Test each method:**
1. Method 1: Tap X button in header
2. Method 2: Tap outside modal (on dark overlay)
3. Method 3: Swipe down on modal
4. Method 4: Use back gesture/button (Android)

**Expected Results for each:**
- [ ] Modal closes smoothly
- [ ] No changes saved if URL was being edited
- [ ] Returns to Create Post screen
- [ ] Previous link (if any) remains unchanged
- [ ] Can reopen modal without issues

---

### 8. Keyboard Handling
**Objective:** Test keyboard interactions

**Steps:**
1. Open link modal
2. Type a URL manually (don't paste)
3. Use keyboard submit button
4. Test with keyboard open/close

**Expected Results:**
- [ ] Keyboard opens automatically on modal open
- [ ] Typing works normally
- [ ] Submit button on keyboard triggers validation
- [ ] Modal adjusts properly when keyboard shows/hides
- [ ] No layout issues on different screen sizes

**Screenshot Points:** Keyboard interactions

---

### 9. Platform-Specific Icons
**Objective:** Verify correct platform detection

**Test each platform:**
| URL Pattern | Expected Icon | Expected Color |
|------------|---------------|----------------|
| tiktok.com | logo-tiktok | Black |
| instagram.com | logo-instagram | Pink (#E4405F) |
| youtube.com | logo-youtube | Red (#FF0000) |
| twitter.com or x.com | logo-twitter | Blue (#1DA1F2) |
| other | link | Gray (#666666) |

**Steps:**
1. Add URL for each platform
2. Verify icon and color in preview
3. Verify icon persists in main form

---

### 10. Post Creation with Link
**Objective:** Verify link persists through post creation

**Steps:**
1. Create a post with external content
2. Add a TikTok link
3. Add caption: "Check out this amazing recipe!"
4. Select a restaurant (if required)
5. Tap "Share" to publish

**Expected Results:**
- [ ] Post creates successfully
- [ ] Link is saved with post
- [ ] Navigate to profile/activity to see post
- [ ] Link preview appears in post
- [ ] Tapping link preview opens external URL

**Screenshot Points:** Published post with link

---

### 11. Memory and State Management
**Objective:** Ensure no memory leaks or state issues

**Steps:**
1. Open and close link modal 10 times rapidly
2. Add and remove links multiple times
3. Switch between different modal types quickly

**Expected Results:**
- [ ] No app crashes
- [ ] No UI freezing
- [ ] Modals continue to work properly
- [ ] No duplicate modals appearing
- [ ] State remains consistent

---

### 12. Accessibility Testing
**Objective:** Verify accessibility features work

**Steps:**
1. Enable screen reader (VoiceOver/TalkBack)
2. Navigate through link modal
3. Test with large text settings
4. Test with reduced motion enabled

**Expected Results:**
- [ ] All buttons have proper accessibility labels
- [ ] Modal can be navigated with screen reader
- [ ] Text scales properly with system settings
- [ ] Animations respect reduced motion preference

---

### 13. Error Recovery
**Objective:** Test error recovery scenarios

**Steps:**
1. Turn on airplane mode
2. Try to add a link
3. Turn off airplane mode
4. Retry the operation

**Expected Results:**
- [ ] Appropriate error message when offline
- [ ] Can retry when connection restored
- [ ] No crash or frozen state
- [ ] Graceful degradation of features

---

## Edge Cases to Test

### Rapid Actions
- [ ] Double-tap "Share a link" button quickly
- [ ] Open modal and immediately close (< 1 second)
- [ ] Paste URL and immediately tap Done

### Unusual URLs
- [ ] Extremely long URL (> 500 characters)
- [ ] URL with special characters
- [ ] URL with emoji
- [ ] Localhost URLs (http://localhost:3000)
- [ ] IP addresses (http://192.168.1.1)

### Device-Specific
- [ ] Test on smallest supported screen (iPhone SE)
- [ ] Test on largest screen (iPad/tablet)
- [ ] Test with different orientations
- [ ] Test with keyboard extensions enabled

---

## Performance Metrics to Note

Record these observations:
- Modal open animation time: _____ms
- Time to validate URL: _____ms
- Preview load time: _____ms
- Modal close animation time: _____ms
- Any lag or stutter: _____

---

## Bug Report Template

If you find issues, report with:
```
Device: [iPhone 14 Pro / Android Model]
OS Version: [iOS 17.0 / Android 13]
App Version: [1.0.0]
Steps to Reproduce:
1. 
2. 
3. 
Expected: 
Actual: 
Screenshot/Video: [Attach]
```

---

## Sign-off Checklist

- [ ] All test scenarios completed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] UI/UX matches design specs
- [ ] Edge cases handled gracefully
- [ ] Accessibility requirements met

**Tested by:** ________________
**Date:** ________________
**Build Version:** ________________
**Status:** [ ] PASS [ ] FAIL [ ] PARTIAL

**Notes:**
_________________________________
_________________________________
_________________________________