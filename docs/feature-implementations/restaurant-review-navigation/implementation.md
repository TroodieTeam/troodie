# Navigation from Restaurant Social Tab to Post Detail

## Overview
This feature enables users to navigate from reviews displayed in a restaurant's Social tab directly to the full post detail view when they tap on any review.

## Implementation Status
✅ **Completed** - Needs Review

## Files Modified
- `/app/restaurant/[id].tsx`

## Implementation Details

### Changes Made
Added `onPress` handlers to three review sections in the Social tab:
1. Friends Who Visited reviews
2. Power Users & Critics reviews
3. Recent Activity reviews

### Key Code Changes

#### 1. Friends Who Visited Section
```typescript
<TouchableOpacity
  key={friend.id}
  style={styles.socialItem}
  onPress={() => {
    if (friend.post?.id) {
      router.push(`/post/${friend.post.id}`);
    }
  }}>
```

#### 2. Power Users & Critics Section
```typescript
<TouchableOpacity
  key={review.id}
  style={[styles.socialItem, styles.powerUserItem]}
  onPress={() => {
    if (review.post?.id) {
      router.push(`/post/${review.post.id}`);
    }
  }}>
```

#### 3. Recent Activity Section
```typescript
<TouchableOpacity
  key={activity.id}
  style={styles.activityItem}
  onPress={() => {
    if (activity.action === 'reviewed' && activity.review?.id) {
      router.push(`/post/${activity.review.id}`);
    }
  }}>
```

## Technical Details
- **Navigation Method**: Expo Router's `push` method
- **Route Pattern**: `/post/[id]` where `id` is the post/review ID
- **Conditional Navigation**: Only reviews navigate to post detail, not saves or check-ins

## User Experience
1. User visits a restaurant detail page
2. User taps on the "Social" tab
3. User sees reviews from friends, power users, or recent activity
4. User taps on any review item
5. App navigates to the full post detail screen
6. User can view complete review with all interactions

## Review Sections Affected
- **Friends Who Visited**: Shows reviews from user's friends
- **Power Users & Critics**: Shows reviews from influential users
- **Recent Activity**: Shows live feed of all recent interactions

## Dependencies
- Expo Router for navigation
- Post detail screen at `/app/post/[id].tsx`
- Reviews must have valid post IDs

## Testing Considerations
- Test navigation from all three social sections
- Verify only reviews are clickable (not saves or check-ins)
- Ensure post detail loads with complete review data
- Test back navigation returns to restaurant Social tab
- Verify navigation with reviews that have photos