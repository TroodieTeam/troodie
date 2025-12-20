import { supabase } from '@/lib/supabase';
import { CommentWithUser, UserInfo } from '@/types/post';

interface ListCommentsParams {
  postId: string;
  limit?: number;
  cursorCreatedAt?: string; // For pagination
}

interface ListRepliesParams {
  parentCommentId: string;
  limit?: number;
}

interface CreateCommentParams {
  postId: string;
  userId: string;
  content: string;
  parentCommentId?: string | null;
}

/**
 * @deprecated This service has been replaced by UnifiedEngagementService.
 * Please use `engagementService.comments` from '@/services/engagement' instead.
 * 
 * Migration guide:
 * - commentService.listTopLevelComments() → engagementService.comments.listTopLevel()
 * - commentService.listReplies() → engagementService.comments.listReplies()
 * - commentService.createComment() → engagementService.comments.create()
 * - commentService.deleteComment() → engagementService.comments.delete()
 * 
 * This file will be removed in a future version.
 */

/**
 * Comment service for CRUD operations on post comments
 * Uses direct inserts (not RPC) - triggers handle count updates
 */
export const commentService = {
  /**
   * List top-level comments for a post (no parent_comment_id)
   */
  async listTopLevelComments({
    postId,
    limit = 20,
    cursorCreatedAt,
  }: ListCommentsParams): Promise<CommentWithUser[]> {
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
      console.error('commentService: error listing comments:', error);
      throw new Error(error.message);
    }

    if (!comments || comments.length === 0) {
      return [];
    }

    // Batch fetch user data for all comments
    const userIds = [...new Set(comments.map((c) => c.user_id))];
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, username, avatar_url, persona, is_verified')
      .in('id', userIds);

    if (usersError) {
      console.error('commentService: error fetching users:', usersError);
    }

    // Create user map
    const userMap = new Map<string, UserInfo>();
    (users || []).forEach((u) => {
      userMap.set(u.id, {
        id: u.id,
        name: u.name || u.username || 'Unknown User',
        username: u.username || 'unknown',
        avatar: u.avatar_url || '',
        persona: u.persona || 'Food Explorer',
        verified: u.is_verified || false,
      });
    });

    // Combine comments with user data
    return comments.map((comment) => ({
      ...comment,
      user: userMap.get(comment.user_id) || {
        id: comment.user_id,
        name: 'Unknown User',
        username: 'unknown',
        avatar: '',
        persona: 'Food Explorer',
        verified: false,
      },
      replies: [],
    })) as CommentWithUser[];
  },

  /**
   * List replies to a specific comment
   */
  async listReplies({
    parentCommentId,
    limit = 50,
  }: ListRepliesParams): Promise<CommentWithUser[]> {
    const { data: replies, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('parent_comment_id', parentCommentId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('commentService: error listing replies:', error);
      throw new Error(error.message);
    }

    if (!replies || replies.length === 0) {
      return [];
    }

    // Batch fetch user data
    const userIds = [...new Set(replies.map((r) => r.user_id))];
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, username, avatar_url, persona, is_verified')
      .in('id', userIds);

    if (usersError) {
      console.error('commentService: error fetching users:', usersError);
    }

    const userMap = new Map<string, UserInfo>();
    (users || []).forEach((u) => {
      userMap.set(u.id, {
        id: u.id,
        name: u.name || u.username || 'Unknown User',
        username: u.username || 'unknown',
        avatar: u.avatar_url || '',
        persona: u.persona || 'Food Explorer',
        verified: u.is_verified || false,
      });
    });

    return replies.map((reply) => ({
      ...reply,
      user: userMap.get(reply.user_id) || {
        id: reply.user_id,
        name: 'Unknown User',
        username: 'unknown',
        avatar: '',
        persona: 'Food Explorer',
        verified: false,
      },
      replies: [],
    })) as CommentWithUser[];
  },

  /**
   * Create a new comment (or reply if parentCommentId is provided)
   * Returns the created comment with user data
   */
  async createComment(params: CreateCommentParams): Promise<CommentWithUser> {
    const { postId, userId, content, parentCommentId } = params;

    if (__DEV__) {
      console.log(`[commentService] Creating comment - postId: ${postId}, userId: ${userId}, parentCommentId: ${parentCommentId || 'none'}`);
    }

    // Insert comment - trigger will update posts.comments_count
    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content,
        parent_comment_id: parentCommentId ?? null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('commentService: error creating comment:', error);
      throw new Error(error.message);
    }

    if (__DEV__) {
      console.log(`[commentService] Comment created successfully - commentId: ${data.id}, postId: ${postId}, userId: ${userId}`);
    }

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, username, avatar_url, persona, is_verified')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('commentService: error fetching user:', userError);
    }

    return {
      ...data,
      user: userData
        ? {
            id: userData.id,
            name: userData.name || userData.username || 'Unknown User',
            username: userData.username || 'unknown',
            avatar: userData.avatar_url || '',
            persona: userData.persona || 'Food Explorer',
            verified: userData.is_verified || false,
          }
        : {
            id: userId,
            name: 'Unknown User',
            username: 'unknown',
            avatar: '',
            persona: 'Food Explorer',
            verified: false,
          },
      replies: [],
    } as CommentWithUser;
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase.from('post_comments').delete().eq('id', commentId);

    if (error) {
      console.error('commentService: error deleting comment:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Get actual comment count for a post by counting rows
   * This is the SINGLE SOURCE OF TRUTH for comment counts
   */
  async getCommentCount(postId: string): Promise<number> {
    const { count, error } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('commentService: error getting comment count:', error);
      return 0;
    }

    return count || 0;
  },
};


