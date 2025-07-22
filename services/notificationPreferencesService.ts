import { supabase } from '@/lib/supabase';
import {
    NotificationCategory,
    NotificationFrequency,
    NotificationPreferencesInsert,
    NotificationPreferencesServiceInterface,
    NotificationPreferencesUpdate,
    Platform,
    UserNotificationPreferences
} from '@/types/notifications';

export class NotificationPreferencesService implements NotificationPreferencesServiceInterface {
  
  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching notification preferences:', error);
      throw new Error(`Failed to fetch notification preferences: ${error.message}`);
    }

    // Convert database format to UserNotificationPreferences format
    const preferencesMap = new Map(preferences?.map(p => [p.category, p]) || []);
    
    return {
      social: {
        push_enabled: preferencesMap.get('social')?.push_enabled ?? true,
        in_app_enabled: preferencesMap.get('social')?.in_app_enabled ?? true,
        email_enabled: preferencesMap.get('social')?.email_enabled ?? false,
        frequency: (preferencesMap.get('social')?.frequency as NotificationFrequency) ?? 'immediate'
      },
      achievements: {
        push_enabled: preferencesMap.get('achievements')?.push_enabled ?? true,
        in_app_enabled: preferencesMap.get('achievements')?.in_app_enabled ?? true,
        email_enabled: preferencesMap.get('achievements')?.email_enabled ?? false,
        frequency: (preferencesMap.get('achievements')?.frequency as NotificationFrequency) ?? 'immediate'
      },
      restaurants: {
        push_enabled: preferencesMap.get('restaurants')?.push_enabled ?? true,
        in_app_enabled: preferencesMap.get('restaurants')?.in_app_enabled ?? true,
        email_enabled: preferencesMap.get('restaurants')?.email_enabled ?? false,
        frequency: (preferencesMap.get('restaurants')?.frequency as NotificationFrequency) ?? 'immediate'
      },
      boards: {
        push_enabled: preferencesMap.get('boards')?.push_enabled ?? true,
        in_app_enabled: preferencesMap.get('boards')?.in_app_enabled ?? true,
        email_enabled: preferencesMap.get('boards')?.email_enabled ?? false,
        frequency: (preferencesMap.get('boards')?.frequency as NotificationFrequency) ?? 'immediate'
      },
      system: {
        push_enabled: preferencesMap.get('system')?.push_enabled ?? true,
        in_app_enabled: preferencesMap.get('system')?.in_app_enabled ?? true,
        email_enabled: preferencesMap.get('system')?.email_enabled ?? false,
        frequency: (preferencesMap.get('system')?.frequency as NotificationFrequency) ?? 'immediate'
      }
    };
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId: string, preferences: Partial<UserNotificationPreferences>): Promise<void> {
    const updates: NotificationPreferencesUpdate[] = [];

    // Convert UserNotificationPreferences format to database format
    Object.entries(preferences).forEach(([category, settings]) => {
      if (settings) {
        updates.push({
          user_id: userId,
          category,
          push_enabled: settings.push_enabled,
          in_app_enabled: settings.in_app_enabled,
          email_enabled: settings.email_enabled,
          frequency: settings.frequency,
          updated_at: new Date().toISOString()
        });
      }
    });

    if (updates.length === 0) {
      return;
    }

    // Update each category
    for (const update of updates) {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(update, { onConflict: 'user_id,category' });

      if (error) {
        console.error('Error updating notification preferences:', error);
        throw new Error(`Failed to update notification preferences: ${error.message}`);
      }
    }
  }

  /**
   * Check if notifications are enabled for a specific category
   */
  async isNotificationEnabled(userId: string, category: NotificationCategory): Promise<boolean> {
    const { data: preference, error } = await supabase
      .from('notification_preferences')
      .select('in_app_enabled')
      .eq('user_id', userId)
      .eq('category', category)
      .single();

    if (error) {
      console.error('Error checking notification preference:', error);
      // Default to enabled if there's an error
      return true;
    }

    return preference?.in_app_enabled ?? true;
  }

  /**
   * Get notification frequency for a specific category
   */
  async getNotificationFrequency(userId: string, category: NotificationCategory): Promise<NotificationFrequency> {
    const { data: preference, error } = await supabase
      .from('notification_preferences')
      .select('frequency')
      .eq('user_id', userId)
      .eq('category', category)
      .single();

    if (error) {
      console.error('Error getting notification frequency:', error);
      // Default to immediate if there's an error
      return 'immediate';
    }

    return (preference?.frequency as NotificationFrequency) ?? 'immediate';
  }

  /**
   * Update push token for a user
   */
  async updatePushToken(userId: string, token: string, platform: Platform): Promise<void> {
    const deviceId = await this.getDeviceId();
    
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token,
        platform,
        device_id: deviceId,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,platform,device_id' });

    if (error) {
      console.error('Error updating push token:', error);
      throw new Error(`Failed to update push token: ${error.message}`);
    }
  }

  /**
   * Remove push token for a user
   */
  async removePushToken(userId: string, token: string): Promise<void> {
    const { error } = await supabase
      .from('push_tokens')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('token', token);

    if (error) {
      console.error('Error removing push token:', error);
      throw new Error(`Failed to remove push token: ${error.message}`);
    }
  }

  /**
   * Get all active push tokens for a user
   */
  async getUserPushTokens(userId: string): Promise<{ token: string; platform: Platform }[]> {
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching push tokens:', error);
      throw new Error(`Failed to fetch push tokens: ${error.message}`);
    }

    return tokens || [];
  }

  /**
   * Create default notification preferences for a new user
   */
  async createDefaultPreferences(userId: string): Promise<void> {
    const defaultPreferences: NotificationPreferencesInsert[] = [
      {
        user_id: userId,
        category: 'social',
        push_enabled: true,
        in_app_enabled: true,
        email_enabled: false,
        frequency: 'immediate'
      },
      {
        user_id: userId,
        category: 'achievements',
        push_enabled: true,
        in_app_enabled: true,
        email_enabled: false,
        frequency: 'immediate'
      },
      {
        user_id: userId,
        category: 'restaurants',
        push_enabled: true,
        in_app_enabled: true,
        email_enabled: false,
        frequency: 'immediate'
      },
      {
        user_id: userId,
        category: 'boards',
        push_enabled: true,
        in_app_enabled: true,
        email_enabled: false,
        frequency: 'immediate'
      },
      {
        user_id: userId,
        category: 'system',
        push_enabled: true,
        in_app_enabled: true,
        email_enabled: false,
        frequency: 'immediate'
      }
    ];

    const { error } = await supabase
      .from('notification_preferences')
      .insert(defaultPreferences);

    if (error) {
      console.error('Error creating default preferences:', error);
      throw new Error(`Failed to create default preferences: ${error.message}`);
    }
  }

  /**
   * Get device ID for push token management
   */
  private async getDeviceId(): Promise<string> {
    // In a real app, you'd get this from the device
    // For now, we'll generate a simple ID
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if push notifications are enabled for a category
   */
  async isPushEnabled(userId: string, category: NotificationCategory): Promise<boolean> {
    const { data: preference, error } = await supabase
      .from('notification_preferences')
      .select('push_enabled')
      .eq('user_id', userId)
      .eq('category', category)
      .single();

    if (error) {
      console.error('Error checking push preference:', error);
      // Default to enabled if there's an error
      return true;
    }

    return preference?.push_enabled ?? true;
  }

  /**
   * Check if email notifications are enabled for a category
   */
  async isEmailEnabled(userId: string, category: NotificationCategory): Promise<boolean> {
    const { data: preference, error } = await supabase
      .from('notification_preferences')
      .select('email_enabled')
      .eq('user_id', userId)
      .eq('category', category)
      .single();

    if (error) {
      console.error('Error checking email preference:', error);
      // Default to disabled if there's an error
      return false;
    }

    return preference?.email_enabled ?? false;
  }
}

// Export singleton instance
export const notificationPreferencesService = new NotificationPreferencesService(); 