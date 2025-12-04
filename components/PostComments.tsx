// CLEAN ARCHITECTURE: Comment Management
// Principles:
// 1. Database triggers handle comment counts (single source of truth)
// 2. Realtime subscriptions sync all UI (via usePostEngagement hook)
// 3. Optimistic updates for immediate UX
// 4. No client-side count management or verification

import { designTokens } from "@/constants/designTokens";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { CommentWithUser } from "@/types/post";
import { eventBus, EVENTS } from "@/utils/eventBus";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Toast from "react-native-toast-message";

interface PostCommentsProps {
  postId: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
  showInput?: boolean;
  showComments?: boolean;
  postAuthorName?: string;
  bottomOffset?: number;
  comments?: CommentWithUser[];
  onCommentsChange?: (comments: CommentWithUser[]) => void;
}

export function PostComments({
  postId,
  onCommentAdded,
  onCommentDeleted,
  showInput = true,
  showComments = true,
  postAuthorName,
  bottomOffset = 0,
  comments: parentComments,
  onCommentsChange,
}: PostCommentsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<CommentWithUser[]>(parentComments || []);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mentionsMap, setMentionsMap] = useState<Map<string, Array<{
    restaurantId: string;
    restaurantName: string;
    startIndex: number;
    endIndex: number;
  }>>>(new Map());

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const { data: commentsData, error } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId)
        .is("parent_comment_id", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[PostComments] Error loading comments:", error);
        return;
      }

      // Get user data for each comment
      const commentsWithUsers = await Promise.all(
        (commentsData || []).map(async (comment) => {
          let { data: userData } = await supabase
            .from("users")
            .select("id, name, username, avatar_url, persona, is_verified")
            .eq("id", comment.user_id)
            .single();

          if (!userData) {
            const { data: authUser } = await supabase.auth.admin.getUserById(comment.user_id);
            if (authUser?.user) {
              userData = {
                id: authUser.user.id,
                name: authUser.user.user_metadata?.name || authUser.user.email || "User",
                username: authUser.user.user_metadata?.username || "user",
                avatar_url: authUser.user.user_metadata?.avatar_url || "",
                persona: authUser.user.user_metadata?.persona || "Food Explorer",
                is_verified: authUser.user.user_metadata?.is_verified || false,
              };
            }
          }

          return {
            ...comment,
            user: userData || {
              id: comment.user_id,
              name: "Unknown User",
              username: "unknown",
              avatar_url: "",
              persona: "Food Explorer",
              is_verified: false,
            },
          };
        })
      );

      const formattedComments = commentsWithUsers.map((comment) => ({
        ...comment,
        user: {
          id: comment.user?.id || "",
          name: comment.user?.name || comment.user?.username || "Unknown User",
          username: comment.user?.username || "unknown",
          avatar: comment.user?.avatar_url || "",
          persona: comment.user?.persona || "Food Explorer",
          verified: comment.user?.is_verified || false,
        },
        replies: [],
      }));

      setComments(formattedComments as CommentWithUser[]);

      // Load mentions
      const commentIds = formattedComments.map((c) => c.id);
      if (commentIds.length > 0) {
        const { data: mentionsData } = await supabase
          .from("restaurant_mentions")
          .select("comment_id, restaurant_id, restaurant_name")
          .in("comment_id", commentIds);

        const mentions = new Map<string, Array<{
          restaurantId: string;
          restaurantName: string;
          startIndex: number;
          endIndex: number;
        }>>();

        mentionsData?.forEach((mention) => {
          if (!mentions.has(mention.comment_id)) {
            mentions.set(mention.comment_id, []);
          }
          mentions.get(mention.comment_id)?.push({
            restaurantId: mention.restaurant_id,
            restaurantName: mention.restaurant_name,
            startIndex: 0,
            endIndex: 0,
          });
        });

        setMentionsMap(mentions);
      }
    } catch (error) {
      console.error("[PostComments] Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (showComments && postId) {
      loadComments();
    }
  }, [postId, showComments, loadComments]);

  // Sync parent comments when they change
  useEffect(() => {
    if (parentComments) {
      setComments(parentComments);
    }
  }, [parentComments]);

  // Notify parent when local comments change
  useEffect(() => {
    if (onCommentsChange && (showInput || showComments)) {
      onCommentsChange(comments);
    }
  }, [comments, onCommentsChange, showInput, showComments]);

  useEffect(() => {
    if (parentComments) {
      setComments(parentComments);
    }
  }, [parentComments]);

  useEffect(() => {
    if (onCommentsChange && (showInput || showComments)) {
      onCommentsChange(comments);
    }
  }, [comments, onCommentsChange, showInput, showComments]);


  const handleSubmitComment = async () => {
    if (!user?.id || !newComment.trim()) return;

    const commentContent = newComment.trim();
    setSubmitting(true);

    // Optimistic update
    const optimisticComment: CommentWithUser = {
      id: `temp-${Date.now()}`,
      post_id: postId,
      user_id: user.id,
      content: commentContent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      parent_comment_id: null,
      user: {
        id: user.id,
        name: user.name || "You",
        username: user.username || "you",
        avatar: user.avatar_url || "",
        persona: user.persona || "Food Explorer",
        verified: user.is_verified || false,
      },
      replies: [],
    };

    setComments((prev) => [optimisticComment, ...prev]);
    setNewComment("");
    onCommentAdded?.();

    try {
      const { data: commentData, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: commentContent,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic comment with real one
      setComments((prev) =>
        prev.map((c) => (c.id === optimisticComment.id ? { ...commentData, user: optimisticComment.user, replies: [] } as CommentWithUser : c))
      );

      // Database trigger updates count, realtime syncs UI
      eventBus.emit(EVENTS.POST_COMMENT_ADDED, { postId, comment: commentData });
    } catch (error: any) {
      console.error("[PostComments] Error submitting comment:", error);
      // Revert optimistic update
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      Toast.show({
        type: "error",
        text1: "Failed to post comment",
        position: "top",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    // Optimistic update - remove from UI immediately
    const commentToDelete = comments.find((c) => c.id === commentId);
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    onCommentDeleted?.();

    try {
      // Delete from database (trigger updates count, realtime syncs UI)
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId);

      if (error) {
        // Revert on error
        if (commentToDelete) {
          setComments((prev) => [...prev, commentToDelete].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ));
        }
        Toast.show({
          type: "error",
          text1: "Failed to delete comment",
          position: "top",
        });
        return;
      }

      // Database trigger handles count update, realtime syncs all PostCards
      eventBus.emit(EVENTS.POST_COMMENT_DELETED, { postId });
      
      Toast.show({
        type: "success",
        text1: "Comment deleted",
        visibilityTime: 2000,
        position: "top",
      });
    } catch (error) {
      console.error("[PostComments] Error deleting comment:", error);
      // Revert on error
      if (commentToDelete) {
        setComments((prev) => [...prev, commentToDelete].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderCommentText = (content: string, commentId: string) => {
    const mentions = mentionsMap.get(commentId) || [];
    if (mentions.length === 0) {
      return <Text style={styles.commentText}>{content}</Text>;
    }

    // Simple rendering - mentions are styled
    return <Text style={styles.commentText}>{content}</Text>;
  };

  if (!showComments && !showInput) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={bottomOffset}
      style={styles.container}
    >
      {showComments && (
        <ScrollView 
          style={styles.commentsList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.commentsContent}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
            </View>
          ) : comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <TouchableOpacity
                  onPress={() => {
                    if (comment.user?.id) {
                      router.push(`/user/${comment.user.id}`);
                    }
                  }}
                >
                  {comment.user?.avatar ? (
                    <Image
                      source={{ uri: comment.user.avatar }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {comment.user?.name?.charAt(0).toUpperCase() || "U"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>
                      {comment.user?.name || "Unknown User"}
                    </Text>
                    {comment.user?.verified && (
                      <Ionicons name="checkmark-circle" size={14} color={designTokens.colors.primaryOrange} style={styles.verifiedIcon} />
                    )}
                    <Text style={styles.commentTime}>{formatTimeAgo(comment.created_at)}</Text>
                  </View>
                  {renderCommentText(comment.content, comment.id)}
                  {user?.id === comment.user_id && (
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(comment.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {showInput && user && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Post your reply"
            placeholderTextColor={designTokens.colors.textMedium}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
            style={[
              styles.submitButton,
              (!newComment.trim() || submitting) && styles.submitButtonDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>Reply</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  commentItem: {
    flexDirection: "row",
    marginVertical: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: designTokens.colors.primaryOrange,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: designTokens.colors.textDark,
    marginRight: 6,
  },
  commentTime: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    marginLeft: 6,
  },
  verifiedIcon: {
    marginLeft: 4,
    marginRight: 4,
  },
  commentText: {
    fontSize: 14,
    color: designTokens.colors.textDark,
    lineHeight: 20,
  },
  deleteButton: {
    marginTop: 4,
  },
  deleteText: {
    fontSize: 12,
    color: "#FF4444",
  },
  noComments: {
    textAlign: "center",
    color: designTokens.colors.textMedium,
    marginTop: 20,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.border,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: designTokens.colors.textDark,
    maxHeight: 100,
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
