import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { activityFeedService, ActivityFeedItem } from '@/services/activityFeedService';
import { ActivityFeedItemComponent } from '@/components/activity/ActivityFeedItem';
import { EmptyActivityState } from '@/components/EmptyActivityState';
import { designTokens, compactDesign } from '@/constants/designTokens';

export default function ActivityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { userState } = useApp();
  
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'friends'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const offset = useRef(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastActivityTimestamp = useRef<string | null>(null);

  // Fetch activity feed
  const fetchActivities = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      
      if (isRefresh) {
        offset.current = 0;
        setHasMore(true);
      }

      const { data, error: fetchError } = await activityFeedService.getActivityFeed(
        user?.id || null,
        {
          filter,
          limit: 50,
          offset: offset.current,
        }
      );

      if (fetchError) {
        setError(fetchError);
        return;
      }

      if (isRefresh) {
        setActivities(data);
        // Store timestamp of most recent activity for real-time updates
        if (data.length > 0) {
          lastActivityTimestamp.current = data[0].created_at;
        }
      } else {
        setActivities(prev => [...prev, ...data]);
      }

      // Check if we have more data
      if (data.length < 50) {
        setHasMore(false);
      }

      offset.current += data.length;
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [user?.id, filter]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchActivities(true);
  }, [filter]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to real-time updates
    unsubscribeRef.current = activityFeedService.subscribeToActivityFeed(
      user.id,
      (newActivity) => {
        // Check if activity matches current filter
        if (filter === 'friends') {
          // TODO: Check if actor is a friend
          // For now, we'll add all activities in friends mode
        }

        // Add new activity to the top of the list
        setActivities(prev => {
          // Avoid duplicates - check both type and id
          if (prev.some(a => 
            a.activity_type === newActivity.activity_type && 
            a.activity_id === newActivity.activity_id
          )) {
            return prev;
          }
          return [newActivity, ...prev];
        });

        // Update last activity timestamp
        lastActivityTimestamp.current = newActivity.created_at;
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user, filter]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      activityFeedService.cleanup();
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchActivities(true);
  }, [fetchActivities]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !refreshing) {
      setLoadingMore(true);
      fetchActivities(false);
    }
  }, [loadingMore, hasMore, refreshing, fetchActivities]);

  const handleFilterChange = (newFilter: 'all' | 'friends') => {
    if (newFilter !== filter) {
      setFilter(newFilter);
      setActivities([]);
      offset.current = 0;
    }
  };

  const renderActivityItem = ({ item }: { item: ActivityFeedItem }) => (
    <ActivityFeedItemComponent
      activity={item}
      formatTimeAgo={activityFeedService.formatTimeAgo}
    />
  );

  const renderHeader = () => (
    <>
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={20} color={designTokens.colors.text} />
          <Text style={styles.title}>Activity</Text>
        </View>
      </View>

      {/* Filter Toggle */}
      {user && (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => handleFilterChange('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All Troodie
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'friends' && styles.filterButtonActive]}
            onPress={() => handleFilterChange('friends')}
          >
            <Text style={[styles.filterText, filter === 'friends' && styles.filterTextActive]}>
              Friends
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchActivities(true)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const hasLimitedActivity = userState.hasLimitedActivity ?? true;
    
    if (hasLimitedActivity || activities.length === 0) {
      return (
        <EmptyActivityState
          onExploreRestaurants={() => router.push('/explore')}
          onSaveRestaurant={() => router.push('/explore')}
          onDiscoverGems={() => router.push('/explore')}
          onShareExperience={() => router.push('/explore')}
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={activities}
        renderItem={renderActivityItem}
        keyExtractor={(item, index) => `${item.activity_type}-${item.activity_id}-${index}`}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={designTokens.colors.primaryOrange}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={activities.length === 0 ? styles.emptyContent : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: compactDesign.header.paddingHorizontal,
    paddingVertical: compactDesign.header.paddingVertical,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
  markAllRead: {
    paddingVertical: 4,
    paddingHorizontal: compactDesign.button.paddingHorizontalSmall,
  },
  markAllReadText: {
    ...designTokens.typography.smallText,
    fontWeight: '600',
    color: designTokens.colors.primaryOrange,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: designTokens.colors.white,
    paddingHorizontal: compactDesign.content.padding,
    paddingVertical: compactDesign.content.gap,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.backgroundGray,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: designTokens.colors.primaryOrange,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyContent: {
    flexGrow: 1,
  },
  errorText: {
    fontSize: 16,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: designTokens.borderRadius.full,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});