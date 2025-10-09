# Deeper Reactive UX Audit - App-Wide Improvements

- Epic: REACTIVE
- Priority: Medium
- Estimate: 3 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: task-reactive-1, task-reactive-2, task-reactive-3, task-reactive-4

## Overview
After fixing the critical reactive UX issues (likes, community join, follow counts, post deletion), conduct a comprehensive audit of all reactive features across the app to identify additional issues and establish patterns for future development. This ensures consistency and prevents similar bugs from being introduced.

## Business Value
- **Prevent Future Bugs**: Establish patterns and best practices
- **User Experience Consistency**: All reactive features behave similarly
- **Developer Efficiency**: Reusable hooks and patterns reduce development time
- **Code Quality**: Centralized reactive logic is easier to maintain

## Scope

### Areas to Audit

#### 1. **Engagement Features**
- [ ] Post comments (add, delete, like)
- [ ] Post saves (save to board, remove from board)
- [ ] Post shares (increment count)
- [ ] Restaurant saves (add to Quick Saves, add to board)
- [ ] Board restaurant management (add, remove, reorder)

#### 2. **Social Features**
- [ ] User blocking/unblocking
- [ ] Friend requests (send, accept, decline)
- [ ] Notifications (mark as read, clear all)
- [ ] Activity feed updates

#### 3. **Community Features**
- [ ] Community create/edit/delete
- [ ] Member role changes (promote to mod, demote)
- [ ] Community invitations (send, accept)
- [ ] Community settings updates

#### 4. **Board Features**
- [ ] Board create/edit/delete
- [ ] Board invitations (send, accept, decline)
- [ ] Board visibility toggle (private ↔ public)
- [ ] Board collaborator management

#### 5. **Creator Features**
- [ ] Campaign creation/editing
- [ ] Application submission
- [ ] Content approval/rejection
- [ ] Earnings updates

#### 6. **Search & Discovery**
- [ ] Search results real-time updates
- [ ] Trending content updates
- [ ] Recommendation refreshes

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Consistent reactive UX across all features
  As a user performing any action in the app
  I want immediate visual feedback
  So that the app always feels responsive

  Scenario: Any create/update/delete action
    Given I am using any feature in the app
    When I perform a create, update, or delete action
    Then I see immediate optimistic UI update (<100ms)
    And I see a loading indicator if action takes >300ms
    And I see success/error feedback when complete
    And state reverts gracefully on error

  Scenario: Real-time updates don't override user actions
    Given I have just performed an action
    When a real-time update arrives for the same entity
    Then my optimistic update is not overridden
    And counts/stats are reconciled correctly

  Scenario: Offline action queuing
    Given I am offline
    When I perform any action
    Then UI updates optimistically
    And action is queued for retry
    And I see offline indicator
    And action syncs when online
```

## Technical Implementation

### 1. Create Shared Reactive Hooks

**New File**: `hooks/useOptimisticMutation.ts`

Centralize optimistic update pattern:

```typescript
interface OptimisticMutationOptions<T, R> {
  mutationFn: (input: T) => Promise<R>;
  onOptimisticUpdate: (input: T) => void;
  onSuccess: (result: R, input: T) => void;
  onError: (error: Error, input: T) => void;
  onRevert: (input: T) => void;
  dedupKey?: string;
}

export function useOptimisticMutation<T, R>({
  mutationFn,
  onOptimisticUpdate,
  onSuccess,
  onError,
  onRevert,
  dedupKey
}: OptimisticMutationOptions<T, R>) {
  const [isLoading, setIsLoading] = useState(false);
  const activeRequests = useRef(new Map<string, Promise<R>>());

  const mutate = useCallback(async (input: T) => {
    // Deduplication
    if (dedupKey && activeRequests.current.has(dedupKey)) {
      return activeRequests.current.get(dedupKey);
    }

    // Optimistic update
    onOptimisticUpdate(input);
    setIsLoading(true);

    const promise = mutationFn(input)
      .then(result => {
        onSuccess(result, input);
        return result;
      })
      .catch(error => {
        onRevert(input);
        onError(error, input);
        throw error;
      })
      .finally(() => {
        setIsLoading(false);
        if (dedupKey) {
          activeRequests.current.delete(dedupKey);
        }
      });

    if (dedupKey) {
      activeRequests.current.set(dedupKey, promise);
    }

    return promise;
  }, [mutationFn, onOptimisticUpdate, onSuccess, onError, onRevert, dedupKey]);

  return { mutate, isLoading };
}
```

**Usage Example**:
```typescript
const { mutate: toggleLike, isLoading } = useOptimisticMutation({
  mutationFn: (postId: string) => postService.toggleLike(postId, userId),
  onOptimisticUpdate: (postId) => {
    setIsLiked(prev => !prev);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  },
  onSuccess: (result, postId) => {
    // Server confirmed - update with actual counts
    setLikesCount(result.likes_count);
  },
  onError: (error, postId) => {
    ToastService.showError('Failed to like post');
  },
  onRevert: (postId) => {
    setIsLiked(prev => !prev);
    setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
  },
  dedupKey: `like-${postId}-${userId}`
});
```

### 2. Create Real-time Subscription Manager

**New File**: `services/realtimeManager.ts`

```typescript
class RealtimeManager {
  private channels = new Map<string, RealtimeChannel>();
  private subscriptions = new Map<string, Set<(data: any) => void>>();

  subscribe<T>(
    channelName: string,
    eventConfig: {
      table: string;
      event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      filter?: string;
    },
    callback: (data: T, eventType: string) => void,
    options?: {
      ignoreUserId?: string; // Ignore events from this user (prevent self-override)
      timestampField?: string; // Only process if newer than local state
    }
  ) {
    // Implementation that prevents self-override
  }

  unsubscribe(channelName: string, callback?: (data: any) => void) {
    // Cleanup implementation
  }

  unsubscribeAll() {
    // Cleanup all subscriptions (useful on logout)
  }
}

export const realtimeManager = new RealtimeManager();
```

### 3. Offline Queue Manager

**New File**: `services/offlineQueueManager.ts`

```typescript
interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueueManager {
  private queue: QueuedAction[] = [];
  private isProcessing = false;

  async enqueue(type: string, payload: any) {
    const action: QueuedAction = {
      id: uuidv4(),
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(action);
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));

    // Try processing immediately
    if (await NetInfo.fetch().then(state => state.isConnected)) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const action = this.queue[0];

      try {
        await this.executeAction(action);
        this.queue.shift(); // Remove on success
      } catch (error) {
        action.retryCount++;

        if (action.retryCount >= 3) {
          // Give up after 3 retries
          this.queue.shift();
          console.error('Action failed after 3 retries:', action);
        } else {
          // Exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, action.retryCount) * 1000)
          );
        }
      }

      await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
    }

    this.isProcessing = false;
  }

  private async executeAction(action: QueuedAction) {
    switch (action.type) {
      case 'like_post':
        return postService.toggleLike(action.payload.postId, action.payload.userId);
      case 'follow_user':
        return followService.followUser(action.payload.userId);
      // ... other action types
    }
  }
}

export const offlineQueueManager = new OfflineQueueManager();

// Listen for network changes
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    offlineQueueManager.processQueue();
  }
});
```

### 4. Establish Reactive UX Guidelines

**New File**: `docs/REACTIVE_UX_GUIDELINES.md`

```markdown
# Reactive UX Guidelines

## Principles

1. **Optimistic First**: Always update UI immediately on user action
2. **Graceful Revert**: Undo optimistic updates on error
3. **No Self-Override**: Real-time updates shouldn't override user's own actions
4. **Debounce Rapid Taps**: Prevent duplicate requests
5. **Offline Support**: Queue actions when offline, sync when online

## Implementation Checklist

For any new reactive feature:

- [ ] Use `useOptimisticMutation` hook
- [ ] Add haptic feedback (iOS)
- [ ] Show loading state if >300ms
- [ ] Handle all error cases with revert
- [ ] Add real-time subscription (if needed)
- [ ] Implement offline queue support
- [ ] Add analytics tracking
- [ ] Write E2E tests with network throttling
- [ ] Performance profile with React DevTools

## Code Templates

### Toggle Pattern (like, follow, save)
[Code example]

### Create Pattern (post, comment, board)
[Code example]

### Delete Pattern (post, comment, board)
[Code example]

### Update Pattern (edit post, update profile)
[Code example]
```

### 5. Audit Checklist

For each reactive feature:

| Feature | Has Optimistic UI | Has Error Revert | Prevents Self-Override | Offline Support | Tests | Status |
|---------|-------------------|------------------|------------------------|-----------------|-------|--------|
| Post Like | ✅ | ✅ | ❌ | ❌ | ⚠️ | 🔴 Needs Fix |
| Post Comment | ❌ | ❌ | N/A | ❌ | ❌ | 🔴 Needs Fix |
| Post Save | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | 🔴 Needs Fix |
| Community Join | ✅ | ⚠️ | N/A | ❌ | ❌ | 🟡 Partial |
| Follow User | ✅ | ✅ | ❌ | ❌ | ⚠️ | 🟡 Partial |
| Block User | ❌ | ❌ | N/A | ❌ | ❌ | 🔴 Needs Fix |
| ... | ... | ... | ... | ... | ... | ... |

### 6. Performance Monitoring

Add to `services/analyticsService.ts`:

```typescript
export function trackReactivePerformance(
  feature: string,
  metrics: {
    tapToUIUpdate: number; // Time from user tap to visual feedback
    apiLatency: number; // Time for API call
    revertRate: number; // % of actions that had to revert
    offlineQueueSize: number;
  }
) {
  // Send to analytics platform
}
```

## Definition of Done
- [ ] All reactive features audited and documented
- [ ] Shared hooks created (`useOptimisticMutation`, etc.)
- [ ] Real-time manager implemented
- [ ] Offline queue manager implemented
- [ ] Reactive UX guidelines document created
- [ ] Audit checklist completed for all features
- [ ] Top 10 issues identified and prioritized
- [ ] Performance monitoring dashboards created
- [ ] Code review and approval
- [ ] Training session for team on new patterns

## Notes

### Priority Issues Found During Audit
1. Post comments - no optimistic UI
2. Board invitations - inconsistent state
3. Notification mark-as-read - laggy
4. Search results - don't update real-time
5. Restaurant saves - confusing state

### Metrics to Track
- Average tap-to-feedback latency (target: <100ms)
- Optimistic update revert rate (target: <2%)
- Offline queue success rate (target: >95%)
- Real-time sync latency (target: <500ms)

### References
- [React Query: Optimistic Updates](https://tanstack.com/query/latest/docs/guides/optimistic-updates)
- [Instagram Engineering: Optimistic UI](https://instagram-engineering.com/making-instagram-com-faster-4f1ecacc3d67)
- [Supabase Realtime: Best Practices](https://supabase.com/docs/guides/realtime)
