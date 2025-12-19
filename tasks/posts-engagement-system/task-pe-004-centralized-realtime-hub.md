# Task PE-004: Centralized Realtime Hub

**Priority:** P1 - High
**Estimated Effort:** 2 days
**Dependencies:** PE-001, PE-003
**Blocks:** None

---

## Summary

Create a centralized realtime subscription hub that manages ONE subscription per entity type, broadcasting updates to all listeners. This replaces the current pattern where each component creates its own subscriptions.

---

## Problem Statement

### Current State

Multiple components create their own realtime subscriptions for the same data:

```typescript
// usePostEngagement.ts:194 - Subscription 1
unsubscribeComments.current = realtimeManager.subscribe(
  `post-comments-${postId}`,
  { table: 'post_comments', event: '*', filter: `post_id=eq.${postId}` },
  ...
);

// comments.tsx:120 - Subscription 2 (same data, different channel name!)
const unsubscribe = realtimeManager.subscribe(
  `post-comments-realtime-${post.id}`,
  { table: 'post_comments', event: '*', filter: `post_id=eq.${post.id}` },
  ...
);

// enhancedPostEngagementService.ts:444 - Subscription 3
const channel = supabase
  .channel(`post-comments-${postId}`)
  .on('postgres_changes', ...)
  .subscribe();
```

### Problems

1. **Multiple subscriptions** - 2-3 subscriptions for the same data
2. **Inconsistent handling** - Each has its own logic for processing events
3. **Memory leaks** - Cleanup not always reliable
4. **Bandwidth waste** - Supabase sends same event multiple times
5. **Race conditions** - Multiple handlers updating state concurrently

---

## Solution Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Realtime Hub                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Active Subscriptions                          │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                 │  │
│  │  │ post_comments   │  │   post_likes    │                 │  │
│  │  │ (1 channel)     │  │  (1 channel)    │                 │  │
│  │  └────────┬────────┘  └────────┬────────┘                 │  │
│  │           │                    │                           │  │
│  │           ▼                    ▼                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │            Listener Registry                         │  │  │
│  │  │  post-123: [listener1, listener2, listener3]        │  │  │
│  │  │  post-456: [listener4]                               │  │  │
│  │  │  post-789: [listener5, listener6]                    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                          │                                 │  │
│  │                          │ broadcast(postId, event)       │  │
│  │                          ▼                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ PostCard A    │   │ PostCard B    │   │ Comments      │
│ (listener1)   │   │ (listener2)   │   │ Modal         │
│               │   │               │   │ (listener3)   │
└───────────────┘   └───────────────┘   └───────────────┘
```

### Implementation

```typescript
// services/realtimeHub.ts

import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type EventType = 'INSERT' | 'UPDATE' | 'DELETE';

interface RealtimeEvent<T = any> {
  type: EventType;
  table: string;
  data: T;
  oldData?: T;
  timestamp: number;
}

type Listener<T = any> = (event: RealtimeEvent<T>) => void;

interface EntitySubscription {
  channel: RealtimeChannel;
  listeners: Map<string, Set<Listener>>;
  refCount: number;
}

class RealtimeHub {
  private subscriptions: Map<string, EntitySubscription> = new Map();
  private userId: string | null = null;

  /**
   * Set the current user ID for filtering self-events
   */
  setUserId(userId: string | null): void {
    this.userId = userId;
  }

  /**
   * Subscribe to realtime events for a specific post
   * Returns an unsubscribe function
   */
  subscribeToPost(
    postId: string,
    listenerId: string,
    callback: Listener
  ): () => void {
    // Subscribe to likes
    this.addListener('post_likes', postId, listenerId, callback);
    // Subscribe to comments
    this.addListener('post_comments', postId, listenerId, callback);
    // Subscribe to saves
    this.addListener('post_saves', postId, listenerId, callback);

    return () => {
      this.removeListener('post_likes', postId, listenerId);
      this.removeListener('post_comments', postId, listenerId);
      this.removeListener('post_saves', postId, listenerId);
    };
  }

  /**
   * Subscribe to a single table for a specific entity
   */
  subscribeToTable(
    table: string,
    entityId: string,
    listenerId: string,
    callback: Listener
  ): () => void {
    this.addListener(table, entityId, listenerId, callback);
    return () => this.removeListener(table, entityId, listenerId);
  }

  private addListener(
    table: string,
    entityId: string,
    listenerId: string,
    callback: Listener
  ): void {
    const subscriptionKey = `${table}`;

    let subscription = this.subscriptions.get(subscriptionKey);

    if (!subscription) {
      // Create new channel subscription for this table
      const channel = this.createChannel(table);
      subscription = {
        channel,
        listeners: new Map(),
        refCount: 0,
      };
      this.subscriptions.set(subscriptionKey, subscription);
    }

    // Get or create listeners set for this entity
    let entityListeners = subscription.listeners.get(entityId);
    if (!entityListeners) {
      entityListeners = new Set();
      subscription.listeners.set(entityId, entityListeners);
    }

    // Add callback with listenerId as identifier
    const wrappedCallback: Listener = (event) => {
      callback(event);
    };
    (wrappedCallback as any).__listenerId = listenerId;
    entityListeners.add(wrappedCallback);
    subscription.refCount++;
  }

  private removeListener(
    table: string,
    entityId: string,
    listenerId: string
  ): void {
    const subscriptionKey = `${table}`;
    const subscription = this.subscriptions.get(subscriptionKey);

    if (!subscription) return;

    const entityListeners = subscription.listeners.get(entityId);
    if (!entityListeners) return;

    // Find and remove the listener with matching ID
    for (const listener of entityListeners) {
      if ((listener as any).__listenerId === listenerId) {
        entityListeners.delete(listener);
        subscription.refCount--;
        break;
      }
    }

    // Clean up empty entity listener sets
    if (entityListeners.size === 0) {
      subscription.listeners.delete(entityId);
    }

    // Clean up subscription if no listeners remain
    if (subscription.refCount === 0) {
      supabase.removeChannel(subscription.channel);
      this.subscriptions.delete(subscriptionKey);
    }
  }

  private createChannel(table: string): RealtimeChannel {
    const channelName = `realtime-hub-${table}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        (payload) => {
          this.handleEvent(table, payload);
        }
      )
      .subscribe();

    return channel;
  }

  private handleEvent(table: string, payload: any): void {
    const subscription = this.subscriptions.get(table);
    if (!subscription) return;

    const eventType = payload.eventType as EventType;
    const data = eventType === 'DELETE' ? payload.old : payload.new;
    const oldData = payload.old;

    // Skip self-events
    const eventUserId = data?.user_id || data?.added_by;
    if (this.userId && eventUserId === this.userId) {
      return;
    }

    // Determine which entity this event is for
    const entityId = data?.post_id || data?.id;
    if (!entityId) return;

    const event: RealtimeEvent = {
      type: eventType,
      table,
      data,
      oldData,
      timestamp: Date.now(),
    };

    // Broadcast to all listeners for this entity
    const entityListeners = subscription.listeners.get(entityId);
    if (entityListeners) {
      entityListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('[RealtimeHub] Listener error:', error);
        }
      });
    }
  }

  /**
   * Get stats for debugging
   */
  getStats(): { tables: number; totalListeners: number } {
    let totalListeners = 0;
    this.subscriptions.forEach((sub) => {
      totalListeners += sub.refCount;
    });

    return {
      tables: this.subscriptions.size,
      totalListeners,
    };
  }

  /**
   * Clean up all subscriptions (call on logout)
   */
  cleanup(): void {
    this.subscriptions.forEach((subscription) => {
      supabase.removeChannel(subscription.channel);
    });
    this.subscriptions.clear();
    this.userId = null;
  }
}

export const realtimeHub = new RealtimeHub();
```

### Integration with Engagement Store

```typescript
// stores/engagementStore.ts (additions)

import { realtimeHub, RealtimeEvent } from '@/services/realtimeHub';

// Add realtime integration
export function initializeRealtimeSync(userId: string): () => void {
  realtimeHub.setUserId(userId);

  // The hub will broadcast events, but we need to subscribe specific posts
  // This is handled by the component/hook that cares about a specific post

  return () => {
    realtimeHub.cleanup();
  };
}

// Hook to subscribe a post to realtime updates
export function useRealtimeEngagement(postId: string) {
  const { updatePost } = useEngagementStore();

  useEffect(() => {
    const listenerId = `engagement-${postId}-${Date.now()}`;

    const unsubscribe = realtimeHub.subscribeToPost(
      postId,
      listenerId,
      (event) => {
        switch (event.table) {
          case 'post_likes':
            if (event.type === 'INSERT') {
              updatePost(postId, {
                likesCount: (get().posts.get(postId)?.likesCount || 0) + 1,
              });
            } else if (event.type === 'DELETE') {
              updatePost(postId, {
                likesCount: Math.max(0, (get().posts.get(postId)?.likesCount || 0) - 1),
              });
            }
            break;

          case 'post_comments':
            if (event.type === 'INSERT') {
              updatePost(postId, {
                commentsCount: (get().posts.get(postId)?.commentsCount || 0) + 1,
              });
            } else if (event.type === 'DELETE') {
              updatePost(postId, {
                commentsCount: Math.max(0, (get().posts.get(postId)?.commentsCount || 0) - 1),
              });
            }
            break;

          case 'post_saves':
            if (event.type === 'INSERT') {
              updatePost(postId, {
                savesCount: (get().posts.get(postId)?.savesCount || 0) + 1,
              });
            } else if (event.type === 'DELETE') {
              updatePost(postId, {
                savesCount: Math.max(0, (get().posts.get(postId)?.savesCount || 0) - 1),
              });
            }
            break;
        }
      }
    );

    return unsubscribe;
  }, [postId, updatePost]);
}
```

---

## Benefits

1. **Single subscription per table** - Massive reduction in Supabase connections
2. **Consistent event handling** - One place for all realtime logic
3. **Automatic cleanup** - Hub manages lifecycle
4. **Better debugging** - `getStats()` shows active subscriptions
5. **Self-event filtering** - Handled centrally, not per-component

---

## Implementation Steps

### Step 1: Create Realtime Hub
1. Create `services/realtimeHub.ts`
2. Implement subscription management
3. Implement event broadcasting

### Step 2: Integrate with Store
1. Create `useRealtimeEngagement` hook
2. Connect to engagement store

### Step 3: Migrate Components
1. Remove direct realtimeManager calls from hooks
2. Remove direct supabase.channel calls
3. Use new hub through hooks

### Step 4: Cleanup
1. Remove old realtimeManager usage for posts
2. Update realtimeManager for other features (notifications, etc.)

---

## Testing Requirements

### Unit Tests
- [ ] Subscription creates channel correctly
- [ ] Multiple listeners share one channel
- [ ] Unsubscribe removes listener
- [ ] Channel cleaned up when no listeners
- [ ] Self-events filtered

### Integration Tests
- [ ] Event from another user broadcasts to all listeners
- [ ] Component unmount cleans up subscription
- [ ] Store updates when realtime event received

---

## Success Criteria

- [ ] Single channel per table type
- [ ] All components use hub (no direct subscriptions)
- [ ] Memory usage reduced
- [ ] `getStats()` shows expected subscription count
- [ ] Event handling is consistent

---

## Files to Modify

### Create
- `services/realtimeHub.ts`
- `hooks/useRealtimeEngagement.ts`

### Modify
- `stores/engagementStore.ts`
- `components/PostCard.tsx`
- `app/posts/[id]/comments.tsx`

### Deprecate/Remove
- Remove post-related code from `services/realtimeManager.ts`
- Remove subscription logic from `hooks/usePostEngagement.ts`
