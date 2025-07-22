import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/types/notifications';
import { useEffect, useRef } from 'react';

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
  const subscriptionRef = useRef<any>(null);

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
          console.log('Notification change:', payload);

          switch (payload.eventType) {
            case 'INSERT':
              const newNotification = payload.new as Notification;
              onNotificationReceived?.(newNotification);
              break;
            
            case 'UPDATE':
              const updatedNotification = payload.new as Notification;
              onNotificationUpdated?.(updatedNotification);
              break;
            
            case 'DELETE':
              const deletedNotificationId = payload.old?.id;
              if (deletedNotificationId) {
                onNotificationDeleted?.(deletedNotificationId);
              }
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('Notification subscription status:', status);
      });

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user?.id, onNotificationReceived, onNotificationUpdated, onNotificationDeleted]);

  // Function to manually trigger unread count update
  const updateUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .rpc('get_unread_notification_count', { user_uuid: user.id });

      if (error) {
        console.error('Error getting unread count:', error);
        return;
      }

      onUnreadCountChanged?.(data || 0);
    } catch (error) {
      console.error('Error updating unread count:', error);
    }
  };

  return {
    updateUnreadCount
  };
};