import { useAuth } from '@/contexts/AuthContext';
import { engagementService } from '@/services/engagement';
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

  // Track last optimistic update timestamp
  const lastOptimisticUpdate = useRef<number>(0);
  
  // Track last initialized postId and initial stats to prevent unnecessary resets
  const lastPostIdRef = useRef<string | null>(null);
  const lastInitialStatsRef = useRef<PostEngagementStats | null>(null);
  
  // Track which postId we've set up subscriptions for to prevent re-subscription
  const subscribedPostIdRef = useRef<string | null>(null);
  const hasReceivedRealtimeUpdate = useRef<boolean>(false);
  
  // Initialize state only on mount or when postId changes
  useEffect(() => {
    const isNewPost = lastPostIdRef.current !== postId;
    
    if (isNewPost) {
      lastPostIdRef.current = postId;
      lastInitialStatsRef.current = initialStats || null;
      hasReceivedRealtimeUpdate.current = false;
      
      // Initialize with provided stats (only on mount/new post)
      // CRITICAL: Don't reset counts if we've already received realtime updates (prevents stale data overwriting realtime updates)
      if (initialStats) {
        // Only set counts if we haven't received realtime updates yet (for this postId)
        // This prevents stale initialStats from overwriting realtime updates when navigating back
        if (!hasReceivedRealtimeUpdate.current) {
          setLikesCount(initialStats.likes_count || 0);
          setCommentsCount(initialStats.comments_count || 0);
          setSavesCount(initialStats.saves_count || 0);
          setShareCount(initialStats.share_count || 0);
        }
      }
      
      // Initialize like/save status
      if (initialIsLiked !== undefined) {
        setIsLiked(initialIsLiked);
      }
      if (initialIsSaved !== undefined) {
        setIsSaved(initialIsSaved);
      }
      
      if (!user?.id) return;
      
      // Fetch engagement stats if not provided (uses cache internally)
      if (!initialStats) {
        engagementService.getEngagementStats(postId, user.id).then((stats) => {
          // Only update if postId hasn't changed
          if (lastPostIdRef.current === postId) {
            setLikesCount(stats.likes_count || 0);
            setCommentsCount(stats.comments_count || 0);
            setSavesCount(stats.saves_count || 0);
            setShareCount(stats.share_count || 0);
            
            if (initialIsLiked === undefined && stats.is_liked_by_user !== undefined) {
              setIsLiked(stats.is_liked_by_user);
            }
            if (initialIsSaved === undefined && stats.is_saved_by_user !== undefined) {
              setIsSaved(stats.is_saved_by_user);
            }
          }
        }).catch((error) => {
          console.error('[usePostEngagement] Error fetching engagement stats:', error);
        });
      } else {
        // If initialIsLiked/initialIsSaved not provided, fetch from service
        if (initialIsLiked === undefined) {
          engagementService.likes.isLiked(postId, user.id).then((isLiked) => {
            if (lastPostIdRef.current === postId) {
              setIsLiked(isLiked);
            }
          });
        }
        if (initialIsSaved === undefined) {
          engagementService.saves.isSaved(postId, user.id).then((isSaved) => {
            if (lastPostIdRef.current === postId) {
              setIsSaved(isSaved);
            }
          });
        }
      }
    }
  }, [postId, user?.id]); // Only depend on postId and user.id, NOT initialStats
  
  // Sync counts when initialStats changes (e.g., when ExploreScreen updates post list)
  // This ensures hook state stays in sync with updated post data when navigating back
  useEffect(() => {
    if (!initialStats || lastPostIdRef.current !== postId) return;
    
    // Check if stats have changed significantly (more than 1 difference indicates real update)
    const commentsDiff = initialStats.comments_count !== undefined ? Math.abs(initialStats.comments_count - commentsCount) : 0;
    const likesDiff = initialStats.likes_count !== undefined ? Math.abs(initialStats.likes_count - likesCount) : 0;
    const savesDiff = initialStats.saves_count !== undefined ? Math.abs(initialStats.saves_count - savesCount) : 0;
    
    // If there's a significant difference (> 1), always sync (likely from event bus update)
    // If difference is 1, only sync if no recent realtime update
    const hasSignificantDiff = commentsDiff > 1 || likesDiff > 1 || savesDiff > 1;
    const hasSmallDiff = commentsDiff === 1 || likesDiff === 1 || savesDiff === 1;
    
    if (!hasSignificantDiff && !hasSmallDiff) return;
    
    // For significant differences, always sync (event bus update)
    // For small differences, check if realtime update was recent
    const timeSinceRealtime = Date.now() - (lastOptimisticUpdate.current || 0);
    const shouldSync = hasSignificantDiff || !hasReceivedRealtimeUpdate.current || timeSinceRealtime > 2000;
    
    if (shouldSync) {
      if (initialStats.likes_count !== undefined) setLikesCount(initialStats.likes_count);
      if (initialStats.comments_count !== undefined) setCommentsCount(initialStats.comments_count);
      if (initialStats.saves_count !== undefined) setSavesCount(initialStats.saves_count);
      if (initialStats.share_count !== undefined) setShareCount(initialStats.share_count);
      
      // Reset realtime flag since we're syncing from external source
      hasReceivedRealtimeUpdate.current = false;
    }
  }, [initialStats?.comments_count, initialStats?.likes_count, initialStats?.saves_count, initialStats?.share_count, postId, commentsCount, likesCount, savesCount, shareCount]);
  
  // Update like/save status when they change (but don't reset counts)
  useEffect(() => {
    if (initialIsLiked !== undefined && lastPostIdRef.current === postId) {
      setIsLiked(initialIsLiked);
    }
  }, [initialIsLiked, postId]);
  
  useEffect(() => {
    if (initialIsSaved !== undefined && lastPostIdRef.current === postId) {
      setIsSaved(initialIsSaved);
    }
  }, [initialIsSaved, postId]);
  
  // Set up real-time subscriptions
  useEffect(() => {
    if (!enableRealtime || !user?.id) {
      return;
    }
    
    // CRITICAL: Only set up subscription once per postId - prevent re-subscription on re-renders
    if (subscribedPostIdRef.current === postId) {
      return;
    }
    
    // Clean up previous subscription if postId changed
    if (subscribedPostIdRef.current && subscribedPostIdRef.current !== postId) {
      unsubscribeStats.current?.();
      unsubscribeComments.current?.();
    }
    
    subscribedPostIdRef.current = postId;

    // Subscribe to comment INSERT/DELETE events (SINGLE SOURCE OF TRUTH)
    // Calculate count from actual comments, not stale column
    unsubscribeComments.current = realtimeManager.subscribe(
      `post-comments-${postId}`,
      {
        table: 'post_comments',
        event: '*', // Listen to both INSERT and DELETE
        filter: `post_id=eq.${postId}`
      },
      async (data: any, eventType: string, metadata?: any) => {
        const payload = metadata?.payload;
        // Use eventType from metadata if available (more reliable), otherwise fallback to parameter
        const actualEventType = metadata?.eventType || payload?.eventType || eventType;
        
        if (actualEventType === 'INSERT') {
          // Check if this is our own comment - we still want to update count but skip adding to list
          // (the comments modal handles its own optimistic updates)
          const isOwnComment = data?.user_id === user.id;
          
          // Only add to list if not our own (comments modal handles own comments optimistically)
          if (!isOwnComment) {
            setComments((prev) => {
              const exists = prev.some(c => c.id === data.id);
              if (exists) return prev;
              return [data, ...prev];
            });
          }
          
          // ALWAYS increment count (even for own comments) - PostCard needs this
          setCommentsCount((prev) => {
            const newCount = prev + 1;
            hasReceivedRealtimeUpdate.current = true; // Mark that we've received a realtime update
            
            // Emit event so ExploreScreen can update post list
            eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, {
              postId,
              commentsCount: newCount
            });
            
            return newCount;
          });
        } else if (actualEventType === 'DELETE') {
          // For DELETE, data contains the deleted row (from payload.old via realtimeManager)
          const deletedCommentId = data?.id;
          
          if (deletedCommentId) {
            // Remove comment from list
            setComments((prev) => prev.filter(c => c.id !== deletedCommentId));
            
            // Decrement count (calculate from actual data)
            setCommentsCount((prev) => {
              const newCount = Math.max(prev - 1, 0);
              
              // Emit event so ExploreScreen can update post list
              eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, {
                postId,
                commentsCount: newCount
              });
              
              return newCount;
            });
          }
        }
      },
      {
        // CRITICAL: Don't ignore userId for comments - we need to see our own INSERTs
        // to update the count on PostCard. The comments modal handles optimistic updates,
        // but PostCard relies on realtime events to update the displayed count.
        // ignoreUserId: user.id  // REMOVED - we need all comment events
      }
    );

    // Subscribe to likes for realtime updates
    unsubscribeStats.current = realtimeManager.subscribe(
      `post-likes-${postId}`,
      {
        table: 'post_likes',
        event: '*',
        filter: `post_id=eq.${postId}`
      },
      async (_data: any, eventType: string) => {
        // Recalculate like count from actual data using unified service
        const count = await engagementService.likes.getCount(postId);
        setLikesCount(count);
        
        // Emit event so ExploreScreen and other components can update
        eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, {
          postId,
          likesCount: count
        });
      },
      {
        ignoreUserId: user.id
      }
    );

    return () => {
      // Only cleanup if this is actually the current subscription (prevent cleanup on re-renders)
      if (subscribedPostIdRef.current === postId) {
        unsubscribeStats.current?.();
        unsubscribeComments.current?.();
        subscribedPostIdRef.current = null;
      }
    };
  }, [postId, enableRealtime, user?.id]); // Removed commentsCount from deps to prevent re-subscription
  
  // Toggle like action with optimistic update
  const toggleLike = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to like posts');
      return;
    }

    const previousIsLiked = isLiked;
    const previousCount = likesCount;

    // Update optimistic timestamp to prevent realtime from overwriting
    lastOptimisticUpdate.current = Date.now();

    try {
      const result = await engagementService.likes.toggle(
        postId,
        user.id,
        {
          onOptimisticUpdate: (toggleResult) => {
            if (toggleResult.isLiked !== undefined) {
              setIsLiked(toggleResult.isLiked);
            }
            if (toggleResult.likesCount !== undefined) {
              setLikesCount(toggleResult.likesCount);
            }
            
            eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, { 
              postId, 
              isLiked: toggleResult.isLiked ?? isLiked, 
              likesCount: toggleResult.likesCount ?? likesCount
            });
          },
          onError: (error) => {
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
        }
      );

      // Update state with server response
      if (result.success) {
        if (result.isLiked !== undefined) {
          setIsLiked(result.isLiked);
        }
        if (result.likesCount !== undefined) {
          setLikesCount(result.likesCount);
        }
        
        eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, { 
          postId, 
          isLiked: result.isLiked ?? isLiked, 
          likesCount: result.likesCount ?? likesCount
        });
      }
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
      const result = await engagementService.saves.toggle(
        postId,
        user.id,
        boardId,
        {
          onOptimisticUpdate: (toggleResult) => {
            if (toggleResult.isSaved !== undefined) {
              setIsSaved(toggleResult.isSaved);
            }
            if (toggleResult.savesCount !== undefined) {
              setSavesCount(toggleResult.savesCount);
            }
          },
          onError: (error) => {
            onEngagementError?.(error);
            Alert.alert('Error', 'Failed to save post. Please try again.');
          }
        }
      );

      // Update state with server response
      if (result.success) {
        if (result.isSaved !== undefined) {
          setIsSaved(result.isSaved);
        }
        if (result.savesCount !== undefined) {
          setSavesCount(result.savesCount);
        }
      }
    } catch (error) {
      onEngagementError?.(error as Error);
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
      
      const result = await engagementService.comments.create(
        postId,
        user.id,
        content,
        undefined, // parentCommentId
        userInfo
      );

      if (result.success && result.comment) {
        setComments((prev) => [result.comment!, ...prev]);
        // DO NOT increment commentsCount here - realtime will handle it
        // Emit engagement changed event
        eventBus.emit(EVENTS.POST_ENGAGEMENT_CHANGED, { postId });
      } else {
        throw result.error || new Error('Failed to create comment');
      }
    } catch (error) {
      onEngagementError?.(error as Error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
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
      const result = await engagementService.shares.share(
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
      const success = await engagementService.shares.copyLink(
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
      const lastComment = comments[comments.length - 1];
      const cursorCreatedAt = lastComment?.created_at;
      
      const newComments = await engagementService.comments.listTopLevel(
        postId,
        {
          limit: 20,
          cursorCreatedAt
        }
      );

      if (newComments.length === 0) {
        setHasMoreComments(false);
      } else {
        setComments((prev) => [...prev, ...newComments]);
      }
    } catch (error) {
      console.error('[usePostEngagement] Error loading more comments:', error);
      setHasMoreComments(false);
    } finally {
      setIsLoadingComments(false);
    }
  }, [postId, comments, isLoadingComments, hasMoreComments]);
  
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