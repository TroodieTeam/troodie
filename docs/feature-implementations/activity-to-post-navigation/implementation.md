# Navigation from Activity Screen to Post Detail

## Overview
This feature enables users to navigate directly from the Activity screen to the Post Detail screen when they tap on any post-related activity item.

## Implementation Status
✅ **Completed** - Needs Review

## Files Modified
- `/components/activity/ActivityFeedItem.tsx`

## Implementation Details

### Changes Made
Modified the `handleTargetPress` function in the ActivityFeedItem component to navigate directly to the post detail screen when the activity type is 'post'.

### Key Code Changes
```typescript
// Before:
case 'post':
  if (activity.target_id) {
    if (onPostPress) {
      onPostPress(activity.target_id);
    } else {
      // Navigate to post detail or restaurant with post highlighted
      if (activity.restaurant_id) {
        router.push(`/restaurant/${activity.restaurant_id}?postId=${activity.target_id}`);
      }
    }
  }
  break;

// After:
case 'post':
  if (activity.target_id) {
    if (onPostPress) {
      onPostPress(activity.target_id);
    } else {
      // Navigate directly to post detail screen
      router.push(`/post/${activity.target_id}`);
    }
  }
  break;
```

## Technical Details
- **Navigation Method**: Using Expo Router's `push` method
- **Route Pattern**: `/post/[id]` where `id` is the post ID
- **Fallback**: If `onPostPress` prop is provided, it takes precedence

## User Experience
1. User scrolls through the Activity feed
2. User sees a post-related activity (e.g., "John shared a post")
3. User taps on the activity item
4. App navigates directly to the full post detail screen
5. User can view the complete post with all comments and interactions

## Dependencies
- Expo Router for navigation
- Post detail screen must exist at `/app/post/[id].tsx`

## Testing Considerations
- Verify navigation works for all post activity types
- Ensure post ID is correctly passed to detail screen
- Test with posts that have and don't have restaurant associations
- Verify back navigation returns to Activity screen