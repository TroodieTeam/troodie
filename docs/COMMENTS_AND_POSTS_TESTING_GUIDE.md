# Comments and Posts Testing Guide

## Quick Start

This guide covers testing the comments and posts functionality, including restaurant tagging/mentions.

**Test Accounts:**
- Consumer: `consumer1@bypass.com` / `000000`
- Creator: `creator1@bypass.com` / `000000`
- Business: Use an account that has claimed a restaurant

---

## Pre-Testing Checklist

### Database Verification
```sql
-- 1. Verify restaurant_mentions table exists
SELECT COUNT(*) FROM restaurant_mentions;

-- 2. Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'process_mentions_after_comment_insert';

-- 3. Verify sample restaurants exist
SELECT id, name, owner_id FROM restaurants LIMIT 10;

-- 4. Check if you have posts to comment on
SELECT id, caption, comments_count FROM posts LIMIT 5;
```

### App Setup
- [ ] App is running and connected to database
- [ ] Logged in with test account
- [ ] Can navigate to posts feed
- [ ] Can see posts with comment buttons

---

## Test Scenarios

### 1. Basic Comment Functionality

#### Test 1.1: Post a Simple Comment
**Steps:**
1. Navigate to any post
2. Tap comment button or comment count
3. Type: "This looks amazing!"
4. Tap Send/Submit

**Expected:**
- ✅ Comment appears immediately (optimistic update)
- ✅ Comment count increases
- ✅ Success toast appears
- ✅ Comment persists after refresh

**Verify in DB:**
```sql
SELECT * FROM post_comments 
WHERE content = 'This looks amazing!'
ORDER BY created_at DESC LIMIT 1;
```

#### Test 1.2: Delete Your Comment
**Steps:**
1. Find a comment you posted
2. Tap delete/X button
3. Confirm deletion

**Expected:**
- ✅ Comment removed from UI immediately
- ✅ Comment count decreases
- ✅ Comment deleted from database

**Verify in DB:**
```sql
-- Comment should be gone
SELECT * FROM post_comments WHERE id = '[deleted-comment-id]';
-- Should return 0 rows
```

---

### 2. Restaurant Mention Autocomplete

#### Test 2.1: Trigger Autocomplete
**Steps:**
1. Open comment input (in PostComments component, not modal)
2. Type `@`
3. Wait 500ms

**Expected:**
- ✅ Dropdown appears with restaurant suggestions
- ✅ Shows up to 20 restaurants
- ✅ Each item shows: photo, name, address
- ✅ Dropdown positioned above input

**Known Limitation:** Autocomplete only works in `PostComments.tsx`, not in full comments modal

#### Test 2.2: Search Filtering
**Steps:**
1. Type `@gold` in comment input
2. Observe results

**Expected:**
- ✅ Only restaurants containing "gold" appear
- ✅ Case-insensitive search
- ✅ Results update as you type

#### Test 2.3: Select Restaurant from Dropdown
**Steps:**
1. Type `@gold`
2. Tap on a restaurant in dropdown (e.g., "Golden Ox")

**Expected:**
- ✅ Text becomes: `@Golden Ox ` (with space)
- ✅ Dropdown closes
- ✅ Cursor positioned after mention
- ✅ Can continue typing

#### Test 2.4: Multiple Mentions
**Steps:**
1. Type: `Check out @` → select restaurant
2. Continue: ` and also @` → select another restaurant
3. Submit comment

**Expected:**
- ✅ Both mentions preserved
- ✅ Both become clickable links (in PostComments view)
- ✅ Both saved to database

**Verify in DB:**
```sql
SELECT rm.*, r.name as restaurant_name, pc.content
FROM restaurant_mentions rm
JOIN restaurants r ON rm.restaurant_id = r.id
JOIN post_comments pc ON rm.comment_id = pc.id
WHERE pc.content LIKE '%@%'
ORDER BY rm.created_at DESC
LIMIT 5;
```

---

### 3. Mention Display and Navigation

#### Test 3.1: View Mentions in PostComments Component
**Steps:**
1. Find a comment with @mention (or create one)
2. View comment in PostComments component (embedded in post card)

**Expected:**
- ✅ Mention text is orange/primary color
- ✅ Mention text is underlined
- ✅ Mention is clickable
- ✅ Tapping mention navigates to restaurant page

**Visual Check:**
- Mention: `@Golden Ox` should be styled differently from regular text
- Regular text: "Check out @Golden Ox - amazing!" 
  - "Check out " = normal black text
  - "@Golden Ox" = orange, underlined, clickable
  - " - amazing!" = normal black text

#### Test 3.2: Navigate from Mention
**Steps:**
1. Find comment with mention
2. Tap on the mention text

**Expected:**
- ✅ Navigates to `/restaurant/[restaurant-id]`
- ✅ Correct restaurant page loads
- ✅ Can navigate back to post

#### Test 3.3: Mentions in Full Comments Modal ⚠️ KNOWN ISSUE
**Steps:**
1. Open full comments view (`/posts/[id]/comments`)
2. View comments with mentions

**Expected (Current Behavior - BROKEN):**
- ❌ Mentions display as plain text
- ❌ Mentions are NOT clickable
- ❌ No special styling

**Expected (After Fix):**
- ✅ Mentions should be clickable links
- ✅ Mentions should be styled (orange, underlined)

**Status:** This is a known issue - mentions only work in PostComments component, not in full modal

---

### 4. Comment Replies

#### Test 4.1: Reply to Comment
**Steps:**
1. Find a comment
2. Tap "Reply" button
3. Type reply text
4. Submit

**Expected:**
- ✅ Reply appears under parent comment
- ✅ Shows "Replying to @username" indicator
- ✅ Reply is indented/nested
- ✅ Comment count increases

#### Test 4.2: View Replies
**Steps:**
1. Find comment with replies
2. Tap "View X replies"

**Expected:**
- ✅ Replies expand and show
- ✅ Can collapse replies
- ✅ Reply count is accurate

#### Test 4.3: Reply with Mention
**Steps:**
1. Reply to a comment
2. Include @mention in reply
3. Submit

**Expected:**
- ✅ Reply posted successfully
- ✅ Mention is clickable (in PostComments view)
- ✅ Mention saved to database

---

### 5. Notifications

#### Test 5.1: Restaurant Owner Receives Notification
**Prerequisites:**
- Restaurant with `owner_id` set (claimed restaurant)
- Owner account credentials

**Steps:**
1. Login as regular user (NOT owner)
2. Comment on post mentioning claimed restaurant: `@RestaurantName is great!`
3. Submit comment
4. Login as restaurant owner
5. Check notifications

**Expected:**
- ✅ Owner receives notification
- ✅ Notification type: `restaurant_mention`
- ✅ Title: "Restaurant Mentioned"
- ✅ Message: "[Username] mentioned @RestaurantName in a comment"
- ✅ Notification is actionable (taps to post/comment)

**Verify in DB:**
```sql
SELECT * FROM notifications
WHERE type = 'restaurant_mention'
ORDER BY created_at DESC
LIMIT 5;
```

#### Test 5.2: No Notification for Unclaimed Restaurant
**Steps:**
1. Find restaurant with `owner_id = NULL`
2. Mention it in a comment
3. Submit

**Expected:**
- ✅ Comment posts successfully
- ✅ Mention saved
- ✅ No notification created (no owner to notify)
- ✅ No errors in logs

---

### 6. Edge Cases

#### Test 6.1: Restaurant Names with Special Characters
**Steps:**
1. Try mentioning restaurants with:
   - Spaces: `@The Rustic Table`
   - Apostrophes: `@Joe's Pizza`
   - Ampersands: `@Ben & Jerry's`
   - Hyphens: `@Cafe-Luna`

**Expected:**
- ✅ Autocomplete finds restaurants
- ✅ Mention inserted correctly
- ✅ Mention saved properly
- ✅ Link works correctly

**Known Issue:** Frontend regex `/@(\w*)$/` may not match spaces properly. Database regex handles it, but autocomplete might not trigger correctly.

#### Test 6.2: Very Long Comment
**Steps:**
1. Type comment near 500 character limit
2. Include @mentions
3. Submit

**Expected:**
- ✅ Character limit enforced
- ✅ Mentions preserved
- ✅ No truncation mid-mention

#### Test 6.3: Rapid Typing
**Steps:**
1. Quickly type `@rest` then delete and type `@gold`

**Expected:**
- ✅ Autocomplete updates correctly
- ✅ No stale results
- ✅ No UI glitches

#### Test 6.4: Network Error
**Steps:**
1. Put device in airplane mode
2. Type comment with mention
3. Try to submit

**Expected:**
- ✅ Error toast appears
- ✅ Comment text preserved (not lost)
- ✅ Can retry after restoring connection

#### Test 6.5: Delete Comment with Mentions
**Steps:**
1. Post comment with @mentions
2. Delete the comment

**Expected:**
- ✅ Comment removed from UI
- ✅ Mention records deleted (CASCADE)
- ✅ No orphaned records

**Verify in DB:**
```sql
-- After deleting comment, mentions should be gone
SELECT * FROM restaurant_mentions 
WHERE comment_id = '[deleted-comment-id]';
-- Should return 0 rows
```

---

### 7. Performance Testing

#### Test 7.1: Comment Loading Speed
**Steps:**
1. Open post with 50+ comments
2. Measure time to load

**Expected:**
- ✅ Comments load within 2 seconds
- ✅ Smooth scrolling
- ✅ No lag when typing

#### Test 7.2: Autocomplete Response Time
**Steps:**
1. Type `@` in comment input
2. Measure time until dropdown appears

**Expected:**
- ✅ Dropdown appears within 500ms
- ✅ Results update quickly as you type

#### Test 7.3: Comment Submission Speed
**Steps:**
1. Submit comment with mention
2. Measure time until comment appears

**Expected:**
- ✅ Optimistic update appears immediately
- ✅ Real comment replaces optimistic within 1-2 seconds

---

### 8. UI/UX Testing

#### Test 8.1: Keyboard Interaction
**Steps:**
1. Open comment input
2. Type @mention with keyboard visible

**Expected:**
- ✅ Dropdown appears above input (not behind keyboard)
- ✅ Dropdown fully visible
- ✅ Can tap suggestions without closing keyboard
- ✅ Keyboard stays open after selecting

#### Test 8.2: Scroll Behavior
**Steps:**
1. Type `@a` to get many results
2. Scroll through suggestions

**Expected:**
- ✅ List scrolls smoothly
- ✅ Max height ~180px
- ✅ Can scroll and tap to select

#### Test 8.3: Empty States
**Steps:**
1. Open post with no comments

**Expected:**
- ✅ Shows "No comments yet" message
- ✅ Shows "Be the first to comment!" prompt
- ✅ Input field is accessible

---

## Component-Specific Tests

### PostComments Component (Embedded)
**Location:** Used in post cards, embedded views

**Test:**
- ✅ Mentions work here (autocomplete + rendering)
- ✅ Comments display correctly
- ✅ Can post, delete comments
- ✅ Mentions are clickable

### PostCommentsModal (Full Screen)
**Location:** `/posts/[id]/comments`

**Test:**
- ⚠️ Mentions DON'T render as links (known issue)
- ✅ Can post comments
- ✅ Can reply to comments
- ✅ Can delete comments
- ❌ Cannot use @mention autocomplete (missing feature)

---

## Database Verification Queries

### Check Comment Count Accuracy
```sql
-- Compare stored count vs actual count
SELECT 
  p.id,
  p.comments_count as stored_count,
  COUNT(pc.id) as actual_count,
  p.comments_count - COUNT(pc.id) as difference
FROM posts p
LEFT JOIN post_comments pc ON p.id = pc.post_id
GROUP BY p.id, p.comments_count
HAVING p.comments_count != COUNT(pc.id)
LIMIT 10;
```

### Check Mention Records
```sql
-- View recent mentions with full details
SELECT 
  rm.id,
  rm.created_at,
  rm.restaurant_name,
  r.name as actual_restaurant_name,
  pc.content as comment_text,
  u.name as commenter_name
FROM restaurant_mentions rm
JOIN restaurants r ON rm.restaurant_id = r.id
JOIN post_comments pc ON rm.comment_id = pc.id
JOIN users u ON pc.user_id = u.id
ORDER BY rm.created_at DESC
LIMIT 20;
```

### Check for Orphaned Mentions
```sql
-- Mentions without comments (should be 0)
SELECT rm.* FROM restaurant_mentions rm
LEFT JOIN post_comments pc ON rm.comment_id = pc.id
WHERE pc.id IS NULL;
```

### Check Notification Creation
```sql
-- Recent restaurant mention notifications
SELECT 
  n.id,
  n.created_at,
  n.title,
  n.message,
  n.data->>'restaurant_name' as restaurant_name,
  n.data->>'commenter_name' as commenter_name,
  u.name as recipient_name
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.type = 'restaurant_mention'
ORDER BY n.created_at DESC
LIMIT 10;
```

---

## Known Issues Summary

| Issue | Component | Severity | Status |
|-------|-----------|----------|--------|
| Mentions not clickable in modal | `app/posts/[id]/comments.tsx` | High | 🔴 Not Fixed |
| No mention autocomplete in modal | `app/posts/[id]/comments.tsx` | Medium | 🔴 Not Fixed |
| Regex pattern mismatch | `components/PostComments.tsx` | Low | ⚠️ Works but inconsistent |
| Duplicate mention processing | `components/PostComments.tsx` | Low | ⚠️ Works but inefficient |

---

## Success Criteria

All critical tests pass when:
- ✅ Comments can be posted and deleted
- ✅ Replies work correctly
- ✅ Mentions work in PostComments component (autocomplete + rendering)
- ✅ Mentions navigate to restaurant pages
- ✅ Restaurant owners receive notifications
- ✅ Database records are accurate
- ✅ No console errors during normal usage

**Note:** Mentions in full comments modal are currently broken and need to be fixed.

---

## Reporting Issues

When reporting bugs, include:
1. Test account used
2. Component tested (PostComments or Modal)
3. Restaurant name mentioned (if applicable)
4. Full comment text
5. Screenshot/video
6. Expected vs actual behavior
7. Device and OS version
8. Console errors (if any)
9. Database query results (if relevant)

---

## Quick Reference

### Test Accounts
- `consumer1@bypass.com` / `000000`
- `creator1@bypass.com` / `000000`

### Key Routes
- Posts feed: `/` or `/explore`
- Post detail: `/posts/[id]`
- Comments modal: `/posts/[id]/comments`
- Restaurant page: `/restaurant/[id]`

### Key Tables
- `post_comments` - Comments
- `restaurant_mentions` - Mention links
- `notifications` - Owner notifications
- `posts` - Post data

### Key Components
- `PostComments.tsx` - Embedded comments (mentions work ✅)
- `app/posts/[id]/comments.tsx` - Full modal (mentions broken ❌)
