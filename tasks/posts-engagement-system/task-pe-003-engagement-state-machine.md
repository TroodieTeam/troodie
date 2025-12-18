# Task PE-003: Engagement State Machine

**Priority:** P1 - High
**Estimated Effort:** 2-3 days
**Dependencies:** PE-001 (Unified Engagement Service)
**Blocks:** None

---

## Summary

Create a centralized Engagement State Machine that serves as the single source of truth for all post engagement state across the application. This replaces the current scattered state management in `usePostEngagement` hook and various components.

---

## Problem Statement

The current `usePostEngagement` hook (570 lines) has grown into an unmaintainable mess:

### Current State Tracking

```typescript
// usePostEngagement.ts - Current state tracking (5+ refs!)
const [isLiked, setIsLiked] = useState(initialIsLiked);
const [isSaved, setIsSaved] = useState(initialIsSaved);
const [likesCount, setLikesCount] = useState(initialStats?.likes_count || 0);
const [commentsCount, setCommentsCount] = useState(initialStats?.comments_count || 0);
const [savesCount, setSavesCount] = useState(initialStats?.saves_count || 0);
const [shareCount, setShareCount] = useState(initialStats?.share_count || 0);
const [isLoading, setIsLoading] = useState(false);
const [comments, setComments] = useState<CommentWithUser[]>([]);

// Plus these refs for tracking state changes
const lastOptimisticUpdate = useRef<number>(0);
const lastPostIdRef = useRef<string | null>(null);
const lastInitialStatsRef = useRef<PostEngagementStats | null>(null);
const subscribedPostIdRef = useRef<string | null>(null);
const hasReceivedRealtimeUpdate = useRef<boolean>(false);
```

### Problems

1. **Multiple instances** - Each PostCard creates its own hook instance
2. **State drift** - Different components can have different states for the same post
3. **Complex sync logic** - Comments like "CRITICAL: Don't reset counts if we've already received realtime updates"
4. **Memory bloat** - Each hook maintains full state even for posts scrolled out of view
5. **Impossible debugging** - 5+ refs tracking different aspects of state lifecycle

---

## Solution Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Engagement State Machine                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    PostEngagementStore                     │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Map<postId, PostEngagementState>                   │  │  │
│  │  │  - likesCount: number                               │  │  │
│  │  │  - commentsCount: number                            │  │  │
│  │  │  - savesCount: number                               │  │  │
│  │  │  - shareCount: number                               │  │  │
│  │  │  - userLiked: boolean                               │  │  │
│  │  │  - userSaved: boolean                               │  │  │
│  │  │  - lastUpdated: number                              │  │  │
│  │  │  - pendingOperations: Operation[]                   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  Methods:                                                  │  │
│  │  - getState(postId) -> PostEngagementState                │  │
│  │  - setState(postId, partial) -> void                      │  │
│  │  - subscribe(postId, callback) -> unsubscribe             │  │
│  │  - optimisticUpdate(postId, action) -> rollback           │  │
│  │  - reconcile(postId, serverState) -> void                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ subscribe/update
                              ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PostCard A    │     │   PostCard B    │     │ Comments Modal  │
│  (post-123)     │     │  (post-123)     │     │   (post-123)    │
│                 │     │                 │     │                 │
│  Same state!    │     │  Same state!    │     │  Same state!    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Implementation

```typescript
// stores/engagementStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface PostEngagementState {
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  shareCount: number;
  userLiked: boolean;
  userSaved: boolean;
  lastUpdated: number;
  loading: boolean;
}

interface EngagementStore {
  // State
  posts: Map<string, PostEngagementState>;
  userId: string | null;

  // Getters
  getPostState: (postId: string) => PostEngagementState | undefined;

  // Setters
  setUserId: (userId: string | null) => void;
  initializePost: (postId: string, state: Partial<PostEngagementState>) => void;
  updatePost: (postId: string, updates: Partial<PostEngagementState>) => void;

  // Optimistic updates
  optimisticLike: (postId: string) => () => void; // Returns rollback
  optimisticSave: (postId: string) => () => void;
  optimisticComment: (postId: string) => () => void;

  // Server reconciliation
  reconcileFromServer: (postId: string, serverState: PostEngagementState) => void;

  // Cleanup
  clearPost: (postId: string) => void;
  clearAll: () => void;
}

export const useEngagementStore = create<EngagementStore>()(
  subscribeWithSelector((set, get) => ({
    posts: new Map(),
    userId: null,

    getPostState: (postId) => get().posts.get(postId),

    setUserId: (userId) => set({ userId }),

    initializePost: (postId, state) => {
      const posts = new Map(get().posts);
      const existing = posts.get(postId);

      // Don't overwrite fresher data
      if (existing && existing.lastUpdated > (state.lastUpdated || 0)) {
        return;
      }

      posts.set(postId, {
        likesCount: 0,
        commentsCount: 0,
        savesCount: 0,
        shareCount: 0,
        userLiked: false,
        userSaved: false,
        lastUpdated: Date.now(),
        loading: false,
        ...existing,
        ...state,
      });

      set({ posts });
    },

    updatePost: (postId, updates) => {
      const posts = new Map(get().posts);
      const existing = posts.get(postId);

      if (!existing) {
        posts.set(postId, {
          likesCount: 0,
          commentsCount: 0,
          savesCount: 0,
          shareCount: 0,
          userLiked: false,
          userSaved: false,
          loading: false,
          ...updates,
          lastUpdated: Date.now(),
        });
      } else {
        posts.set(postId, {
          ...existing,
          ...updates,
          lastUpdated: Date.now(),
        });
      }

      set({ posts });
    },

    optimisticLike: (postId) => {
      const existing = get().posts.get(postId);
      if (!existing) return () => {};

      const wasLiked = existing.userLiked;
      const prevCount = existing.likesCount;

      // Optimistic update
      get().updatePost(postId, {
        userLiked: !wasLiked,
        likesCount: wasLiked ? prevCount - 1 : prevCount + 1,
      });

      // Return rollback function
      return () => {
        get().updatePost(postId, {
          userLiked: wasLiked,
          likesCount: prevCount,
        });
      };
    },

    optimisticSave: (postId) => {
      const existing = get().posts.get(postId);
      if (!existing) return () => {};

      const wasSaved = existing.userSaved;
      const prevCount = existing.savesCount;

      get().updatePost(postId, {
        userSaved: !wasSaved,
        savesCount: wasSaved ? prevCount - 1 : prevCount + 1,
      });

      return () => {
        get().updatePost(postId, {
          userSaved: wasSaved,
          savesCount: prevCount,
        });
      };
    },

    optimisticComment: (postId) => {
      const existing = get().posts.get(postId);
      if (!existing) return () => {};

      const prevCount = existing.commentsCount;

      get().updatePost(postId, {
        commentsCount: prevCount + 1,
      });

      return () => {
        get().updatePost(postId, {
          commentsCount: prevCount,
        });
      };
    },

    reconcileFromServer: (postId, serverState) => {
      const existing = get().posts.get(postId);

      // Always trust server for counts, but preserve user state if we have pending ops
      get().updatePost(postId, {
        likesCount: serverState.likesCount,
        commentsCount: serverState.commentsCount,
        savesCount: serverState.savesCount,
        shareCount: serverState.shareCount,
        // Only update user state if we're not in the middle of an operation
        ...(existing?.loading ? {} : {
          userLiked: serverState.userLiked,
          userSaved: serverState.userSaved,
        }),
      });
    },

    clearPost: (postId) => {
      const posts = new Map(get().posts);
      posts.delete(postId);
      set({ posts });
    },

    clearAll: () => set({ posts: new Map(), userId: null }),
  }))
);
```

### Selector Hooks

```typescript
// hooks/usePostEngagementState.ts

import { useEngagementStore } from '@/stores/engagementStore';
import { useShallow } from 'zustand/react/shallow';

/**
 * Get engagement state for a single post
 * Uses shallow comparison for optimal re-renders
 */
export function usePostEngagementState(postId: string) {
  const state = useEngagementStore(
    useShallow((store) => store.getPostState(postId))
  );

  const {
    initializePost,
    optimisticLike,
    optimisticSave,
    optimisticComment,
  } = useEngagementStore();

  return {
    // State
    likesCount: state?.likesCount ?? 0,
    commentsCount: state?.commentsCount ?? 0,
    savesCount: state?.savesCount ?? 0,
    shareCount: state?.shareCount ?? 0,
    isLiked: state?.userLiked ?? false,
    isSaved: state?.userSaved ?? false,
    loading: state?.loading ?? false,

    // Actions (return rollback functions)
    optimisticLike: () => optimisticLike(postId),
    optimisticSave: () => optimisticSave(postId),
    optimisticComment: () => optimisticComment(postId),

    // Initialize
    initialize: (initial: Partial<PostEngagementState>) =>
      initializePost(postId, initial),
  };
}
```

### Usage in PostCard

```typescript
// components/PostCard.tsx (simplified)

export function PostCard({ post }: PostCardProps) {
  const {
    likesCount,
    commentsCount,
    savesCount,
    isLiked,
    isSaved,
    optimisticLike,
    optimisticSave,
    initialize,
  } = usePostEngagementState(post.id);

  // Initialize once when post data arrives
  useEffect(() => {
    initialize({
      likesCount: post.likes_count,
      commentsCount: post.comments_count,
      savesCount: post.saves_count,
      userLiked: post.is_liked_by_user,
      userSaved: post.is_saved_by_user,
    });
  }, [post.id]);

  const handleLike = async () => {
    const rollback = optimisticLike();

    try {
      await engagementService.likes.toggle(post.id, userId);
    } catch (error) {
      rollback();
      ToastService.showError('Failed to like post');
    }
  };

  // ... much simpler component!
}
```

---

## Benefits

1. **Single source of truth** - All components see the same state
2. **Simpler components** - No complex state management in each component
3. **Better performance** - Zustand's selector pattern prevents unnecessary re-renders
4. **Easier debugging** - One place to inspect all engagement state
5. **Memory efficient** - Can clear state for posts no longer in view

---

## Implementation Steps

### Step 1: Create Store
1. Install Zustand if not present: `npm install zustand`
2. Create `stores/engagementStore.ts`
3. Create selector hooks

### Step 2: Migrate PostCard
1. Replace `usePostEngagement` with `usePostEngagementState`
2. Remove complex initialization logic
3. Simplify like/save handlers

### Step 3: Migrate Comments Modal
1. Use same store for comment count
2. Remove duplicate state management

### Step 4: Connect Realtime
1. Create realtime listener that updates store
2. Remove per-component subscriptions

### Step 5: Cleanup
1. Remove old `usePostEngagement` hook
2. Remove event bus usage for engagement sync

---

## Testing Requirements

### Unit Tests
- [ ] Store initialization
- [ ] Optimistic update and rollback
- [ ] Server reconciliation
- [ ] Multiple subscribers get same state
- [ ] State isolation between posts

### Integration Tests
- [ ] Like updates all PostCards for same post
- [ ] Comment count syncs between PostCard and modal
- [ ] Optimistic update shows immediately
- [ ] Server error triggers rollback

---

## Success Criteria

- [ ] Single store manages all engagement state
- [ ] Zustand replaces useState/useRef mess
- [ ] Components are significantly simpler
- [ ] No state drift between components
- [ ] Performance improved (fewer re-renders)
- [ ] `usePostEngagement` hook deleted

---

## Files to Modify

### Create
- `stores/engagementStore.ts`
- `hooks/usePostEngagementState.ts`

### Modify
- `components/PostCard.tsx`
- `app/posts/[id]/comments.tsx`
- `components/cards/ExplorePostCard.tsx`
- `components/cards/ProfilePostCard.tsx`

### Delete
- `hooks/usePostEngagement.ts` (after full migration)
