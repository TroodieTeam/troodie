import { CommentWithUser, PostEngagementStats } from '@/types/post';

/**
 * Centralized cache for engagement data
 * Provides consistent state management across all engagement operations
 */
export class EngagementCache {
  // Cache for engagement stats per post
  private statsCache = new Map<string, { data: PostEngagementStats; timestamp: number }>();
  
  // Cache for like status (postId_userId -> boolean)
  private likesCache = new Map<string, boolean>();
  
  // Cache for save status (postId_userId -> boolean)
  private savesCache = new Map<string, boolean>();
  
  // Cache for comment lists per post
  private commentsCache = new Map<string, { data: CommentWithUser[]; timestamp: number }>();
  
  // Default TTL: 5 minutes
  private readonly DEFAULT_TTL = 5 * 60 * 1000;
  
  /**
   * Get engagement stats for a post
   */
  getStats(postId: string): PostEngagementStats | null {
    const entry = this.statsCache.get(postId);
    if (!entry) return null;
    
    if (this.isStale(entry.timestamp)) {
      this.statsCache.delete(postId);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Set engagement stats for a post
   */
  setStats(postId: string, stats: PostEngagementStats): void {
    this.statsCache.set(postId, {
      data: stats,
      timestamp: Date.now()
    });
  }
  
  /**
   * Check if cached stats are stale
   */
  isStale(postId: string): boolean;
  isStale(timestamp: number): boolean;
  isStale(postIdOrTimestamp: string | number): boolean {
    if (typeof postIdOrTimestamp === 'string') {
      const entry = this.statsCache.get(postIdOrTimestamp);
      if (!entry) return true;
      return Date.now() - entry.timestamp > this.DEFAULT_TTL;
    } else {
      return Date.now() - postIdOrTimestamp > this.DEFAULT_TTL;
    }
  }
  
  /**
   * Get like status for a user-post pair
   */
  getLikeStatus(postId: string, userId: string): boolean | undefined {
    return this.likesCache.get(`${postId}_${userId}`);
  }
  
  /**
   * Set like status for a user-post pair
   */
  setLikeStatus(postId: string, userId: string, isLiked: boolean): void {
    this.likesCache.set(`${postId}_${userId}`, isLiked);
  }
  
  /**
   * Get save status for a user-post pair
   */
  getSaveStatus(postId: string, userId: string): boolean | undefined {
    return this.savesCache.get(`${postId}_${userId}`);
  }
  
  /**
   * Set save status for a user-post pair
   */
  setSaveStatus(postId: string, userId: string, isSaved: boolean): void {
    this.savesCache.set(`${postId}_${userId}`, isSaved);
  }
  
  /**
   * Update likes count optimistically
   */
  updateLikesCount(postId: string, delta: number): void {
    const entry = this.statsCache.get(postId);
    if (entry) {
      entry.data.likes_count = Math.max(0, (entry.data.likes_count || 0) + delta);
    }
  }
  
  /**
   * Set likes count from server
   */
  setLikesCount(postId: string, count: number): void {
    const entry = this.statsCache.get(postId);
    if (entry) {
      entry.data.likes_count = count;
    } else {
      this.setStats(postId, {
        likes_count: count,
        comments_count: 0,
        saves_count: 0,
        share_count: 0
      });
    }
  }
  
  /**
   * Get likes count from cache
   */
  getLikesCount(postId: string): number {
    const stats = this.getStats(postId);
    return stats?.likes_count || 0;
  }
  
  /**
   * Update saves count optimistically
   */
  updateSavesCount(postId: string, delta: number): void {
    const entry = this.statsCache.get(postId);
    if (entry) {
      entry.data.saves_count = Math.max(0, (entry.data.saves_count || 0) + delta);
    }
  }
  
  /**
   * Set saves count from server
   */
  setSavesCount(postId: string, count: number): void {
    const entry = this.statsCache.get(postId);
    if (entry) {
      entry.data.saves_count = count;
    } else {
      this.setStats(postId, {
        likes_count: 0,
        comments_count: 0,
        saves_count: count,
        share_count: 0
      });
    }
  }
  
  /**
   * Update comments count optimistically
   */
  updateCommentsCount(postId: string, delta: number): void {
    const entry = this.statsCache.get(postId);
    if (entry) {
      entry.data.comments_count = Math.max(0, (entry.data.comments_count || 0) + delta);
    } else {
      // Create entry if it doesn't exist
      this.setStats(postId, {
        likes_count: 0,
        comments_count: Math.max(0, delta),
        saves_count: 0,
        share_count: 0
      });
    }
  }
  
  /**
   * Set comments count from server
   */
  setCommentsCount(postId: string, count: number): void {
    const entry = this.statsCache.get(postId);
    if (entry) {
      entry.data.comments_count = count;
    } else {
      this.setStats(postId, {
        likes_count: 0,
        comments_count: count,
        saves_count: 0,
        share_count: 0
      });
    }
  }
  
  /**
   * Update share count optimistically
   */
  updateShareCount(postId: string, delta: number): void {
    const entry = this.statsCache.get(postId);
    if (entry) {
      entry.data.share_count = Math.max(0, (entry.data.share_count || 0) + delta);
    }
  }
  
  /**
   * Set share count from server
   */
  setShareCount(postId: string, count: number): void {
    const entry = this.statsCache.get(postId);
    if (entry) {
      entry.data.share_count = count;
    } else {
      this.setStats(postId, {
        likes_count: 0,
        comments_count: 0,
        saves_count: 0,
        share_count: count
      });
    }
  }
  
  /**
   * Get saves count from cache (helper for SavesManager)
   */
  getSavesCount(postId: string): number {
    const stats = this.getStats(postId);
    return stats?.saves_count || 0;
  }
  
  /**
   * Get comments for a post
   */
  getComments(postId: string): CommentWithUser[] | null {
    const entry = this.commentsCache.get(postId);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.DEFAULT_TTL) {
      this.commentsCache.delete(postId);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Set comments for a post
   */
  setComments(postId: string, comments: CommentWithUser[]): void {
    this.commentsCache.set(postId, {
      data: comments,
      timestamp: Date.now()
    });
  }
  
  /**
   * Add a comment to the cache
   */
  addComment(postId: string, comment: CommentWithUser): void {
    const entry = this.commentsCache.get(postId);
    if (entry) {
      entry.data.unshift(comment); // Add to beginning
      entry.timestamp = Date.now();
    }
  }
  
  /**
   * Remove a comment from the cache
   */
  removeComment(postId: string, commentId: string): void {
    const entry = this.commentsCache.get(postId);
    if (entry) {
      entry.data = entry.data.filter(c => c.id !== commentId);
      entry.timestamp = Date.now();
    }
  }
  
  /**
   * Invalidate stats for a post
   */
  invalidateStats(postId: string): void {
    this.statsCache.delete(postId);
  }
  
  /**
   * Invalidate all cache for a post
   */
  invalidatePost(postId: string): void {
    this.statsCache.delete(postId);
    this.commentsCache.delete(postId);
    
    // Remove all like/save entries for this post
    const keysToDelete: string[] = [];
    this.likesCache.forEach((_, key) => {
      if (key.startsWith(`${postId}_`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.likesCache.delete(key));
    
    keysToDelete.length = 0;
    this.savesCache.forEach((_, key) => {
      if (key.startsWith(`${postId}_`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.savesCache.delete(key));
  }
  
  /**
   * Clear all cache (useful on logout)
   */
  clear(): void {
    this.statsCache.clear();
    this.likesCache.clear();
    this.savesCache.clear();
    this.commentsCache.clear();
  }
}
