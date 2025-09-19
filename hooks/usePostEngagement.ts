import { useState, useEffect, useCallback, useRef } from 'react';
import { enhancedPostEngagementService } from '@/services/enhancedPostEngagementService';
import { useAuth } from '@/contexts/AuthContext';
import { PostEngagementStats, CommentWithUser } from '@/types/post';
import { eventBus, EVENTS } from '@/utils/eventBus';
import { Alert } from 'react-native';

interface UsePostEngagementOptions {
  postId: string;
  initialStats?: PostEngagementStats;
  initialIsLiked?: boolean;
  initialIsSaved?: boolean;
  onEngagementError?: (error: Error) => void;
  enableRealtime?: boolean;
}

interface UsePostEngagementReturn {
  // States
  isLiked: boolean;
  isSaved: boolean;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  shareCount: number;
  isLoading: boolean;
  
  // Actions
  toggleLike: () => Promise<void>;
  toggleSave: (boardId?: string) => Promise<void>;
  addComment: (content: string) => Promise<void>;
  sharePost: (title: string, restaurantName: string, postCaption?: string, tags?: string[]) => Promise<void>;
  copyLink: () => Promise<void>;
  refreshStats: (newStats: PostEngagementStats) => void;
  
  // Comments
  comments: CommentWithUser[];
  loadMoreComments: () => Promise<void>;
  isLoadingComments: boolean;
  hasMoreComments: boolean;
}

export function usePostEngagement({
  postId,
  initialStats,
  initialIsLiked = false,
  initialIsSaved = false,
  onEngagementError,
  enableRealtime = true
}: UsePostEngagementOptions): UsePostEngagementReturn {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [likesCount, setLikesCount] = useState(initialStats?.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(initialStats?.comments_count || 0);
  const [savesCount, setSavesCount] = useState(initialStats?.saves_count || 0);
  const [shareCount, setShareCount] = useState(initialStats?.share_count || 0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const commentsOffset = useRef(0);
  
  // Subscriptions cleanup
  const unsubscribeStats = useRef<(() => void) | null>(null);
  const unsubscribeComments = useRef<(() => void) | null>(null);
  
  // Initialize from initial stats or cache
  useEffect(() => {
    if (initialStats) {
      setLikesCount(initialStats.likes_count || 0);
      setCommentsCount(initialStats.comments_count || 0);
      setSavesCount(initialStats.saves_count || 0);
      setShareCount(initialStats.share_count || 0);
    }
    
    if (!user?.id) return;
    
    const cachedLike = enhancedPostEngagementService.getCachedLikeStatus(postId, user.id);
    const cachedSave = enhancedPostEngagementService.getCachedSaveStatus(postId, user.id);
    const cachedStats = enhancedPostEngagementService.getCachedStats(postId);
    
    if (cachedLike !== undefined) setIsLiked(cachedLike);
    if (cachedSave !== undefined) setIsSaved(cachedSave);
    if (cachedStats && !initialStats) {
      setLikesCount(cachedStats.likes_count || 0);
      setCommentsCount(cachedStats.comments_count || 0);
      setSavesCount(cachedStats.saves_count || 0);
      setShareCount(cachedStats.share_count || 0);
    }
  }, [postId, user?.id, initialStats]);
  
  // Set up real-time subscriptions
  useEffect(() => {
    if (!enableRealtime) return;
    
    // Subscribe to engagement stats
    unsubscribeStats.current = enhancedPostEngagementService.subscribeToPostEngagement(
      postId,
      (stats) => {
        setLikesCount(stats.likes_count || 0);
        setCommentsCount(stats.comments_count || 0);
        setSavesCount(stats.saves_count || 0);
        setShareCount(stats.share_count || 0);
      }
    );
    
    // Subscribe to comments
    unsubscribeComments.current = enhancedPostEngagementService.subscribeToPostComments(
      postId,
      (comment) => {
        setComments((prev) => {
          // Check if comment already exists (optimistic update)
          const exists = prev.some(c => c.id === comment.id);
          if (exists) return prev;
          return [comment, ...prev];
        });
        setCommentsCount((prev) => prev + 1);
      }
    );
    
    return () => {
      unsubscribeStats.current?.();
      unsubscribeComments.current?.();
    };
  }, [postId, enableRealtime]);
  
  // Toggle like action
  const toggleLike = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to like posts');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await enhancedPostEngagementService.togglePostLikeOptimistic(
        postId,
        user.id,
        (newIsLiked, newLikesCount) => {
          setIsLiked(newIsLiked);
          setLikesCount(newLikesCount);
          // Emit engagement changed event
          eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, { postId });
        },
        (error) => {
          onEngagementError?.(error);
          Alert.alert('Error', 'Failed to update like. Please try again.');
        }
      );
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [postId, user?.id, onEngagementError]);
  
  // Toggle save action
  const toggleSave = useCallback(async (boardId?: string) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to save posts');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await enhancedPostEngagementService.togglePostSaveOptimistic(
        postId,
        user.id,
        boardId,
        (newIsSaved, newSavesCount) => {
          setIsSaved(newIsSaved);
          setSavesCount(newSavesCount);
        },
        (error) => {
          onEngagementError?.(error);
          Alert.alert('Error', 'Failed to save post. Please try again.');
        }
      );
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [postId, user?.id, onEngagementError]);
  
  // Add comment action
  const addComment = useCallback(async (content: string) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to comment');
      return;
    }
    
    if (!content.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const userInfo = {
        id: user.id,
        name: user.user_metadata?.name || 'Unknown User',
        username: user.user_metadata?.username || 'unknown',
        avatar: user.user_metadata?.avatar_url || '',
        persona: user.user_metadata?.persona || 'Food Explorer',
        verified: user.user_metadata?.is_verified || false
      };
      
      await enhancedPostEngagementService.addCommentOptimistic(
        postId,
        user.id,
        content,
        userInfo,
        (comment) => {
          setComments((prev) => [comment, ...prev]);
          setCommentsCount((prev) => prev + 1);
          // Emit engagement changed event
          eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, { postId });
        },
        (error) => {
          onEngagementError?.(error);
          Alert.alert('Error', 'Failed to add comment. Please try again.');
        }
      );
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [postId, user, onEngagementError]);
  
  // Share post action
  const sharePost = useCallback(async (
    title: string, 
    restaurantName: string,
    postCaption?: string,
    tags?: string[]
  ) => {
    setIsLoading(true);
    
    try {
      const result = await enhancedPostEngagementService.sharePost(
        postId,
        user?.id || null,
        title,
        restaurantName,
        postCaption,
        tags
      );
      
      if (result.success) {
        setShareCount((prev) => prev + 1);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [postId, user?.id]);
  
  // Copy link action
  const copyLink = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const success = await enhancedPostEngagementService.copyPostLink(
        postId,
        user?.id || null
      );
      
      if (success) {
        setShareCount((prev) => prev + 1);
        Alert.alert('Success', 'Link copied to clipboard!');
      } else {
        Alert.alert('Error', 'Failed to copy link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    } finally {
      setIsLoading(false);
    }
  }, [postId, user?.id]);
  
  // Load more comments
  const loadMoreComments = useCallback(async () => {
    if (isLoadingComments || !hasMoreComments) return;
    
    setIsLoadingComments(true);
    
    try {
      // This would call the original postEngagementService.getPostComments
      // with offset for pagination
      // For now, we'll just set hasMoreComments to false
      setHasMoreComments(false);
    } catch (error) {
    } finally {
      setIsLoadingComments(false);
    }
  }, [isLoadingComments, hasMoreComments]);
  
  // Refresh stats manually
  const refreshStats = useCallback((newStats: PostEngagementStats) => {
    setLikesCount(newStats.likes_count || 0);
    setCommentsCount(newStats.comments_count || 0);
    setSavesCount(newStats.saves_count || 0);
    setShareCount(newStats.share_count || 0);
  }, []);
  
  return {
    // States
    isLiked,
    isSaved,
    likesCount,
    commentsCount,
    savesCount,
    shareCount,
    isLoading,
    
    // Actions
    toggleLike,
    toggleSave,
    addComment,
    sharePost,
    copyLink,
    refreshStats,
    
    // Comments
    comments,
    loadMoreComments,
    isLoadingComments,
    hasMoreComments
  };
}