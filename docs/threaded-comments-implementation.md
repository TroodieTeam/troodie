# Threaded Comments Implementation Summary

## Overview
This document tracks the implementation of threaded comments (replies) functionality in the Posts & Engagement System, including fixes for comment count synchronization and reply persistence.

## Key Features Implemented

### 1. Reply Creation & Persistence
- **Issue**: Replies were being created but lost when navigating back to comments screen
- **Root Cause**: `loadComments()` was replacing the entire comments array, wiping out replies that weren't persisted
- **Solution**: 
  - Preserve existing replies when reloading top-level comments
  - Automatically load replies from database for comments that have them
  - Added `batchGetReplyCounts()` method to detect which comments have replies

### 2. Comment Count Synchronization
- **Issue**: Comment counts displayed incorrectly after creating comments/replies
- **Root Cause**: Multiple synchronization issues between:
  - Optimistic updates
  - Realtime subscriptions
  - Event bus emissions
  - Hook state synchronization
- **Solution**:
  - Improved sync logic in `usePostEngagement` hook to detect significant count differences
  - Added event bus listener in `ExploreScreen` to update post list
  - Added focus effect to refresh engagement stats when navigating back
  - Direct database queries for emitting accurate counts via event bus

### 3. Reply Replacement Logic Fix
- **Issue**: When creating a reply, `setReplyingTo(null)` was called before API completion, causing replacement logic to fail
- **Solution**: Store `parentCommentId` before clearing `replyingTo`, use stored value for replacement logic

### 4. Auto-Loading Replies
- **Feature**: When reloading comments, automatically detect and load replies from database
- **Implementation**:
  - `batchGetReplyCounts()` queries database for reply counts
  - Filters comments that have replies in DB but not in memory
  - Loads replies in parallel and merges into comment state
  - Prevents race conditions by checking comment IDs haven't changed

## Technical Details

### Files Modified

#### `/app/posts/[id]/comments.tsx`
- Added reply preservation logic in `loadComments()`
- Added auto-loading of replies when reloading comments
- Fixed reply replacement logic to use stored `parentCommentId`
- Improved logging for debugging reply creation/rendering

#### `/services/engagement/CommentsManager.ts`
- Added `batchGetReplyCounts()` method to check which comments have replies
- Improved comment creation to fetch actual count from database for event emission

#### `/hooks/usePostEngagement.ts`
- Enhanced sync logic to detect significant count differences (>1)
- Improved synchronization with `initialStats` prop
- Better handling of realtime updates vs. external updates

#### `/app/(tabs)/explore.tsx`
- Added event bus listener for `POST_ENGAGEMENT_CHANGED` events
- Added focus effect to refresh engagement stats when navigating back
- Improved post list updates when engagement changes occur

### Database Schema
- Replies are stored in `post_comments` table with `parent_comment_id` foreign key
- Comment counts include all comments (top-level + replies)
- `getCount()` queries all comments for a post, regardless of parent

### State Management
- Replies are stored in `comment.replies` array
- `expandedReplies` Set tracks which comments have expanded replies
- `seenCommentIds` Set prevents duplicate comment additions
- Replies are loaded on-demand when expanding, or automatically when reloading

## Testing Checklist
- [x] Create top-level comment → appears in list
- [x] Create reply to comment → appears under parent when expanded
- [x] Navigate away and back → replies persist
- [x] Comment counts update correctly after creating comments/replies
- [x] Realtime updates work for both comments and replies
- [x] Multiple replies to same comment display correctly
- [x] Reply deletion works correctly

## Known Issues
- None currently

## Future Improvements
- Consider lazy-loading replies only when user expands (currently auto-loads on reload)
- Add pagination for replies if a comment has many replies
- Add reply-to-reply functionality (nested threading)
