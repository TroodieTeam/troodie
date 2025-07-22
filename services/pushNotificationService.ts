import { supabase } from '@/lib/supabase';
import { Platform, PushNotification, PushNotificationServiceInterface } from '@/types/notifications';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class PushNotificationService implements PushNotificationServiceInterface {
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  
  /**
   * Initialize push notifications
   */
  async initialize(): Promise<void> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        console.log('Push token:', token);
      }

      // Set up notification listeners
      this.setupNotificationListeners();
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  /**
   * Get the current push token
   */
  async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return null;
      }

      // EAS automatically handles the project ID
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID || undefined, // EAS will auto-detect
      });

      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register device with push token
   */
  async registerDevice(userId: string, token: string, platform: Platform): Promise<void> {
    try {
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token,
          platform,
          device_id: await this.getDeviceId(),
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform,device_id'
        });

      if (error) {
        console.error('Error registering device:', error);
        throw new Error(`Failed to register device: ${error.message}`);
      }
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  /**
   * Unregister device
   */
  async unregisterDevice(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('token', token);

      if (error) {
        console.error('Error unregistering device:', error);
        throw new Error(`Failed to unregister device: ${error.message}`);
      }
    } catch (error) {
      console.error('Error unregistering device:', error);
      throw error;
    }
  }

  /**
   * Send push notification to a specific token
   */
  async sendPushNotification(token: string, notification: PushNotification): Promise<void> {
    try {
      const message = {
        to: token,
        sound: notification.sound || 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        badge: notification.badge,
        category: notification.category,
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Send bulk push notifications
   */
  async sendBulkPushNotifications(tokens: string[], notification: PushNotification): Promise<void> {
    try {
      const messages = tokens.map(token => ({
        to: token,
        sound: notification.sound || 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        badge: notification.badge,
        category: notification.category,
      }));

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
    } catch (error) {
      console.error('Error sending bulk push notifications:', error);
      throw error;
    }
  }

  /**
   * Handle notification received while app is in foreground
   */
  async handleNotificationReceived(notification: Notifications.Notification): Promise<void> {
    console.log('Notification received:', notification);
    
    // You can add custom logic here, such as:
    // - Updating local state
    // - Playing custom sounds
    // - Showing custom UI
    // - Triggering analytics events
  }

  /**
   * Handle notification opened (user tapped notification)
   */
  async handleNotificationOpened(response: Notifications.NotificationResponse): Promise<void> {
    const data = response.notification.request.content.data;
    console.log('Notification opened:', data);
    
    // You can add navigation logic here based on the notification data
    // For example, navigate to a specific screen based on notification type
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<Notifications.PermissionStatus> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      throw error;
    }
  }

  /**
   * Get current permission status
   */
  async getPermissionsStatus(): Promise<Notifications.PermissionStatus> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error getting permission status:', error);
      throw error;
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Clear badge count
   */
  async clearBadgeCount(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge count:', error);
    }
  }

  /**
   * Get device ID
   */
  private async getDeviceId(): Promise<string | null> {
    try {
      if (Device.isDevice) {
        return Device.osInternalBuildId || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return null;
    }
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners(): void {
    // Handle notifications received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Handle notification responses (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationOpened.bind(this)
    );

    // Store listeners for cleanup (you might want to add a cleanup method)
    this.notificationListener = notificationListener;
    this.responseListener = responseListener;
  }
}

export const pushNotificationService = new PushNotificationService(); 