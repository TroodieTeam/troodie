import { supabase } from '@/lib/supabase';
import { EngagementCache } from './cache';
import { OptimisticUpdateOptions, ToggleResult } from './types';

/**
 * Manages all save-related operations
 * Supports board-based saving (optional boardId)
 */
export class SavesManager {
  constructor(private cache: EngagementCache) {}

  /**
   * Toggle save with optimistic update
   */
  async toggle(
    postId: string,
    userId: string,
    boardId?: string,
    options?: OptimisticUpdateOptions
  ): Promise<ToggleResult> {
    // Get current state
    const currentlySaved = await this.isSaved(postId, userId, boardId);
    const optimisticState = !currentlySaved;

    // Optimistic update
    this.cache.setSaveStatus(postId, userId, optimisticState);
    this.cache.updateSavesCount(postId, optimisticState ? 1 : -1);

    // Notify UI immediately
    const currentCount = this.cache.getSavesCount?.(postId) || 0;
    options?.onOptimisticUpdate?.({
      success: true,
      isSaved: optimisticState,
      savesCount: currentCount
    });

    try {
      if (currentlySaved) {
        await this.removeSave(postId, userId, boardId);
      } else {
        await this.addSave(postId, userId, boardId);
      }

      // Get server truth
      const serverCount = await this.getCount(postId);
      this.cache.setSavesCount(postId, serverCount);
      
      // Ensure cache state matches server
      const serverIsSaved = await this.isSaved(postId, userId, boardId);
      this.cache.setSaveStatus(postId, userId, serverIsSaved);

      return {
        success: true,
        isSaved: serverIsSaved,
        savesCount: serverCount
      };
    } catch (error) {
      // Rollback optimistic update
      this.cache.setSaveStatus(postId, userId, currentlySaved);
      this.cache.updateSavesCount(postId, currentlySaved ? 1 : -1);

      const rollbackCount = this.cache.getSavesCount?.(postId) || 0;
      options?.onOptimisticUpdate?.({
        success: false,
        isSaved: currentlySaved,
        savesCount: rollbackCount
      });

      options?.onError?.(error as Error);

      return {
        success: false,
        isSaved: currentlySaved,
        savesCount: rollbackCount,
        error: error as Error
      };
    }
  }

  /**
   * Check if user has saved a post (optionally to a specific board)
   */
  async isSaved(postId: string, userId: string, boardId?: string): Promise<boolean> {
    // Check cache first (cache doesn't distinguish boards, so this is approximate)
    const cached = this.cache.getSaveStatus(postId, userId);
    if (cached !== undefined && !boardId) {
      // If no board specified, cache is reliable
      return cached;
    }

    // Query database
    let query = supabase
      .from('post_saves')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (boardId) {
      query = query.eq('board_id', boardId);
    } else {
      // If no board specified, check if saved to any board
      query = query.is('board_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[SavesManager] Error checking save status:', error);
      return false;
    }

    const isSaved = !!data;
    // Update cache (approximate for board-specific saves)
    if (!boardId) {
      this.cache.setSaveStatus(postId, userId, isSaved);
    }
    return isSaved;
  }

  /**
   * Get save count for a post
   * Calculates from actual data (single source of truth)
   */
  async getCount(postId: string): Promise<number> {
    const { count, error } = await supabase
      .from('post_saves')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('[SavesManager] Error getting save count:', error);
      return 0;
    }

    const countValue = count || 0;
    this.cache.setSavesCount(postId, countValue);
    return countValue;
  }

  /**
   * Batch check save status for multiple posts
   */
  async batchIsSaved(postIds: string[], userId: string): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();

    // Check cache first
    const uncachedPostIds: string[] = [];
    for (const postId of postIds) {
      const cached = this.cache.getSaveStatus(postId, userId);
      if (cached !== undefined) {
        result.set(postId, cached);
      } else {
        uncachedPostIds.push(postId);
      }
    }

    if (uncachedPostIds.length === 0) {
      return result;
    }

    // Query database for uncached posts (any board)
    const { data, error } = await supabase
      .from('post_saves')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', uncachedPostIds);

    if (error) {
      console.error('[SavesManager] Error batch checking saves:', error);
      return result;
    }

    // Create set of saved post IDs
    const savedPostIds = new Set(data?.map(save => save.post_id) || []);

    // Update cache and result
    for (const postId of uncachedPostIds) {
      const isSaved = savedPostIds.has(postId);
      this.cache.setSaveStatus(postId, userId, isSaved);
      result.set(postId, isSaved);
    }

    return result;
  }

  /**
   * Batch get save counts for multiple posts
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
   * Add a save (internal)
   */
  private async addSave(postId: string, userId: string, boardId?: string): Promise<void> {
    const { error } = await supabase
      .from('post_saves')
      .insert({
        post_id: postId,
        user_id: userId,
        board_id: boardId || null
      });

    if (error) {
      // Handle unique constraint violation (already saved)
      if (error.code === '23505') {
        // Already saved, this is fine
        return;
      }
      throw error;
    }
  }

  /**
   * Remove a save (internal)
   */
  private async removeSave(postId: string, userId: string, boardId?: string): Promise<void> {
    let query = supabase
      .from('post_saves')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (boardId) {
      query = query.eq('board_id', boardId);
    } else {
      query = query.is('board_id', null);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }
  }
}
