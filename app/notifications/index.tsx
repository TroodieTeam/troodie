import { NotificationItem } from '@/components/NotificationItem';
import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/notificationService';
import { Notification } from '@/types/notifications';
import { useRouter } from 'expo-router';
import { Bell, Check, Settings, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const PAGE_SIZE = 20;

type DateLabel = 'Today' | 'Yesterday' | 'This Week' | 'Older';
type DateHeader = { type: 'header'; label: DateLabel };
type ListItem = Notification | DateHeader;

function isDateHeader(item: ListItem): item is DateHeader {
  return 'type' in item && item.type === 'header';
}

function getDateLabel(dateStr: string): DateLabel {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'This Week';
  return 'Older';
}

function groupNotificationsByDate(notifications: Notification[]): ListItem[] {
  if (notifications.length === 0) return [];

  const items: ListItem[] = [];
  let currentLabel: DateLabel | null = null;

  for (const notification of notifications) {
    const label = getDateLabel(notification.created_at);
    if (label !== currentLabel) {
      currentLabel = label;
      items.push({ type: 'header', label });
    }
    items.push(notification);
  }

  return items;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const userNotifications = await notificationService.getUserNotifications(user!.id, PAGE_SIZE, 0);
      setNotifications(userNotifications);
      setHasMore(userNotifications.length >= PAGE_SIZE);
    } catch (error) {
      console.error('[Notifications] Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id, loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    const userNotifications = await notificationService.getUserNotifications(user!.id, PAGE_SIZE, 0);
    setNotifications(userNotifications);
    setHasMore(userNotifications.length >= PAGE_SIZE);
    setRefreshing(false);
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !user?.id) return;

    try {
      setLoadingMore(true);
      const moreNotifications = await notificationService.getUserNotifications(
        user.id,
        PAGE_SIZE,
        notifications.length
      );
      setNotifications(prev => [...prev, ...moreNotifications]);
      setHasMore(moreNotifications.length >= PAGE_SIZE);
    } catch (error) {
      console.error('[Notifications] Error loading more notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, user?.id, notifications.length]);

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as read
      await notificationService.markAsRead(notification.id);

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );

      // Navigate based on notification type
      const data = notification.data && typeof notification.data === 'object'
        ? (notification.data as Record<string, unknown>)
        : null;

      switch (notification.type) {
        case 'like':
        case 'post_liked':
        case 'comment':
        case 'post_commented':
        case 'post_mention':
        case 'mentioned_in_post':
        case 'mentioned_in_comment':
          if (data && 'postId' in data) {
            router.push(`/posts/${data.postId}`);
          }
          break;
        case 'follow':
        case 'new_follower':
          if (data && 'followerId' in data) {
            router.push(`/user/${data.followerId}`);
          }
          break;
        case 'achievement':
        case 'milestone':
          router.push('/profile?tab=achievements');
          break;
        case 'restaurant_recommendation':
        case 'restaurant_mention':
          if (data && 'restaurantId' in data) {
            router.push(`/restaurant/${data.restaurantId}`);
          }
          break;
        case 'board_invite': {
          const boardId = notification.related_id
            || (data && ('board_id' in data ? data.board_id : data && 'boardId' in data ? data.boardId : null));
          const invitationId = data && 'invitation_id' in data ? data.invitation_id : null;
          if (boardId) {
            if (invitationId) {
              router.push(`/boards/${boardId}?invitation_id=${invitationId}`);
            } else {
              router.push(`/boards/${boardId}`);
            }
          }
          break;
        }
        case 'campaign_opportunity':
        case 'new_campaign_posted':
          router.push('/creator/explore-campaigns');
          break;
        case 'campaign_application':
        case 'campaign_application_submitted':
          if (data && 'campaignId' in data) {
            router.push(`/(tabs)/business/campaigns/${data.campaignId}` as any);
          } else {
            router.push('/(tabs)/business/applications' as any);
          }
          break;
        case 'application_approved':
        case 'application_rejected':
        case 'campaign_deadline':
        case 'campaign_deadline_approaching':
          if (data && 'campaignId' in data) {
            router.push(`/creator/campaigns` as any);
          }
          break;
        case 'revision_requested':
          if (data && 'campaignId' in data) {
            router.push(`/creator/campaigns` as any);
          }
          break;
        case 'deliverable_submitted':
        case 'deliverables_submitted':
          if (data && 'campaignId' in data) {
            router.push(`/business/campaigns/${data.campaignId}/review-deliverables` as any);
          }
          break;
        case 'payment_sent':
        case 'payment_received':
          router.push('/creator/earnings' as any);
          break;
        case 'campaign_invite':
          if (data && 'campaignId' in data) {
            router.push(`/creator/apply/${data.campaignId}` as any);
          } else {
            router.push('/creator/explore-campaigns' as any);
          }
          break;
        case 'friend_post':
        case 'friend_post_restaurant':
          if (data && 'postId' in data) {
            router.push(`/posts/${data.postId}`);
          }
          break;
        case 'weekly_recap':
          // Navigate to feed
          router.push('/(tabs)');
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('[Notifications] Error handling notification:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      setMarkingAllRead(true);
      await notificationService.markAllAsRead(user.id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header} testID="notifications-header">
      <View style={styles.headerLeft}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          testID="notifications-close-button"
        >
          <X size={24} color={designTokens.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/notifications/settings')}
          testID="notifications-settings-button"
        >
          <Settings size={22} color={designTokens.colors.textDark} />
        </TouchableOpacity>
        {notifications.some(n => !n.is_read) && (
          <TouchableOpacity
            style={styles.markAllReadButton}
            onPress={handleMarkAllAsRead}
            disabled={markingAllRead}
            testID="mark-all-read-button"
          >
            {markingAllRead ? (
              <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
            ) : (
              <Check size={16} color={designTokens.colors.primaryOrange} />
            )}
            <Text style={styles.markAllReadText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState} testID="notifications-empty-state">
      <Bell size={48} color={designTokens.colors.textLight} />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySubtitle}>
        When you get notifications, they&apos;ll appear here
      </Text>
    </View>
  );

  const groupedItems = useMemo(
    () => groupNotificationsByDate(notifications),
    [notifications]
  );

  const renderListItem = ({ item }: { item: ListItem }) => {
    if (isDateHeader(item)) {
      return (
        <View style={styles.sectionHeader} testID={`section-header-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
          <Text style={styles.sectionHeaderText}>{item.label.toUpperCase()}</Text>
        </View>
      );
    }
    return (
      <NotificationItem
        notification={item}
        onPress={handleNotificationPress}
        onSwipeDelete={handleDeleteNotification}
      />
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader} testID="notifications-loading-more">
        <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <FlatList
        testID="notifications-list"
        data={groupedItems}
        renderItem={renderListItem}
        keyExtractor={(item) => isDateHeader(item) ? `header-${item.label}` : item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[designTokens.colors.primaryOrange]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  closeButton: {
    marginRight: designTokens.spacing.sm,
    padding: designTokens.spacing.xs
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  settingsButton: {
    padding: designTokens.spacing.sm
  },
  markAllReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.sm
  },
  markAllReadText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.primaryOrange,
    marginLeft: designTokens.spacing.xs
  },
  listContent: {
    flexGrow: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xxxl
  },
  loadingText: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    marginTop: designTokens.spacing.md
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xxxl
  },
  emptyTitle: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
    marginTop: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.sm
  },
  emptySubtitle: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    lineHeight: 20
  },
  footerLoader: {
    paddingVertical: designTokens.spacing.lg,
    alignItems: 'center'
  },
  sectionHeader: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.xs,
    backgroundColor: designTokens.colors.backgroundLight
  },
  sectionHeaderText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textLight,
    fontWeight: '600',
    letterSpacing: 0.5
  }
}); 