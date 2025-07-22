import { NotificationSettings } from '@/components/NotificationSettings';
import { useAuth } from '@/contexts/AuthContext';
import { notificationPreferencesService } from '@/services/notificationPreferencesService';
import { UserNotificationPreferences } from '@/types/notifications';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet } from 'react-native';

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserNotificationPreferences>({
    social: { push_enabled: true, in_app_enabled: true, email_enabled: false, frequency: 'immediate' },
    achievements: { push_enabled: true, in_app_enabled: true, email_enabled: false, frequency: 'immediate' },
    restaurants: { push_enabled: true, in_app_enabled: true, email_enabled: false, frequency: 'immediate' },
    boards: { push_enabled: true, in_app_enabled: true, email_enabled: false, frequency: 'immediate' },
    system: { push_enabled: true, in_app_enabled: true, email_enabled: false, frequency: 'immediate' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const userPreferences = await notificationPreferencesService.getUserPreferences(user!.id);
      setPreferences(userPreferences);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesChange = (newPreferences: Partial<UserNotificationPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...newPreferences
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);
      await notificationPreferencesService.updatePreferences(user.id, preferences);
      Alert.alert('Success', 'Notification preferences saved successfully');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      Alert.alert('Error', 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <NotificationSettings
          preferences={preferences}
          onPreferencesChange={handlePreferencesChange}
          onSave={handleSave}
          loading={true}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NotificationSettings
        preferences={preferences}
        onPreferencesChange={handlePreferencesChange}
        onSave={handleSave}
        loading={saving}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  }
}); 