# Restaurant Tagging Manual Testing Guide

## Feature Overview

The restaurant tagging feature allows users to mention restaurants in post comments using the `@` symbol. When a user types `@` followed by a restaurant name, an autocomplete dropdown appears showing matching restaurants. Clicking on a restaurant completes the mention, which becomes a clickable link that navigates to the restaurant's page.

### Key Components
- **PostComments.tsx** - Comment input with @mention autocomplete
- **restaurant_mentions table** - Stores mentions linking comments to restaurants
- **trigger_process_restaurant_mentions()** - Database trigger for processing mentions
- **notificationService.ts** - Sends notifications to restaurant owners when mentioned

---

## Prerequisites

### Test Accounts
Use these accounts for testing different scenarios:
- **Consumer Account:** `consumer1@bypass.com` or `consumer2@bypass.com`
- **Creator Account:** `creator1@bypass.com` or `creator2@bypass.com`
- **Business Owner Account:** Use an account that has claimed a restaurant
- **OTP Code:** `000000` for all test accounts

### Database Requirements
1. Ensure migration `20250125_add_restaurant_mentions.sql` has been applied
2. Verify the `restaurant_mentions` table exists
3. Verify restaurants exist in the database for testing mentions

### Pre-Test Verification
Run these queries to verify setup:
```sql
-- Check restaurant_mentions table exists
SELECT COUNT(*) FROM restaurant_mentions;

-- Check sample restaurants exist
SELECT id, name, owner_id FROM restaurants LIMIT 10;

-- Verify trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'process_mentions_after_comment_insert';
```

---

## Test Scenarios

### 1. Autocomplete Dropdown Functionality

#### Test 1.1: Trigger Autocomplete with @
**Steps:**
1. Login with any test account
2. Navigate to any post with comments enabled
3. Tap the comment input field
4. Type `@` followed by at least 1 character (e.g., `@go`)

**Expected:**
- Autocomplete dropdown appears within 500ms
- Shows up to 20 matching restaurants
- Each suggestion shows:
  - Restaurant cover photo (or gray placeholder if none)
  - Restaurant name
  - Restaurant address
- Dropdown is positioned above the input field
- Dropdown has shadow/elevation for visibility

#### Test 1.2: Search Filtering
**Steps:**
1. In comment input, type `@Golden`
2. Observe results

**Expected:**
- Only restaurants containing "Golden" appear
- Search is case-insensitive
- Results update as you type more characters

#### Test 1.3: Empty Search Results
**Steps:**
1. Type `@xyznonexistent123`

**Expected:**
- Dropdown shows but is empty OR dropdown doesn't appear
- No errors in console
- User can continue typing normally

#### Test 1.4: Dismiss Dropdown
**Steps:**
1. Trigger autocomplete with `@go`
2. Delete the `@` character OR add a space after the mention

**Expected:**
- Autocomplete dropdown disappears
- Comment input continues to work normally

---

### 2. Selecting a Restaurant Mention

#### Test 2.1: Select from Autocomplete
**Steps:**
1. Type `@` and search for a known restaurant
2. Tap on a restaurant in the dropdown

**Expected:**
- Restaurant name is inserted into comment: `@RestaurantName `
- A space is added after the name
- Autocomplete dropdown closes
- Cursor is positioned after the mention

#### Test 2.2: Multiple Mentions in One Comment
**Steps:**
1. Type: `Loved @` and select a restaurant
2. Continue typing: ` and also @` and select another restaurant
3. Submit the comment

**Expected:**
- Both mentions are preserved in the comment text
- Both mentions become clickable links after posting
- Both restaurants are recorded in `restaurant_mentions` table

#### Test 2.3: Mention with Additional Text
**Steps:**
1. Type: `Check out @RestaurantName - amazing food!`
2. Submit comment

**Expected:**
- Full comment is saved including the mention
- Mention is clickable
- Non-mention text displays normally

---

### 3. Comment Submission with Mentions

#### Test 3.1: Submit Comment with Single Mention
**Steps:**
1. Navigate to any post
2. Type a comment with one @mention
3. Tap submit/send button

**Expected:**
- Comment is posted successfully
- Success toast appears
- Comment shows in the list immediately (optimistic update)
- Mention text appears in orange/brand color
- Mention is underlined
- Comment displays author's avatar and name

#### Test 3.2: Verify Database Records
**Steps:**
1. Submit a comment with @mention
2. Query the database

**Expected:**
```sql
-- Should return the new mention record
SELECT * FROM restaurant_mentions
WHERE comment_id = '[your-comment-id]';
```
- One record per mentioned restaurant
- `restaurant_name` matches the displayed name
- `restaurant_id` points to correct restaurant

#### Test 3.3: Submit Comment Without Mentions
**Steps:**
1. Type a comment without any @ symbols
2. Submit

**Expected:**
- Comment posts normally
- No records created in `restaurant_mentions` table
- No errors related to mention processing

---

### 4. Mention Display and Navigation

#### Test 4.1: Clickable Mention Link
**Steps:**
1. Find a comment with a @mention
2. Tap on the orange/highlighted mention text

**Expected:**
- Navigates to `/restaurant/[id]` page
- Correct restaurant page loads
- Back navigation returns to the post/comments

#### Test 4.2: Visual Styling
**Steps:**
1. View a comment with mentions

**Expected:**
- Mention text is in the primary orange color (#FF6B35 or similar)
- Mention text is underlined
- Mention stands out from regular comment text
- Non-mention text is normal black/dark color

#### Test 4.3: Multiple Mentions Display
**Steps:**
1. View a comment with multiple @mentions

**Expected:**
- Each mention is individually clickable
- Tapping each navigates to the correct restaurant
- Text between mentions displays normally

---

### 5. Notifications for Restaurant Owners

#### Test 5.1: Owner Receives Notification (Claimed Restaurant)
**Prerequisites:**
- Have a restaurant with an `owner_id` set (claimed restaurant)
- Know the owner's account credentials

**Steps:**
1. Login as a regular user (NOT the restaurant owner)
2. Find a post and add a comment mentioning the claimed restaurant: `@ClaimedRestaurant is great!`
3. Submit the comment
4. Login as the restaurant owner
5. Check notifications

**Expected:**
- Owner receives a notification
- Notification type is `restaurant_mention`
- Notification title: "Restaurant Mentioned"
- Notification message: "[Username] mentioned @RestaurantName in a comment"
- Notification is actionable (taps through to post/comment)

#### Test 5.2: No Notification for Unclaimed Restaurant
**Steps:**
1. Find a restaurant with `owner_id = NULL`
2. Mention this restaurant in a comment
3. Check that no notification errors occur

**Expected:**
- Comment posts successfully
- Mention is recorded
- No notification is sent (no owner to notify)
- No errors in logs

#### Test 5.3: Self-Mention (Owner Mentions Own Restaurant)
**Steps:**
1. Login as restaurant owner
2. Mention your own restaurant in a comment

**Expected:**
- Comment posts successfully
- Mention displays correctly
- Owner should NOT receive a notification for their own mention (or this may be acceptable behavior - verify with product requirements)

---

### 6. Edge Cases and Error Handling

#### Test 6.1: Restaurant Name with Special Characters
**Steps:**
1. Try mentioning restaurants with names like:
   - `Joe's Pizza` (apostrophe)
   - `Ben & Jerry's` (ampersand and apostrophe)
   - `Café Luna` (accent character)
   - `The Rustic Table` (spaces)

**Expected:**
- Autocomplete finds these restaurants
- Mention is inserted correctly
- Mention is saved and displayed properly
- Links work correctly

#### Test 6.2: Very Long Comment with Mentions
**Steps:**
1. Type a comment near the 500 character limit
2. Include @mentions
3. Submit

**Expected:**
- Character limit is enforced
- Mentions are preserved
- No truncation of mention names mid-word

#### Test 6.3: Rapid Typing / Autocomplete Race Conditions
**Steps:**
1. Quickly type `@rest` then immediately delete and type `@gold`

**Expected:**
- Autocomplete updates correctly
- No stale results shown
- No UI glitches or duplicate dropdowns

#### Test 6.4: Network Error During Comment Submission
**Steps:**
1. Put device in airplane mode
2. Type comment with @mention
3. Try to submit

**Expected:**
- Error toast appears
- Comment is NOT lost (input preserved)
- User can retry after restoring connection

#### Test 6.5: Delete Comment with Mentions
**Steps:**
1. Post a comment with @mentions
2. Delete the comment (tap X, confirm deletion)

**Expected:**
- Comment is removed from UI
- `restaurant_mentions` records are deleted (CASCADE delete)
- No orphaned mention records

---

### 7. UI/UX Testing

#### Test 7.1: Keyboard Interaction
**Steps:**
1. Start typing @mention with keyboard visible
2. Observe dropdown positioning

**Expected:**
- Dropdown appears above the input (not behind keyboard)
- Dropdown is fully visible
- Can tap suggestions without closing keyboard
- Keyboard stays open after selecting a suggestion

#### Test 7.2: Scroll Behavior in Suggestions
**Steps:**
1. Type `@a` to get many results
2. Scroll through the suggestions list

**Expected:**
- Suggestions list scrolls smoothly
- Maximum height is ~180px
- Shows scroll indicator if content exceeds height
- Can scroll and tap to select

#### Test 7.3: Dark Mode (if applicable)
**Steps:**
1. Enable dark mode on device
2. Test mention autocomplete and display

**Expected:**
- Dropdown is readable in dark mode
- Mention text color contrasts properly
- All UI elements are visible

---

## Performance Checklist

- [ ] Autocomplete dropdown appears within 500ms of typing @
- [ ] No lag when typing in comment field
- [ ] Suggestion search responds within 300ms
- [ ] Comment submission completes within 2 seconds
- [ ] Navigating to restaurant from mention is instant
- [ ] No memory leaks when opening/closing multiple posts

---

## Accessibility Checklist

- [ ] Autocomplete dropdown is reachable via screen reader
- [ ] Mention links are announced as links
- [ ] Color contrast meets WCAG AA standards
- [ ] Touch targets are at least 44x44 points
- [ ] Error messages are announced to screen reader

---

## Device Testing Matrix

Test on:
- [ ] iPhone 15 Pro (latest iOS)
- [ ] iPhone SE (small screen)
- [ ] iPhone 12 mini
- [ ] Android Pixel 7 (latest Android)
- [ ] Android Samsung Galaxy S23

---

## Known Limitations

1. **Mention Detection Pattern**: Current regex `@(\w*)` may not capture all special characters in restaurant names
2. **No @mention in Post Body**: Feature only works in comments, not in post creation
3. **Owner Notifications**: Only sent to claimed restaurants with an `owner_id`
4. **Offline Mode**: Mentions won't work offline since autocomplete requires database search

---

## Bug Reporting

When reporting issues, include:
1. Test account used
2. Restaurant name mentioned
3. Full comment text
4. Screenshot of the issue
5. Expected vs actual behavior
6. Device and OS version
7. Relevant console errors

---

## Success Criteria

All tests pass when:
- [ ] Autocomplete appears when typing @
- [ ] Restaurant suggestions are accurate and load quickly
- [ ] Selecting a suggestion inserts the mention correctly
- [ ] Comments with mentions submit successfully
- [ ] Mentions display with correct styling (orange, underlined)
- [ ] Clicking mentions navigates to restaurant page
- [ ] Restaurant owners receive notifications for mentions
- [ ] Multiple mentions in one comment work correctly
- [ ] Special characters in restaurant names are handled
- [ ] Deleting comments removes mention records
- [ ] No errors in console during normal usage
- [ ] Feature works on both iOS and Android
