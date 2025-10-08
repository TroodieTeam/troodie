# Manual Testing Guide: Restaurant Review to Post Navigation

## Test Scenarios

### Scenario 1: Navigate from Friends Who Visited
**Pre-conditions:**
- User is logged in
- User has friends who have reviewed restaurants
- Restaurant has reviews from friends

**Steps:**
1. Navigate to any restaurant detail page (tap a restaurant from Explore)
2. Tap on the "Social" tab
3. Look for "Friends Who Visited" section
4. Tap on any friend's review

**Expected Result:**
- App navigates to the full post detail screen
- Post shows complete review with rating, photos, and caption
- User can interact with the post (like, save, comment)

### Scenario 2: Navigate from Power Users & Critics
**Pre-conditions:**
- Restaurant has reviews from power users or critics

**Steps:**
1. Open a restaurant detail page
2. Switch to "Social" tab
3. Scroll to "Power Users & Critics" section (purple background)
4. Tap on any power user review

**Expected Result:**
- Navigation to post detail screen
- Review displays with power user badge
- Full review content is visible
- Follower count is shown for the power user

### Scenario 3: Navigate from Recent Activity
**Pre-conditions:**
- Restaurant has recent review activity

**Steps:**
1. Go to restaurant detail page
2. Open "Social" tab
3. Scroll to "Recent Activity" section (marked as "Live")
4. Find a review activity (look for "reviewed" action)
5. Tap on the review

**Expected Result:**
- Only reviews should be clickable (not saves or check-ins)
- Navigation to post detail
- Review shows with traffic light rating if applicable

### Scenario 4: Non-Review Activities
**Pre-conditions:**
- Recent Activity section has mixed activity types

**Steps:**
1. In Social tab's Recent Activity section
2. Try tapping on:
   - Save activities ("X saved")
   - Check-in activities ("X checked in")
   - Like activities ("X liked")

**Expected Result:**
- Non-review activities should NOT navigate anywhere
- Only review activities should be clickable

### Scenario 5: Back Navigation
**Pre-conditions:**
- User has navigated to post detail from restaurant Social tab

**Steps:**
1. From post detail, tap the back arrow

**Expected Result:**
- User returns to restaurant detail page
- Social tab remains selected
- Scroll position is maintained

### Scenario 6: Review with Photos
**Pre-conditions:**
- Restaurant has reviews containing photos

**Steps:**
1. In Social tab, find a review with photo thumbnails
2. Tap on the review

**Expected Result:**
- Post detail shows all photos in full size
- Photos are swipeable if multiple
- Photo count indicator visible

### Scenario 7: Review Interactions
**Pre-conditions:**
- User is on post detail from restaurant review

**Steps:**
1. Try these actions on the post detail:
   - Like the review
   - Save the review
   - Share the review
   - Tap on reviewer's profile

**Expected Result:**
- All interactions work normally
- Profile tap navigates to user profile
- Like/save states update immediately

## Edge Cases to Test

### Empty States
1. **No Friends Reviews**
   - Friends section shows "No friends have visited yet"
   - Text should not be clickable

2. **No Power User Reviews**
   - Shows "No reviews from power users yet"
   - Not clickable

3. **No Recent Activity**
   - Shows "No recent activity"
   - Not clickable

### Error Handling
1. **Deleted Review**
   - If review was deleted, should show error state

2. **Network Issues**
   - Appropriate error message on connection failure

## Verification Checklist
- [ ] Friends reviews are clickable
- [ ] Power user reviews are clickable
- [ ] Only "reviewed" activities are clickable in Recent Activity
- [ ] Navigation is smooth
- [ ] Post detail loads completely
- [ ] Back navigation returns to Social tab
- [ ] Traffic light ratings display correctly
- [ ] Star ratings display correctly
- [ ] Photos load in post detail
- [ ] Non-review activities are not clickable
- [ ] Empty states display correctly

## Platform-Specific Testing
- Test on iOS and Android
- Verify smooth animations
- Check gesture navigation (iOS swipe back)

## Performance Testing
- Test with restaurants that have many reviews
- Verify smooth scrolling in Social tab
- Check navigation speed

## Notes for Testers
- Some restaurants may not have all three sections populated
- Power Users section only shows for users with high follower counts
- Recent Activity updates in real-time
- Friends section requires user to have friends on the platform