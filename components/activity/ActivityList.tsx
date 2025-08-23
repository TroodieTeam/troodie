import React, { memo, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ActivityFeedItem } from '@/services/activityFeedService';
import { ActivityFeedItemComponent } from './ActivityFeedItem';
import { EmptyActivityState } from '@/components/EmptyActivityState';
import { designTokens } from '@/constants/designTokens';
import { useRouter } from 'expo-router';

interface ActivityListProps {
  activities: ActivityFeedItem[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  hasLimitedActivity: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  formatTimeAgo: (date: string) => string;
  ListHeaderComponent?: React.ReactElement;
}

const FooterLoader = memo(() => (
  <View style={styles.footerLoader}>
    <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
  </View>
));

const ErrorView = memo<{ error: string; onRetry: () => void }>(({ error, onRetry }) => (
  <View style={styles.centerContainer}>
    <Text style={styles.errorText}>{error}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryButtonText}>Retry</Text>
    </TouchableOpacity>
  </View>
));

const LoadingView = memo(() => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
  </View>
));

export const ActivityList: React.FC<ActivityListProps> = memo(({
  activities,
  loading,
  refreshing,
  loadingMore,
  error,
  hasMore,
  hasLimitedActivity,
  onRefresh,
  onLoadMore,
  formatTimeAgo,
  ListHeaderComponent,
}) => {
  const router = useRouter();

  const renderItem = useCallback(({ item, index }: { item: ActivityFeedItem; index: number }) => (
    <ActivityFeedItemComponent
      activity={item}
      formatTimeAgo={formatTimeAgo}
      testID={`activity-item-${index}`}
    />
  ), [formatTimeAgo]);

  const keyExtractor = useCallback((item: ActivityFeedItem, index: number) => 
    `${item.activity_type}-${item.activity_id}-${index}`,
  []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return <FooterLoader />;
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return <LoadingView />;
    }

    if (error) {
      return <ErrorView error={error} onRetry={onRefresh} />;
    }

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
  }, [loading, error, hasLimitedActivity, activities.length, onRefresh, router]);

  return (
    <FlatList
      data={activities}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={designTokens.colors.primaryOrange}
        />
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={activities.length === 0 ? styles.emptyContent : undefined}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      initialNumToRender={10}
      windowSize={21}
      updateCellsBatchingPeriod={50}
      getItemLayout={(data, index) => ({
        length: 100, // Approximate height of each item
        offset: 100 * index,
        index,
      })}
    />
  );
});

ActivityList.displayName = 'ActivityList';

const styles = StyleSheet.create({
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