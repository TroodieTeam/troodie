import { useCallback, useEffect, useRef, useState } from 'react';
import { activityFeedService, ActivityFeedItem } from '@/services/activityFeedService';
import { moderationService } from '@/services/moderationService';
import { eventBus, EVENTS } from '@/utils/eventBus';

interface UseActivityFeedOptions {
  userId: string | null;
  filter: 'all' | 'friends';
  enabled?: boolean;
}

interface UseActivityFeedReturn {
  activities: ActivityFeedItem[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  blockedUsers: string[];
  refresh: (force?: boolean) => Promise<void>;
  loadMore: () => void;
  addActivity: (activity: ActivityFeedItem) => void;
}

export function useActivityFeed({ 
  userId, 
  filter, 
  enabled = true 
}: UseActivityFeedOptions): UseActivityFeedReturn {
  // State
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for tracking
  const offset = useRef(0);
  const isInitialized = useRef(false);
  const lastFetchTime = useRef<number>(0);
  
  // Constants
  const REFRESH_COOLDOWN = 2000; // 2 seconds cooldown between refreshes
  const PAGE_SIZE = 50;

  /**
   * Fetch blocked users list
   */
  const fetchBlockedUsers = useCallback(async (): Promise<string[]> => {
    if (!userId) return [];
    
    try {
      const blocked = await moderationService.getBlockedUsers();
      return blocked;
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }
  }, [userId]);

  /**
   * Filter activities based on blocked users
   */
  const filterBlockedActivities = useCallback((
    activities: ActivityFeedItem[], 
    blockedList: string[]
  ): ActivityFeedItem[] => {
    if (!blockedList.length) return activities;
    return activities.filter(activity => !blockedList.includes(activity.actor_id));
  }, []);

  /**
   * Core fetch function for activities
   */
  const fetchActivities = useCallback(async (
    isRefresh: boolean = false,
    blockedList?: string[]
  ): Promise<void> => {
    // Prevent rapid refreshes
    const now = Date.now();
    if (isRefresh && now - lastFetchTime.current < REFRESH_COOLDOWN) {
      return;
    }
    
    try {
      setError(null);
      
      // Reset pagination for refresh
      if (isRefresh) {
        offset.current = 0;
        setHasMore(true);
      }

      // Get blocked users list
      const currentBlockedList = blockedList ?? blockedUsers;

      // Fetch activities from service
      const { data, error: fetchError } = await activityFeedService.getActivityFeed(
        userId,
        {
          filter,
          limit: PAGE_SIZE,
          offset: offset.current,
        }
      );

      if (fetchError) {
        throw new Error(fetchError);
      }

      // Filter out blocked users
      const filteredData = filterBlockedActivities(data, currentBlockedList);

      // Update state
      if (isRefresh) {
        setActivities(filteredData);
      } else {
        setActivities(prev => [...prev, ...filteredData]);
      }

      // Update pagination
      setHasMore(data.length === PAGE_SIZE);
      offset.current += data.length;
      lastFetchTime.current = now;
      
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [userId, filter, blockedUsers, filterBlockedActivities, fetchBlockedUsers]);

  /**
   * Initialize data on mount or filter change
   */
  const initialize = useCallback(async () => {
    // Prevent duplicate initialization
    if (!enabled || !userId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      // Fetch blocked users first
      const blockedList = await fetchBlockedUsers();
      setBlockedUsers(blockedList);
      
      // Then fetch activities
      await fetchActivities(true, blockedList);
      isInitialized.current = true;
    } catch (error) {
      console.error('Error initializing activity feed:', error);
      setLoading(false);
    }
  }, [enabled, userId, fetchBlockedUsers, fetchActivities]);

  /**
   * Public refresh function with smart cooldown
   */
  const refresh = useCallback(async (force: boolean = false) => {
    // Prevent refresh if already refreshing or initial loading
    if (refreshing || (loading && !isInitialized.current)) return;
    
    // Check cooldown unless forced
    if (!force) {
      const now = Date.now();
      if (now - lastFetchTime.current < REFRESH_COOLDOWN) {
        return;
      }
    }
    
    setRefreshing(true);
    
    // Clear cache and fetch fresh data
    activityFeedService.clearCache();
    
    const blockedList = await fetchBlockedUsers();
    setBlockedUsers(blockedList);
    
    await fetchActivities(true, blockedList);
  }, [refreshing, loading, fetchBlockedUsers, fetchActivities]);

  /**
   * Load more activities (pagination)
   */
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || refreshing || loading) return;
    
    setLoadingMore(true);
    fetchActivities(false);
  }, [loadingMore, hasMore, refreshing, loading, fetchActivities]);

  /**
   * Add a new activity to the feed (for real-time updates)
   */
  const addActivity = useCallback((newActivity: ActivityFeedItem) => {
    setActivities(prev => {
      // Check if activity already exists
      if (prev.some(a => 
        a.activity_type === newActivity.activity_type && 
        a.activity_id === newActivity.activity_id
      )) {
        return prev;
      }
      
      // Add to beginning of list
      return [newActivity, ...prev];
    });
  }, []);

  /**
   * Handle user blocked event
   */
  const handleUserBlocked = useCallback((blockedUserId: string) => {
    setBlockedUsers(prev => {
      if (prev.includes(blockedUserId)) return prev;
      return [...prev, blockedUserId];
    });
    
    // Remove activities from blocked user immediately
    setActivities(prev => prev.filter(activity => activity.actor_id !== blockedUserId));
  }, []);

  /**
   * Handle user unblocked event
   */
  const handleUserUnblocked = useCallback(async (unblockedUserId: string) => {
    // Update blocked list and refresh to show their activities
    const blockedList = await fetchBlockedUsers();
    setBlockedUsers(blockedList);
    
    // Only refresh if we're initialized to avoid duplicate fetches
    if (isInitialized.current) {
      await fetchActivities(true, blockedList);
    }
  }, [fetchBlockedUsers, fetchActivities]);

  // Initialize on mount and filter changes
  useEffect(() => {
    // Reset state when filter changes
    setActivities([]);
    offset.current = 0;
    isInitialized.current = false;
    
    initialize();
  }, [filter, userId]); // Don't include initialize to avoid loops

  // Subscribe to block/unblock events
  useEffect(() => {
    const unsubscribeBlocked = eventBus.on(EVENTS.USER_BLOCKED, handleUserBlocked);
    const unsubscribeUnblocked = eventBus.on(EVENTS.USER_UNBLOCKED, handleUserUnblocked);

    return () => {
      unsubscribeBlocked();
      unsubscribeUnblocked();
    };
  }, [handleUserBlocked, handleUserUnblocked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activityFeedService.clearCache();
    };
  }, []);

  return {
    activities,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    blockedUsers,
    refresh,
    loadMore,
    addActivity,
  };
}