import { designTokens } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { useAuth } from '@/contexts/AuthContext';
import { usePostEngagement } from '@/hooks/usePostEngagement';
import { supabase } from '@/lib/supabase';
import { engagementService } from '@/services/engagement';
import { postService } from '@/services/postService';
import { realtimeManager } from '@/services/realtimeManager';
import { ToastService } from '@/services/toastService';
import { CommentWithUser, PostWithUser } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COMMENT_ITEM_HEIGHT_ESTIMATE = 100;

export default function PostCommentsModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [post, setPost] = useState<PostWithUser | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommentWithUser | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [cursorCreatedAt, setCursorCreatedAt] = useState<string | undefined>();

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Memoize initialStats to prevent unnecessary re-initialization
  const initialStats = useMemo(() => {
    if (!post) return undefined;
    return {
      likes_count: post.likes_count || 0,
      comments_count: post.comments_count || 0, // This is now calculated from actual data
      share_count: post.share_count || 0,
    };
  }, [post?.likes_count, post?.comments_count, post?.share_count]);

  // Use post engagement hook for reactive engagement actions
  const {
    isLiked,
    likesCount,
    commentsCount,
    shareCount,
    isLoading,
    toggleLike,
    sharePost,
    copyLink,
  } = usePostEngagement({
    postId: id || '',
    initialStats,
    initialIsLiked: post?.is_liked_by_user || false,
    enableRealtime: true, // Always enable realtime for accurate counts
  });

  // Log comment count changes for debugging
  useEffect(() => {
    console.log(`[Comments] commentsCount changed: ${commentsCount} (postId: ${id})`);
  }, [commentsCount, id]);


  // Load post data (recalculates counts from actual data)
  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  // Reload post when returning to screen to get fresh counts
  // BUT: Only reload if we don't already have post data (prevents unnecessary reloads)
  useFocusEffect(
    useCallback(() => {
      if (id && !post) {
        // Only reload if we don't have post data yet
        loadPost();
      }
    }, [id, post?.id])
  );

  // Track if we've loaded comments to prevent duplicate loads
  const hasLoadedComments = useRef(false);

  // Load initial comments - only once per post
  useEffect(() => {
    if (post?.id && !hasLoadedComments.current) {
      // Reset seen IDs and load fresh comments
      seenCommentIds.current.clear();
      hasLoadedComments.current = true;
      loadComments();
    }
  }, [post?.id]);

  // Reset load flag when post changes
  useEffect(() => {
    hasLoadedComments.current = false;
  }, [post?.id]);
  
  // CRITICAL: Prevent loadComments from running after comment creation
  // This was causing subscription cleanup and missing realtime events

  // Track comment IDs we've seen to prevent duplicates
  const seenCommentIds = useRef<Set<string>>(new Set());

  // Set up realtime subscription for comments
  useEffect(() => {
    if (!post?.id || !user?.id) return;

    // Reset seen IDs when post changes
    seenCommentIds.current.clear();

    const unsubscribe = realtimeManager.subscribe(
      `post-comments-realtime-${post.id}`,
      {
        table: 'post_comments',
        event: '*',
        filter: `post_id=eq.${post.id}`,
      },
      (data: any, eventType: string, metadata?: any) => {
        const payload = metadata?.payload;
        const actualEventType = metadata?.eventType || payload?.eventType || eventType;
        
        if (actualEventType === 'INSERT') {
          // Skip if we've already seen this comment
          if (seenCommentIds.current.has(data.id)) {
            console.log(`[Comments] Realtime INSERT skipped (already seen): ${data.id}`);
            return;
          }
          
          console.log(`[Comments] Realtime INSERT received - commentId: ${data.id}, parentCommentId: ${data.parent_comment_id || 'none'}`);
          seenCommentIds.current.add(data.id);
          handleRealtimeInsert(data);
        } else if (actualEventType === 'DELETE') {
          // For DELETE, data contains the deleted row (from payload.old)
          const deletedCommentId = data?.id;
          if (deletedCommentId) {
            seenCommentIds.current.delete(deletedCommentId);
            handleRealtimeDelete({ id: deletedCommentId });
          }
        } else if (actualEventType === 'UPDATE') {
          handleRealtimeUpdate(data);
        }
      },
      {
        ignoreUserId: user.id, // Ignore our own inserts (we handle optimistically)
      }
    );

    return () => {
      unsubscribe();
    };
  }, [post?.id, user?.id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const postData = await postService.getPost(id as string);
      console.log(`[Comments] Post loaded - comments_count: ${postData.comments_count} (postId: ${id})`);
      setPost(postData);
    } catch (error) {
      ToastService.showError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (append = false) => {
    if (!post?.id) return;

    try {
      const newComments = await engagementService.comments.listTopLevel(
        post.id,
        {
          limit: 20,
          cursorCreatedAt: append ? cursorCreatedAt : undefined
        }
      );

      if (newComments.length === 0) {
        setHasMore(false);
        return;
      }

      // Deduplicate comments by ID to prevent duplicates
      setComments((prev) => {
        if (append) {
          // When appending, filter out any duplicates
          const existingIds = new Set(prev.map((c) => c.id));
          const uniqueNewComments = newComments.filter((c) => {
            const isNew = !existingIds.has(c.id) && !seenCommentIds.current.has(c.id);
            if (isNew) {
              seenCommentIds.current.add(c.id);
            }
            return isNew;
          });
          if (uniqueNewComments.length === 0) {
            setHasMore(false);
            return prev;
          }
          return [...prev, ...uniqueNewComments];
        } else {
          // When loading fresh, preserve existing replies from prev comments
          // Create a map of existing comments with their replies
          const existingCommentsMap = new Map<string, CommentWithUser>();
          prev.forEach((c) => {
            if (c.replies && c.replies.length > 0) {
              existingCommentsMap.set(c.id, c);
            }
          });
          
          // Merge new comments with existing replies
          const mergedComments = newComments.map((newComment) => {
            const existingComment = existingCommentsMap.get(newComment.id);
            if (existingComment && existingComment.replies && existingComment.replies.length > 0) {
              return {
                ...newComment,
                replies: existingComment.replies, // Preserve existing replies
              };
            }
            return newComment;
          });
          
          // Track all comment IDs
          mergedComments.forEach((c) => seenCommentIds.current.add(c.id));
          
          // Set initial state, then load replies asynchronously
          // This allows the UI to render immediately while replies load in the background
          (async () => {
            try {
              // Check which comments have replies in the database and load them
              const commentIds = mergedComments.map(c => c.id);
              const replyCounts = await engagementService.comments.batchGetReplyCounts(commentIds);
              
              // Load replies for comments that have them but don't have them in memory
              const commentsToLoadReplies = mergedComments.filter(c => {
                const hasRepliesInDb = (replyCounts.get(c.id) || 0) > 0;
                const hasRepliesInMemory = (c.replies?.length || 0) > 0;
                return hasRepliesInDb && !hasRepliesInMemory;
              });
              
              // Load replies in parallel
              const replyPromises = commentsToLoadReplies.map(async (comment) => {
                try {
                  const replies = await engagementService.comments.listReplies(comment.id, 50);
                  return { commentId: comment.id, replies };
                } catch (error) {
                  console.error(`[Comments] Error loading replies for ${comment.id}:`, error);
                  return { commentId: comment.id, replies: [] };
                }
              });
              
              const replyResults = await Promise.all(replyPromises);
              
              // Merge loaded replies into comments
              setComments((current) => {
                // Make sure we're still working with the same comments (check by IDs)
                const currentIds = new Set(current.map(c => c.id));
                const mergedIds = new Set(mergedComments.map(c => c.id));
                
                // If comments have changed, don't update (user might have navigated away)
                if (currentIds.size !== mergedIds.size || 
                    !Array.from(currentIds).every(id => mergedIds.has(id))) {
                  return current;
                }
                
                const finalComments = current.map((comment) => {
                  const replyResult = replyResults.find(r => r.commentId === comment.id);
                  if (replyResult && replyResult.replies.length > 0) {
                    // Only update if we don't already have replies (preserve user-loaded replies)
                    if (!comment.replies || comment.replies.length === 0) {
                      // Track reply IDs
                      replyResult.replies.forEach(r => seenCommentIds.current.add(r.id));
                      return {
                        ...comment,
                        replies: replyResult.replies,
                      };
                    }
                  }
                  return comment;
                });
                
                return finalComments;
              });
            } catch (error) {
              console.error('[Comments] Error loading replies:', error);
            }
          })();
          
          return mergedComments;
        }
      });

      // Update cursor for pagination
      const lastComment = newComments[newComments.length - 1];
      setCursorCreatedAt(lastComment.created_at);

      // If we got fewer than limit, no more to load
      if (newComments.length < 20) {
        setHasMore(false);
      }
    } catch (error) {
      ToastService.showError('Failed to load comments');
    }
  };

  const loadReplies = async (commentId: string) => {
    if (loadingReplies.has(commentId)) return;

    try {
      setLoadingReplies((prev) => new Set(prev).add(commentId));
      const replies = await engagementService.comments.listReplies(
        commentId,
        50
      );

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? { ...comment, replies } : comment
        )
      );
    } catch (error) {
      ToastService.showError('Failed to load replies');
    } finally {
      setLoadingReplies((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  const handleRealtimeInsert = async (commentData: any) => {
    // Double-check we haven't seen this comment
    if (seenCommentIds.current.has(commentData.id)) {
      return;
    }

    // Use functional update to check and prevent duplicates atomically
    setComments((prev) => {
      // Check if comment already exists (optimistic update or duplicate)
      const existsInTopLevel = prev.some((c) => c.id === commentData.id);
      const existsInReplies = prev.some((c) => 
        c.replies?.some((r) => r.id === commentData.id)
      );
      
      if (existsInTopLevel || existsInReplies) {
        return prev; // Comment already exists, don't add again
      }

      // Fetch user data asynchronously and update state
      supabase
        .from('users')
        .select('id, name, username, avatar_url, persona, is_verified')
        .eq('id', commentData.user_id)
        .single()
        .then(({ data: userData }) => {
          const comment: CommentWithUser = {
            ...commentData,
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
                  id: commentData.user_id,
                  name: 'Unknown User',
                  username: 'unknown',
                  avatar: '',
                  persona: 'Food Explorer',
                  verified: false,
                },
            replies: [],
          };

          // Update state with the comment, checking for duplicates again
          setComments((current) => {
            const stillExists = current.some((c) => 
              c.id === commentData.id || c.replies?.some((r) => r.id === commentData.id)
            );
            if (stillExists) {
              return current;
            }

            // Mark as seen before adding
            seenCommentIds.current.add(commentData.id);

            if (comment.parent_comment_id) {
              return current.map((c) =>
                c.id === comment.parent_comment_id
                  ? {
                      ...c,
                      replies: [...(c.replies || []), comment],
                    }
                  : c
              );
            } else {
              return [comment, ...current];
            }
          });
        })
        .catch((error) => {
          // Still add the comment with minimal user data
          const comment: CommentWithUser = {
            ...commentData,
            user: {
              id: commentData.user_id,
              name: 'Unknown User',
              username: 'unknown',
              avatar: '',
              persona: 'Food Explorer',
              verified: false,
            },
            replies: [],
          };

          setComments((current) => {
            const stillExists = current.some((c) => 
              c.id === commentData.id || c.replies?.some((r) => r.id === commentData.id)
            );
            if (stillExists) {
              return current;
            }

            // Mark as seen before adding
            seenCommentIds.current.add(commentData.id);

            if (comment.parent_comment_id) {
              return current.map((c) =>
                c.id === comment.parent_comment_id
                  ? {
                      ...c,
                      replies: [...(c.replies || []), comment],
                    }
                  : c
              );
            } else {
              return [comment, ...current];
            }
          });
        });

      // Return current state while we fetch user data
      return prev;
    });
  };

  const handleRealtimeDelete = (deletedComment: { id: string }) => {
    setComments((prev) => {
      // Remove from top-level comments
      let filtered = prev.filter((c) => c.id !== deletedComment.id);

      // Remove from replies
      filtered = filtered.map((comment) => ({
        ...comment,
        replies: (comment.replies || []).filter(
          (r) => r.id !== deletedComment.id
        ),
      }));

      return filtered;
    });
  };

  const handleRealtimeUpdate = (updatedComment: CommentWithUser) => {
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === updatedComment.id) {
          return updatedComment;
        }
        // Check replies
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map((reply) =>
              reply.id === updatedComment.id ? updatedComment : reply
            ),
          };
        }
        return comment;
      })
    );
  };

  const handleSubmitComment = async () => {
    if (!user?.id || !post || !newComment.trim()) return;

    const content = newComment.trim();
    const tempId = `temp-${Date.now()}`;
    const currentCount = commentsCount;
    const isReply = !!replyingTo;

    console.log(`[Comments] Submitting comment - currentCount: ${currentCount}, isReply: ${isReply}, postId: ${post.id}`);

    try {
      setSubmitting(true);

      // Create optimistic comment
      const optimisticComment: CommentWithUser = {
        id: tempId,
        post_id: post.id,
        user_id: user.id,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent_comment_id: replyingTo?.id || null,
        likes_count: 0,
        user: {
          id: user.id,
          name: user.user_metadata?.name || user.user_metadata?.username || user.email || 'Anonymous',
          username: user.user_metadata?.username || 'user',
          avatar: user.user_metadata?.avatar_url || '',
          persona: user.user_metadata?.persona || 'Food Explorer',
          verified: user.user_metadata?.is_verified || false,
        },
        replies: [],
      };

      // Store parentCommentId BEFORE clearing replyingTo (needed for replacement logic)
      const parentCommentId = replyingTo?.id || null;
      
      // Add optimistic comment immediately
      if (replyingTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyingTo.id
              ? {
                  ...c,
                  replies: [...(c.replies || []), optimisticComment],
                }
              : c
          )
        );
      } else {
        setComments((prev) => [optimisticComment, ...prev]);
      }

      setNewComment('');
      Keyboard.dismiss();
      // Don't clear replyingTo yet - we need it for replacement logic

      // Create comment via service (trigger handles count update)
      const result = await engagementService.comments.create(
        post.id,
        user.id,
        content,
        parentCommentId
      );

      if (!result.success || !result.comment) {
        throw result.error || new Error('Failed to create comment');
      }

      const realComment = result.comment;
      console.log(`[Comments] Comment created - commentId: ${realComment.id}, expectedNewCount: ${currentCount + (isReply ? 0 : 1)}, currentUICount: ${commentsCount}`);

      // Track the real comment ID
      seenCommentIds.current.add(realComment.id);

      // Replace optimistic comment with real one
      // Use parentCommentId (stored before clearing replyingTo) to determine if it's a reply
      if (parentCommentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentCommentId
              ? {
                  ...c,
                  replies: (c.replies || []).map((r) =>
                    r.id === tempId ? realComment : r
                  ),
                }
              : c
          )
        );
      } else {
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? realComment : c))
        );
      }
      
      // Clear replyingTo AFTER successful replacement
      setReplyingTo(null);

      // NOTE: No event emissions needed - usePostEngagement hook in PostCard components
      // has realtime subscriptions to the posts table that automatically update
      // comment counts when the DB trigger fires.

      console.log(`[Comments] Comment posted successfully - UI count after: ${commentsCount}, expected: ${currentCount + (isReply ? 0 : 1)}`);
      ToastService.showSuccess('Comment posted!');
    } catch (error: any) {
      // Remove optimistic comment
      // Use parentCommentId from closure (replyingTo might be null by now)
      if (parentCommentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentCommentId
              ? {
                  ...c,
                  replies: (c.replies || []).filter((r) => r.id !== tempId),
                }
              : c
          )
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== tempId));
      }
      
      // Clear replyingTo on error too
      setReplyingTo(null);

      ToastService.showError('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string, isReply = false) => {
    const currentCount = commentsCount;
    const expectedNewCount = Math.max(currentCount - (isReply ? 0 : 1), 0);
    
    console.log(`[Comments] Deleting comment - commentId: ${commentId}, isReply: ${isReply}, currentCount: ${currentCount}, expectedNewCount: ${expectedNewCount}, postId: ${post.id}`);
    
    try {
      const success = await engagementService.comments.delete(commentId, post.id);
      if (!success) {
        throw new Error('Failed to delete comment');
      }
      
      // Remove from seen IDs
      seenCommentIds.current.delete(commentId);

      if (isReply) {
        setComments((prev) =>
          prev.map((comment) => ({
            ...comment,
            replies: (comment.replies || []).filter((r) => r.id !== commentId),
          }))
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }

      console.log(`[Comments] Comment deleted successfully - UI count after: ${commentsCount}, expected: ${expectedNewCount}`);
      ToastService.showSuccess('Comment deleted');
    } catch (error) {
      ToastService.showError('Failed to delete comment');
    }
  };

  const toggleReplies = (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    
    if (expandedReplies.has(commentId)) {
      setExpandedReplies((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    } else {
      setExpandedReplies((prev) => new Set(prev).add(commentId));
      // Load replies if not already loaded
      if (comment && (!comment.replies || comment.replies.length === 0)) {
        loadReplies(commentId);
      }
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

  const renderComment = ({ item: comment }: { item: CommentWithUser }) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedReplies.has(comment.id);
    const isReplying = replyingTo?.id === comment.id;

    return (
      <View style={styles.commentItem}>
        <View style={styles.commentHeader}>
          <Image
            source={{ uri: comment.user.avatar || DEFAULT_IMAGES.avatar }}
            style={styles.commentAvatar}
          />
          <View style={styles.commentContent}>
            <View style={styles.commentAuthorRow}>
              <Text style={styles.commentAuthorName}>
                {comment.user.name || comment.user.username}
              </Text>
              {comment.user.verified && (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={designTokens.colors.primaryOrange}
                />
              )}
              <Text style={styles.commentTime}>
                {formatTimeAgo(comment.created_at)}
              </Text>
            </View>
            <Text style={styles.commentText}>{comment.content}</Text>
            <View style={styles.commentActions}>
              <TouchableOpacity
                style={styles.commentActionButton}
                onPress={() => setReplyingTo(comment)}
              >
                <MessageCircle size={16} color={designTokens.colors.textMedium} />
                <Text style={styles.commentActionText}>Reply</Text>
              </TouchableOpacity>
              {user?.id === comment.user_id && (
                <TouchableOpacity
                  style={styles.commentActionButton}
                  onPress={() => handleDeleteComment(comment.id, false)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={designTokens.colors.error}
                  />
                  <Text style={[styles.commentActionText, { color: designTokens.colors.error }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Replies */}
        {hasReplies && (
          <View style={styles.repliesContainer}>
            <TouchableOpacity
              style={styles.repliesToggle}
              onPress={() => toggleReplies(comment.id)}
            >
              <View style={styles.repliesDivider} />
              <Text style={styles.repliesToggleText}>
                {isExpanded
                  ? `Hide ${comment.replies!.length} ${comment.replies!.length === 1 ? 'reply' : 'replies'}`
                  : `View ${comment.replies!.length} ${comment.replies!.length === 1 ? 'reply' : 'replies'}`}
              </Text>
            </TouchableOpacity>

            {isExpanded &&
              comment.replies?.map((reply, replyIndex) => (
                <View key={`reply-${reply.id}-${replyIndex}`} style={styles.replyItem}>
                  <Image
                    source={{ uri: reply.user.avatar || DEFAULT_IMAGES.avatar }}
                    style={styles.replyAvatar}
                  />
                  <View style={styles.replyContent}>
                    <View style={styles.commentAuthorRow}>
                      <Text style={styles.commentAuthorName}>
                        {reply.user.name || reply.user.username}
                      </Text>
                      {reply.user.verified && (
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color={designTokens.colors.primaryOrange}
                        />
                      )}
                      <Text style={styles.commentTime}>
                        {formatTimeAgo(reply.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{reply.content}</Text>
                    <View style={styles.commentActions}>
                      <TouchableOpacity
                        style={styles.commentActionButton}
                        onPress={() => setReplyingTo(reply)}
                      >
                        <MessageCircle
                          size={14}
                          color={designTokens.colors.textMedium}
                        />
                        <Text style={styles.commentActionText}>Reply</Text>
                      </TouchableOpacity>
                      {user?.id === reply.user_id && (
                        <TouchableOpacity
                          style={styles.commentActionButton}
                          onPress={() => handleDeleteComment(reply.id, true)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={14}
                            color={designTokens.colors.error}
                          />
                          <Text
                            style={[
                              styles.commentActionText,
                              { color: designTokens.colors.error },
                            ]}
                          >
                            Delete
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Loading replies indicator */}
        {loadingReplies.has(comment.id) && (
          <View style={styles.loadingReplies}>
            <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
          </View>
        )}
      </View>
    );
  };

  if (loading || !post) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={designTokens.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Post Header (Compact) */}
      <View style={styles.postHeader}>
        <Image
          source={{ uri: post.user.avatar || DEFAULT_IMAGES.avatar }}
          style={styles.postAvatar}
        />
        <View style={styles.postInfo}>
          <Text style={styles.postAuthorName}>
            {post.user.name || post.user.username}
          </Text>
          <Text style={styles.postCaption} numberOfLines={2}>
            {post.caption || 'No caption'}
          </Text>
        </View>
      </View>

      {/* Reaction Bar */}
      <View style={styles.reactionBar}>
        <TouchableOpacity 
          style={styles.reactionButton} 
          onPress={toggleLike}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? '#FF4444' : designTokens.colors.textMedium}
          />
          <Text style={styles.reactionCount}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.reactionButton} 
          onPress={() => {
            // Focus the comment input
            inputRef.current?.focus();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={20} color={designTokens.colors.textMedium} />
          <Text style={styles.reactionCount} testID="comment-count-display">{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.reactionButton} 
          onPress={async () => {
            if (post.restaurant) {
              await sharePost(
                post.caption || 'Check out this post',
                post.restaurant.name || '',
                post.caption,
                post.tags || []
              );
            } else {
              await copyLink();
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={20} color={designTokens.colors.textMedium} />
          <Text style={styles.reactionCount}>{shareCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Comments List */}
      <FlatList
        ref={flatListRef}
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item, index) => {
          // Ensure unique keys - combine ID with index to guarantee uniqueness
          // This prevents duplicate key errors even if IDs somehow collide
          const baseKey = item.id && typeof item.id === 'string' 
            ? item.id.startsWith('temp-') 
              ? `temp-${index}` 
              : item.id
            : `unknown-${index}`;
          return `comment-${baseKey}-${index}`;
        }}
        contentContainerStyle={[
          styles.commentsList,
          { paddingBottom: 100 } // Extra padding for composer
        ]}
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MessageCircle size={48} color={designTokens.colors.textLight} />
            <Text style={styles.emptyStateText}>No comments yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Be the first to comment!
            </Text>
          </View>
        }
        onEndReached={() => {
          if (hasMore && !loading) {
            loadComments(true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator
                size="small"
                color={designTokens.colors.primaryOrange}
              />
            </View>
          ) : null
        }
      />

      {/* Pinned Composer - Always visible above keyboard */}
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {replyingTo && (
          <View style={styles.replyingTo}>
            <Text style={styles.replyingToText}>
              Replying to @{replyingTo.user.username || replyingTo.user.name}
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={18} color={designTokens.colors.textMedium} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composerInputRow}>
          <TextInput
            ref={inputRef}
            style={styles.composerInput}
            placeholder="Add a comment..."
            placeholderTextColor={designTokens.colors.textLight}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
            testID="comment-input"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newComment.trim() || submitting) && styles.sendButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
            testID="comment-send"
          >
            {submitting ? (
              <ActivityIndicator
                size="small"
                color={designTokens.colors.white}
              />
            ) : (
              <Send size={20} color={designTokens.colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
    backgroundColor: designTokens.colors.white,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
  headerSpacer: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postHeader: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    marginBottom: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  postCaption: {
    fontSize: 14,
    color: designTokens.colors.textMedium,
    fontFamily: 'Inter_400Regular',
  },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
    backgroundColor: designTokens.colors.white,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  reactionCount: {
    fontSize: 14,
    color: designTokens.colors.textMedium,
    fontFamily: 'Inter_500Medium',
    minWidth: 20,
    textAlign: 'left',
  },
  commentsList: {
    paddingBottom: 20,
  },
  commentItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  commentHeader: {
    flexDirection: 'row',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    fontFamily: 'Inter_600SemiBold',
  },
  commentTime: {
    fontSize: 12,
    color: designTokens.colors.textLight,
    fontFamily: 'Inter_400Regular',
  },
  commentText: {
    fontSize: 14,
    color: designTokens.colors.textDark,
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: 'Inter_400Regular',
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  commentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    fontFamily: 'Inter_500Medium',
  },
  repliesContainer: {
    marginLeft: 48,
    marginTop: 12,
  },
  repliesToggle: {
    marginBottom: 8,
  },
  repliesDivider: {
    height: 1,
    backgroundColor: designTokens.colors.borderLight,
    marginBottom: 8,
  },
  repliesToggleText: {
    fontSize: 12,
    color: designTokens.colors.primaryOrange,
    fontFamily: 'Inter_500Medium',
  },
  replyItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  loadingReplies: {
    marginLeft: 48,
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    marginTop: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: designTokens.colors.textMedium,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  composer: {
    backgroundColor: designTokens.colors.white,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
    paddingHorizontal: 16,
    paddingTop: 12,
    // Composer stays at bottom, KeyboardAvoidingView handles keyboard
    // Ensure it's always visible above keyboard
    minHeight: 60,
  },
  replyingTo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: designTokens.colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    fontFamily: 'Inter_500Medium',
  },
  composerInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: designTokens.colors.textDark,
    fontFamily: 'Inter_400Regular',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designTokens.colors.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: designTokens.colors.textLight,
    opacity: 0.5,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

