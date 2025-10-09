import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FollowService } from '@/services/followService';
import { supabase } from '@/lib/supabase';
import { realtimeManager } from '@/services/realtimeManager';
import { ToastService } from '@/services/toastService';
import { useAuth } from '@/contexts/AuthContext';

interface UseFollowStateProps {
  userId: string;
  initialIsFollowing?: boolean;
  initialFollowersCount?: number;
  initialFollowingCount?: number;
  onFollowChange?: (isFollowing: boolean) => void;
}

interface FollowState {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  loading: boolean;
  lastSyncTimestamp: number; // Track last sync for conflict resolution
}

/**
 * Hook to manage follow state with real-time updates and optimistic UI
 */
export function useFollowState({
  userId,
  initialIsFollowing = false,
  initialFollowersCount = 0,
  initialFollowingCount = 0,
  onFollowChange
}: UseFollowStateProps) {
  const { user: currentUser } = useAuth();
  const [state, setState] = useState<FollowState>({
    isFollowing: initialIsFollowing,
    followersCount: initialFollowersCount,
    followingCount: initialFollowingCount,
    loading: false,
    lastSyncTimestamp: Date.now()
  });

  // Prevent concurrent toggle operations
  const isToggling = useRef(false);

  // Update state when initial values change (e.g., when profile loads)
  useEffect(() => {
    setState(prev => ({
      ...prev,
      followersCount: initialFollowersCount,
      followingCount: initialFollowingCount,
      lastSyncTimestamp: Date.now()
    }));
  }, [initialFollowersCount, initialFollowingCount]);

  // Check initial follow status
  useEffect(() => {
    if (!currentUser?.id || !userId || currentUser.id === userId) return;

    const checkFollowStatus = async () => {
      try {
        const isFollowing = await FollowService.isFollowing(userId);
        setState(prev => ({ ...prev, isFollowing }));
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowStatus();
  }, [currentUser?.id, userId]);

  // SIMPLIFIED: Single real-time subscription for count updates using realtimeManager
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = realtimeManager.subscribe(
      `user-follow-stats-${userId}`,
      {
        table: 'users',
        event: 'UPDATE',
        filter: `id=eq.${userId}`
      },
      (data: any) => {
        const serverTimestamp = new Date(data.updated_at || Date.now()).getTime();

        // Only update if server data is newer than our last optimistic update
        setState(prev => {
          if (serverTimestamp > prev.lastSyncTimestamp) {
            return {
              ...prev,
              followersCount: data.followers_count || 0,
              followingCount: data.following_count || 0,
              lastSyncTimestamp: serverTimestamp
            };
          }
          return prev;
        });
      },
      {
        timestampField: 'updated_at',
        minTimestamp: state.lastSyncTimestamp
      }
    );

    return unsubscribe;
  }, [userId]);

  // IMPROVED: Toggle with request deduplication and proper error handling
  const toggleFollow = useCallback(async () => {
    if (!currentUser?.id || !userId || currentUser.id === userId) return;

    // Prevent concurrent toggles
    if (isToggling.current) return;

    isToggling.current = true;
    setState(prev => ({ ...prev, loading: true }));

    // Store previous state for rollback
    const wasFollowing = state.isFollowing;
    const prevFollowersCount = state.followersCount;

    // Optimistic update with timestamp
    const optimisticTimestamp = Date.now();
    setState(prev => ({
      ...prev,
      isFollowing: !wasFollowing,
      followersCount: wasFollowing
        ? Math.max(0, prev.followersCount - 1)
        : prev.followersCount + 1,
      lastSyncTimestamp: optimisticTimestamp
    }));

    // Haptic feedback on iOS
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const result = wasFollowing
        ? await FollowService.unfollowUser(userId)
        : await FollowService.followUser(userId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update follow status');
      }

      // Success - verify counts with server
      await refreshCounts();

      onFollowChange?.(!wasFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);

      // Rollback optimistic update
      setState(prev => ({
        ...prev,
        isFollowing: wasFollowing,
        followersCount: prevFollowersCount,
        lastSyncTimestamp: Date.now()
      }));

      ToastService.showError(
        wasFollowing ? 'Failed to unfollow user' : 'Failed to follow user'
      );
    } finally {
      setState(prev => ({ ...prev, loading: false }));
      isToggling.current = false;
    }
  }, [currentUser?.id, userId, state.isFollowing, onFollowChange]);

  // IMPROVED: Refresh counts with timestamp-based conflict resolution
  const refreshCounts = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('followers_count, following_count, updated_at')
        .eq('id', userId)
        .single();

      if (!error && data) {
        const serverTimestamp = new Date(data.updated_at || Date.now()).getTime();

        setState(prev => {
          // Only update if server data is newer
          if (serverTimestamp >= prev.lastSyncTimestamp) {
            return {
              ...prev,
              followersCount: data.followers_count || 0,
              followingCount: data.following_count || 0,
              lastSyncTimestamp: serverTimestamp
            };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error refreshing counts:', error);
    }
  }, [userId]);

  return {
    isFollowing: state.isFollowing,
    followersCount: state.followersCount,
    followingCount: state.followingCount,
    loading: state.loading,
    toggleFollow,
    refreshCounts
  };
}