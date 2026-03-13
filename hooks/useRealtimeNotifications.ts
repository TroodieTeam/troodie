import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/types/notifications';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef } from 'react';

interface UseRealtimeNotificationsProps {
  onNotificationReceived?: (notification: Notification) => void;
  onNotificationUpdated?: (notification: Notification) => void;
  onNotificationDeleted?: (notificationId: string) => void;
  onUnreadCountChanged?: (count: number) => void;
}

export const useRealtimeNotifications = ({
  onNotificationReceived,
  onNotificationUpdated,
  onNotificationDeleted,
  onUnreadCountChanged
}: UseRealtimeNotificationsProps = {}) => {
  const { user } = useAuth();
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  // Store callbacks in refs to prevent subscription churn
  const onReceivedRef = useRef(onNotificationReceived);
  onReceivedRef.current = onNotificationReceived;

  const onUpdatedRef = useRef(onNotificationUpdated);
  onUpdatedRef.current = onNotificationUpdated;

  const onDeletedRef = useRef(onNotificationDeleted);
  onDeletedRef.current = onNotificationDeleted;

  const onUnreadCountRef = useRef(onUnreadCountChanged);
  onUnreadCountRef.current = onUnreadCountChanged;

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to notifications for the current user
    subscriptionRef.current = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT': {
              const newNotification = payload.new as Notification;
              onReceivedRef.current?.(newNotification);
              break;
            }
            case 'UPDATE': {
              const updatedNotification = payload.new as Notification;
              onUpdatedRef.current?.(updatedNotification);
              break;
            }
            case 'DELETE': {
              const deletedNotificationId = payload.old?.id;
              if (deletedNotificationId) {
                onDeletedRef.current?.(deletedNotificationId);
              }
              break;
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user?.id]);

  // Function to manually trigger unread count update
  const updateUnreadCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .rpc('get_unread_notification_count', { user_uuid: user.id });

      if (error) {
        console.error('Error getting unread count:', error);
        return;
      }

      onUnreadCountRef.current?.(data || 0);
    } catch (error) {
      console.error('Error updating unread count:', error);
    }
  }, [user?.id]);

  return {
    updateUnreadCount
  };
};