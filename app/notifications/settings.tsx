import { NotificationSettings } from '@/components/NotificationSettings';
import { useAuth } from '@/contexts/AuthContext';
import { notificationPreferencesService } from '@/services/notificationPreferencesService';
import { UserNotificationPreferences } from '@/types/notifications';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const defaultPrefs = { push_enabled: true, in_app_enabled: true, email_enabled: false, frequency: 'immediate' as const };
  const [preferences, setPreferences] = useState<UserNotificationPreferences>({
    social: { ...defaultPrefs },
    achievements: { ...defaultPrefs },
    restaurants: { ...defaultPrefs },
    boards: { ...defaultPrefs },
    system: { ...defaultPrefs },
    campaigns: { ...defaultPrefs },
    engagement: { ...defaultPrefs }
  });
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const userPreferences = await notificationPreferencesService.getUserPreferences(user!.id);
      setPreferences(prev => ({ ...prev, ...userPreferences }));
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-save with debounce
  const handlePreferencesChange = useCallback((newPreferences: Partial<UserNotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!user?.id) return;
      try {
        await notificationPreferencesService.updatePreferences(user.id, newPreferences as UserNotificationPreferences);
      } catch (error) {
        console.error('Error saving notification preferences:', error);
      }
    }, 500);
  }, [user?.id]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header} testID="notification-settings-header">
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="settings-back-button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <NotificationSettings
        preferences={preferences}
        onPreferencesChange={handlePreferencesChange}
        onSave={() => {}}
        loading={loading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  headerSpacer: {
    width: 44,
  },
});
