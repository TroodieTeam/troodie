import { ActivityFeedItem, activityFeedService } from '@/services/activityFeedService';
import { useEffect, useRef } from 'react';

// Team account ID to hide from activity feed
const TEAM_ACCOUNT_ID = '5373475d-b6b5-4abd-bd47-8ec515c44a47';

interface UseActivityRealtimeOptions {
  userId: string | null;
  filter: 'all' | 'friends';
  blockedUsers: string[];
  onNewActivity: (activity: ActivityFeedItem) => void;
  enabled?: boolean;
}

export function useActivityRealtime({
  userId,
  filter,
  blockedUsers,
  onNewActivity,
  enabled = true,
}: UseActivityRealtimeOptions) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Don't subscribe if not enabled or no user
    if (!enabled || !userId) return;

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Subscribe to real-time updates
    unsubscribeRef.current = activityFeedService.subscribeToActivityFeed(
      userId,
      (newActivity) => {
        // Filter based on current filter setting
        if (filter === 'friends') {
          // TODO: Check if actor is a friend
          // For now, we'll add all activities in friends mode
        }

        // Filter out blocked users
        if (blockedUsers.includes(newActivity.actor_id)) {
          return;
        }

        // Filter out team account activities
        if (newActivity.actor_id === TEAM_ACCOUNT_ID) {
          return;
        }

        // Pass to parent component
        onNewActivity(newActivity);
      }
    );

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId, filter, blockedUsers, enabled]); // onNewActivity excluded to prevent re-subscriptions

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);
}