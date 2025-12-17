import { PostEngagementStats } from '@/types/post';
import { EngagementCache } from './cache';
import { CommentsManager } from './CommentsManager';
import { LikesManager } from './LikesManager';
import { SavesManager } from './SavesManager';
import { SharesManager } from './SharesManager';

/**
 * Unified Engagement Service
 * Single source of truth for all engagement operations (likes, comments, saves, shares)
 * 
 * Consolidates functionality from:
 * - postEngagementService.ts
 * - enhancedPostEngagementService.ts
 * - commentService.ts
 * - engagement methods in postService.ts
 */
export class UnifiedEngagementService {
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
   * 
   * This replaces the stale count columns in the posts table
   */
  async getEngagementStats(
    postId: string,
    userId?: string
  ): Promise<PostEngagementStats> {
    // Check cache first
    const cached = this.cache.getStats(postId);
    if (cached && !this.cache.isStale(postId)) {
      // If userId provided, check like/save status
      if (userId) {
        const [isLiked, isSaved] = await Promise.all([
          this.likes.isLiked(postId, userId),
          this.saves.isSaved(postId, userId)
        ]);
        return {
          ...cached,
          is_liked_by_user: isLiked,
          is_saved_by_user: isSaved
        };
      }
      return cached;
    }

    // Calculate from actual data (single query using COUNT)
    const stats = await this.calculateStats(postId, userId);
    this.cache.setStats(postId, stats);
    return stats;
  }

  /**
   * Batch get engagement stats for multiple posts
   * Used by feed/explore screens for performance
   */
  async batchGetEngagementStats(
    postIds: string[],
    userId?: string
  ): Promise<Map<string, PostEngagementStats>> {
    const result = new Map<string, PostEngagementStats>();

    // Use parallel queries for all counts
    const [likeCounts, commentCounts, saveCounts, shareCounts] = await Promise.all([
      this.likes.batchGetCounts(postIds),
      this.comments.batchGetCounts(postIds),
      this.saves.batchGetCounts(postIds),
      this.shares.batchGetCounts(postIds)
    ]);

    // Get user engagement status if userId provided
    let userLikes: Map<string, boolean> | null = null;
    let userSaves: Map<string, boolean> | null = null;
    if (userId) {
      [userLikes, userSaves] = await Promise.all([
        this.likes.batchIsLiked(postIds, userId),
        this.saves.batchIsSaved(postIds, userId)
      ]);
    }

    // Combine into stats objects
    for (const postId of postIds) {
      const stats: PostEngagementStats = {
        post_id: postId,
        user_id: userId,
        likes_count: likeCounts.get(postId) || 0,
        comments_count: commentCounts.get(postId) || 0,
        saves_count: saveCounts.get(postId) || 0,
        share_count: shareCounts.get(postId) || 0,
        is_liked_by_user: userLikes?.get(postId),
        is_saved_by_user: userSaves?.get(postId)
      };

      // Cache the stats
      this.cache.setStats(postId, stats);
      result.set(postId, stats);
    }

    return result;
  }

  /**
   * Calculate engagement stats from actual database data
   * This is the SINGLE SOURCE OF TRUTH - never uses stale count columns
   */
  private async calculateStats(
    postId: string,
    userId?: string
  ): Promise<PostEngagementStats> {
    // Parallel queries for all counts
    const [likesCount, commentsCount, savesCount, shareCount] = await Promise.all([
      this.likes.getCount(postId),
      this.comments.getCount(postId),
      this.saves.getCount(postId),
      this.shares.getCount(postId)
    ]);

    const stats: PostEngagementStats = {
      post_id: postId,
      user_id: userId,
      likes_count: likesCount,
      comments_count: commentsCount,
      saves_count: savesCount,
      share_count: shareCount
    };

    // If userId provided, check like/save status
    if (userId) {
      const [isLiked, isSaved] = await Promise.all([
        this.likes.isLiked(postId, userId),
        this.saves.isSaved(postId, userId)
      ]);
      stats.is_liked_by_user = isLiked;
      stats.is_saved_by_user = isSaved;
    }

    return stats;
  }

  /**
   * Invalidate cache for a post
   * Useful when you know the data has changed externally
   */
  invalidatePost(postId: string): void {
    this.cache.invalidatePost(postId);
  }

  /**
   * Clear all cache (useful on logout)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const engagementService = new UnifiedEngagementService();
