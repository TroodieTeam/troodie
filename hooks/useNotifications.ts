import { useAuth } from '@/contexts/AuthContext';
import { notificationPreferencesService } from '@/services/notificationPreferencesService';
import { notificationService } from '@/services/notificationService';
import {
    Notification,
    NotificationCategory,
    UserNotificationPreferences
} from '@/types/notifications';
import { useCallback, useEffect, useState } from 'react';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<UserNotificationPreferences>({
    social: { push_enabled: true, in_app_enabled: true, email_enabled: false, frequency: 'immediate' },
    achievements: { push_enabled: true, in_app_enabled: true, email_enabled: false, frequency: 'immediate' },
    restaurants: { push_enabled: true, in_app_enabled: true, email_enabled: false, frequency: 'immediate' },
    boards: { push_enabled: true, in_app_enabled: true, email_enabled: false, frequency: 'immediate' },
    system: { push_enabled: true, in_app_enabled: true, email_enabled: false, frequency: 'immediate' }
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async (limit: number = 50) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const userNotifications = await notificationService.getUserNotifications(user.id, limit);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, [user?.id]);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!user?.id) return;

    try {
      const userPreferences = await notificationPreferencesService.getUserPreferences(user.id);
      setPreferences(userPreferences);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, [user?.id]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      
      // Update unread count
      await loadUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [loadUnreadCount]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      await notificationService.markAllAsRead(user.id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      // Update unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user?.id]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
      
      // Update unread count if needed
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<UserNotificationPreferences>) => {
    if (!user?.id) return;

    try {
      await notificationPreferencesService.updatePreferences(user.id, newPreferences);
      setPreferences(prev => ({
        ...prev,
        ...newPreferences
      }));
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }, [user?.id]);

  // Check if notifications are enabled for a category
  const isNotificationEnabled = useCallback(async (category: NotificationCategory): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      return await notificationPreferencesService.isNotificationEnabled(user.id, category);
    } catch (error) {
      console.error('Error checking notification preference:', error);
      return true; // Default to enabled
    }
  }, [user?.id]);

  // Refresh notifications
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadNotifications(),
      loadUnreadCount()
    ]);
    setRefreshing(false);
  }, [loadNotifications, loadUnreadCount]);

  // Initialize
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      loadUnreadCount();
      loadPreferences();
    }
  }, [user?.id, loadNotifications, loadUnreadCount, loadPreferences]);

  return {
    notifications,
    unreadCount,
    preferences,
    loading,
    refreshing,
    loadNotifications,
    loadUnreadCount,
    loadPreferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    isNotificationEnabled,
    refresh
  };
}; 