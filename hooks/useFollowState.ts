import { useState, useEffect, useCallback } from 'react';
import { FollowService } from '@/services/followService';
import { supabase } from '@/lib/supabase';
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
}

/**
 * Hook to manage follow state with real-time updates
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
    loading: false
  });

  // Update state when initial values change (e.g., when profile loads)
  useEffect(() => {
    setState(prev => ({
      ...prev,
      followersCount: initialFollowersCount,
      followingCount: initialFollowingCount
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

  // Subscribe to real-time updates for user stats
  useEffect(() => {
    if (!userId) return;

    // Subscribe to user stats updates
    const channel = supabase
      .channel(`user-stats-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          const newData = payload.new;
          setState(prev => ({
            ...prev,
            followersCount: newData.followers_count || 0,
            followingCount: newData.following_count || 0
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Subscribe to relationship changes
  useEffect(() => {
    if (!currentUser?.id || !userId) return;

    // If viewing own profile, subscribe to changes in following count
    if (currentUser.id === userId) {
      const channel = supabase
        .channel(`own-follow-status-${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_relationships',
            filter: `follower_id=eq.${currentUser.id}`
          },
          () => {
            // When current user follows someone, increment their following count
            setState(prev => ({
              ...prev,
              followingCount: prev.followingCount + 1
            }));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'user_relationships',
            filter: `follower_id=eq.${currentUser.id}`
          },
          () => {
            // When current user unfollows someone, decrement their following count
            setState(prev => ({
              ...prev,
              followingCount: Math.max(0, prev.followingCount - 1)
            }));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Viewing someone else's profile
      const channel = supabase
        .channel(`follow-status-${currentUser.id}-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_relationships',
            filter: `follower_id=eq.${currentUser.id}`
          },
          (payload) => {
            if (payload.new.following_id === userId) {
              setState(prev => ({
                ...prev,
                isFollowing: true,
                followersCount: prev.followersCount + 1
              }));
              onFollowChange?.(true);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'user_relationships',
            filter: `follower_id=eq.${currentUser.id}`
          },
          (payload) => {
            if (payload.old?.following_id === userId) {
              setState(prev => ({
                ...prev,
                isFollowing: false,
                followersCount: Math.max(0, prev.followersCount - 1)
              }));
              onFollowChange?.(false);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser?.id, userId, onFollowChange]);

  // Toggle follow status
  const toggleFollow = useCallback(async () => {
    if (!currentUser?.id || !userId || currentUser.id === userId) return;
    
    setState(prev => ({ ...prev, loading: true }));
    
    // Optimistic update
    const wasFollowing = state.isFollowing;
    setState(prev => ({
      ...prev,
      isFollowing: !wasFollowing,
      followersCount: wasFollowing 
        ? Math.max(0, prev.followersCount - 1) 
        : prev.followersCount + 1
    }));

    try {
      if (wasFollowing) {
        await FollowService.unfollowUser(userId);
      } else {
        await FollowService.followUser(userId);
      }
      
      onFollowChange?.(!wasFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);
      
      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        isFollowing: wasFollowing,
        followersCount: wasFollowing 
          ? prev.followersCount + 1 
          : Math.max(0, prev.followersCount - 1)
      }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [currentUser?.id, userId, state.isFollowing, onFollowChange]);

  // Refresh counts from database
  const refreshCounts = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('followers_count, following_count')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setState(prev => ({
          ...prev,
          followersCount: data.followers_count || 0,
          followingCount: data.following_count || 0
        }));
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