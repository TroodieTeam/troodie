import { supabase } from '@/lib/supabase';
import { EngagementCache } from './cache';
import { OptimisticUpdateOptions, ToggleResult } from './types';

/**
 * Manages all like-related operations
 * Handles optimistic updates, rollback on error, and caching
 */
export class LikesManager {
  constructor(private cache: EngagementCache) {}

  /**
   * Toggle like with optimistic update
   * Returns the new like state
   */
  async toggle(
    postId: string,
    userId: string,
    options?: OptimisticUpdateOptions
  ): Promise<ToggleResult> {
    // Get current state from cache or database
    const currentlyLiked = await this.isLiked(postId, userId);
    const optimisticState = !currentlyLiked;

    // Optimistic update
    this.cache.setLikeStatus(postId, userId, optimisticState);
    this.cache.updateLikesCount(postId, optimisticState ? 1 : -1);

    // Notify UI immediately
    const currentCount = this.cache.getLikesCount(postId);
    options?.onOptimisticUpdate?.({
      success: true,
      isLiked: optimisticState,
      likesCount: currentCount
    });

    try {
      if (currentlyLiked) {
        await this.removeLike(postId, userId);
      } else {
        await this.addLike(postId, userId);
      }

      // Get server truth
      const serverCount = await this.getCount(postId);
      this.cache.setLikesCount(postId, serverCount);
      
      // Ensure cache state matches server
      const serverIsLiked = await this.isLiked(postId, userId);
      this.cache.setLikeStatus(postId, userId, serverIsLiked);

      return {
        success: true,
        isLiked: serverIsLiked,
        likesCount: serverCount
      };
    } catch (error) {
      // Rollback optimistic update
      this.cache.setLikeStatus(postId, userId, currentlyLiked);
      this.cache.updateLikesCount(postId, currentlyLiked ? 1 : -1);

      const rollbackCount = this.cache.getLikesCount(postId);
      options?.onOptimisticUpdate?.({
        success: false,
        isLiked: currentlyLiked,
        likesCount: rollbackCount
      });

      options?.onError?.(error as Error);

      return {
        success: false,
        isLiked: currentlyLiked,
        likesCount: rollbackCount,
        error: error as Error
      };
    }
  }

  /**
   * Check if user has liked a post
   */
  async isLiked(postId: string, userId: string): Promise<boolean> {
    // Check cache first
    const cached = this.cache.getLikeStatus(postId, userId);
    if (cached !== undefined) return cached;

    // Query database
    const { data, error } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[LikesManager] Error checking like status:', error);
      // Don't cache on error
      return false;
    }

    const isLiked = !!data;
    this.cache.setLikeStatus(postId, userId, isLiked);
    return isLiked;
  }

  /**
   * Get like count for a post
   * Calculates from actual data (single source of truth)
   */
  async getCount(postId: string): Promise<number> {
    const { count, error } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('[LikesManager] Error getting like count:', error);
      return 0;
    }

    const countValue = count || 0;
    this.cache.setLikesCount(postId, countValue);
    return countValue;
  }

  /**
   * Batch check like status for multiple posts
   */
  async batchIsLiked(postIds: string[], userId: string): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();

    // Check cache first
    const uncachedPostIds: string[] = [];
    for (const postId of postIds) {
      const cached = this.cache.getLikeStatus(postId, userId);
      if (cached !== undefined) {
        result.set(postId, cached);
      } else {
        uncachedPostIds.push(postId);
      }
    }

    if (uncachedPostIds.length === 0) {
      return result;
    }

    // Query database for uncached posts
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', uncachedPostIds);

    if (error) {
      console.error('[LikesManager] Error batch checking likes:', error);
      // Return cached results only
      return result;
    }

    // Create set of liked post IDs
    const likedPostIds = new Set(data?.map(like => like.post_id) || []);

    // Update cache and result
    for (const postId of uncachedPostIds) {
      const isLiked = likedPostIds.has(postId);
      this.cache.setLikeStatus(postId, userId, isLiked);
      result.set(postId, isLiked);
    }

    return result;
  }

  /**
   * Batch get like counts for multiple posts
   */
  async batchGetCounts(postIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    // Use parallel queries for better performance
    const promises = postIds.map(async (postId) => {
      const count = await this.getCount(postId);
      return { postId, count };
    });

    const results = await Promise.all(promises);
    results.forEach(({ postId, count }) => {
      result.set(postId, count);
    });

    return result;
  }

  /**
   * Add a like (internal)
   */
  private async addLike(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: userId
      });

    if (error) {
      // Handle unique constraint violation (already liked)
      if (error.code === '23505') {
        // Already liked, this is fine
        return;
      }
      throw error;
    }
  }

  /**
   * Remove a like (internal)
   */
  private async removeLike(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }
}
