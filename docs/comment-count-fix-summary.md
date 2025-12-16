# Comment Count Fix - Single Source of Truth

## Problem
- Multiple places reading comment data causing inconsistency
- `posts.comments_count` column was stale (showing 4 instead of 5)
- Comments list was correct (from `post_comments` table) but count was wrong

## Solution: Single Source of Truth

### 1. **Comment Data: `post_comments` Table**
   - **ONLY** `commentService.ts` reads/writes comments
   - All comment operations go through `commentService`
   - No other services should query `post_comments` directly

### 2. **Comment Count: Calculated from `post_comments`**
   - `postService.getExplorePosts()` now calculates actual counts from `post_comments` table
   - Overrides stale `posts.comments_count` column values
   - Always accurate, no dependency on triggers

### 3. **Realtime Updates: `posts` Table Subscription**
   - `usePostEngagement` subscribes to `posts` table UPDATE events
   - When trigger updates `posts.comments_count`, realtime fires
   - UI updates automatically

## Architecture

```
┌─────────────────────────────────────────┐
│         post_comments table              │
│  (SINGLE SOURCE OF TRUTH for comments)  │
└──────────────┬──────────────────────────┘
               │
               ├─→ commentService.ts (ONLY service that reads/writes)
               │
               ├─→ postService.getExplorePosts() calculates count
               │   (overrides stale posts.comments_count)
               │
               └─→ DB Trigger updates posts.comments_count
                   └─→ Realtime fires → usePostEngagement updates UI
```

## Files Changed

1. **`services/commentService.ts`**
   - Added `getCommentCount()` function
   - Single service for all comment operations

2. **`services/postService.ts`**
   - `getExplorePosts()` now calculates actual comment counts
   - Overrides stale `posts.comments_count` values
   - Always shows accurate counts

3. **`hooks/usePostEngagement.ts`**
   - Subscribes to `posts` table for realtime updates
   - Accepts realtime updates as authoritative

## Migration Required

Run this to fix existing stale counts:

```sql
-- Recalculate all comment counts
UPDATE posts 
SET 
  comments_count = (
    SELECT COUNT(*) 
    FROM post_comments 
    WHERE post_comments.post_id = posts.id
  ),
  updated_at = NOW();
```

## Going Forward

- **Comment count is always calculated from `post_comments` table**
- **Trigger keeps `posts.comments_count` in sync** (for performance)
- **If trigger fails, count is still accurate** (calculated on read)
- **Realtime updates UI automatically** when trigger fires

## Deprecated Services

These services should NOT be used for comments:
- ❌ `postEngagementService.getPostComments()` - Use `commentService` instead
- ❌ `enhancedPostEngagementService` comment methods - Use `commentService` instead
- ❌ Direct queries to `post_comments` - Use `commentService` instead

