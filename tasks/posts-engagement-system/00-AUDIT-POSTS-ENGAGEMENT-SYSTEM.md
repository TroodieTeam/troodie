# Posts & Engagement System Audit

**Date:** December 2024
**Auditor:** System Architecture Review
**Severity:** High - Core User Experience Impact

---

## Executive Summary

The current posts, likes, comments, and engagement system has evolved organically with multiple bandaid fixes, resulting in a fragmented architecture that introduces race conditions, duplicate state management, stale data issues, and poor separation of concerns.

This document provides a comprehensive audit of the current state, architectural diagram, identified weaknesses, and prioritized engineering tasks to mature the system to production-grade quality comparable to Instagram/Twitter.

---

## Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CURRENT STATE (Fragmented)                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PostCard.tsx  │     │ Comments Modal  │     │  Explore Feed   │
│  (712 lines)    │     │  (1134 lines)   │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       │
┌─────────────────┐     ┌─────────────────┐              │
│usePostEngagement│     │usePostEngagement│              │
│   (570 lines)   │     │   (duplicate)   │              │
└────────┬────────┘     └────────┬────────┘              │
         │                       │                       │
         ├───────────────────────┼───────────────────────┤
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ enhanced        │     │ commentService  │     │ postService     │
│ PostEngagement  │     │ (253 lines)     │     │ (1197 lines)    │
│ Service (587)   │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │              ┌────────┼───────────────────────┤
         │              │        │                       │
         ▼              ▼        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ postEngagement  │     │ realtimeManager │     │ Supabase        │
│ Service (419)   │     │ (187 lines)     │     │ Direct Calls    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE DATABASE                              │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│     posts       │   post_likes    │  post_comments  │    post_saves       │
│ ─────────────── │ ─────────────── │ ─────────────── │ ───────────────     │
│ likes_count     │ post_id         │ post_id         │ post_id             │
│ comments_count  │ user_id         │ user_id         │ user_id             │
│ saves_count     │ created_at      │ content         │ board_id            │
│ share_count     │                 │ parent_id       │ created_at          │
│ (STALE!)        │                 │ created_at      │                     │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘
         │                                   │
         ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE TRIGGERS                                   │
│  - update_post_comment_count  (duplicate triggers exist!)                   │
│  - update_post_like_count                                                   │
│  - Multiple migration attempts to fix triggers                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Target Architecture (Instagram/Twitter Grade)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TARGET STATE (Unified)                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PostCard.tsx  │     │ Comments Modal  │     │  Explore Feed   │
│  (Slim ~300)    │     │  (Slim ~500)    │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Engagement State Manager                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Single Source of Truth for ALL engagement state                   │    │
│  │  • Post engagement stats (likes, comments, saves, shares)          │    │
│  │  • User engagement state (isLiked, isSaved per post)               │    │
│  │  • Optimistic update queue with rollback                           │    │
│  │  • Event bus for cross-component sync                              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Unified Engagement Service                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Likes      │  │ Comments   │  │ Saves      │  │ Shares     │            │
│  │ Manager    │  │ Manager    │  │ Manager    │  │ Manager    │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        └───────────────┴───────────────┴───────────────┘                   │
│                                 │                                           │
│  ┌──────────────────────────────┴──────────────────────────────┐           │
│  │              Optimistic Update Manager                       │           │
│  │  • Queue operations with retry logic                         │           │
│  │  • Timestamp-based conflict resolution                       │           │
│  │  • Server reconciliation                                     │           │
│  └──────────────────────────────────────────────────────────────┘           │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Centralized Realtime Subscription Hub                    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Single subscription per entity (not per component)                │    │
│  │  • post_likes changes → broadcast to all listeners                 │    │
│  │  • post_comments changes → broadcast to all listeners              │    │
│  │  • Automatic cleanup on unmount                                    │    │
│  │  • Self-event filtering                                            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE DATABASE                              │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│     posts       │   post_likes    │  post_comments  │    post_saves       │
│ ─────────────── │ ─────────────── │ ─────────────── │ ───────────────     │
│ (NO count cols) │ post_id         │ post_id         │ post_id             │
│ metadata only   │ user_id         │ user_id         │ user_id             │
│                 │ created_at      │ content         │ board_id            │
│                 │                 │ parent_id       │ created_at          │
│                 │                 │ created_at      │                     │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘
         │
         ▼
    Counts calculated at query time via COUNT(*) or cached in Redis
```

---

## Critical Weaknesses Identified

### 1. **Duplicate Service Architecture** (Severity: HIGH)
**Location:** `postEngagementService.ts`, `enhancedPostEngagementService.ts`, `commentService.ts`, `postService.ts`

**Problem:**
- 4 different services handle engagement operations
- `postEngagementService.ts` (419 lines) - basic like/comment/save operations
- `enhancedPostEngagementService.ts` (587 lines) - "enhanced" optimistic updates
- `commentService.ts` (253 lines) - comment CRUD
- `postService.ts` also has engagement count calculations (1197 lines)

**Impact:**
- Inconsistent behavior between services
- Cache invalidation nightmares
- Difficulty in debugging issues
- Multiple places to update for any change

**Evidence:**
```typescript
// enhancedPostEngagementService.ts:46
async togglePostLikeOptimistic(...) // Uses RPC handle_post_engagement

// postEngagementService.ts:46
async togglePostLike(...) // Uses direct table operations

// Both can be called for the same operation!
```

---

### 2. **Stale Count Columns** (Severity: HIGH)
**Location:** `posts` table columns: `likes_count`, `comments_count`, `saves_count`, `share_count`

**Problem:**
The database has denormalized count columns that frequently go stale. The code attempts to fix this by:
- Calculating counts from actual data in EVERY query (postService.ts:24-77)
- Having database triggers that sometimes fail
- Multiple migration files attempting to fix trigger issues

**Impact:**
- Performance degradation (N+3 queries for every post list)
- Race conditions between triggers and calculated counts
- Confusion about which value is authoritative

**Evidence:**
```typescript
// postService.ts:349-355 - EVERY getPost() call does this:
const { commentCounts, likeCounts, saveCounts } = await this.calculateEngagementCounts([postId]);

// Override stale column values with actual counts
postData.comments_count = commentCounts.get(postId) || 0;
postData.likes_count = likeCounts.get(postId) || 0;
postData.saves_count = saveCounts.get(postId) || 0;
```

---

### 3. **Duplicate Realtime Subscriptions** (Severity: MEDIUM-HIGH)
**Location:** `usePostEngagement.ts`, `app/posts/[id]/comments.tsx`, `enhancedPostEngagementService.ts`

**Problem:**
- Each component creates its own realtime subscription
- `usePostEngagement` subscribes to `post-comments-${postId}`
- Comments modal ALSO subscribes to `post-comments-realtime-${postId}`
- `enhancedPostEngagementService` has its own subscription methods

**Impact:**
- Multiple subscriptions for the same data
- Race conditions when multiple subscribers update state
- Memory leaks if cleanup isn't perfect
- Bandwidth waste

**Evidence:**
```typescript
// usePostEngagement.ts:194
unsubscribeComments.current = realtimeManager.subscribe(
  `post-comments-${postId}`, // Subscription 1
  ...
);

// comments.tsx:120
const unsubscribe = realtimeManager.subscribe(
  `post-comments-realtime-${post.id}`, // Subscription 2 (different name, same table)
  ...
);
```

---

### 4. **Complex State Synchronization** (Severity: HIGH)
**Location:** `usePostEngagement.ts` (570 lines)

**Problem:**
The hook has grown to handle too many responsibilities:
- Initial state management
- Optimistic updates
- Server reconciliation
- Realtime subscriptions
- Caching
- Event bus emissions
- Subscription lifecycle

**Impact:**
- Extremely hard to debug
- Multiple refs tracking state (`lastPostIdRef`, `lastInitialStatsRef`, `subscribedPostIdRef`, `hasReceivedRealtimeUpdate`)
- Complex conditional logic for when to update vs ignore
- Comments in code like "CRITICAL: Don't reset counts if we've already received realtime updates"

**Evidence:**
```typescript
// usePostEngagement.ts:82-145 - Look at the complexity:
useEffect(() => {
  const isNewPost = lastPostIdRef.current !== postId;

  if (isNewPost) {
    lastPostIdRef.current = postId;
    lastInitialStatsRef.current = initialStats || null;
    hasReceivedRealtimeUpdate.current = false;

    // CRITICAL: Don't reset counts if we've already received realtime updates
    if (initialStats) {
      if (!hasReceivedRealtimeUpdate.current) {
        setLikesCount(initialStats.likes_count || 0);
        // ... more state updates
      } else {
        if (__DEV__) {
          console.log(`Skipping count initialization - realtime updates already received`);
        }
      }
    }
    // ... continues for 60+ more lines
  }
}, [postId, user?.id]);
```

---

### 5. **Comment Count Synchronization Issues** (Severity: HIGH)
**Location:** Multiple files

**Problem:**
The comment count is managed in at least 5 different places:
1. `posts.comments_count` column (stale)
2. `postService.calculateEngagementCounts()` (on-demand calculation)
3. `usePostEngagement` state (local component state)
4. `commentService.getCommentCount()` (yet another calculation)
5. Comments array length in the comments modal

**Impact:**
- Count mismatches across the app
- Debug logs like "MISMATCH - post.comments_count !== displayed commentsCount"
- Multiple documentation files specifically for fixing comment counts

**Evidence:**
```typescript
// PostCard.tsx:96-103 - Debug logging for this exact issue:
useEffect(() => {
  if (__DEV__) {
    console.log(`[PostCard] post.comments_count: ${post.comments_count}, displayed commentsCount: ${commentsCount}`);
    if (post.comments_count !== commentsCount) {
      console.warn(`[PostCard] MISMATCH - post.comments_count !== displayed commentsCount`);
    }
  }
}, [...]);
```

---

### 6. **PostCard Bloat** (Severity: MEDIUM)
**Location:** `components/PostCard.tsx` (983 lines with styles)

**Problem:**
PostCard handles too many responsibilities:
- User display and navigation
- Restaurant info and navigation
- Photo grid/single photo display
- Video thumbnail and playback
- External content preview
- Ratings (two different systems!)
- Tags display
- Actions (like, comment, save, share)
- Menu (edit, delete, report, block)
- Image/Video viewer modals
- Report modal
- Time formatting
- Error handling for images

**Impact:**
- Hard to maintain and test
- Performance concerns with complex renders
- Difficult to reuse individual pieces

---

### 7. **Inconsistent Error Handling** (Severity: MEDIUM)
**Location:** Throughout all services

**Problem:**
- Some methods throw errors, some return null
- Some catch and log silently, some propagate
- No consistent error type/interface

**Evidence:**
```typescript
// postService.ts:316-318 - Returns null on error
if (postError) {
  return null;
}

// postService.ts:189-192 - Throws on error
if (error) {
  throw new Error(`Failed to create post: ${error.message}`);
}

// postService.ts:437 - Silently ignores error
if (userError) {
  // Handle error silently
}
```

---

### 8. **RPC vs Direct Operations Inconsistency** (Severity: MEDIUM)
**Location:** `enhancedPostEngagementService.ts`

**Problem:**
- Some operations use RPC (`handle_post_engagement`)
- Others use direct table operations
- Fallback logic when RPC fails

**Evidence:**
```typescript
// enhancedPostEngagementService.ts:62-68
const { data, error } = await supabase.rpc('handle_post_engagement', {
  p_action: 'toggle_like',
  p_post_id: postId,
  p_user_id: userId
});

// But also direct operations in togglePostLike:101-138
const { data: existingLike } = await supabase
  .from('post_likes')
  .select('id')
  ...
```

---

### 9. **Type Safety Gaps** (Severity: LOW-MEDIUM)
**Location:** Various

**Problem:**
- Heavy use of `any` types
- Type assertions without validation
- `UserInfo.id` is typed as `number` but used as `string` UUID

**Evidence:**
```typescript
// postEngagementService.ts:101
return data.map((like: any) => ({
  id: parseInt(like.user.id), // Converting UUID string to number!
  ...
}));
```

---

### 10. **Missing Offline Support** (Severity: LOW)
**Problem:**
- No queue for offline operations
- Optimistic updates fail permanently if network drops
- No retry logic that survives app restart

---

## File Summary Analysis

| File | Lines | Responsibility | Issues |
|------|-------|----------------|--------|
| `postService.ts` | 1197 | Post CRUD, engagement calc | Too large, does too much |
| `postEngagementService.ts` | 419 | Basic engagement ops | Duplicated by enhanced |
| `enhancedPostEngagementService.ts` | 587 | Optimistic engagement | Parallel to basic service |
| `commentService.ts` | 253 | Comment CRUD | Good isolation |
| `usePostEngagement.ts` | 570 | Hook for engagement | Too complex, too many refs |
| `realtimeManager.ts` | 187 | Subscription mgmt | Good but underutilized |
| `PostCard.tsx` | 983 | Post display | Massive, needs splitting |
| `comments.tsx` | 1134 | Comments modal | Large but reasonable |

**Total lines of code for post/engagement:** ~5,330 lines

---

## Prioritized Engineering Tasks

### P0 - Critical (Immediate)
1. **[task-pe-001]** Unified Engagement Service - Consolidate 4 services into 1
2. **[task-pe-002]** Eliminate Stale Count Columns - Remove denormalized counts

### P1 - High (Next Sprint)
3. **[task-pe-003]** Engagement State Machine - Single source of truth for state
4. **[task-pe-004]** Centralized Realtime Hub - One subscription per entity

### P2 - Medium (Following Sprint)
5. **[task-pe-005]** PostCard Component Refactor - Split into smaller components
6. **[task-pe-006]** Optimistic Update Manager - Proper queue with rollback

### P3 - Low (Backlog)
7. **[task-pe-007]** Type Safety Improvements
8. **[task-pe-008]** Offline Support Queue
9. **[task-pe-009]** Error Handling Standardization

---

## Success Metrics

After implementing these changes:

| Metric | Current | Target |
|--------|---------|--------|
| Engagement service files | 4 | 1 |
| Lines of engagement code | ~5,330 | ~2,500 |
| Realtime subscriptions per post | 2-3 | 1 |
| Count calculation queries per post list | N+3 | 0 |
| State management refs in hook | 5+ | 1-2 |
| Time to debug count mismatch | Hours | Minutes |

---

## Appendix: Related Documentation

- `docs/comment-count-fix-summary.md`
- `docs/industry-standard-comment-count-design.md`
- `docs/post-comments-modal-architecture-and-testing.md`
- `docs/production-ready-comment-crud-audit.md`
- `docs/system-design-audit-comment-counts.md`
- `supabase/migrations/20250123_dedupe_post_comment_count_triggers.sql`
- `supabase/migrations/20250123_fix_stale_comment_counts.sql`
