# Test Guide: Save TikTok/Instagram with Context Feature

## Overview
This test guide covers the new feature allowing users to save restaurants with context - adding TikTok/Instagram links and notes to remember why they saved a place.

## Prerequisites
- App installed and running
- User account logged in
- At least one restaurant available in the app
- Test social media URLs ready (provided below)

## Test Data

### Test URLs
```
TikTok Food Review: https://www.tiktok.com/@foodie/video/7234567890
Instagram Reel: https://www.instagram.com/reel/Cq1234567/
YouTube Short: https://www.youtube.com/shorts/abc123
Twitter Post: https://x.com/user/status/1234567890
Blog Post: https://medium.com/best-restaurants-2024
Invalid URL: not-a-url
```

### Test Notes
```
Short: "Must try the pasta!"
Medium: "Saw this on @foodie's TikTok - the truffle mac and cheese looks incredible. Perfect for date night!"
Long (200 chars): "This place was recommended by multiple food influencers. The ambiance looks perfect for special occasions. They have amazing cocktails and the dessert menu is supposed to be exceptional too!"
Too Long (201+ chars): [Should be truncated at 200]
```

---

## Test Scenarios

### 1. Access Enhanced Save Modal
**Objective:** Verify the new save modal appears with context fields

**Steps:**
1. Navigate to Explore/Search tab
2. Search for any restaurant (e.g., "Pizza")
3. Tap on a restaurant card to view details
4. Tap the bookmark/save icon

**Expected Results:**
- [ ] Enhanced save modal opens
- [ ] Modal title shows "Save Restaurant"
- [ ] Restaurant name is displayed at top
- [ ] "Your Saves" option is visible and selected by default
- [ ] "Add link or note for context" button is visible with + icon
- [ ] Rating options (Poor/Average/Excellent) are visible
- [ ] Save button is enabled

**Screenshot Points:** Initial modal state

---

### 2. Expand Context Fields
**Objective:** Test the context section expansion

**Steps:**
1. Open save modal for any restaurant
2. Tap "Add link or note for context" button
3. Observe the expanded section

**Expected Results:**
- [ ] Context section expands smoothly
- [ ] "Add Context (Optional)" title appears
- [ ] Link input field appears with link icon
- [ ] Placeholder: "Paste a link that inspired this save..."
- [ ] Note input field appears with document icon
- [ ] Placeholder: "Why are you saving this? (e.g., 'Amazing pasta from @foodie')"
- [ ] Character counter shows "0/200"
- [ ] "Clear context" link appears at bottom

**Screenshot Points:** Expanded context fields

---

### 3. Add TikTok Link
**Objective:** Test adding a TikTok link as context

**Steps:**
1. Open save modal and expand context
2. Tap the link input field
3. Paste: `https://www.tiktok.com/@foodie/video/7234567890`
4. Tap outside the input field

**Expected Results:**
- [ ] URL is accepted in the field
- [ ] No validation error appears
- [ ] Keyboard dismisses properly
- [ ] URL remains in field
- [ ] Can continue to add note if desired

**Additional URLs to test:**
- [ ] Instagram: Verify accepts Instagram URLs
- [ ] YouTube: Verify accepts YouTube URLs
- [ ] Without https://: Should auto-normalize
- [ ] With spaces: Should trim spaces

**Screenshot Points:** Link added state

---

### 4. Add Context Note
**Objective:** Test the note functionality

**Steps:**
1. Open save modal and expand context
2. Tap the note input field
3. Type: "Must try the truffle pasta - saw it on @foodie's TikTok!"
4. Observe character counter

**Expected Results:**
- [ ] Text input works normally
- [ ] Field expands for multiline text
- [ ] Character counter updates in real-time
- [ ] Shows "X/200" where X is current count
- [ ] Text wraps properly in field

**Screenshot Points:** Note with character count

---

### 5. Character Limit Enforcement
**Objective:** Verify 200 character limit works

**Steps:**
1. In note field, paste or type exactly 200 characters
2. Try to type more characters
3. Try pasting text longer than 200 characters

**Expected Results:**
- [ ] Counter shows "200/200" in red/warning color
- [ ] Cannot type beyond 200 characters
- [ ] Pasting long text truncates at 200
- [ ] No error message needed (just enforcement)
- [ ] Can delete and re-type normally

**Screenshot Points:** Max character state

---

### 6. Add Both Link and Note
**Objective:** Test using both context fields together

**Steps:**
1. Add TikTok URL in link field
2. Add note: "The dessert in this video looks amazing!"
3. Select "Excellent" rating
4. Tap Save button

**Expected Results:**
- [ ] Both fields accept input
- [ ] Save processes successfully
- [ ] Success message mentions "with context"
- [ ] Modal closes after save
- [ ] Restaurant is saved to Your Saves

**Screenshot Points:** Both fields filled

---

### 7. URL Validation
**Objective:** Test URL validation in context

**Steps:**
1. Try various invalid URLs:
   - "not a url"
   - "htp://wrong"
   - Empty spaces only
   - Just "tiktok" without domain

**Expected Results:**
- [ ] Invalid URLs show error when saving
- [ ] Error message: "Please enter a valid URL"
- [ ] Save is prevented until URL is fixed
- [ ] Can clear URL and save without it
- [ ] Note can still be added independently

**Screenshot Points:** Validation error

---

### 8. Clear Context
**Objective:** Test clearing context fields

**Steps:**
1. Add both URL and note
2. Tap "Clear context" link
3. Observe the fields

**Expected Results:**
- [ ] Both fields are cleared
- [ ] Context section remains expanded
- [ ] Can immediately add new content
- [ ] Character counter resets to 0/200
- [ ] No confirmation dialog (immediate clear)

---

### 9. Save to Your Saves
**Objective:** Test saving with context to Your Saves

**Steps:**
1. Open save modal for a restaurant
2. Ensure "Your Saves" is selected (default)
3. Add TikTok link and note
4. Tap Save

**Expected Results:**
- [ ] Save completes successfully
- [ ] Success toast: "Added [Restaurant] to Your Saves with context!"
- [ ] Navigate to Profile > Your Saves
- [ ] Restaurant appears in list
- [ ] Context (link/note) is saved with the item

**Screenshot Points:** Success message, saved item

---

### 10. Save to Custom Board
**Objective:** Test saving with context to a custom board

**Steps:**
1. Open save modal
2. Deselect "Your Saves"
3. Select or create a custom board
4. Add context (link and note)
5. Tap Save

**Expected Results:**
- [ ] Can select custom board
- [ ] Context fields work same as Your Saves
- [ ] Saves to selected board with context
- [ ] Success message mentions board name
- [ ] Context is preserved with board save

**Screenshot Points:** Custom board selection

---

### 11. Edit Existing Save
**Objective:** Test editing context on already saved restaurant

**Steps:**
1. Save a restaurant with context
2. Open same restaurant again
3. Tap save icon (should show as saved)
4. Try to edit context

**Expected Results:**
- [ ] Modal shows restaurant is already saved
- [ ] Can view existing context
- [ ] Can edit/update context
- [ ] Can add context if none existed
- [ ] Changes save properly

---

### 12. Rating with Context
**Objective:** Test rating integration with context

**Steps:**
1. Open save modal
2. Select "Average" rating
3. Add note: "Food was okay but great atmosphere"
4. Save

**Expected Results:**
- [ ] Rating selection works (color changes)
- [ ] Rating saves with context
- [ ] All three elements save together
- [ ] Can have rating without context
- [ ] Can have context without rating

**Screenshot Points:** Rating selected with context

---

### 13. Multiple Board Selection
**Objective:** Test saving to Your Saves AND a custom board

**Steps:**
1. Keep "Your Saves" selected
2. Also select a custom board
3. Add context
4. Save

**Expected Results:**
- [ ] Can select both Your Saves and custom board
- [ ] Context saves to both locations
- [ ] Success message mentions both
- [ ] Restaurant appears in both lists
- [ ] Context is consistent in both

---

### 14. Social Media Platform Detection
**Objective:** Verify different platforms are recognized

**Test each platform URL:**
| Platform | URL Pattern | Should Accept |
|----------|------------|---------------|
| TikTok | tiktok.com/... | Yes |
| Instagram | instagram.com/... | Yes |
| YouTube | youtube.com/... | Yes |
| Twitter/X | x.com/... | Yes |
| Facebook | facebook.com/... | Yes |
| Random Blog | medium.com/... | Yes |
| Invalid | not-a-url | No |

---

### 15. Keyboard and Input Handling
**Objective:** Test input field interactions

**Steps:**
1. Open context fields
2. Tap between link and note fields
3. Use keyboard next/previous buttons
4. Test auto-capitalization in note
5. Test auto-correct in note

**Expected Results:**
- [ ] Keyboard navigation works between fields
- [ ] Link field has URL keyboard (no spaces)
- [ ] Note field has normal keyboard
- [ ] Auto-capitalization works in note
- [ ] Auto-correct works in note
- [ ] No auto-correct in URL field

---

### 16. Offline Behavior
**Objective:** Test saving with context while offline

**Steps:**
1. Enable airplane mode
2. Try to save with context
3. Re-enable connection
4. Retry save

**Expected Results:**
- [ ] Appropriate offline error message
- [ ] Context fields retain entered data
- [ ] Can retry when connection restored
- [ ] Save completes successfully when online

---

### 17. View Saved Context
**Objective:** Verify saved context is viewable

**Steps:**
1. Navigate to Profile tab
2. Go to "Your Saves" section
3. Find restaurant saved with context
4. View the saved context

**Expected Results:**
- [ ] Context indicator visible on saved items
- [ ] Can tap to view full context
- [ ] Link is shown (if added)
- [ ] Note is shown (if added)
- [ ] Rating is shown (if added)

**Note:** Full display implementation may vary

---

### 18. Performance Testing
**Objective:** Ensure smooth performance

**Steps:**
1. Open save modal rapidly 10 times
2. Add/remove context multiple times
3. Type maximum characters quickly
4. Switch between restaurants quickly

**Expected Results:**
- [ ] No lag in modal opening
- [ ] Character counter updates smoothly
- [ ] No freezing when typing fast
- [ ] Context clears properly between restaurants
- [ ] No memory leaks or crashes

---

## Edge Cases

### Unusual Input Combinations
- [ ] Only spaces in URL field
- [ ] Emoji in note field 
- [ ] Special characters in note
- [ ] URL with query parameters
- [ ] URL with fragments (#)
- [ ] Mixed language text in note

### Rapid Actions
- [ ] Save immediately after adding context
- [ ] Close modal while typing
- [ ] Switch boards while context entered
- [ ] Clear context multiple times rapidly

### State Management
- [ ] Add context, close modal, reopen
- [ ] Background app while modal open
- [ ] Receive notification while typing
- [ ] Phone call interruption

---

## Accessibility Testing

**Steps:**
1. Enable VoiceOver/TalkBack
2. Navigate through enhanced modal
3. Test with large text settings
4. Test with color filters

**Expected Results:**
- [ ] All fields have proper labels
- [ ] Character count is announced
- [ ] Context section expandable via screen reader
- [ ] Color contrast sufficient for ratings
- [ ] Text scales properly

---

## Integration Testing

### With Other Features
- [ ] Create post after saving with context
- [ ] Share restaurant that has context
- [ ] Add to community with context preserved
- [ ] Export board containing items with context

---

## Performance Metrics

Record these observations:
- Context field expand time: _____ms
- Character counter update lag: _____ms
- Save with context time: _____ms
- Modal close after save: _____ms

---

## Bug Report Template

```
Feature: Save with Context
Device: [Model]
OS: [Version]
App Version: [Version]

Steps to Reproduce:
1. 
2. 

Expected: 
Actual: 
Context Lost: [ ] Yes [ ] No
Screenshot: [Attach]
```

---

## Sign-off Checklist

### Functionality
- [ ] Context fields expand/collapse properly
- [ ] URL validation works correctly
- [ ] Character limit enforced
- [ ] Clear context works
- [ ] Saves successfully with context

### Integration
- [ ] Works with Your Saves
- [ ] Works with custom boards
- [ ] Works with ratings
- [ ] Multiple board selection works

### User Experience
- [ ] Intuitive to use
- [ ] Proper error messages
- [ ] Success feedback clear
- [ ] No data loss scenarios

### Performance
- [ ] No lag or freezing
- [ ] Smooth animations
- [ ] Quick save times

**Tested by:** ________________
**Date:** ________________
**Version:** ________________
**Status:** [ ] PASS [ ] FAIL [ ] PARTIAL

**Notes:**
_________________________________
_________________________________
_________________________________