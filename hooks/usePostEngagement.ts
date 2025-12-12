import { useAuth } from '@/contexts/AuthContext';
import { enhancedPostEngagementService } from '@/services/enhancedPostEngagementService';
import { realtimeManager } from '@/services/realtimeManager';
import { ToastService } from '@/services/toastService';
import { CommentWithUser, PostEngagementStats } from '@/types/post';
import { eventBus, EVENTS } from '@/utils/eventBus';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const unsubscribeCommentDeletes = useRef<(() => void) | null>(null);

  // Track last optimistic update timestamp
  const lastOptimisticUpdate = useRef<number>(0);
  
  // Track last initialized postId to prevent unnecessary resets
  const lastPostIdRef = useRef<string | null>(null);
  const lastInitialIsLikedRef = useRef<boolean | undefined>(undefined);
  const lastInitialStatsRef = useRef<PostEngagementStats | null>(null);
  
  useEffect(() => {
    const isNewPost = lastPostIdRef.current !== postId;
    const isLikedStatusChanged = lastInitialIsLikedRef.current !== initialIsLiked;
    
    // Check if stats have changed (for when post loads and initialStats becomes available)
    const lastStats = lastInitialStatsRef.current;
    const statsChanged = lastStats && initialStats && (
      lastStats.likes_count !== initialStats.likes_count ||
      lastStats.comments_count !== initialStats.comments_count ||
      lastStats.saves_count !== initialStats.saves_count ||
      lastStats.share_count !== initialStats.share_count
    );
    
    // Initialize if new post, like status changed, OR stats changed (post just loaded)
    if (!isNewPost && !isLikedStatusChanged && !statsChanged && lastInitialStatsRef.current) {
      // Already initialized and nothing changed - don't re-initialize
      // Realtime subscriptions handle all updates after initialization
      return;
    }
    
    lastPostIdRef.current = postId;
    lastInitialIsLikedRef.current = initialIsLiked;
    lastInitialStatsRef.current = initialStats;
    
    // Initialize from props (server data) - this is the source of truth on mount
    if (initialStats) {
      setLikesCount(initialStats.likes_count || 0);
      setCommentsCount(initialStats.comments_count || 0);
      setSavesCount(initialStats.saves_count || 0);
      setShareCount(initialStats.share_count || 0);
    }
    
    if (initialIsLiked !== undefined) {
      setIsLiked(initialIsLiked);
    }
    if (initialIsSaved !== undefined) {
      setIsSaved(initialIsSaved);
    }
    
    // Fallback to cache if no initial values provided
    if (!user?.id) return;
    
    const cachedLike = enhancedPostEngagementService.getCachedLikeStatus(postId, user.id);
    const cachedSave = enhancedPostEngagementService.getCachedSaveStatus(postId, user.id);
    const cachedStats = enhancedPostEngagementService.getCachedStats(postId);
    
    if (initialIsLiked === undefined && cachedLike !== undefined) {
      setIsLiked(cachedLike);
    }
    if (initialIsSaved === undefined && cachedSave !== undefined) {
      setIsSaved(cachedSave);
    }
    if (cachedStats && !initialStats) {
      setLikesCount(cachedStats.likes_count || 0);
      setCommentsCount(cachedStats.comments_count || 0);
      setSavesCount(cachedStats.saves_count || 0);
      setShareCount(cachedStats.share_count || 0);
    }
  }, [postId, user?.id, initialIsLiked, initialIsSaved, initialStats]);
  
  // Set up real-time subscriptions
  useEffect(() => {
    if (!enableRealtime || !user?.id) return;

    // Subscribe to engagement stats - IMPROVED: ignore self-generated events
    unsubscribeStats.current = realtimeManager.subscribe(
      `post-stats-${postId}`,
      {
        table: 'posts',
        event: 'UPDATE',
        filter: `id=eq.${postId}`
      },
      (data: any) => {
        // Realtime is the source of truth - database triggers ensure counts are correct
        setLikesCount(data.likes_count || 0);
        setCommentsCount(data.comments_count || 0);
        setSavesCount(data.saves_count || 0);
        setShareCount(data.share_count || 0);
      },
      {
        ignoreUserId: user.id // Don't process our own actions
      }
    );

    // Subscribe to comment INSERT events (for comment list updates only)
    // Count updates come from posts table UPDATE subscription above
    unsubscribeComments.current = realtimeManager.subscribe(
      `post-comments-${postId}`,
      {
        table: 'post_comments',
        event: 'INSERT',
        filter: `post_id=eq.${postId}`
      },
      (comment: any) => {
        // Only update comment list - count is handled by posts table UPDATE
        setComments((prev) => {
          const exists = prev.some(c => c.id === comment.id);
          if (exists) return prev;
          return [comment, ...prev];
        });
      },
      {
        ignoreUserId: user.id
      }
    );

    // Subscribe to comment DELETE events (for comment list updates only)
    // Count updates come from posts table UPDATE subscription above
    unsubscribeCommentDeletes.current = realtimeManager.subscribe(
      `post-comments-delete-${postId}`,
      {
        table: 'post_comments',
        event: 'DELETE',
        filter: `post_id=eq.${postId}`
      },
      (oldComment: any) => {
        // Only update comment list - count is handled by posts table UPDATE
        setComments((prev) => prev.filter(c => c.id !== oldComment.id));
      },
      {
        ignoreUserId: user.id
      }
    );

    return () => {
      unsubscribeStats.current?.();
      unsubscribeComments.current?.();
      unsubscribeCommentDeletes.current?.();
    };
  }, [postId, enableRealtime, user?.id]);
  
  // Toggle like action with optimistic update
  const toggleLike = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to like posts');
      return;
    }

    const previousIsLiked = isLiked;
    const previousCount = likesCount;
    const newIsLiked = !previousIsLiked;
    const expectedCount = newIsLiked 
      ? previousCount + 1 
      : Math.max(previousCount - 1, 0);

    // Update optimistic timestamp to prevent realtime from overwriting
    lastOptimisticUpdate.current = Date.now();

    setIsLiked(newIsLiked);
    setLikesCount(expectedCount);

    eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, { 
      postId, 
      isLiked: newIsLiked, 
      likesCount: expectedCount 
    });

    try {
      await enhancedPostEngagementService.togglePostLikeOptimistic(
        postId,
        user.id,
        previousIsLiked,
        (serverIsLiked, serverLikesCount) => {
          if (serverIsLiked !== newIsLiked) {
            setIsLiked(serverIsLiked);
          }
          
          if (serverLikesCount >= expectedCount && serverLikesCount !== expectedCount) {
            setLikesCount(serverLikesCount);
          }
          
          eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, { 
            postId, 
            isLiked: serverIsLiked, 
            likesCount: serverLikesCount >= expectedCount ? serverLikesCount : expectedCount 
          });
        },
        (error) => {
          setIsLiked(previousIsLiked);
          setLikesCount(previousCount);
          eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, { 
            postId, 
            isLiked: previousIsLiked, 
            likesCount: previousCount 
          });
          onEngagementError?.(error);
          Alert.alert('Error', 'Failed to update like. Please try again.');
        }
      );
    } catch (error) {
      setIsLiked(previousIsLiked);
      setLikesCount(previousCount);
      eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, { 
        postId, 
        isLiked: previousIsLiked, 
        likesCount: previousCount 
      });
      onEngagementError?.(error as Error);
      ToastService.showError('Failed to update like');
      throw error;
    }
  }, [postId, user?.id, isLiked, likesCount, onEngagementError]);
  
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