import { NotificationItem } from '@/components/NotificationItem';
import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { notificationService } from '@/services/notificationService';
import { Notification } from '@/types/notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Check } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsTabScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const userNotifications = await notificationService.getUserNotifications(user.id, 50);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('[Notifications] Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id, loadNotifications]);

  // Refresh when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user?.id) {
        loadNotifications();
      }
    }, [isAuthenticated, user?.id, loadNotifications])
  );

  // Subscribe to realtime notifications
  useRealtimeNotifications({
    onNotificationReceived: useCallback((notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
    }, []),
    onNotificationUpdated: useCallback((notification: Notification) => {
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? notification : n)
      );
    }, []),
    onNotificationDeleted: useCallback((notificationId: string) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, []),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      await notificationService.markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );

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
            router.push('/creator/campaigns' as any);
          }
          break;
        case 'revision_requested':
          if (data && 'campaignId' in data) {
            router.push('/creator/campaigns' as any);
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
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      setMarkingAllRead(true);
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header} testID="notifications-header">
      <Text style={styles.title}>Notifications</Text>
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

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={handleNotificationPress}
      onSwipeDelete={handleDeleteNotification}
    />
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Bell size={48} color={designTokens.colors.textLight} />
          <Text style={styles.emptyTitle}>Sign in to see notifications</Text>
          <Text style={styles.emptySubtitle}>
            Get notified about likes, comments, and more
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
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
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[designTokens.colors.primaryOrange]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
  markAllReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.sm,
  },
  markAllReadText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.primaryOrange,
    marginLeft: designTokens.spacing.xs,
  },
  listContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xxxl,
  },
  loadingText: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    marginTop: designTokens.spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xxxl,
  },
  emptyTitle: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
    marginTop: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.sm,
  },
  emptySubtitle: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
});
