# Task PE-001: Unified Engagement Service

**Priority:** P0 - Critical
**Estimated Effort:** 3-4 days
**Dependencies:** None
**Blocks:** PE-002, PE-003, PE-004

---

## Summary

Consolidate the fragmented engagement services (`postEngagementService.ts`, `enhancedPostEngagementService.ts`, `commentService.ts`, and engagement methods in `postService.ts`) into a single, well-architected `UnifiedEngagementService`.

---

## Problem Statement

Currently, engagement operations are spread across 4 different services:

1. **`postEngagementService.ts`** (419 lines)
   - Basic CRUD for likes, comments, saves
   - Direct Supabase table operations
   - No optimistic updates

2. **`enhancedPostEngagementService.ts`** (587 lines)
   - "Enhanced" version with optimistic updates
   - Uses RPC `handle_post_engagement` for some operations
   - Has its own cache layer
   - Has its own subscription methods

3. **`commentService.ts`** (253 lines)
   - Comment CRUD operations
   - Separate from other engagement services
   - Good isolation but inconsistent patterns

4. **`postService.ts`** (relevant portions ~150 lines)
   - `calculateEngagementCounts()` method
   - `isPostLikedByUser()` and `isPostSavedByUser()` methods
   - Duplicates functionality from engagement services

### Impact

- Code changes require updates in multiple places
- Inconsistent behavior (some use RPC, some use direct operations)
- Cache invalidation is impossible to manage correctly
- Debugging is a nightmare

---

## Solution Design

### New File Structure

```
services/
  engagement/
    index.ts                    # Re-exports everything
    UnifiedEngagementService.ts # Main service class
    types.ts                    # Engagement-specific types
    LikesManager.ts             # Like operations
    CommentsManager.ts          # Comment operations
    SavesManager.ts             # Save operations
    SharesManager.ts            # Share operations
    cache.ts                    # Centralized cache
```

### Service Architecture

```typescript
// services/engagement/UnifiedEngagementService.ts

import { LikesManager } from './LikesManager';
import { CommentsManager } from './CommentsManager';
import { SavesManager } from './SavesManager';
import { SharesManager } from './SharesManager';
import { EngagementCache } from './cache';

class UnifiedEngagementService {
  private cache: EngagementCache;

  public likes: LikesManager;
  public comments: CommentsManager;
  public saves: SavesManager;
  public shares: SharesManager;

  constructor() {
    this.cache = new EngagementCache();
    this.likes = new LikesManager(this.cache);
    this.comments = new CommentsManager(this.cache);
    this.saves = new SavesManager(this.cache);
    this.shares = new SharesManager(this.cache);
  }

  /**
   * Get engagement stats for a post
   * SINGLE SOURCE OF TRUTH - calculates from actual data
   */
  async getEngagementStats(postId: string, userId?: string): Promise<EngagementStats> {
    // Check cache first
    const cached = this.cache.getStats(postId);
    if (cached && !this.cache.isStale(postId)) {
      return cached;
    }

    // Calculate from actual data (single query using COUNT)
    const stats = await this.calculateStats(postId, userId);
    this.cache.setStats(postId, stats);
    return stats;
  }

  /**
   * Batch get engagement stats for multiple posts
   * Used by feed/explore screens
   */
  async batchGetEngagementStats(
    postIds: string[],
    userId?: string
  ): Promise<Map<string, EngagementStats>> {
    // Implementation using parallel queries
  }

  /**
   * Clear all cache (useful on logout)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const engagementService = new UnifiedEngagementService();
```

### Manager Pattern Example

```typescript
// services/engagement/LikesManager.ts

export class LikesManager {
  constructor(private cache: EngagementCache) {}

  /**
   * Toggle like with optimistic update
   * Returns the new like state
   */
  async toggle(postId: string, userId: string): Promise<ToggleResult> {
    // Get current state
    const currentlyLiked = await this.isLiked(postId, userId);
    const optimisticState = !currentlyLiked;

    // Optimistic update
    this.cache.setLikeStatus(postId, userId, optimisticState);
    this.cache.updateLikesCount(postId, optimisticState ? 1 : -1);

    try {
      if (currentlyLiked) {
        await this.removeLike(postId, userId);
      } else {
        await this.addLike(postId, userId);
      }

      // Get server truth
      const serverCount = await this.getCount(postId);
      this.cache.setLikesCount(postId, serverCount);

      return {
        success: true,
        isLiked: optimisticState,
        likesCount: serverCount,
      };
    } catch (error) {
      // Rollback optimistic update
      this.cache.setLikeStatus(postId, userId, currentlyLiked);
      this.cache.updateLikesCount(postId, currentlyLiked ? 1 : -1);

      return {
        success: false,
        isLiked: currentlyLiked,
        likesCount: this.cache.getLikesCount(postId),
        error: error as Error,
      };
    }
  }

  /**
   * Check if user has liked a post
   */
  async isLiked(postId: string, userId: string): Promise<boolean> {
    // Check cache
    const cached = this.cache.getLikeStatus(postId, userId);
    if (cached !== undefined) return cached;

    // Query database
    const { data } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    const isLiked = !!data;
    this.cache.setLikeStatus(postId, userId, isLiked);
    return isLiked;
  }

  /**
   * Get like count for a post
   */
  async getCount(postId: string): Promise<number> {
    const { count } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    return count || 0;
  }

  private async addLike(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });

    if (error) throw error;
  }

  private async removeLike(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;
  }
}
```

---

## Implementation Steps

### Step 1: Create New Service Structure
1. Create `services/engagement/` directory
2. Create type definitions in `types.ts`
3. Create `EngagementCache` class
4. Create empty manager files

### Step 2: Implement Managers
1. Implement `LikesManager` with tests
2. Implement `CommentsManager` with tests
3. Implement `SavesManager` with tests
4. Implement `SharesManager` with tests

### Step 3: Implement Main Service
1. Create `UnifiedEngagementService`
2. Implement `getEngagementStats`
3. Implement `batchGetEngagementStats`
4. Add logging and error handling

### Step 4: Migration
1. Update `usePostEngagement` to use new service
2. Update `PostCard` to use new service
3. Update comments modal to use new service
4. Update explore/feed screens to use new service

### Step 5: Cleanup
1. Deprecate old services (add deprecation warnings)
2. Remove old services after verification
3. Remove engagement methods from `postService.ts`
4. Update all imports

---

## API Design

### Public API

```typescript
// Unified access
import { engagementService } from '@/services/engagement';

// Like operations
await engagementService.likes.toggle(postId, userId);
await engagementService.likes.isLiked(postId, userId);
await engagementService.likes.getCount(postId);

// Comment operations
await engagementService.comments.create(postId, userId, content);
await engagementService.comments.delete(commentId);
await engagementService.comments.list(postId, { limit, cursor });
await engagementService.comments.getCount(postId);

// Save operations
await engagementService.saves.toggle(postId, userId, boardId?);
await engagementService.saves.isSaved(postId, userId);
await engagementService.saves.getCount(postId);

// Share operations
await engagementService.shares.share(postId, userId, platform);
await engagementService.shares.copyLink(postId);
await engagementService.shares.getCount(postId);

// Batch operations
await engagementService.getEngagementStats(postId, userId);
await engagementService.batchGetEngagementStats(postIds, userId);
```

---

## Testing Requirements

### Unit Tests
- [ ] LikesManager toggle with optimistic update
- [ ] LikesManager rollback on error
- [ ] CommentsManager create/delete/list
- [ ] SavesManager toggle
- [ ] Cache invalidation
- [ ] Batch operations

### Integration Tests
- [ ] Full like flow
- [ ] Full comment flow
- [ ] Concurrent operations
- [ ] Error recovery

---

## Success Criteria

- [ ] Single service handles all engagement operations
- [ ] All existing functionality preserved
- [ ] Cache layer provides consistent state
- [ ] Optimistic updates work correctly
- [ ] Error handling is consistent
- [ ] No regressions in user experience
- [ ] Old services removed from codebase

---

## Files to Modify

### Create New
- `services/engagement/index.ts`
- `services/engagement/types.ts`
- `services/engagement/cache.ts`
- `services/engagement/UnifiedEngagementService.ts`
- `services/engagement/LikesManager.ts`
- `services/engagement/CommentsManager.ts`
- `services/engagement/SavesManager.ts`
- `services/engagement/SharesManager.ts`

### Modify
- `hooks/usePostEngagement.ts` - Use new service
- `components/PostCard.tsx` - Use new service
- `app/posts/[id]/comments.tsx` - Use new service

### Delete (after migration)
- `services/postEngagementService.ts`
- `services/enhancedPostEngagementService.ts`
- `services/commentService.ts` (merge into engagement)
