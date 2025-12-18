/**
 * @deprecated This service has been replaced by UnifiedEngagementService.
 * Please use `engagementService` from '@/services/engagement' instead.
 * 
 * Migration guide:
 * - enhancedPostEngagementService.togglePostLikeOptimistic() → engagementService.likes.toggle()
 * - enhancedPostEngagementService.togglePostSaveOptimistic() → engagementService.saves.toggle()
 * - enhancedPostEngagementService.addCommentOptimistic() → engagementService.comments.create()
 * - enhancedPostEngagementService.sharePost() → engagementService.shares.share()
 * 
 * This file will be removed in a future version.
 */

import { supabase } from '@/lib/supabase';
import ShareService from '@/services/shareService';
import { UserInfo } from '@/types/core';
import {
    CommentWithUser,
    PostEngagementStats
} from '@/types/post';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as Clipboard from 'expo-clipboard';

interface OptimisticUpdate<T> {
  id: string;
  action: 'like' | 'unlike' | 'save' | 'unsave' | 'comment' | 'share';
  timestamp: number;
  data: T;
  retryCount: number;
}

interface EngagementCache {
  likes: Map<string, boolean>;
  saves: Map<string, boolean>;
  stats: Map<string, PostEngagementStats>;
  comments: Map<string, CommentWithUser[]>;
}

class EnhancedPostEngagementService {
  private cache: EngagementCache = {
    likes: new Map(),
    saves: new Map(),
    stats: new Map(),
    comments: new Map()
  };
  
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private optimisticUpdates: Map<string, OptimisticUpdate<any>> = new Map();
  private retryQueue: OptimisticUpdate<any>[] = [];
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  /**
   * Toggle like with optimistic update and retry mechanism
   */
  async togglePostLikeOptimistic(
    postId: string, 
    userId: string,
    currentIsLiked?: boolean,
    onOptimisticUpdate?: (isLiked: boolean, likesCount: number) => void,
    onError?: (error: Error) => void
  ): Promise<boolean> {
    const cacheKey = `${postId}_${userId}`;
    // Use passed current state if available, otherwise fall back to cache
    const currentLikeState = currentIsLiked !== undefined 
      ? currentIsLiked 
      : (this.cache.likes.get(cacheKey) ?? false);
    
    // Update cache for consistency (UI update handled by hook)
    this.cache.likes.set(cacheKey, !currentLikeState);
    
    try {
      // Call database function
      const { data, error } = await supabase.rpc('handle_post_engagement', {
        p_action: 'toggle_like',
        p_post_id: postId,
        p_user_id: userId
      });
      
      if (error) throw error;
      
      const result = data as any;
      
      // Update cache with server response
      this.cache.likes.set(cacheKey, result.is_liked);
      const stats = this.cache.stats.get(postId) || { likes_count: 0 };
      stats.likes_count = result.likes_count;
      this.cache.stats.set(postId, stats);
      
      // Notify hook with server response
      onOptimisticUpdate?.(result.is_liked, result.likes_count);
      
      return result.is_liked;
    } catch (error: any) {
      console.error('Error toggling like:', error);
      
      // Revert cache
      this.cache.likes.set(cacheKey, currentLikeState);
      const stats = this.cache.stats.get(postId) || { likes_count: 0 };
      
      // Notify error handler
      onError?.(error);
      
      throw error;
    }
  }

  /**
   * Simple toggle like method (for useOptimisticMutation pattern)
   */
  async togglePostLike(
    postId: string,
    userId: string
  ): Promise<{ success: boolean; is_liked: boolean; likes_count: number; error?: string }> {
    try {
      // Check current state
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      let isLiked: boolean;

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);

        if (error) throw error;
        isLiked = false;
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: userId,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        isLiked = true;
      }

      // Get updated count
      const { data: post } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      return {
        success: true,
        is_liked: isLiked,
        likes_count: post?.likes_count || 0
      };
    } catch (error: any) {
      console.error('Error in togglePostLike:', error);
      return {
        success: false,
        is_liked: false,
        likes_count: 0,
        error: error.message || 'Failed to toggle like'
      };
    }
  }

  /**
   * Toggle save with optimistic update
   */
  async togglePostSaveOptimistic(
    postId: string,
    userId: string,
    boardId?: string,
    onOptimisticUpdate?: (isSaved: boolean, savesCount: number) => void,
    onError?: (error: Error) => void
  ): Promise<boolean> {
    const cacheKey = `${postId}_${userId}_${boardId || 'default'}`;
    const currentSaveState = this.cache.saves.get(cacheKey) ?? false;
    const newSaveState = !currentSaveState;
    
    // Get current stats
    const stats = this.cache.stats.get(postId) || { saves_count: 0 };
    const newSavesCount = newSaveState 
      ? stats.saves_count + 1 
      : Math.max(0, stats.saves_count - 1);
    
    // Optimistic update
    this.cache.saves.set(cacheKey, newSaveState);
    if (stats) {
      stats.saves_count = newSavesCount;
      this.cache.stats.set(postId, stats);
    }
    
    // Notify UI immediately
    onOptimisticUpdate?.(newSaveState, newSavesCount);
    
    try {
      const { data, error } = await supabase.rpc('handle_post_engagement', {
        p_action: 'toggle_save',
        p_post_id: postId,
        p_user_id: userId,
        p_board_id: boardId
      });
      
      if (error) throw error;
      
      // Update cache with server response
      const result = data as any;
      this.cache.saves.set(cacheKey, result.is_saved);
      if (stats) {
        stats.saves_count = result.saves_count;
        this.cache.stats.set(postId, stats);
      }
      
      return result.is_saved;
    } catch (error: any) {
      console.error('Error toggling save:', error);
      
      // Revert optimistic update
      this.cache.saves.set(cacheKey, currentSaveState);
      if (stats) {
        stats.saves_count = currentSaveState 
          ? stats.saves_count 
          : Math.max(0, stats.saves_count - 1);
        this.cache.stats.set(postId, stats);
      }
      
      onError?.(error);
      onOptimisticUpdate?.(currentSaveState, stats.saves_count);
      
      throw error;
    }
  }

  /**
   * Add comment with optimistic update
   */
  async addCommentOptimistic(
    postId: string,
    userId: string,
    content: string,
    userInfo: UserInfo,
    onOptimisticUpdate?: (comment: CommentWithUser) => void,
    onError?: (error: Error) => void
  ): Promise<CommentWithUser> {
    // Create optimistic comment
    const optimisticComment: CommentWithUser = {
      id: `temp_${Date.now()}`,
      post_id: postId,
      user_id: userId,
      content,
      likes_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      parent_comment_id: null,
      user: userInfo,
      replies: []
    };
    
    // Add to cache
    const cachedComments = this.cache.comments.get(postId) || [];
    this.cache.comments.set(postId, [optimisticComment, ...cachedComments]);
    
    // Notify UI immediately
    onOptimisticUpdate?.(optimisticComment);
    
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: userId,
          content
        })
        .select(`
          *,
          user:users!post_comments_user_id_fkey(
            id,
            name,
            username,
            avatar_url,
            persona,
            is_verified
          )
        `)
        .single();
      
      if (error) throw error;
      
      // Replace optimistic comment with real one
      const realComment: CommentWithUser = {
        ...data,
        user: userInfo,
        replies: []
      };
      
      const comments = this.cache.comments.get(postId) || [];
      const index = comments.findIndex(c => c.id === optimisticComment.id);
      if (index !== -1) {
        comments[index] = realComment;
        this.cache.comments.set(postId, comments);
      }
      
      return realComment;
    } catch (error: any) {
      console.error('Error adding comment:', error);
      
      // Remove optimistic comment
      const comments = this.cache.comments.get(postId) || [];
      const filtered = comments.filter(c => c.id !== optimisticComment.id);
      this.cache.comments.set(postId, filtered);
      
      onError?.(error);
      throw error;
    }
  }

  /**
   * Share post with tracking
   */
  async sharePost(
    postId: string,
    userId: string | null,
    postTitle: string,
    restaurantName: string,
    postCaption?: string,
    tags?: string[]
  ): Promise<{ success: boolean; platform?: string }> {
    try {
      // Use ShareService for consistent sharing with proper deep links
      const result = await ShareService.share({
        type: 'post',
        id: postId,
        title: restaurantName || 'Amazing food discovery',
        description: postCaption || postTitle || undefined,
        tags: tags || undefined,
      });
      
      if (result.success) {
        // Track the share
        await this.trackShare(postId, userId, result.action || 'native_share');
        
        return { success: true, platform: result.action || 'native_share' };
      } else if (result.action === 'dismissed') {
        return { success: false };
      }
      
      return { success: result.success };
    } catch (error) {
      console.error('Error sharing post:', error);
      return { success: false };
    }
  }

  /**
   * Copy post link to clipboard
   */
  async copyPostLink(postId: string, userId: string | null): Promise<boolean> {
    try {
      const baseUrl = 'https://troodie.app';
      const webLink = `${baseUrl}/posts/${postId}`;
      
      await Clipboard.setStringAsync(webLink);
      
      // Track the share
      await this.trackShare(postId, userId, 'copy_link');
      
      return true;
    } catch (error) {
      console.error('Error copying link:', error);
      return false;
    }
  }

  /**
   * Track share analytics
   */
  private async trackShare(
    postId: string,
    userId: string | null,
    platform: string
  ): Promise<void> {
    try {
      await supabase.from('share_analytics').insert({
        user_id: userId,
        content_type: 'post',
        content_id: postId,
        platform
      });
    } catch (error) {
      console.error('Error tracking share:', error);
    }
  }

  /**
   * Subscribe to post engagement updates
   */
  subscribeToPostEngagement(
    postId: string,
    onUpdate: (stats: PostEngagementStats) => void
  ): () => void {
    const channelName = `post-engagement-${postId}`;
    
    // Unsubscribe from existing channel if any
    this.unsubscribeFromPost(channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${postId}`
        },
        (payload) => {
          const stats: PostEngagementStats = {
            post_id: payload.new.id,
            likes_count: payload.new.likes_count,
            comments_count: payload.new.comments_count,
            saves_count: payload.new.saves_count,
            share_count: payload.new.share_count
          };
          
          // Update cache
          this.cache.stats.set(postId, stats);
          
          // Notify subscriber
          onUpdate(stats);
        }
      )
      .subscribe();
    
    this.subscriptions.set(channelName, channel);
    
    // Return unsubscribe function
    return () => this.unsubscribeFromPost(channelName);
  }

  /**
   * Subscribe to post comments
   */
  subscribeToPostComments(
    postId: string,
    onNewComment: (comment: CommentWithUser) => void
  ): () => void {
    const channelName = `post-comments-${postId}`;
    
    // Unsubscribe from existing channel if any
    this.unsubscribeFromPost(channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`
        },
        async (payload) => {
          // Fetch user details for the comment
          const { data: userData } = await supabase
            .from('users')
            .select('id, name, username, avatar_url, persona, is_verified')
            .eq('id', payload.new.user_id)
            .single();
          
          if (userData) {
            const comment: CommentWithUser = {
              ...payload.new,
              user: {
                id: userData.id,
                name: userData.name || 'Unknown User',
                username: userData.username || 'unknown',
                avatar: userData.avatar_url || '',
                persona: userData.persona || 'Food Explorer',
                verified: userData.is_verified || false
              },
              replies: []
            };
            
            // Update cache
            const cachedComments = this.cache.comments.get(postId) || [];
            // Only add if not already in cache (avoid duplicates from optimistic updates)
            if (!cachedComments.find(c => c.id === comment.id)) {
              this.cache.comments.set(postId, [comment, ...cachedComments]);
            }
            
            onNewComment(comment);
          }
        }
      )
      .subscribe();
    
    this.subscriptions.set(channelName, channel);
    
    // Return unsubscribe function
    return () => this.unsubscribeFromPost(channelName);
  }

  /**
   * Process retry queue
   */
  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.length === 0) return;
    
    const update = this.retryQueue.shift();
    if (!update) return;
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, this.retryDelay * update.retryCount));
    
    try {
      if (update.action === 'like' || update.action === 'unlike') {
        await this.togglePostLikeOptimistic(
          update.data.postId,
          update.data.userId
        );
      } else if (update.action === 'save' || update.action === 'unsave') {
        await this.togglePostSaveOptimistic(
          update.data.postId,
          update.data.userId,
          update.data.boardId
        );
      }
    } catch (error) {
      console.error('Retry failed:', error);
    }
    
    // Process next item in queue
    this.processRetryQueue();
  }

  /**
   * Unsubscribe from a channel
   */
  private unsubscribeFromPost(channelName: string): void {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
    }
  }

  /**
   * Get cached engagement stats
   */
  getCachedStats(postId: string): PostEngagementStats | undefined {
    return this.cache.stats.get(postId);
  }

  /**
   * Get cached like status
   */
  getCachedLikeStatus(postId: string, userId: string): boolean | undefined {
    return this.cache.likes.get(`${postId}_${userId}`);
  }

  /**
   * Get cached save status
   */
  getCachedSaveStatus(postId: string, userId: string, boardId?: string): boolean | undefined {
    return this.cache.saves.get(`${postId}_${userId}_${boardId || 'default'}`);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.likes.clear();
    this.cache.saves.clear();
    this.cache.stats.clear();
    this.cache.comments.clear();
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
    this.clearCache();
    this.optimisticUpdates.clear();
    this.retryQueue = [];
  }
}

export const enhancedPostEngagementService = new EnhancedPostEngagementService();