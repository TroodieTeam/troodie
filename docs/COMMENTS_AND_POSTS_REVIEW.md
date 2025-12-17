# Comments and Posts Implementation Review

## Overview
This document reviews the current implementation of comments and posts functionality, particularly focusing on restaurant tagging/mentions feature from the `feat/TRO-133-restaurants-tagging` branch.

## Implementation Summary

### Components
1. **PostComments.tsx** (`components/PostComments.tsx`)
   - Comment input with @mention autocomplete
   - Displays comments with mention rendering
   - Manual mention saving after comment creation

2. **PostCommentsModal** (`app/posts/[id]/comments.tsx`)
   - Full-screen comments view
   - Uses `engagementService.comments.create()`
   - **ISSUE: Does NOT render mentions as clickable links**

### Database Schema
- `post_comments` table - stores comments
- `restaurant_mentions` table - links comments to restaurants
- `process_restaurant_mentions()` function - processes mentions from comment text
- `trigger_process_restaurant_mentions()` trigger - auto-processes mentions on INSERT

### Services
- `CommentsManager` (`services/engagement/CommentsManager.ts`) - handles comment CRUD
- `handle_post_engagement()` RPC function - creates comments via RPC

---

## Issues Found

### 🔴 Critical Issues

#### 1. Comments Modal Doesn't Render Mentions
**Location:** `app/posts/[id]/comments.tsx` line 718, 784

**Problem:**
- Comments are displayed as plain text: `<Text style={styles.commentText}>{comment.content}</Text>`
- Mentions are not parsed or rendered as clickable links
- Mentions are stored in database but not displayed properly

**Impact:** Users can't click on restaurant mentions in the full comments view

**Fix Required:**
- Add mention loading logic similar to `PostComments.tsx`
- Add `renderCommentText()` function to parse and render mentions
- Load mentions from `restaurant_mentions` table when loading comments

#### 2. Duplicate Mention Processing
**Location:** `components/PostComments.tsx` lines 280-306

**Problem:**
- Database trigger `process_mentions_after_comment_insert` automatically processes mentions
- `PostComments.tsx` also manually saves mentions after comment creation
- This could cause duplicate mention records (though UNIQUE constraint prevents it)

**Impact:** Redundant processing, potential race conditions

**Recommendation:**
- Remove manual mention saving from `PostComments.tsx` since trigger handles it
- OR remove trigger and handle mentions only in frontend
- Current approach works but is inefficient

#### 3. Comments Modal Missing Mention Input
**Location:** `app/posts/[id]/comments.tsx`

**Problem:**
- No @mention autocomplete in the comments modal
- Users can't tag restaurants when commenting from the full-screen view

**Impact:** Inconsistent UX - mentions work in PostComments but not in modal

**Fix Required:**
- Add mention autocomplete to comments modal input
- Reuse logic from `PostComments.tsx`

### ⚠️ Medium Priority Issues

#### 4. Regex Pattern Mismatch
**Location:** `components/PostComments.tsx` line 58 vs `20250125_add_restaurant_mentions.sql` line 49

**Problem:**
- Frontend regex: `/@(\w*)$/` - only matches word characters
- Database regex: `@([A-Za-z0-9\s&''-]+)` - matches spaces, apostrophes, etc.

**Impact:** 
- Autocomplete may not trigger for restaurant names with spaces
- User types `@The Rustic` but regex only matches `@The` (if cursor is after "The")

**Fix Required:**
- Update frontend regex to match database pattern
- Or update database pattern to match frontend

#### 5. Mention Loading Not Optimized
**Location:** `components/PostComments.tsx` lines 166-202

**Problem:**
- Mentions are loaded separately after comments
- Could be optimized with a JOIN query

**Impact:** Extra database roundtrip, slower comment loading

**Recommendation:** Consider joining mentions in the initial comment query

### ✅ Working Correctly

1. ✅ Database trigger processes mentions automatically
2. ✅ Notifications sent to restaurant owners
3. ✅ Mentions are clickable in `PostComments.tsx`
4. ✅ Autocomplete dropdown works
5. ✅ Multiple mentions in one comment work
6. ✅ CASCADE delete removes mentions when comment deleted

---

## Testing Guide

See `docs/COMMENTS_AND_POSTS_TESTING_GUIDE.md` for comprehensive testing instructions.

### Quick Smoke Tests

1. **Basic Comment Flow**
   - Post a comment without mentions → Should work
   - Post a comment with @mention → Mention should be clickable in PostComments component

2. **Comments Modal**
   - Open full comments view
   - View comments with mentions → Mentions should be plain text (known issue)
   - Post comment from modal → Should work but mentions won't be clickable

3. **Mention Autocomplete**
   - Type `@` in comment input → Dropdown appears
   - Type `@gold` → Shows matching restaurants
   - Select restaurant → Mention inserted

4. **Database Verification**
   ```sql
   -- Check mentions are created
   SELECT rm.*, pc.content, r.name as restaurant_name
   FROM restaurant_mentions rm
   JOIN post_comments pc ON rm.comment_id = pc.id
   JOIN restaurants r ON rm.restaurant_id = r.id
   ORDER BY rm.created_at DESC
   LIMIT 10;
   ```

---

## Recommended Fixes

### Priority 1: Add Mention Rendering to Comments Modal
1. Load mentions when loading comments
2. Add `renderCommentText()` function
3. Parse mentions and render as clickable links

### Priority 2: Add Mention Input to Comments Modal
1. Add autocomplete dropdown
2. Add mention state management
3. Handle mention saving (or rely on trigger)

### Priority 3: Fix Regex Pattern
1. Standardize regex between frontend and backend
2. Test with restaurant names containing spaces and special characters

### Priority 4: Optimize Mention Loading
1. Join mentions in initial comment query
2. Reduce database roundtrips

---

## Code Quality Notes

### Good Practices
- ✅ Proper error handling in comment creation
- ✅ Optimistic updates for better UX
- ✅ CASCADE deletes prevent orphaned records
- ✅ RLS policies protect data access

### Areas for Improvement
- ⚠️ Code duplication between PostComments and CommentsModal
- ⚠️ Inconsistent mention handling between components
- ⚠️ Could extract mention logic into shared hook/service

---

## Migration Status

✅ Migration `20250125_add_restaurant_mentions.sql` applied
✅ Trigger `process_mentions_after_comment_insert` active
✅ Table `restaurant_mentions` exists
✅ Function `process_restaurant_mentions()` available

---

## Next Steps

1. Fix mention rendering in comments modal (Priority 1)
2. Add mention input to comments modal (Priority 2)
3. Test thoroughly with the testing guide
4. Consider refactoring to shared mention utilities
