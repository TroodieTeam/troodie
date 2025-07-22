import { useAuth } from '@/contexts/AuthContext';
import { pushNotificationService } from '@/services/pushNotificationService';
import { Platform } from '@/types/notifications';
import { useCallback, useEffect, useState } from 'react';
import { Platform as RNPlatform } from 'react-native';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [pushToken, setPushToken] = useState<string | null>(null);

  const initializePushNotifications = useCallback(async () => {
    try {
      // Initialize the push notification service
      await pushNotificationService.initialize();
      
      // Get permission status
      const status = await pushNotificationService.getPermissionsStatus();
      setPermissionStatus(status);
      
      // Get push token
      const token = await pushNotificationService.getPushToken();
      setPushToken(token);
      
      // Register device if we have a user and token
      if (user?.id && token) {
        const platform = (RNPlatform.OS === 'ios' ? 'ios' : 'android') as Platform;
        await pushNotificationService.registerDevice(user.id, token, platform);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    initializePushNotifications();
  }, [initializePushNotifications]);

  const requestPermissions = async () => {
    try {
      const status = await pushNotificationService.requestPermissions();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        // Re-initialize to get the push token
        await initializePushNotifications();
      }
      
      return status;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      throw error;
    }
  };

  const setBadgeCount = async (count: number) => {
    try {
      await pushNotificationService.setBadgeCount(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  };

  const clearBadgeCount = async () => {
    try {
      await pushNotificationService.clearBadgeCount();
    } catch (error) {
      console.error('Error clearing badge count:', error);
    }
  };

  return {
    isInitialized,
    permissionStatus,
    pushToken,
    requestPermissions,
    setBadgeCount,
    clearBadgeCount,
  };
}; 