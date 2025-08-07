import { designTokens } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { useAuth } from '@/contexts/AuthContext';
import { postEngagementService } from '@/services/postEngagementService';
import { supabase } from '@/lib/supabase';
import { CommentWithUser } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PostCommentsProps {
  postId: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
  showInput?: boolean;
  showComments?: boolean;
  postAuthorName?: string; // For "Replying to" text
}

export function PostComments({ 
  postId, 
  onCommentAdded, 
  onCommentDeleted, 
  showInput = true, 
  showComments = true,
  postAuthorName 
}: PostCommentsProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [postId, showComments]);

  const loadComments = async () => {
    try {
      setLoading(true);
      // First get comments, then get user data separately to avoid foreign key issues
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error loading comments:', error);
        return;
      }
      
      
      // Get user data for each comment
      const commentsWithUsers = await Promise.all(
        (commentsData || []).map(async (comment) => {
          
          // First try to get from users table
          let { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, username, avatar_url, persona, is_verified')
            .eq('id', comment.user_id)
            .single();
            
          if (userError || !userData) {
            
            // Fallback: try to get from auth.users if not in users table
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(comment.user_id);
            
            if (authUser && authUser.user) {
              userData = {
                id: authUser.user.id,
                name: authUser.user.user_metadata?.name || authUser.user.email || 'User',
                username: authUser.user.user_metadata?.username || 'user',
                avatar_url: authUser.user.user_metadata?.avatar_url || '',
                persona: authUser.user.user_metadata?.persona || 'Food Explorer',
                is_verified: authUser.user.user_metadata?.is_verified || false,
              };
            }
          }
            
          return {
            ...comment,
            user: userData || {
              id: comment.user_id,
              name: 'Unknown User',
              username: 'unknown',
              avatar_url: '',
              persona: 'Food Explorer',
              is_verified: false,
            }
          };
        })
      );
      
      const formattedComments = commentsWithUsers.map(comment => ({
        ...comment,
        user: {
          id: comment.user?.id || '',
          name: comment.user?.name || comment.user?.username || 'Unknown User', // Use username as fallback if name is null
          username: comment.user?.username || 'unknown',
          avatar: comment.user?.avatar_url || '',
          persona: comment.user?.persona || 'Food Explorer',
          verified: comment.user?.is_verified || false,
        },
        replies: []
      }));
      
      setComments(formattedComments as CommentWithUser[]);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user?.id || !newComment.trim()) return;

    try {
      setSubmitting(true);
      
      
      // Use the database function to handle comment adding and count updating
      const { data, error } = await supabase.rpc('handle_post_engagement', {
        p_action: 'add_comment',
        p_post_id: postId,
        p_user_id: user.id,
        p_content: newComment.trim()
      });
        
      if (error) {
        console.error('Error submitting comment:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return;
      }
      
      
      // Get current user data from users table for accurate display
      const { data: currentUserData } = await supabase
        .from('users')
        .select('id, name, username, avatar_url, persona, is_verified')
        .eq('id', user.id)
        .single();
      

      // Add optimistic comment update - show the comment immediately with current user data
      const optimisticComment: CommentWithUser = {
        id: `temp-${Date.now()}`, // Temporary ID
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent_comment_id: null,
        user: {
          id: user.id,
          name: currentUserData?.name || currentUserData?.username || user.user_metadata?.name || user.user_metadata?.username || user.email || 'Anonymous',
          username: currentUserData?.username || user.user_metadata?.username || 'user',
          avatar: currentUserData?.avatar_url || user.user_metadata?.avatar_url || '',
          persona: currentUserData?.persona || user.user_metadata?.persona || 'Food Explorer',
          verified: currentUserData?.is_verified || user.user_metadata?.is_verified || false,
        },
        replies: []
      };
      
      // Add to comments list immediately - no background reload needed
      setComments(prev => [optimisticComment, ...prev]);
      
      setNewComment('');
      
      // Dismiss keyboard
      Keyboard.dismiss();
      
      // Show success toast from top
      Toast.show({
        type: 'success',
        text1: 'Comment posted!',
        visibilityTime: 2000,
        position: 'top',
      });
      
      onCommentAdded?.();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      // Optimistic update - remove from UI immediately
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      onCommentDeleted?.();
      
      // Delete from database
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);
        
      if (error) {
        console.error('Error deleting comment:', error);
        // On error, reload comments to restore state
        loadComments();
        return;
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      // On error, reload comments to restore state
      loadComments();
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderComment = ({ item }: { item: CommentWithUser }) => {
    return (
      <View style={styles.commentContainer}>
        <Image 
          source={{ uri: item.user.avatar || DEFAULT_IMAGES.avatar }} 
          style={styles.commentAvatar}
          defaultSource={{ uri: DEFAULT_IMAGES.avatar }}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentBody}>
            <View style={styles.commentUserNameRow}>
              <Text style={styles.commentUserName}>{item.user.name}</Text>
              {item.user.verified && (
                <Ionicons name="checkmark-circle" size={14} color={designTokens.colors.primaryOrange} />
              )}
              <Text style={styles.commentTime}>• {formatTimeAgo(item.created_at)}</Text>
            </View>
            <Text style={styles.commentText}>{item.content}</Text>
          </View>
        {item.user_id === user?.id && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              // Add confirmation to prevent accidental deletes
              const { Alert } = require('react-native');
              Alert.alert(
                'Delete Comment',
                'Are you sure you want to delete this comment?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => handleDeleteComment(item.id)
                  }
                ]
              );
            }}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="close" size={14} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
        <Text style={styles.loadingText}>Loading comments...</Text>
      </View>
    );
  }

  // If only showing input (Twitter-style fixed bottom input)
  if (showInput && !showComments) {
    return (
      <KeyboardAvoidingView 
        style={[styles.fixedInputContainer, { bottom: 70 + insets.bottom }]} // Dynamic bottom spacing
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.twitterInputContainer}>
          {/* Replying to text - outside of input field like Twitter */}
          {postAuthorName && (
            <Text style={styles.replyingToText}>
              Replying to <Text style={styles.replyingToUsername}>@{postAuthorName}</Text>
            </Text>
          )}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.twitterCommentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Post your reply"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={newComment.trim() ? handleSubmitComment : undefined}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.twitterSubmitButton, (!newComment.trim() || submitting) && styles.submitButtonDisabled]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={designTokens.colors.white} />
              ) : (
                <Text style={styles.replyButtonText}>Reply</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // If only showing comments (no input)
  if (!showInput && showComments) {
    return (
      <View style={styles.commentsOnlyContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
            <Text style={styles.loadingText}>Loading comments...</Text>
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No comments yet</Text>
          </View>
        ) : (
          comments.slice(0, 10).map((item) => ( // Show more comments when separate
            <View key={item.id}>
              {renderComment({ item })}
            </View>
          ))
        )}
        {comments.length > 10 && (
          <View style={styles.showMoreContainer}>
            <Text style={styles.showMoreText}>... and {comments.length - 10} more comments</Text>
          </View>
        )}
      </View>
    );
  }

  // Default: show both (legacy behavior)
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Comments List - Move above input so it can scroll */}
      {showComments && (
        <View style={styles.commentsList}>
          {comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={32} color={designTokens.colors.textLight} />
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment!</Text>
            </View>
          ) : (
            comments.slice(0, 5).map((item) => ( // Limit to 5 comments to avoid height issues
              <View key={item.id}>
                {renderComment({ item })}
              </View>
            ))
          )}
          {comments.length > 5 && (
            <View style={styles.showMoreContainer}>
              <Text style={styles.showMoreText}>... and {comments.length - 5} more comments</Text>
            </View>
          )}
        </View>
      )}

      {/* Comment Input - Fixed at bottom */}
      {showInput && (
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add a comment..."
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={newComment.trim() ? handleSubmitComment : undefined}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.submitButton, (!newComment.trim() || submitting) && styles.submitButtonDisabled]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={designTokens.colors.white} />
              ) : (
                <Ionicons name="send" size={16} color={designTokens.colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333333',
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#F8F9FA',
  },
  submitButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  commentsList: {
    flex: 1,
  },
  commentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  commentBody: {
    flex: 1,
  },
  commentUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    marginRight: 6,
  },
  commentTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#8E8E93',
    marginLeft: 4,
  },
  commentText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#1A1A1A',
    lineHeight: 20,
    marginTop: 2,
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#1A1A1A',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#8E8E93',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#8E8E93',
    marginTop: 8,
  },
  showMoreContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
  // Twitter-style fixed input styles
  fixedInputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
  },
  twitterInputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  replyingToText: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
    paddingLeft: 4,
  },
  replyingToUsername: {
    color: '#1DA1F2', // Twitter blue
    fontFamily: 'Inter_500Medium',
  },
  twitterCommentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#1A1A1A',
    minHeight: 36,
    maxHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#F8F9FA',
  },
  twitterSubmitButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    minWidth: 60,
  },
  replyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  commentsOnlyContainer: {
    backgroundColor: '#FFFFFF',
  },
}); 