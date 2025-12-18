import { supabase } from '@/lib/supabase';
import { CommentWithUser, UserInfo } from '@/types/post';
import { eventBus, EVENTS } from '@/utils/eventBus';
import { EngagementCache } from './cache';
import { CreateCommentResult, ListCommentsOptions } from './types';

/**
 * Manages all comment-related operations
 * Consolidates functionality from commentService.ts
 */
export class CommentsManager {
  constructor(private cache: EngagementCache) {}

  /**
   * Create a comment with optimistic update
   */
  async create(
    postId: string,
    userId: string,
    content: string,
    parentCommentId?: string | null,
    userInfo?: UserInfo
  ): Promise<CreateCommentResult> {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: userId,
          content,
          parent_comment_id: parentCommentId || null
        })
        .select()
        .single();

      if (error) throw error;

      // Fetch user info if not provided
      let commentUser: UserInfo;
      if (userInfo) {
        commentUser = userInfo;
      } else {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, username, avatar_url, persona, is_verified')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error('[CommentsManager] Error fetching user:', userError);
          commentUser = {
            id: userId,
            name: 'Unknown User',
            username: 'unknown',
            avatar: '',
            persona: 'Food Explorer',
            verified: false
          };
        } else {
          commentUser = {
            id: userData.id,
            name: userData.name || userData.username || 'Unknown User',
            username: userData.username || 'unknown',
            avatar: userData.avatar_url || '',
            persona: userData.persona || 'Food Explorer',
            verified: userData.is_verified || false
          };
        }
      }

      const commentWithUser: CommentWithUser = {
        ...data,
        user: commentUser,
        replies: []
      };

      // Update cache optimistically
      if (!parentCommentId) {
        // Top-level comment - add to list
        this.cache.addComment(postId, commentWithUser);
        
        // Get actual count from database (single source of truth)
        // This ensures we emit the correct count even if cache is stale
        const actualCount = await this.getCount(postId);
        
        // Update cache with actual count
        this.cache.setCommentsCount(postId, actualCount);
        
        if (__DEV__) {
          console.log(`[CommentsManager] 📢 Emitting POST_ENGAGEMENT_CHANGED - postId: ${postId.substring(0, 8)}..., commentsCount: ${actualCount} (from database)`);
        }
        
        // Emit event so ExploreScreen and other components can update immediately
        // This ensures UI updates even if realtime subscription hasn't fired yet
        eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, {
          postId,
          commentsCount: actualCount
        });
      }

      // Invalidate stats cache to force fresh calculation on next read
      // This ensures postService.getExplorePosts() gets accurate counts
      this.cache.invalidateStats(postId);

      return {
        success: true,
        comment: commentWithUser
      };
    } catch (error) {
      console.error('[CommentsManager] Error creating comment:', error);
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Update a comment
   */
  async update(commentId: string, content: string): Promise<CommentWithUser | null> {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .update({
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;

      // Fetch user info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, username, avatar_url, persona, is_verified')
        .eq('id', data.user_id)
        .single();

      if (userError) {
        console.error('[CommentsManager] Error fetching user:', userError);
      }

      const commentWithUser: CommentWithUser = {
        ...data,
        user: userData ? {
          id: userData.id,
          name: userData.name || userData.username || 'Unknown User',
          username: userData.username || 'unknown',
          avatar: userData.avatar_url || '',
          persona: userData.persona || 'Food Explorer',
          verified: userData.is_verified || false
        } : {
          id: data.user_id,
          name: 'Unknown User',
          username: 'unknown',
          avatar: '',
          persona: 'Food Explorer',
          verified: false
        },
        replies: []
      };

      // Invalidate cache to force fresh calculation
      // Note: We don't know the postId from just commentId, so we can't update specific cache
      // The caller should refresh the comment list

      return commentWithUser;
    } catch (error) {
      console.error('[CommentsManager] Error updating comment:', error);
      return null;
    }
  }

  /**
   * Delete a comment
   */
  async delete(commentId: string, postId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // Update cache
      this.cache.removeComment(postId, commentId);
      this.cache.updateCommentsCount(postId, -1);
      
      // Get actual count from database (single source of truth)
      // This ensures we emit the correct count even if cache is stale
      const actualCount = await this.getCount(postId);
      
      // Update cache with actual count
      this.cache.setCommentsCount(postId, actualCount);
      
      console.log(`[CommentsManager] 📢 Emitting POST_ENGAGEMENT_CHANGED (delete) - postId: ${postId.substring(0, 8)}..., commentsCount: ${actualCount} (from database)`);
      
      // Emit event so components can update immediately
      // This ensures UI updates even if realtime subscription hasn't fired yet
      eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, {
        postId,
        commentsCount: actualCount
      });
      
      // Invalidate stats cache to force fresh calculation on next read
      this.cache.invalidateStats(postId);

      return true;
    } catch (error) {
      console.error('[CommentsManager] Error deleting comment:', error);
      return false;
    }
  }

  /**
   * List top-level comments for a post
   */
  async listTopLevel(
    postId: string,
    options: ListCommentsOptions = {}
  ): Promise<CommentWithUser[]> {
    const { limit = 20, cursorCreatedAt } = options;

    // Check cache first
    const cached = this.cache.getComments(postId);
    if (cached && !cursorCreatedAt) {
      // Return cached if no pagination
      return cached;
    }

    let query = supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursorCreatedAt) {
      query = query.lt('created_at', cursorCreatedAt);
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error('[CommentsManager] Error listing comments:', error);
      throw new Error(error.message);
    }

    if (!comments || comments.length === 0) {
      return [];
    }

    // Batch fetch user data
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, username, avatar_url, persona, is_verified')
      .in('id', userIds);

    if (usersError) {
      console.error('[CommentsManager] Error fetching users:', usersError);
    }

    // Create user map
    const userMap = new Map<string, UserInfo>();
    (users || []).forEach(u => {
      userMap.set(u.id, {
        id: u.id,
        name: u.name || u.username || 'Unknown User',
        username: u.username || 'unknown',
        avatar: u.avatar_url || '',
        persona: u.persona || 'Food Explorer',
        verified: u.is_verified || false
      });
    });

    // Combine comments with user data
    const commentsWithUser = comments.map(comment => ({
      ...comment,
      user: userMap.get(comment.user_id) || {
        id: comment.user_id,
        name: 'Unknown User',
        username: 'unknown',
        avatar: '',
        persona: 'Food Explorer',
        verified: false
      },
      replies: []
    })) as CommentWithUser[];

    // Update cache (only for first page)
    if (!cursorCreatedAt) {
      this.cache.setComments(postId, commentsWithUser);
    }

    return commentsWithUser;
  }

  /**
   * List replies to a specific comment
   */
  async listReplies(parentCommentId: string, limit: number = 20): Promise<CommentWithUser[]> {
    const { data: comments, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('parent_comment_id', parentCommentId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[CommentsManager] Error listing replies:', error);
      throw new Error(error.message);
    }

    if (!comments || comments.length === 0) {
      return [];
    }

    // Batch fetch user data
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, username, avatar_url, persona, is_verified')
      .in('id', userIds);

    if (usersError) {
      console.error('[CommentsManager] Error fetching users:', usersError);
    }

    // Create user map
    const userMap = new Map<string, UserInfo>();
    (users || []).forEach(u => {
      userMap.set(u.id, {
        id: u.id,
        name: u.name || u.username || 'Unknown User',
        username: u.username || 'unknown',
        avatar: u.avatar_url || '',
        persona: u.persona || 'Food Explorer',
        verified: u.is_verified || false
      });
    });

    // Combine comments with user data
    return comments.map(comment => ({
      ...comment,
      user: userMap.get(comment.user_id) || {
        id: comment.user_id,
        name: 'Unknown User',
        username: 'unknown',
        avatar: '',
        persona: 'Food Explorer',
        verified: false
      },
      replies: []
    })) as CommentWithUser[];
  }

  /**
   * Get comment count for a post
   * Calculates from actual data (single source of truth)
   */
  async getCount(postId: string): Promise<number> {
    const { count, error } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('[CommentsManager] Error getting comment count:', error);
      return 0;
    }

    const countValue = count || 0;
    this.cache.setCommentsCount(postId, countValue);
    return countValue;
  }

  /**
   * Batch get comment counts for multiple posts
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
   * Get reply counts for multiple comments (which comments have replies)
   */
  async batchGetReplyCounts(commentIds: string[]): Promise<Map<string, number>> {
    if (commentIds.length === 0) return new Map();

    const { data, error } = await supabase
      .from('post_comments')
      .select('parent_comment_id')
      .in('parent_comment_id', commentIds);

    if (error) {
      console.error('[CommentsManager] Error getting reply counts:', error);
      return new Map();
    }

    const result = new Map<string, number>();
    commentIds.forEach(id => result.set(id, 0));

    (data || []).forEach((reply: { parent_comment_id: string }) => {
      const current = result.get(reply.parent_comment_id) || 0;
      result.set(reply.parent_comment_id, current + 1);
    });

    return result;
  }
}
