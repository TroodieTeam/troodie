import { supabase } from '@/lib/supabase';
import { UserInfo } from '@/types/core';
import {
    CommentWithUser,
    PostComment,
    PostSave
} from '@/types/post';

class PostEngagementService {
  /**
   * Like a post
   */
  async likePost(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: userId,
      });

    if (error) {
      console.error('Error liking post:', error);
      throw new Error(`Failed to like post: ${error.message}`);
    }
  }

  /**
   * Unlike a post
   */
  async unlikePost(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error unliking post:', error);
      throw new Error(`Failed to unlike post: ${error.message}`);
    }
  }

  /**
   * Toggle like on a post
   */
  async togglePostLike(postId: string, userId: string): Promise<boolean> {
    const isLiked = await this.isPostLikedByUser(postId, userId);
    
    if (isLiked) {
      await this.unlikePost(postId, userId);
      return false;
    } else {
      await this.likePost(postId, userId);
      return true;
    }
  }

  /**
   * Check if user has liked a post
   */
  async isPostLikedByUser(postId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking post like:', error);
    }

    return !!data;
  }

  /**
   * Get users who liked a post
   */
  async getPostLikes(postId: string): Promise<UserInfo[]> {
    const { data, error } = await supabase
      .from('post_likes')
      .select(`
        user:users!post_likes_user_id_fkey(
          id,
          name,
          username,
          avatar_url,
          persona,
          is_verified
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching post likes:', error);
      return [];
    }

    return data.map((like: any) => ({
      id: parseInt(like.user.id),
      name: like.user.name || 'Unknown User',
      username: like.user.username || 'unknown',
      avatar: like.user.avatar_url || 'https://i.pravatar.cc/150?img=1',
      persona: like.user.persona || 'Food Explorer',
      verified: like.user.is_verified || false,
    }));
  }

  /**
   * Comment on a post
   */
  async commentOnPost(postId: string, userId: string, content: string, parentCommentId?: string): Promise<PostComment> {
    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content,
        parent_comment_id: parentCommentId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error commenting on post:', error);
      throw new Error(`Failed to comment on post: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, content: string): Promise<PostComment> {
    const { data, error } = await supabase
      .from('post_comments')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      throw new Error(`Failed to update comment: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  /**
   * Get comments for a post
   */
  async getPostComments(postId: string, limit: number = 20, offset: number = 0): Promise<CommentWithUser[]> {
    const { data, error } = await supabase
      .from('post_comments')
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
      .eq('post_id', postId)
      .is('parent_comment_id', null) // Only top-level comments
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching post comments:', error);
      return [];
    }

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      data.map(async (comment) => {
        const replies = await this.getCommentReplies(comment.id);
        return {
          ...comment,
          user: {
            id: parseInt(comment.user.id),
            name: comment.user.name || 'Unknown User',
            username: comment.user.username || 'unknown',
            avatar: comment.user.avatar_url || 'https://i.pravatar.cc/150?img=1',
            persona: comment.user.persona || 'Food Explorer',
            verified: comment.user.is_verified || false,
          },
          replies,
        };
      })
    );

    return commentsWithReplies;
  }

  /**
   * Get replies for a comment
   */
  async getCommentReplies(commentId: string): Promise<CommentWithUser[]> {
    const { data, error } = await supabase
      .from('post_comments')
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
      .eq('parent_comment_id', commentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comment replies:', error);
      return [];
    }

    return data.map(comment => ({
      ...comment,
      user: {
        id: parseInt(comment.user.id),
        name: comment.user.name || 'Unknown User',
        username: comment.user.username || 'unknown',
        avatar: comment.user.avatar_url || 'https://i.pravatar.cc/150?img=1',
        persona: comment.user.persona || 'Food Explorer',
        verified: comment.user.is_verified || false,
      },
    }));
  }

  /**
   * Save a post
   */
  async savePost(postId: string, userId: string, boardId?: string): Promise<void> {
    const { error } = await supabase
      .from('post_saves')
      .insert({
        post_id: postId,
        user_id: userId,
        board_id: boardId,
      });

    if (error) {
      console.error('Error saving post:', error);
      throw new Error(`Failed to save post: ${error.message}`);
    }
  }

  /**
   * Unsave a post
   */
  async unsavePost(postId: string, userId: string, boardId?: string): Promise<void> {
    let query = supabase
      .from('post_saves')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (boardId) {
      query = query.eq('board_id', boardId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error unsaving post:', error);
      throw new Error(`Failed to unsave post: ${error.message}`);
    }
  }

  /**
   * Toggle save on a post
   */
  async togglePostSave(postId: string, userId: string, boardId?: string): Promise<boolean> {
    const isSaved = await this.isPostSavedByUser(postId, userId, boardId);
    
    if (isSaved) {
      await this.unsavePost(postId, userId, boardId);
      return false;
    } else {
      await this.savePost(postId, userId, boardId);
      return true;
    }
  }

  /**
   * Check if user has saved a post
   */
  async isPostSavedByUser(postId: string, userId: string, boardId?: string): Promise<boolean> {
    let query = supabase
      .from('post_saves')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (boardId) {
      query = query.eq('board_id', boardId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking post save:', error);
    }

    return !!data;
  }

  /**
   * Get user's saved posts
   */
  async getUserSavedPosts(userId: string, boardId?: string, limit: number = 20, offset: number = 0): Promise<PostSave[]> {
    let query = supabase
      .from('post_saves')
      .select('*')
      .eq('user_id', userId);

    if (boardId) {
      query = query.eq('board_id', boardId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user saved posts:', error);
      return [];
    }

    return data;
  }

  /**
   * Like a comment
   */
  async likeComment(commentId: string, userId: string): Promise<void> {
    // This would require a post_comment_likes table
    // For now, we'll just update the likes_count
    const { error } = await supabase
      .from('post_comments')
      .update({
        likes_count: supabase.rpc('increment_likes_count', { comment_id: commentId }),
      })
      .eq('id', commentId);

    if (error) {
      console.error('Error liking comment:', error);
      throw new Error(`Failed to like comment: ${error.message}`);
    }
  }

  /**
   * Unlike a comment
   */
  async unlikeComment(commentId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('post_comments')
      .update({
        likes_count: supabase.rpc('decrement_likes_count', { comment_id: commentId }),
      })
      .eq('id', commentId);

    if (error) {
      console.error('Error unliking comment:', error);
      throw new Error(`Failed to unlike comment: ${error.message}`);
    }
  }

  /**
   * Get comment statistics
   */
  async getCommentStats(commentId: string): Promise<{ likes: number; replies: number }> {
    const [likesResult, repliesResult] = await Promise.all([
      supabase
        .from('post_comments')
        .select('likes_count')
        .eq('id', commentId)
        .single(),
      supabase
        .from('post_comments')
        .select('id', { count: 'exact' })
        .eq('parent_comment_id', commentId),
    ]);

    return {
      likes: likesResult.data?.likes_count || 0,
      replies: repliesResult.count || 0,
    };
  }
}

export const postEngagementService = new PostEngagementService(); 