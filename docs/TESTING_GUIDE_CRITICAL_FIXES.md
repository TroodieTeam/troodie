# Manual Testing Guide - Critical Fixes (Oct 1, 2025)

## Pre-Testing Setup

### Prerequisites
- [ ] Database migration applied (`20251001_critical_fixes.sql`)
- [ ] App rebuilt with latest code
- [ ] Test user accounts created
- [ ] iPhone 16 simulator or device available

### Test Data Setup
```sql
-- Create test boards
INSERT INTO boards (user_id, title, description, type, is_private)
VALUES
  ('{your_user_id}', 'Test Board 1', 'Public board for testing', 'free', false),
  ('{your_user_id}', 'Test Board 2', 'Private board for testing', 'free', true);

-- Create test community
INSERT INTO communities (name, description, admin_id, type)
VALUES ('Test Community', 'For testing member counts', '{your_user_id}', 'public');

-- Create test post
INSERT INTO posts (user_id, restaurant_id, caption, privacy)
VALUES ('{your_user_id}', '{restaurant_id}', 'Test post for likes', 'public');
```

---

## Test Scenarios

### 1. iPhone 16 UI Fix

#### Test 1.1: Quiz Screen Layout
**Steps**:
1. Open app on iPhone 16 (or simulator)
2. Start onboarding flow
3. Reach quiz screen
4. Answer first question

**Expected**:
- [ ] Question text is readable (not too large)
- [ ] All answer options visible without scrolling initially
- [ ] Can scroll to see all options if needed
- [ ] Text doesn't overflow containers
- [ ] Safe areas respected (no content under notch/home indicator)

**Pass Criteria**: All answer choices visible and selectable on iPhone 16

#### Test 1.2: Multiple Answer Sizes
**Steps**:
1. Progress through quiz (different questions have different answer lengths)
2. Check questions with 4, 5, and 6 answer options

**Expected**:
- [ ] Short answers fit on screen
- [ ] Long answers scroll smoothly
- [ ] Bottom answer always accessible
- [ ] Bottom padding prevents home indicator overlap

---

### 2. Board Image Error Fix

#### Test 2.1: Valid Image URL
**Steps**:
1. Navigate to Boards tab
2. View board with valid cover_image_url

**Expected**:
- [ ] Image loads correctly
- [ ] Image fills thumbnail area (64x64)
- [ ] No broken image icon
- [ ] Image scales properly (cover mode)

#### Test 2.2: Invalid Image URL
**Steps**:
1. Update a board's cover_image_url to invalid URL in database:
   ```sql
   UPDATE boards
   SET cover_image_url = 'https://invalid-url-doesnt-exist.com/image.jpg'
   WHERE id = '{test_board_id}';
   ```
2. View board list

**Expected**:
- [ ] Placeholder emoji (📋) appears instead of broken image
- [ ] No error messages shown
- [ ] Card layout not broken
- [ ] Other boards still load their images

#### Test 2.3: Null Image URL
**Steps**:
1. View board with no cover_image_url (null)

**Expected**:
- [ ] Placeholder emoji (📋) shown
- [ ] Card renders normally

---

### 3. Board Collaboration Invites

#### Test 3.1: Invite by User ID
**Steps**:
1. Login as User A
2. Open a board you own
3. Tap "Invite Collaborators"
4. Search for User B by username
5. Tap "Invite"

**Expected**:
- [ ] Success message shown
- [ ] User B receives in-app notification
- [ ] Invitation appears in User B's invitations list
- [ ] Invitation status = 'pending'

**Verify in Database**:
```sql
SELECT * FROM board_invitations
WHERE board_id = '{board_id}' AND invitee_id = '{user_b_id}';
```

#### Test 3.2: Accept Invitation
**Steps**:
1. Login as User B
2. View pending invitations
3. Tap on invitation from User A
4. Tap "Accept"

**Expected**:
- [ ] Added to board as member
- [ ] Board appears in User B's board list
- [ ] Invitation status changes to 'accepted'
- [ ] User A receives notification that User B accepted
- [ ] Board member_count incremented

**Verify in Database**:
```sql
SELECT * FROM board_members
WHERE board_id = '{board_id}' AND user_id = '{user_b_id}';
```

#### Test 3.3: Decline Invitation
**Steps**:
1. User B receives another invitation
2. Tap "Decline"

**Expected**:
- [ ] Invitation status = 'declined'
- [ ] Not added to board
- [ ] Invitation removed from pending list

#### Test 3.4: Shareable Invite Link
**Steps**:
1. Login as User A
2. Open board settings
3. Tap "Create Invite Link"
4. Copy link (format: `troodie://boards/{id}/invite/{token}`)
5. Share link with User C
6. User C taps link

**Expected**:
- [ ] Link token generated and saved
- [ ] Deep link opens app to invitation acceptance screen
- [ ] User C can accept via link
- [ ] Token validates correctly
- [ ] Same outcome as direct invite

#### Test 3.5: Invite Existing Member
**Steps**:
1. Try to invite User B (who is already a member)

**Expected**:
- [ ] Error message: "User is already a member"
- [ ] No duplicate invitation created

#### Test 3.6: Expired Invitation
**Steps**:
1. Create invitation
2. Manually expire it in database:
   ```sql
   UPDATE board_invitations
   SET expires_at = NOW() - INTERVAL '1 day'
   WHERE id = '{invitation_id}';
   ```
3. Try to accept

**Expected**:
- [ ] Error: "Invalid or expired invite link"
- [ ] Not added to board
- [ ] Invitation marked as 'expired'

---

### 4. Like Counter Fix

#### Test 4.1: First Like
**Steps**:
1. View a post with 0 likes
2. Tap like button (heart icon)
3. Observe counter

**Expected**:
- [ ] Heart turns red immediately (optimistic update)
- [ ] Counter changes from 0 to 1
- [ ] Database updated: `posts.likes_count = 1`
- [ ] Entry created in `post_likes` table

**Verify in Database**:
```sql
SELECT likes_count FROM posts WHERE id = '{post_id}';
SELECT COUNT(*) FROM post_likes WHERE post_id = '{post_id}';
-- Both should return 1
```

#### Test 4.2: Unlike
**Steps**:
1. On same post, tap heart again to unlike

**Expected**:
- [ ] Heart turns gray
- [ ] Counter decrements to 0
- [ ] Database updated: `posts.likes_count = 0`
- [ ] Entry deleted from `post_likes` table

#### Test 4.3: Multiple Users Liking
**Steps**:
1. User A likes post (count = 1)
2. User B likes same post (count = 2)
3. User C likes same post (count = 3)
4. User A unlikes (count = 2)

**Expected**:
- [ ] Counter increments correctly for each like
- [ ] Counter decrements correctly for unlike
- [ ] No race conditions (count always accurate)
- [ ] Real-time updates visible to all users

**Verify in Database**:
```sql
SELECT likes_count FROM posts WHERE id = '{post_id}';
-- Should be 2

SELECT COUNT(*) FROM post_likes WHERE post_id = '{post_id}';
-- Should be 2
```

#### Test 4.4: Trigger Performance
**Steps**:
1. Like/unlike post 10 times rapidly

**Expected**:
- [ ] All actions complete < 1 second total
- [ ] Final count is accurate
- [ ] No errors in console
- [ ] UI remains responsive

---

### 5. Community Member Count Fix

#### Test 5.1: Join Community
**Steps**:
1. View community with 0 members
2. Tap "Join Community"

**Expected**:
- [ ] Member count increments to 1
- [ ] User appears in member list
- [ ] Database: `communities.member_count = 1`
- [ ] Database: Entry in `community_members` with `status='active'`

**Verify in Database**:
```sql
SELECT member_count FROM communities WHERE id = '{community_id}';
SELECT COUNT(*) FROM community_members
WHERE community_id = '{community_id}' AND status = 'active';
-- Both should match
```

#### Test 5.2: Leave Community
**Steps**:
1. Tap "Leave Community"

**Expected**:
- [ ] Member count decrements
- [ ] User removed from member list
- [ ] Database updated correctly

#### Test 5.3: Multiple Members
**Steps**:
1. User A joins (count = 1)
2. User B joins (count = 2)
3. User C joins (count = 3)
4. User A leaves (count = 2)

**Expected**:
- [ ] Count always matches actual member list
- [ ] No discrepancies between count and list

#### Test 5.4: Pending Status Handling
**Steps**:
1. Create community with approval required
2. User requests to join (status = 'pending')
3. Admin approves (status changes to 'active')

**Expected**:
- [ ] Pending member NOT counted in member_count
- [ ] Count increments when approved (status → active)
- [ ] Trigger handles status transitions

---

## Integration Tests

### Test I.1: Complete User Flow
**Scenario**: New user joins, creates board, invites friend, posts and likes content

**Steps**:
1. New user signs up on iPhone 16
2. Completes quiz (check UI)
3. Creates first board with image
4. Invites friend to board
5. Friend accepts invitation
6. Both users create posts
7. Users like each other's posts
8. Users join a community
9. Verify all counts are accurate

**Expected**:
- [ ] No UI issues on iPhone 16
- [ ] Board image shows or placeholder
- [ ] Invitation flow works end-to-end
- [ ] Like counters accurate
- [ ] Community member count accurate
- [ ] No errors in console

---

## Regression Tests

### R.1: Existing Features Still Work
- [ ] User can create board (without inviting)
- [ ] User can save restaurant
- [ ] User can post without likes
- [ ] User can view community without joining
- [ ] Onboarding works on other devices (not just iPhone 16)

### R.2: Performance
- [ ] Board list loads < 1 second
- [ ] Post feed scrolls smoothly (60fps)
- [ ] Like actions feel instant (< 100ms visual feedback)
- [ ] Community join < 500ms

---

## Edge Cases

### E.1: Network Conditions
- [ ] Test with slow 3G network
- [ ] Test with no network (offline)
- [ ] Test with intermittent connection

### E.2: Concurrent Actions
- [ ] Two users invite same person simultaneously
- [ ] Multiple users like same post at exact same time
- [ ] User accepts invitation while owner deletes board

### E.3: Data Validation
- [ ] Try to invite invalid user ID
- [ ] Try to like deleted post
- [ ] Try to join deleted community

---

## Automated Test Verification

After manual testing, verify with automated tests:

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Type checking
npm run typecheck
```

---

## Bug Reporting Template

If you find an issue:

```markdown
**Test**: [Test number and name]
**Steps**: [Steps to reproduce]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Screenshots**: [If applicable]
**Device**: [iPhone 16 Pro, etc.]
**Logs**: [Console errors]
```

---

## Sign-Off Checklist

Before marking as "Needs Review":
- [ ] All critical tests passed
- [ ] No regression bugs found
- [ ] Performance acceptable
- [ ] Edge cases handled
- [ ] Documentation updated
- [ ] Database migration verified

**Tester Name**: ___________
**Date**: ___________
**Status**: ☐ Pass  ☐ Fail  ☐ Needs Fixes
