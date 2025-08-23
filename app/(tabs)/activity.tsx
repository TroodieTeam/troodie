import { ActivityFilterToggle } from '@/components/activity/ActivityFilterToggle';
import { ActivityHeader } from '@/components/activity/ActivityHeader';
import { ActivityList } from '@/components/activity/ActivityList';
import { AuthGate } from '@/components/AuthGate';
import { designTokens } from '@/constants/designTokens';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useActivityRealtime } from '@/hooks/useActivityRealtime';
import { activityFeedService } from '@/services/activityFeedService';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

/**
 * Activity Screen Component
 * 
 * Displays a feed of activities from users and communities
 * with support for filtering, pagination, and real-time updates.
 */
export default function ActivityScreen() {
  const { user, isAuthenticated } = useAuth();
  const { userState } = useApp();
  
  // Filter state
  const [filter, setFilter] = useState<'all' | 'friends'>('all');
  
  // Track last focus time to prevent rapid refreshes
  const lastFocusTime = useRef<number>(0);
  
  // Use custom hook for activity feed management
  const {
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
  } = useActivityFeed({
    userId: user?.id || null,
    filter,
    enabled: isAuthenticated,
  });

  // Subscribe to real-time updates
  useActivityRealtime({
    userId: user?.id || null,
    filter,
    blockedUsers,
    onNewActivity: addActivity,
    enabled: isAuthenticated,
  });

  // Refresh when screen comes into focus (with smart cooldown)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFocus = now - lastFocusTime.current;
      
      // Only refresh if:
      // 1. User is authenticated
      // 2. Not currently loading or refreshing
      // 3. It's been more than 30 seconds since last focus
      if (isAuthenticated && !loading && !refreshing && timeSinceLastFocus > 30000) {
        lastFocusTime.current = now;
      }
    }, [isAuthenticated, loading, refreshing, refresh])
  );

  // Handle filter change
  const handleFilterChange = useCallback((newFilter: 'all' | 'friends') => {
    if (newFilter !== filter) {
      setFilter(newFilter);
    }
  }, [filter]);

  // Memoize header component
  const ListHeader = useMemo(() => (
    <>
      <ActivityHeader />
      <ActivityFilterToggle
        filter={filter}
        onFilterChange={handleFilterChange}
        showFilter={!!user}
      />
    </>
  ), [filter, handleFilterChange, user]);

  // Check if user has limited activity
  const hasLimitedActivity = userState.hasLimitedActivity ?? true;

  // Show AuthGate for non-authenticated users
  if (!isAuthenticated) {
    return (
      <AuthGate 
        screenName="your activity feed"
        customTitle="Stay Connected with Your Food Community"
        customMessage="See what your friends are eating, get notified about new reviews, and discover trending restaurants in your area."
      >
        <View />
      </AuthGate>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ActivityList
        activities={activities}
        loading={loading}
        refreshing={refreshing}
        loadingMore={loadingMore}
        error={error}
        hasMore={hasMore}
        hasLimitedActivity={hasLimitedActivity}
        onRefresh={refresh}
        onLoadMore={loadMore}
        formatTimeAgo={activityFeedService.formatTimeAgo}
        ListHeaderComponent={ListHeader}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight,
  },
});