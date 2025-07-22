import { designTokens } from '@/constants/designTokens';
import {
    NotificationCategory,
    NotificationFrequency,
    NotificationSettingsProps,
    UserNotificationPreferences
} from '@/types/notifications';
import {
    Bell,
    ChevronRight,
    Heart,
    MapPin,
    Settings,
    Trophy,
    Users
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface CategoryConfig {
  key: NotificationCategory;
  title: string;
  description: string;
  icon: any;
  color: string;
}

const categoryConfigs: CategoryConfig[] = [
  {
    key: 'social',
    title: 'Social',
    description: 'Likes, comments, follows, and mentions',
    icon: Heart,
    color: '#FF4444'
  },
  {
    key: 'achievements',
    title: 'Achievements',
    description: 'Badges, milestones, and rewards',
    icon: Trophy,
    color: '#F59E0B'
  },
  {
    key: 'restaurants',
    title: 'Restaurants',
    description: 'New spots, recommendations, and updates',
    icon: MapPin,
    color: '#8B5CF6'
  },
  {
    key: 'boards',
    title: 'Boards',
    description: 'Board invites, updates, and activity',
    icon: Users,
    color: '#06B6D4'
  },
  {
    key: 'system',
    title: 'System',
    description: 'App updates, maintenance, and announcements',
    icon: Settings,
    color: '#6B7280'
  }
];

const frequencyOptions: { value: NotificationFrequency; label: string }[] = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' }
];

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ 
  preferences, 
  onPreferencesChange, 
  onSave, 
  loading = false 
}) => {
  const [localPreferences, setLocalPreferences] = useState<UserNotificationPreferences>(preferences);
  const [expandedCategory, setExpandedCategory] = useState<NotificationCategory | null>(null);

  const updateCategoryPreference = (
    category: NotificationCategory,
    field: keyof UserNotificationPreferences[NotificationCategory],
    value: boolean | NotificationFrequency
  ) => {
    const updatedPreferences = {
      ...localPreferences,
      [category]: {
        ...localPreferences[category],
        [field]: value
      }
    };
    setLocalPreferences(updatedPreferences);
    onPreferencesChange(updatedPreferences);
  };

  const handleSave = () => {
    onSave();
  };

  const renderCategoryItem = (config: CategoryConfig) => {
    const categoryPrefs = localPreferences[config.key];
    const Icon = config.icon;
    const isExpanded = expandedCategory === config.key;

    return (
      <View key={config.key} style={styles.categoryContainer}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => setExpandedCategory(isExpanded ? null : config.key)}
          activeOpacity={0.7}
        >
          <View style={styles.categoryInfo}>
            <View style={[styles.categoryIcon, { backgroundColor: `${config.color}20` }]}>
              <Icon size={20} color={config.color} />
            </View>
            <View style={styles.categoryText}>
              <Text style={styles.categoryTitle}>{config.title}</Text>
              <Text style={styles.categoryDescription}>{config.description}</Text>
            </View>
          </View>
          <View style={styles.categoryActions}>
            <Switch
              value={categoryPrefs.in_app_enabled}
              onValueChange={(value) => 
                updateCategoryPreference(config.key, 'in_app_enabled', value)
              }
              trackColor={{ false: designTokens.colors.borderLight, true: `${config.color}40` }}
              thumbColor={categoryPrefs.in_app_enabled ? config.color : designTokens.colors.textLight}
            />
            <ChevronRight 
              size={16} 
              color={designTokens.colors.textLight}
              style={[styles.expandIcon, isExpanded && styles.expandIconRotated]}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Push notifications</Text>
              <Switch
                value={categoryPrefs.push_enabled}
                onValueChange={(value) => 
                  updateCategoryPreference(config.key, 'push_enabled', value)
                }
                trackColor={{ false: designTokens.colors.borderLight, true: `${config.color}40` }}
                thumbColor={categoryPrefs.push_enabled ? config.color : designTokens.colors.textLight}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Email notifications</Text>
              <Switch
                value={categoryPrefs.email_enabled}
                onValueChange={(value) => 
                  updateCategoryPreference(config.key, 'email_enabled', value)
                }
                trackColor={{ false: designTokens.colors.borderLight, true: `${config.color}40` }}
                thumbColor={categoryPrefs.email_enabled ? config.color : designTokens.colors.textLight}
              />
            </View>

            <View style={styles.frequencyContainer}>
              <Text style={styles.settingLabel}>Frequency</Text>
              <View style={styles.frequencyOptions}>
                {frequencyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyOption,
                      categoryPrefs.frequency === option.value && styles.frequencyOptionSelected
                    ]}
                    onPress={() => 
                      updateCategoryPreference(config.key, 'frequency', option.value)
                    }
                  >
                    <Text style={[
                      styles.frequencyOptionText,
                      categoryPrefs.frequency === option.value && styles.frequencyOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Bell size={24} color={designTokens.colors.primaryOrange} />
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <Text style={styles.headerDescription}>
          Choose what notifications you want to receive and how often
        </Text>
      </View>

      <View style={styles.categoriesContainer}>
        {categoryConfigs.map(renderCategoryItem)}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={designTokens.colors.white} />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight
  },
  header: {
    alignItems: 'center',
    padding: designTokens.spacing.xxxl,
    backgroundColor: designTokens.colors.white,
    marginBottom: designTokens.spacing.lg
  },
  headerTitle: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
    marginTop: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm
  },
  headerDescription: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    lineHeight: 20
  },
  categoriesContainer: {
    backgroundColor: designTokens.colors.white,
    marginBottom: designTokens.spacing.xxxl
  },
  categoryContainer: {
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: designTokens.spacing.lg
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.md
  },
  categoryText: {
    flex: 1
  },
  categoryTitle: {
    ...designTokens.typography.bodyMedium,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.xs
  },
  categoryDescription: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  expandIcon: {
    marginLeft: designTokens.spacing.sm
  },
  expandIconRotated: {
    transform: [{ rotate: '90deg' }]
  },
  expandedContent: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.backgroundLight
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.md
  },
  settingLabel: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textDark
  },
  frequencyContainer: {
    marginTop: designTokens.spacing.md
  },
  frequencyOptions: {
    flexDirection: 'row',
    marginTop: designTokens.spacing.sm
  },
  frequencyOption: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    marginRight: designTokens.spacing.sm
  },
  frequencyOptionSelected: {
    backgroundColor: designTokens.colors.primaryOrange,
    borderColor: designTokens.colors.primaryOrange
  },
  frequencyOptionText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium
  },
  frequencyOptionTextSelected: {
    color: designTokens.colors.white,
    fontWeight: '600' as const
  },
  saveButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingVertical: designTokens.spacing.lg,
    paddingHorizontal: designTokens.spacing.xxxl,
    borderRadius: designTokens.borderRadius.md,
    marginHorizontal: designTokens.spacing.lg,
    alignItems: 'center',
    ...designTokens.shadows.button
  },
  saveButtonDisabled: {
    opacity: 0.6
  },
  saveButtonText: {
    ...designTokens.typography.bodyMedium,
    color: designTokens.colors.white,
    fontWeight: '600' as const
  }
}); 