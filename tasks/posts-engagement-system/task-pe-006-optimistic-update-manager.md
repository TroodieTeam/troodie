# Task PE-006: Optimistic Update Manager

**Priority:** P2 - Medium
**Estimated Effort:** 2 days
**Dependencies:** PE-001, PE-003
**Blocks:** None

---

## Summary

Create a dedicated Optimistic Update Manager that provides robust handling for optimistic UI updates, including operation queuing, retry logic, conflict resolution, and reliable rollback mechanisms.

---

## Problem Statement

Current optimistic update handling is scattered and inconsistent:

### Current Issues

1. **Inconsistent patterns across services**
   ```typescript
   // enhancedPostEngagementService.ts - Has optimistic updates
   async togglePostLikeOptimistic(...) {
     this.cache.likes.set(cacheKey, !currentLikeState);
     try { ... } catch { /* rollback */ }
   }

   // postEngagementService.ts - No optimistic updates
   async togglePostLike(...) {
     const isLiked = await this.isPostLikedByUser(...);
     if (isLiked) { await this.unlikePost(...); }
     // No optimistic UI at all!
   }
   ```

2. **No operation queuing**
   - Rapid taps can create race conditions
   - No debouncing or deduplication
   - Server and client can get out of sync

3. **Basic rollback only**
   - Just reverts to previous state
   - No handling for partial failures
   - No retry mechanism

4. **No conflict resolution**
   - What if server says "already liked" but we tried to like?
   - No timestamp-based conflict handling

---

## Solution Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Optimistic Update Manager                       │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Operation Queue                         │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │  │
│  │  │ Op 1    │→ │ Op 2    │→ │ Op 3    │→ │ Op 4    │      │  │
│  │  │ (proc)  │  │ (queue) │  │ (queue) │  │ (queue) │      │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Operation Processor                      │  │
│  │  - Deduplication (don't double-like)                      │  │
│  │  - Debouncing (wait 300ms before server call)             │  │
│  │  - Retry logic (3 attempts with backoff)                  │  │
│  │  - Conflict resolution (timestamp-based)                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Rollback Registry                       │  │
│  │  postId: [rollback1, rollback2, ...]                      │  │
│  │  - Chained rollbacks for multiple pending ops             │  │
│  │  - Atomic rollback on failure                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Server Reconciliation                    │  │
│  │  - After server response, update to server truth          │  │
│  │  - Handle "already liked" conflicts gracefully            │  │
│  │  - Emit events for UI updates                             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// services/optimisticUpdateManager.ts

type OperationType = 'like' | 'unlike' | 'save' | 'unsave' | 'comment' | 'delete_comment';

interface Operation {
  id: string;
  type: OperationType;
  entityId: string; // postId or commentId
  userId: string;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  rollback: () => void;
  execute: () => Promise<void>;
}

interface OperationResult {
  success: boolean;
  serverState?: any;
  error?: Error;
  conflictResolved?: boolean;
}

class OptimisticUpdateManager {
  private queue: Map<string, Operation[]> = new Map();
  private processing: Set<string> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  private readonly DEBOUNCE_MS = 300;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  /**
   * Execute an operation with optimistic update
   * Returns immediately after applying optimistic update
   * Actual server call happens after debounce
   */
  async execute<T>(
    type: OperationType,
    entityId: string,
    userId: string,
    optimisticUpdate: () => () => void, // Returns rollback function
    serverOperation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const operationKey = `${type}-${entityId}-${userId}`;

    // Cancel any pending operation of same type for same entity
    this.cancelPending(operationKey);

    // Apply optimistic update immediately
    const rollback = optimisticUpdate();

    const operation: Operation = {
      id: `${operationKey}-${Date.now()}`,
      type,
      entityId,
      userId,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      rollback,
      execute: async () => {
        try {
          const result = await serverOperation();
          onSuccess?.(result);
        } catch (error) {
          throw error;
        }
      },
    };

    // Add to queue
    const entityQueue = this.queue.get(entityId) || [];
    entityQueue.push(operation);
    this.queue.set(entityId, entityQueue);

    // Debounce server call
    const existingTimer = this.debounceTimers.get(operationKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.processOperation(operation, onError);
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(operationKey, timer);
  }

  /**
   * Execute a toggle operation (like/unlike, save/unsave)
   * Handles the common pattern of toggling state
   */
  async executeToggle(
    type: 'like' | 'save',
    entityId: string,
    userId: string,
    getCurrentState: () => boolean,
    applyOptimisticToggle: () => () => void,
    serverToggle: () => Promise<boolean>,
    onStateChange?: (newState: boolean) => void
  ): Promise<void> {
    const currentState = getCurrentState();
    const expectedNewState = !currentState;

    await this.execute(
      expectedNewState ? type : `un${type}` as OperationType,
      entityId,
      userId,
      applyOptimisticToggle,
      async () => {
        const serverState = await serverToggle();

        // Handle conflict: server says different state than expected
        if (serverState !== expectedNewState) {
          console.warn(
            `[OptimisticUpdateManager] Conflict resolved: expected ${expectedNewState}, server says ${serverState}`
          );
        }

        onStateChange?.(serverState);
        return serverState;
      }
    );
  }

  private async processOperation(
    operation: Operation,
    onError?: (error: Error) => void
  ): Promise<void> {
    const { id, entityId, retryCount } = operation;

    // Check if already processing
    if (this.processing.has(id)) return;
    this.processing.add(id);

    operation.status = 'processing';

    try {
      await operation.execute();
      operation.status = 'completed';

      // Remove from queue
      this.removeFromQueue(entityId, id);
    } catch (error) {
      console.error(`[OptimisticUpdateManager] Operation failed:`, error);

      if (retryCount < this.MAX_RETRIES) {
        // Retry with backoff
        operation.retryCount++;
        operation.status = 'pending';

        setTimeout(() => {
          this.processing.delete(id);
          this.processOperation(operation, onError);
        }, this.RETRY_DELAY_MS * Math.pow(2, retryCount));
      } else {
        // Max retries reached, rollback
        operation.status = 'failed';
        operation.rollback();
        this.removeFromQueue(entityId, id);

        onError?.(error as Error);
      }
    } finally {
      this.processing.delete(id);
    }
  }

  private cancelPending(operationKey: string): void {
    const timer = this.debounceTimers.get(operationKey);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(operationKey);
    }
  }

  private removeFromQueue(entityId: string, operationId: string): void {
    const entityQueue = this.queue.get(entityId);
    if (entityQueue) {
      const filtered = entityQueue.filter((op) => op.id !== operationId);
      if (filtered.length === 0) {
        this.queue.delete(entityId);
      } else {
        this.queue.set(entityId, filtered);
      }
    }
  }

  /**
   * Rollback all pending operations for an entity
   * Useful when navigating away or on error
   */
  rollbackAll(entityId: string): void {
    const entityQueue = this.queue.get(entityId);
    if (entityQueue) {
      // Rollback in reverse order (LIFO)
      [...entityQueue].reverse().forEach((op) => {
        if (op.status === 'pending' || op.status === 'processing') {
          op.rollback();
        }
      });
      this.queue.delete(entityId);
    }
  }

  /**
   * Get pending operation count for an entity
   */
  getPendingCount(entityId: string): number {
    return this.queue.get(entityId)?.length || 0;
  }

  /**
   * Check if any operations are pending for an entity
   */
  hasPending(entityId: string): boolean {
    return this.getPendingCount(entityId) > 0;
  }

  /**
   * Clear all pending operations (e.g., on logout)
   */
  clearAll(): void {
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
    this.queue.clear();
    this.processing.clear();
  }
}

export const optimisticUpdateManager = new OptimisticUpdateManager();
```

### Integration Example

```typescript
// In engagementService likes.toggle:

async toggle(postId: string, userId: string): Promise<ToggleResult> {
  const store = useEngagementStore.getState();

  return new Promise((resolve) => {
    optimisticUpdateManager.executeToggle(
      'like',
      postId,
      userId,
      () => store.getPostState(postId)?.userLiked ?? false,
      () => store.optimisticLike(postId), // Returns rollback
      () => this.serverToggle(postId, userId), // Actual API call
      (newState) => {
        resolve({
          success: true,
          isLiked: newState,
          likesCount: store.getPostState(postId)?.likesCount ?? 0,
        });
      }
    );
  });
}
```

---

## Benefits

1. **Consistent handling** - All optimistic updates go through same system
2. **Debouncing** - Prevents rapid-tap issues
3. **Retry logic** - Handles transient failures
4. **Conflict resolution** - Gracefully handles server disagreements
5. **Clean rollback** - Proper undo on failure

---

## Implementation Steps

### Step 1: Create Manager
1. Create `services/optimisticUpdateManager.ts`
2. Implement core queue and processing
3. Add debounce and retry logic

### Step 2: Integrate with Engagement Service
1. Update likes manager to use optimistic manager
2. Update saves manager
3. Update comments manager

### Step 3: Testing
1. Test rapid toggle scenarios
2. Test network failure scenarios
3. Test conflict resolution

---

## Testing Requirements

### Unit Tests
- [ ] Debouncing works correctly
- [ ] Retry happens on failure
- [ ] Rollback called after max retries
- [ ] Cancel pending works
- [ ] Conflict resolution handles mismatches

### Integration Tests
- [ ] Full like/unlike cycle with failures
- [ ] Rapid tapping doesn't break state
- [ ] Multiple entities handled correctly

---

## Success Criteria

- [ ] All optimistic updates use the manager
- [ ] No race conditions on rapid interactions
- [ ] Graceful handling of network issues
- [ ] Clean UI state even after failures
- [ ] Logging for debugging

---

## Files to Modify

### Create
- `services/optimisticUpdateManager.ts`

### Modify
- `services/engagement/LikesManager.ts`
- `services/engagement/SavesManager.ts`
- `services/engagement/CommentsManager.ts`
