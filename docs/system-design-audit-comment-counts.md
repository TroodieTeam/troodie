# System Design Audit: Comment Count Updates

## Current Architecture Problems

### 1. **Multiple Sources of Truth (Anti-Pattern)**
- **Problem**: Comment counts are updated via:
  - Event bus (`EVENTS.POST_ENGAGEMENT_CHANGED`)
  - DeviceEventEmitter (`post-comment-added`)
  - Full reloads (`posts.load()`)
  - Realtime subscriptions (`usePostEngagement` hook)
  
- **Impact**: Race conditions, stale data, overwritten optimistic updates

### 2. **Fighting Between Optimistic Updates and Reloads**
- **Problem**: `useFocusEffect` reloads all posts when navigating back, overwriting:
  - Optimistic comment count updates
  - Realtime updates that just arrived
  - Event-based updates
  
- **Impact**: User sees incorrect counts, poor UX

### 3. **Redundant Update Mechanisms**
- **Problem**: 
  - `usePostEngagement` hook already has realtime subscription to `posts` table
  - `explore.tsx` also tries to manage state via events
  - Both try to update the same data
  
- **Impact**: Unnecessary complexity, bugs, performance overhead

### 4. **Event-Based Updates Are Fragile**
- **Problem**: Events can be:
  - Lost if component unmounts
  - Received out of order
  - Duplicated
  - Not received at all
  
- **Impact**: Inconsistent state across components

## Root Cause Analysis

The fundamental issue is **architectural confusion**:
- We're treating Supabase Realtime as optional/backup
- We're using events as primary update mechanism
- We're reloading data when realtime should handle it

## Correct Architecture (Single Source of Truth)

### Principle: **Supabase Realtime is the Source of Truth**

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase Database                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  posts.comments_count (updated by DB trigger)   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Realtime UPDATE events
                        ▼
┌─────────────────────────────────────────────────────────┐
│              usePostEngagement Hook                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Realtime subscription to posts table           │   │
│  │  Updates: commentsCount state                    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Provides state via hook
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    PostCard Component                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Uses usePostEngagement hook                      │   │
│  │  Displays: commentsCount from hook                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Renders in list
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  explore.tsx Screen                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Renders PostCard components                     │   │
│  │  NO state management for counts                  │   │
│  │  NO event listeners                              │   │
│  │  NO reloads on focus                             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Remove Event-Based Updates (CRITICAL)
1. **Remove from `app/posts/[id]/comments.tsx`**:
   - Remove `DeviceEventEmitter.emit('post-comment-added')`
   - Remove `eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED)`
   - **Why**: Realtime subscription in `usePostEngagement` handles this

2. **Remove from `app/(tabs)/explore.tsx`**:
   - Remove `DeviceEventEmitter.addListener('post-comment-added')`
   - Remove `eventBus.on(EVENTS.POST_ENGAGEMENT_CHANGED)` listener
   - Remove `recentlyUpdatedPostIds` tracking
   - Remove `lastCommentUpdateTime` tracking
   - **Why**: PostCard components use `usePostEngagement` hook which has realtime

### Phase 2: Remove Reloads on Focus (CRITICAL)
1. **Update `useFocusEffect` in `explore.tsx`**:
   - Remove `posts.load()` for posts tab
   - **Why**: Realtime subscriptions keep data fresh automatically
   - Keep reloads only for restaurants (they need randomization)

### Phase 3: Verify Realtime Subscriptions
1. **Ensure `usePostEngagement` hook**:
   - Subscribes to `posts` table UPDATE events
   - Updates `commentsCount` from realtime events
   - Uses `commit_timestamp` for reliable freshness checks
   - **Status**: ✅ Already implemented correctly

2. **Ensure PostCard components**:
   - Use `usePostEngagement` hook with `enableRealtime: true`
   - Display `commentsCount` from hook
   - **Status**: ✅ Already implemented correctly

### Phase 4: Optimistic Updates (Keep Local Only)
1. **In comments modal**:
   - Keep optimistic UI updates locally
   - Don't emit events
   - Let realtime sync handle the final state
   - **Why**: Provides instant feedback without global state management

## Expected Behavior After Fix

1. **User adds comment**:
   - Comment appears optimistically in modal (local state)
   - DB trigger updates `posts.comments_count`
   - Realtime UPDATE event fires
   - `usePostEngagement` hook receives update
   - `commentsCount` state updates in hook
   - PostCard re-renders with new count
   - **No events needed, no reloads needed**

2. **User navigates back**:
   - `useFocusEffect` does NOT reload posts
   - PostCard components still have active realtime subscriptions
   - Counts are already correct from realtime
   - **No race conditions, no overwrites**

## Benefits

1. **Single Source of Truth**: Database → Realtime → Hook → Component
2. **No Race Conditions**: No competing update mechanisms
3. **Simpler Code**: Remove ~100 lines of event handling code
4. **Better Performance**: No unnecessary reloads
5. **More Reliable**: Realtime is persistent, events are ephemeral

## Migration Steps

1. Remove event emissions from comments modal
2. Remove event listeners from explore.tsx
3. Remove reload-on-focus for posts tab
4. Test: Add comment, navigate back, verify count
5. Test: Add comment, wait for realtime, verify count
6. Test: Multiple comments, verify all update correctly

## Risk Assessment

- **Low Risk**: Removing redundant code
- **High Confidence**: Realtime subscriptions already work
- **Rollback Plan**: Can re-add events if needed (but shouldn't be)

