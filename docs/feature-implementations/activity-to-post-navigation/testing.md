# Manual Testing Guide: Navigation from Activity to Post Detail

## Test Scenarios

### Scenario 1: Navigate to Post from Activity Feed
**Pre-conditions:**
- User is logged in
- Activity feed has post-related activities

**Steps:**
1. Open the app and navigate to the Activity tab (second tab from left)
2. Scroll through the activity feed to find any post activity (look for items with circular orange dots)
3. Tap on a post activity item

**Expected Result:**
- App should navigate to the post detail screen
- Post detail screen should show the complete post with:
  - User information
  - Post content/caption
  - Photos (if any)
  - Restaurant information (if associated)
  - Like, comment, save, and share buttons

### Scenario 2: Navigation with Different Activity Types
**Pre-conditions:**
- Activity feed contains various activity types

**Steps:**
1. Navigate to Activity tab
2. Find and tap on different types of post activities:
   - "X posted about [Restaurant]"
   - "X shared a review"
   - Any other post-related activity

**Expected Result:**
- All post-related activities should navigate to post detail
- Non-post activities (follows, saves, etc.) should not navigate to post detail

### Scenario 3: Back Navigation
**Pre-conditions:**
- User has navigated to a post detail from activity feed

**Steps:**
1. From the post detail screen, tap the back arrow (top left)

**Expected Result:**
- User should return to the Activity feed
- Activity feed should maintain its scroll position

### Scenario 4: Post Interaction from Detail View
**Pre-conditions:**
- User has navigated to post detail from activity

**Steps:**
1. On the post detail screen, try these actions:
   - Like the post
   - Save the post
   - Tap on the restaurant card (if present)
   - Tap on the user profile

**Expected Result:**
- Like/save actions should update immediately
- Restaurant tap should navigate to restaurant detail
- User profile tap should navigate to user profile

### Scenario 5: Edge Cases
**Test these edge cases:**

1. **Deleted Post**
   - If a post has been deleted, tapping should show an error state

2. **No Internet Connection**
   - Turn off internet and try to navigate
   - Should show appropriate error message

3. **Loading State**
   - On slower connections, should see loading indicator
   - Loading text should say "Loading post..."

## Verification Checklist
- [ ] Post activities show clickable appearance
- [ ] Navigation is smooth and immediate
- [ ] Post detail loads completely
- [ ] Back navigation works correctly
- [ ] All post content is visible
- [ ] Interactions (like, save) work from detail view
- [ ] Error states display appropriately
- [ ] Loading states appear when needed

## Known Issues
- None currently identified

## Notes for Testers
- Test on both iOS and Android if possible
- Test with different network speeds
- Verify with posts that have and don't have photos
- Check posts with and without restaurant associations