import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ToastService } from '@/services/toastService';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, Lock, Shield, UserCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface PrivacySetting {
  key: string;
  title: string;
  description: string;
  icon: any;
  value: boolean;
}

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<PrivacySetting[]>([
    {
      key: 'profile_private',
      title: 'Private Profile',
      description: 'Only approved followers can see your posts and boards',
      icon: Lock,
      value: false
    },
    {
      key: 'show_activity',
      title: 'Show Activity',
      description: 'Allow others to see your activity in the feed',
      icon: Eye,
      value: true
    },
    {
      key: 'discoverable',
      title: 'Discoverable',
      description: 'Allow others to find you through search',
      icon: UserCheck,
      value: true
    },
    {
      key: 'show_saved_restaurants',
      title: 'Show Saved Restaurants',
      description: 'Display your saved restaurants on your profile',
      icon: EyeOff,
      value: true
    }
  ]);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setSettings(prev => prev.map(setting => ({
          ...setting,
          value: data[setting.key] ?? setting.value
        })));
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const handleToggle = async (key: string, newValue: boolean) => {
    if (!user) return;

    setLoading(true);
    
    // Update local state immediately for better UX
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value: newValue } : setting
    ));

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          [key]: newValue,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      ToastService.showSuccess('Privacy settings updated');
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      ToastService.showError('Failed to update settings');
      
      // Revert on error
      setSettings(prev => prev.map(setting => 
        setting.key === key ? { ...setting, value: !newValue } : setting
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={designTokens.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={designTokens.colors.primaryOrange} />
            <Text style={styles.sectionTitle}>Privacy Controls</Text>
          </View>
          
          <Text style={styles.sectionDescription}>
            Control who can see your content and interact with you
          </Text>

          {settings.map((setting) => {
            const Icon = setting.icon;
            return (
              <View key={setting.key} style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Icon size={22} color={designTokens.colors.textMedium} />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>{setting.title}</Text>
                    <Text style={styles.settingDescription}>{setting.description}</Text>
                  </View>
                </View>
                <Switch
                  value={setting.value}
                  onValueChange={(value) => handleToggle(setting.key, value)}
                  trackColor={{ 
                    false: designTokens.colors.backgroundMedium, 
                    true: designTokens.colors.primaryOrange 
                  }}
                  disabled={loading}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Your Privacy</Text>
          <Text style={styles.infoText}>
            • Your email address is never shared publicly
          </Text>
          <Text style={styles.infoText}>
            • Blocked users cannot see your content or interact with you
          </Text>
          <Text style={styles.infoText}>
            • You can delete your account at any time from Account Settings
          </Text>
          <Text style={styles.infoText}>
            • We don't sell your personal data to third parties
          </Text>
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  backButton: {
    padding: designTokens.spacing.xs,
  },
  headerTitle: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
  headerSpacer: {
    width: 32,
  },
  section: {
    padding: designTokens.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.sm,
  },
  sectionTitle: {
    ...designTokens.typography.labelText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  sectionDescription: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: designTokens.spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    ...designTokens.typography.bodyRegular,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  settingDescription: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  infoSection: {
    padding: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.white,
    marginTop: designTokens.spacing.lg,
    marginHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xl,
    borderRadius: designTokens.borderRadius.medium,
  },
  infoTitle: {
    ...designTokens.typography.labelText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.md,
  },
  infoText: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.sm,
  },
});