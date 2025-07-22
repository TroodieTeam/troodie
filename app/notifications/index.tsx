import { NotificationItem } from '@/components/NotificationItem';
import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/notificationService';
import { Notification } from '@/types/notifications';
import { useRouter } from 'expo-router';
import { Bell, Check } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
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

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const userNotifications = await notificationService.getUserNotifications(user!.id, 50);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
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
    await loadNotifications();
    setRefreshing(false);
  };

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
      switch (notification.type) {
        case 'like':
        case 'comment':
          if (notification.data && typeof notification.data === 'object' && 'postId' in notification.data) {
            // Navigate to explore for now since posts don't exist yet
            router.push('/explore');
          }
          break;
        case 'follow':
          if (notification.data && typeof notification.data === 'object' && 'followerId' in notification.data) {
            // Navigate to profile for now
            router.push('/profile');
          }
          break;
        case 'achievement':
          router.push('/profile?tab=achievements');
          break;
        case 'restaurant_recommendation':
          if (notification.data && typeof notification.data === 'object' && 'restaurantId' in notification.data) {
            router.push(`/restaurant/${notification.data.restaurantId}`);
          }
          break;
        case 'board_invite':
          if (notification.data && typeof notification.data === 'object' && 'boardId' in notification.data) {
            router.push(`/boards/${notification.data.boardId}`);
          }
          break;
        default:
          // Stay on notifications screen for other types
          break;
      }
    } catch (error) {
      console.error('Error handling notification:', error);
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
    <View style={styles.header}>
      <Text style={styles.title}>Notifications</Text>
      {notifications.some(n => !n.is_read) && (
        <TouchableOpacity 
          style={styles.markAllReadButton}
          onPress={handleMarkAllAsRead}
          disabled={markingAllRead}
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
    <View style={styles.emptyState}>
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
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark
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
  }
}); 