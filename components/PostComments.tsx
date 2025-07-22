import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { postEngagementService } from '@/services/postEngagementService';
import { CommentWithUser } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PostCommentsProps {
  postId: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
}

export function PostComments({ postId, onCommentAdded, onCommentDeleted }: PostCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const commentsData = await postEngagementService.getPostComments(postId, 50);
      setComments(commentsData);
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
      await postEngagementService.commentOnPost(postId, user.id, newComment.trim());
      setNewComment('');
      // Reload comments to get the new comment with user data
      await loadComments();
      onCommentAdded?.();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await postEngagementService.deleteComment(commentId);
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      onCommentDeleted?.();
    } catch (error) {
      console.error('Error deleting comment:', error);
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

  const renderComment = ({ item }: { item: CommentWithUser }) => (
    <View style={styles.commentContainer}>
      <View style={styles.commentHeader}>
        <View style={styles.commentUserInfo}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={16} color={designTokens.colors.textLight} />
          </View>
          <View style={styles.commentUserDetails}>
            <Text style={styles.commentUserName}>{item.user.name}</Text>
            <Text style={styles.commentTime}>{formatTimeAgo(item.created_at)}</Text>
          </View>
        </View>
        {item.user_id === user?.id && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteComment(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color={designTokens.colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.commentContent}>{item.content}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
        <Text style={styles.loadingText}>Loading comments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Comment Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.commentInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            multiline
            maxLength={500}
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

      {/* Comments List */}
      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item) => item.id}
        style={styles.commentsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={32} color={designTokens.colors.textLight} />
            <Text style={styles.emptyText}>No comments yet</Text>
            <Text style={styles.emptySubtext}>Be the first to comment!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    padding: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: designTokens.spacing.sm,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
    padding: designTokens.spacing.sm,
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textDark,
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  commentsList: {
    flex: 1,
  },
  commentContainer: {
    padding: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: designTokens.spacing.xs,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: designTokens.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.sm,
  },
  commentUserDetails: {
    flex: 1,
  },
  commentUserName: {
    fontSize: designTokens.typography.bodyMedium.fontSize,
    fontFamily: designTokens.typography.bodyMedium.fontFamily,
    color: designTokens.colors.textDark,
  },
  commentTime: {
    fontSize: designTokens.typography.smallText.fontSize,
    fontFamily: designTokens.typography.smallText.fontFamily,
    color: designTokens.colors.textLight,
  },
  deleteButton: {
    padding: designTokens.spacing.xs,
  },
  commentContent: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textDark,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxxl,
  },
  emptyText: {
    fontSize: designTokens.typography.bodyMedium.fontSize,
    fontFamily: designTokens.typography.bodyMedium.fontFamily,
    color: designTokens.colors.textDark,
    marginTop: designTokens.spacing.sm,
  },
  emptySubtext: {
    fontSize: designTokens.typography.smallText.fontSize,
    fontFamily: designTokens.typography.smallText.fontFamily,
    color: designTokens.colors.textLight,
    marginTop: designTokens.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxxl,
  },
  loadingText: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textLight,
    marginTop: designTokens.spacing.sm,
  },
}); 