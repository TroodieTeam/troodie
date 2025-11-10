# Post Like - Optimistic UI & State Sync Issues

- Epic: REACTIVE
- Priority: Critical
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Users experience laggy, inconsistent like button behavior when liking posts. The UI doesn't respond immediately to taps, counters don't update reliably, and there's visual flickering between states. This creates a poor user experience for one of the most common interactions in the app.

## Business Value
- **User Engagement**: Smooth like interactions are table stakes for social apps. Current bugs frustrate users and reduce engagement.
- **Perceived Performance**: Optimistic UI makes the app feel instant, even on slow networks.
- **Data Integrity**: Proper error handling prevents phantom likes that don't persist to database.
- **Metric**: Target <100ms perceived response time for like button taps.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Reliable post like interactions
  As a user viewing posts
  I want immediate visual feedback when liking
  So that the app feels responsive and my actions are confirmed

  Scenario: Like a post with optimistic update
    Given I am viewing a post with 10 likes
    And I have not liked this post
    When I tap the like button
    Then the like button turns red immediately (<100ms)
    And the counter shows 11 likes immediately
    And the API call happens in background
    And if the API succeeds, state remains
    And if the API fails, button reverts to gray and counter shows 10

  Scenario: Unlike a post with optimistic update
    Given I am viewing a post I previously liked
    And the post has 15 likes
    When I tap the like button
    Then the like button turns gray immediately
    And the counter shows 14 likes immediately
    And the API call happens in background
    And state reverts on failure

  Scenario: Rapid consecutive likes (double-tap)
    Given I am viewing a post
    When I tap like button twice rapidly
    Then only one state change occurs
    And duplicate API calls are debounced
    And UI shows final state correctly

  Scenario: Like count sync from real-time updates
    Given I am viewing a post with 20 likes
    When another user likes the same post
    Then I see the counter update to 21 in real-time
    But my button state (liked/unliked) doesn't change

  Scenario: Offline like attempt
    Given I have no network connection
    When I tap the like button
    Then UI updates optimistically
    And a retry mechanism queues the action
    And user sees subtle offline indicator
    And action completes when back online
```

## Technical Implementation

### Root Causes Identified
1. **Race Conditions**: Real-time subscription updates override optimistic UI state
2. **Cache Invalidation**: `enhancedPostEngagementService` cache not properly synchronized
3. **Loading States**: `isLoading` flag blocks rapid interactions
4. **Event Propagation**: Like events trigger parent component re-renders, causing flicker

### Components to Modify

#### 1. `hooks/usePostEngagement.ts` (Lines 128-154)
**Current Issue**:
- `setIsLoike(true)` happens before API call resolves
- Real-time subscription (line 98-106) overrides optimistic state
- No debouncing for rapid taps

**Changes**:
```typescript
// Add debouncing and request deduplication
const toggleLike = useCallback(async () => {
  if (!user?.id || isTogglingLike.current) return;

  isTogglingLike.current = true;
  const previousState = isLiked;
  const previousCount = likesCount;

  // Optimistic update with timestamp
  const optimisticTimestamp = Date.now();
  setIsLiked(!previousState);
  setLikesCount(prev => previousState ? prev - 1 : prev + 1);

  try {
    const result = await enhancedPostEngagementService.togglePostLikeOptimistic(
      postId,
      user.id,
      // Success callback - only update if no newer real-time event
      (newIsLiked, newCount, serverTimestamp) => {
        if (serverTimestamp > optimisticTimestamp) {
          setIsLiked(newIsLiked);
          setLikesCount(newCount);
        }
      },
      // Error callback - revert optimistic update
      () => {
        setIsLiked(previousState);
        setLikesCount(previousCount);
        ToastService.showError('Failed to update like');
      }
    );
  } finally {
    isTogglingLike.current = false;
  }
}, [postId, user?.id, isLiked, likesCount]);
```

#### 2. `services/enhancedPostEngagementService.ts`
**Add**:
- Request deduplication map: `Map<postId, Promise>`
- Timestamp-based cache with TTL
- Retry queue for offline scenarios
- Proper error recovery

```typescript
private activeLikeRequests = new Map<string, Promise<any>>();
private likeCache = new Map<string, { isLiked: boolean, timestamp: number }>();
private readonly CACHE_TTL = 5000; // 5 seconds

async togglePostLikeOptimistic(
  postId: string,
  userId: string,
  onSuccess: (isLiked: boolean, count: number, timestamp: number) => void,
  onError: (error: Error) => void
) {
  // Prevent duplicate requests
  const requestKey = `${postId}-${userId}`;
  if (this.activeLikeRequests.has(requestKey)) {
    return this.activeLikeRequests.get(requestKey);
  }

  const requestPromise = this._executeLikeToggle(postId, userId, onSuccess, onError);
  this.activeLikeRequests.set(requestKey, requestPromise);

  requestPromise.finally(() => {
    this.activeLikeRequests.delete(requestKey);
  });

  return requestPromise;
}
```

#### 3. `components/PostCard.tsx` (Lines 81-84)
**Current Issue**:
- No visual feedback during API call
- No error recovery UX

**Changes**:
```typescript
const handleLike = async () => {
  // Add haptic feedback
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  await toggleLike();
  onLike?.(post.id, !isLiked); // Pass new state, not old state
};

// Add visual loading state (subtle pulse animation)
<TouchableOpacity
  onPress={handleLike}
  disabled={isLoading}
  style={[styles.likeButton, isLoading && styles.likeButtonPulsing]}
>
  <Ionicons
    name={isLiked ? 'heart' : 'heart-outline'}
    size={24}
    color={isLiked ? theme.colors.error : theme.colors.textSecondary}
  />
  <Text>{likesCount}</Text>
</TouchableOpacity>
```

### Database & Real-time

#### Fix Trigger Race Conditions
**File**: Check `supabase/migrations/*_likes_count_trigger.sql`
- Ensure trigger uses `AFTER INSERT/DELETE` not `BEFORE`
- Add idempotency check to prevent double-counting

#### Real-time Subscription Strategy
**Update**: `hooks/usePostEngagement.ts` (lines 94-106)
```typescript
// Subscribe to stats but ignore self-generated events
unsubscribeStats.current = enhancedPostEngagementService.subscribeToPostEngagement(
  postId,
  (stats, eventUserId) => {
    // Ignore events caused by current user to prevent override
    if (eventUserId === user?.id) return;

    // Update counts from other users
    setLikesCount(stats.likes_count || 0);
    // Don't update isLiked - that's controlled by user's own actions
  }
);
```

### Analytics & Telemetry
Add tracking for:
- Like button tap latency (time to visual feedback)
- API success/failure rates
- Optimistic update revert rate
- Real-time sync delays

### Error States and Retries
1. **Network Errors**: Queue action in AsyncStorage, retry on reconnect
2. **Server Errors (500)**: Show toast, allow manual retry
3. **Conflict Errors (409)**: Fetch fresh state, update UI
4. **Timeout (>5s)**: Show toast, keep optimistic state unless user navigates away

## Definition of Done
- [ ] Like button responds within 100ms of tap (measured via analytics)
- [ ] No visual flicker or state reversion on successful like
- [ ] Double-tap protection prevents duplicate requests
- [ ] Real-time updates from other users don't override user's own actions
- [ ] Offline likes queue and sync when online
- [ ] Error states show appropriate user feedback
- [ ] Unit tests for optimistic update logic
- [ ] Integration tests for race condition scenarios
- [ ] Analytics dashboards show <2% revert rate
- [ ] UX reviewed and approved
- [ ] Performance profiled (React DevTools)

## Notes
### Related Files
- `hooks/usePostEngagement.ts` - Main hook
- `services/enhancedPostEngagementService.ts` - Service layer
- `components/PostCard.tsx` - UI component
- `components/post/EnhancedPostCard.tsx` - Alternative card
- `components/cards/ExplorePostCard.tsx` - Explore variant

### References
- Instagram's like button UX (instant feedback)
- Twitter's optimistic UI patterns
- [React Query: Optimistic Updates](https://tanstack.com/query/latest/docs/guides/optimistic-updates)
- [Supabase Realtime: Best Practices](https://supabase.com/docs/guides/realtime)

### Testing Strategy
1. **Manual**: Use React Native Debugger to add artificial delays
2. **Automated**: Jest tests with mocked timers
3. **E2E**: Maestro flows with network throttling
4. **Load**: Simulate 10 concurrent users liking same post
