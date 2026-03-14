import { designTokens } from '@/constants/designTokens';
import {
    NotificationCategory,
    NotificationSettingsProps,
} from '@/types/notifications';
import {
    Bell,
    BellOff,
    Briefcase,
    Heart,
    MapPin,
    Newspaper,
    Settings,
    Users
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';

interface CategoryConfig {
  key: NotificationCategory;
  title: string;
  description: string;
  icon: any;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'social',
    title: 'Social',
    description: 'Likes, comments, follows & mentions',
    icon: Heart,
  },
  {
    key: 'campaigns',
    title: 'Campaigns',
    description: 'Applications, approvals & payments',
    icon: Briefcase,
  },
  {
    key: 'boards',
    title: 'Boards',
    description: 'Invites & collaboration activity',
    icon: Users,
  },
  {
    key: 'restaurants',
    title: 'Restaurants',
    description: 'Mentions & recommendations',
    icon: MapPin,
  },
  {
    key: 'engagement',
    title: 'Activity',
    description: 'Friend posts & weekly recaps',
    icon: Newspaper,
  },
  {
    key: 'system',
    title: 'System',
    description: 'App updates & announcements',
    icon: Settings,
  },
];

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  preferences,
  onPreferencesChange,
  loading = false
}) => {
  const [localPrefs, setLocalPrefs] = useState(preferences);

  const toggleCategory = useCallback((category: NotificationCategory) => {
    const current = localPrefs[category];
    const newEnabled = !current.push_enabled;
    const updated = {
      ...localPrefs,
      [category]: {
        ...current,
        push_enabled: newEnabled,
        in_app_enabled: newEnabled,
      }
    };
    setLocalPrefs(updated);
    onPreferencesChange(updated);
  }, [localPrefs, onPreferencesChange]);

  const allEnabled = Object.values(localPrefs).every(p => p.push_enabled);
  const allDisabled = Object.values(localPrefs).every(p => !p.push_enabled);

  const toggleAll = useCallback(() => {
    const newEnabled = !allEnabled;
    const updated = { ...localPrefs };
    for (const key of Object.keys(updated) as NotificationCategory[]) {
      updated[key] = { ...updated[key], push_enabled: newEnabled, in_app_enabled: newEnabled };
    }
    setLocalPrefs(updated);
    onPreferencesChange(updated);
  }, [allEnabled, localPrefs, onPreferencesChange]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Master toggle */}
      <View style={styles.masterSection} testID="settings-master-toggle">
        <View style={styles.masterRow}>
          <View style={styles.masterInfo}>
            {allDisabled ? (
              <BellOff size={22} color={designTokens.colors.textLight} />
            ) : (
              <Bell size={22} color={designTokens.colors.primaryOrange} />
            )}
            <View style={styles.masterText}>
              <Text style={styles.masterTitle}>Push Notifications</Text>
              <Text style={styles.masterDescription}>
                {allDisabled ? 'All notifications paused' : allEnabled ? 'All notifications active' : 'Some notifications active'}
              </Text>
            </View>
          </View>
          <Switch
            testID="settings-master-push-toggle"
            value={allEnabled}
            onValueChange={toggleAll}
            trackColor={{ false: '#E5E7EB', true: `${designTokens.colors.primaryOrange}50` }}
            thumbColor={allEnabled ? designTokens.colors.primaryOrange : '#FFFFFF'}
            ios_backgroundColor="#E5E7EB"
          />
        </View>
      </View>

      {/* Category toggles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BY CATEGORY</Text>
        <View style={styles.card}>
          {CATEGORIES.map((config, index) => {
            const prefs = localPrefs[config.key];
            const Icon = config.icon;
            const isLast = index === CATEGORIES.length - 1;

            return (
              <View
                key={config.key}
                style={[styles.categoryRow, !isLast && styles.categoryRowBorder]}
                testID={`settings-category-${config.key}`}
              >
                <View style={styles.categoryInfo}>
                  <View style={styles.iconWrapper}>
                    <Icon size={18} color={prefs.push_enabled ? designTokens.colors.textDark : designTokens.colors.textLight} />
                  </View>
                  <View style={styles.categoryText}>
                    <Text style={[styles.categoryTitle, !prefs.push_enabled && styles.categoryTitleDisabled]}>
                      {config.title}
                    </Text>
                    <Text style={styles.categoryDescription}>{config.description}</Text>
                  </View>
                </View>
                <Switch
                  testID={`settings-${config.key}-push-toggle`}
                  value={prefs.push_enabled}
                  onValueChange={() => toggleCategory(config.key)}
                  trackColor={{ false: '#E5E7EB', true: `${designTokens.colors.primaryOrange}50` }}
                  thumbColor={prefs.push_enabled ? designTokens.colors.primaryOrange : '#FFFFFF'}
                  ios_backgroundColor="#E5E7EB"
                />
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.footnote}>
        Changes are saved automatically. In-app notifications will still appear in your notification center.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  masterSection: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  masterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  masterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  masterText: {
    marginLeft: 12,
  },
  masterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  masterDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryText: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  categoryTitleDisabled: {
    color: '#8E8E93',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 1,
  },
  footnote: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 40,
    marginHorizontal: 32,
    lineHeight: 18,
  },
});
