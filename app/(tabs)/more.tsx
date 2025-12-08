/**
 * MORE SCREEN - V1.0 Design with Account Type Integration
 * Houses secondary features and settings in an organized menu with Creator Marketplace support
 */

import { DS } from '@/components/design-system/tokens';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { personas } from '@/data/personas';
import { useAccountType } from '@/hooks/useAccountType';
import { useCreatorProfileId } from '@/hooks/useCreatorProfileId';
import { profileService } from '@/services/profileService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { PersonaType } from '@/types/onboarding';
import { getAvatarUrlWithFallback } from '@/utils/avatarUtils';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  Activity,
  BarChart3,
  Bell,
  Building,
  ChevronRight,
  Compass,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Megaphone,
  Settings,
  Star,
  Store,
  Target,
  TrendingUp
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: any;
  iconColor?: string;
  action: () => void;
  showBadge?: boolean;
  badgeCount?: number | string;
  badgeText?: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  betaFeature?: boolean;
}

interface MenuSection {
  id: string;
  title: string;
  visible: boolean;
  items: MenuItem[];
  priority: number;
}

export default function MoreScreen() {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const {
    accountType,
    isCreator,
    isBusiness,
    businessProfile
  } = useAccountType();
  const { profileId: creatorProfileId } = useCreatorProfileId();

  // Check if user is admin - using specific admin user IDs
  const ADMIN_USER_IDS = [
    'b08d9600-358d-4be9-9552-4607d9f50227',
    '31744191-f7c0-44a4-8673-10b34ccbb87f',
    'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599' // kouame@troodieapp.com
  ];
  const isAdmin = user?.id && ADMIN_USER_IDS.includes(user.id);
  
  // Debug logging for admin access
  React.useEffect(() => {
    if (user?.id) {
      console.log('[MoreScreen] Admin check:', {
        user_id: user.id,
        isAdmin,
        admin_user_ids: ADMIN_USER_IDS,
        matches: ADMIN_USER_IDS.includes(user.id),
      });
    }
  }, [user?.id, isAdmin]);

  const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);
  const [checkingNotifications, setCheckingNotifications] = React.useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile from users table
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        const profile = await profileService.getProfile(user.id);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    fetchProfile();
  }, [user?.id]);

  // Check notification permission status on mount
  React.useEffect(() => {
    const checkNotificationStatus = async () => {
      try {
        const status = await pushNotificationService.getPermissionsStatus();
        setNotificationsEnabled(status === 'granted');
      } catch (error) {
        console.error('Error checking notification status:', error);
      } finally {
        setCheckingNotifications(false);
      }
    };

    checkNotificationStatus();
  }, []);

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      // Request permission when enabling
      try {
        const status = await pushNotificationService.requestPermissions();

        if (status === 'granted') {
          setNotificationsEnabled(true);
          // Initialize notifications after permission granted
          await pushNotificationService.initialize();

          // Register device if user is logged in
          if (user?.id) {
            const token = await pushNotificationService.getPushToken();
            if (token) {
              const platform = Platform.OS === 'ios' ? 'ios' : 'android';
              await pushNotificationService.registerDevice(user.id, token, platform as any);
            }
          }

          Alert.alert('Notifications Enabled', 'You will now receive notifications from Troodie');
        } else {
          setNotificationsEnabled(false);
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive updates from Troodie',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
      } catch (error) {
        console.error('Error requesting notification permissions:', error);
        setNotificationsEnabled(false);
      }
    } else {
      // Disable notifications
      setNotificationsEnabled(false);
      Alert.alert(
        'Notifications Disabled',
        'You can re-enable notifications anytime from settings'
      );
    }
  };

  const handlePrivacyPolicy = async () => {
    const url = 'https://www.troodieapp.com/privacy-policy';
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open Privacy Policy link');
      }
    } catch (error) {
      console.error('Error opening privacy policy:', error);
      Alert.alert('Error', 'Failed to open Privacy Policy');
    }
  };

  const handleTermsOfService = async () => {
    const url = 'https://www.troodieapp.com/terms-of-service';
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open Terms of Service link');
      }
    } catch (error) {
      console.error('Error opening terms of service:', error);
      Alert.alert('Error', 'Failed to open Terms of Service');
    }
  };

  const handleHelpSupport = async () => {
    // Gather device information for support
    const appVersion = Constants.expoConfig?.version || '1.0.0';
    const platform = Platform.OS;
    const osVersion = Platform.Version as string | number;

    const bodyPlain = [
      'Hi Troodie Team,',
      '',
      'I need help with:',
      '',
      '[Please describe your issue here]',
      '',
      '----',
      `App Version: ${appVersion}`,
      `Platform: ${platform}`,
      `OS Version: ${osVersion}`,
      `User: ${user?.user_metadata?.username || user?.user_metadata?.name || user?.email || 'Not logged in'}`,
    ].join('\n');

    const subject = 'Help & Support Request';
    const mailtoUrl = `mailto:team@troodieapp.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyPlain)}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert('Contact Support', 'Please email us at: team@troodieapp.com');
      }
    } catch (error) {
      console.error('Error opening email client:', error);
      Alert.alert('Contact Support', 'Please email us at: team@troodieapp.com');
    }
  };

  const handleSignOut = async () => {
    console.log('[More] handleSignOut called')
    console.log('[More] Current user before signOut:', user?.email)

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            console.log('[More] User confirmed sign out, calling signOut()...')
            await signOut();
            console.log('[More] signOut() completed, setting timeout for navigation...')
            // Small delay to ensure auth state is cleared before navigation
            setTimeout(() => {
              console.log('[More] Navigating to splash screen...')
              router.replace('/onboarding/splash');
            }, 100);
          }
        }
      ]
    );
  };

  // Admin Tools Section
  const adminItems: MenuItem[] = isAdmin ? [
    {
      id: 'admin-reviews',
      title: 'Review Queue',
      subtitle: 'Review pending restaurant claims and creator applications',
      icon: BarChart3,
      iconColor: '#FF6B6B',
      action: () => {
        console.log('[MoreScreen] Navigating to admin reviews');
        router.push('/admin/reviews');
      },
    },
  ] : [];

  // Creator Tools Section
  const creatorItems: MenuItem[] = isCreator ? [
    {
      id: 'creator-profile',
      title: 'Creator Profile',
      subtitle: creatorProfileId ? 'View and edit your profile' : 'Complete your creator profile',
      icon: Settings,
      iconColor: '#6366F1',
      action: () => {
        if (creatorProfileId) {
          // Navigate to view profile, user can edit from there
          router.push(`/creator/${creatorProfileId}`);
        } else {
          // No profile yet, go to edit/create
          router.push('/creator/profile/edit');
        }
      },
    },
    {
      id: 'explore-campaigns',
      title: 'Explore Campaigns',
      subtitle: 'Discover new brand collaborations',
      icon: Compass,
      iconColor: '#F59E0B',
      action: () => router.push('/creator/explore-campaigns'),
    },
    {
      id: 'my-campaigns',
      title: 'My Campaigns',
      subtitle: 'Manage your active campaigns',
      icon: Target,
      iconColor: '#8B5CF6',
      action: () => router.push('/creator/campaigns'),
    },
  ] : [];

  // Business Tools Section
  const businessItems: MenuItem[] = isBusiness ? [
    {
      id: 'business-dashboard',
      title: 'Business Dashboard',
      subtitle: businessProfile?.restaurant_name
        ? `Managing ${businessProfile.restaurant_name}`
        : 'Restaurant overview',
      icon: Store,
      iconColor: '#DC2626',
      action: () => router.push('/business/dashboard'),
    },
    {
      id: 'manage-campaigns',
      title: 'Manage Campaigns',
      subtitle: 'Create and manage marketing campaigns',
      icon: Megaphone,
      iconColor: '#7C3AED',
      action: () => router.push('/business/campaigns'),
      // showBadge: newApplications > 0,
      // badgeCount: newApplications,
    },
    {
      id: 'discover-creators',
      title: 'Discover Creators',
      subtitle: 'Browse and find creators for campaigns',
      icon: Compass,
      iconColor: '#6366F1',
      action: () => router.push('/business/creators/browse'),
    },
    {
      id: 'campaign-analytics',
      title: 'Campaign Analytics',
      subtitle: 'Track campaign performance & ROI',
      icon: BarChart3,
      iconColor: '#059669',
      action: () => router.push('/business/analytics'),
    },
    ...(businessProfile?.restaurant_id ? [{
      id: 'restaurant-analytics',
      title: 'Restaurant Analytics',
      subtitle: 'Saves, mentions & engagement metrics',
      icon: TrendingUp,
      iconColor: '#F59E0B',
      action: () => router.push(`/restaurant/${businessProfile.restaurant_id}/analytics`),
    }] : []),
    {
      id: 'restaurant-settings',
      title: 'Restaurant Settings',
      subtitle: 'Manage restaurant information',
      icon: Settings,
      iconColor: '#64748B',
      action: () => router.push('/business/settings'),
    }
  ] : [];

  // Growth Opportunities Section
  const growthItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];

    if (!isCreator) {
      items.push({
        id: 'become-creator',
        title: 'Become a Creator',
        subtitle: 'Earn money sharing your food discoveries',
        icon: Star,
        iconColor: '#F59E0B',
        action: () => router.push('/creator/onboarding'),
      });
    }

    if (!isBusiness) {
      items.push({
        id: 'claim-restaurant',
        title: 'Claim Your Restaurant',
        subtitle: 'Access business tools and analytics',
        icon: Building,
        iconColor: '#DC2626',
        action: () => router.push('/business/claim'),
      });
    }

    return items;
  }, [isCreator, isBusiness, router]);

  // Discover & Social Section
  const discoverItems: MenuItem[] = [
    {
      id: 'activity',
      title: 'Activity',
      subtitle: 'See what your friends are up to',
      icon: Activity,
      iconColor: DS.colors.primaryOrange,
      action: () => router.push('/(tabs)/activity'),
    },
  ];

  // Account & Settings Section
  const accountItems: MenuItem[] = [
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Push notification preferences',
      icon: Bell,
      iconColor: '#FFB800',
      action: () => handleNotificationToggle(!notificationsEnabled),
      hasToggle: true,
      toggleValue: notificationsEnabled,
      onToggleChange: handleNotificationToggle,
    },
  ];

  // Support & Legal Section
  const supportItems: MenuItem[] = [
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Get help or contact us',
      icon: HelpCircle,
      iconColor: '#4ECDC4',
      action: handleHelpSupport,
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: Lock,
      iconColor: '#64748B',
      action: handlePrivacyPolicy,
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      icon: FileText,
      iconColor: '#9CA3AF',
      action: handleTermsOfService,
    },
  ];

  // Dynamic section ordering based on account type
  const sections: MenuSection[] = useMemo(() => {
    // Debug logging for admin section
    console.log('[MoreScreen] Building sections:', {
      isAdmin,
      adminItemsLength: adminItems.length,
      adminItems,
    });
    
    const baseSections: MenuSection[] = [
      // Admin Tools (highest priority for admins)
      ...(adminItems.length > 0 ? [{
        id: 'admin-tools',
        title: 'Admin Tools',
        visible: true,
        items: adminItems,
        priority: 0,
      }] : []),

      // Creator Tools (highest priority if user is creator)
      ...(creatorItems.length > 0 ? [{
        id: 'creator-tools',
        title: 'Creator Tools',
        visible: true,
        items: creatorItems,
        priority: 1,
      }] : []),

      // Business Tools (high priority if user is restaurant owner)  
      ...(businessItems.length > 0 ? [{
        id: 'business-tools',
        title: 'Business Tools',
        visible: true,
        items: businessItems,
        priority: 2,
      }] : []),

      // Growth Opportunities (medium priority if user doesn't have roles)
      ...(growthItems.length > 0 ? [{
        id: 'growth-opportunities',
        title: 'Grow with Troodie',
        visible: true,
        items: growthItems,
        priority: 3,
      }] : []),

      // Existing sections (lower priority but always visible)
      {
        id: 'discover-social',
        title: 'Discover & Social',
        visible: true,
        items: discoverItems,
        priority: 4,
      },
      {
        id: 'account-settings',
        title: 'Account & Settings',
        visible: true,
        items: accountItems,
        priority: 5,
      },
      {
        id: 'support',
        title: 'Support & Legal',
        visible: true,
        items: supportItems,
        priority: 6,
      }
    ];

    return baseSections.sort((a, b) => a.priority - b.priority);
  }, [adminItems, creatorItems, businessItems, growthItems, discoverItems, accountItems, supportItems]);

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={item.action}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}15` }]}>
          <item.icon size={20} color={item.iconColor || DS.colors.textDark} />
        </View>
        <View style={styles.menuItemText}>
          <View style={styles.menuItemTitleRow}>
            <Text style={styles.menuItemTitle}>{item.title}</Text>
            {item.betaFeature && (
              <View style={styles.betaBadge}>
                <Text style={styles.betaBadgeText}>BETA</Text>
              </View>
            )}
          </View>
          {item.subtitle && (
            <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>

      <View style={styles.menuItemRight}>
        {item.showBadge && (item.badgeCount || item.badgeCount === 0 || item.badgeText) && (
          <View style={[
            styles.badge,
            typeof item.badgeCount === 'string' && item.badgeCount === '$' && styles.earningsBadge,
            item.badgeText && styles.newBadge
          ]}>
            <Text style={[styles.badgeText, item.badgeText && styles.newBadgeText]}>
              {item.badgeText || item.badgeCount}
            </Text>
          </View>
        )}

        {item.hasToggle ? (
          <Switch
            value={item.toggleValue}
            onValueChange={item.onToggleChange}
            trackColor={{ false: '#E5E5E5', true: DS.colors.primaryOrange }}
            thumbColor={DS.colors.textWhite}
            disabled={checkingNotifications}
          />
        ) : (
          <ChevronRight size={20} color={DS.colors.textGray} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (section: MenuSection) => {
    if (!section.visible) return null;

    return (
      <View key={section.id} style={styles.section}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.menuGroup}>
          {section.items.map(renderMenuItem)}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ProfileAvatar size={36} style={styles.profileAvatar} />
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        {isAuthenticated && user && (
          <TouchableOpacity
            style={styles.profileCard}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <View style={styles.profileInfo}>
              <Image 
                source={{ 
                  uri: getAvatarUrlWithFallback(
                    userProfile?.avatar_url, 
                    userProfile?.name || userProfile?.username
                  )
                }} 
                style={styles.avatar}
                resizeMode="cover"
              />
              <View style={styles.profileText}>
                <Text style={styles.profileName}>
                  {userProfile?.name || (userProfile?.username ? `@${userProfile.username}` : 'User')}
                </Text>
                {(() => {
                  const persona = userProfile?.persona ? personas[userProfile.persona as PersonaType] : null;
                  return persona ? (
                    <View style={styles.personaBadge}>
                      <Text style={styles.personaEmoji}>{persona.emoji}</Text>
                      <Text style={styles.personaName}>{persona.name}</Text>
                    </View>
                  ) : null;
                })()}
                <TouchableOpacity style={styles.viewProfileButton}
                  onPress={() => router.push('/(tabs)/profile')}
                >
                  <Text style={styles.viewProfileText}>View Profile</Text>
                  <ChevronRight size={14} color={DS.colors.primaryOrange} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Dynamic sections rendering */}
        {sections.map(renderSection)}

        {/* Sign Out */}
        {isAuthenticated && (
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color={DS.colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        {/* Version Info */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Troodie v1.0.14</Text>
          <Text style={styles.copyrightText}>© 2024 Troodie Inc.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.lg,
    paddingVertical: DS.spacing.md,
    backgroundColor: DS.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.borderLight,
  },
  profileAvatar: {
    marginRight: DS.spacing.md,
  },
  headerTitle: {
    ...DS.typography.h1,
    color: DS.colors.textDark,
  },

  // Profile Card
  profileCard: {
    backgroundColor: DS.colors.surface,
    margin: DS.spacing.lg,
    padding: DS.spacing.lg,
    borderRadius: DS.borderRadius.lg,
    ...DS.shadows.sm,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: DS.spacing.md,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    ...DS.typography.h3,
    color: DS.colors.textDark,
    marginBottom: DS.spacing.xs,
  },
  personaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: DS.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: DS.spacing.sm,
    gap: DS.spacing.xxs,
  },
  personaEmoji: {
    fontSize: 12,
  },
  personaName: {
    ...DS.typography.caption,
    color: DS.colors.textGray,
    fontWeight: '600',
    fontSize: 11,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xxs,
  },
  viewProfileText: {
    ...DS.typography.button,
    color: DS.colors.primaryOrange,
    fontSize: 13,
  },

  // Sections
  section: {
    marginBottom: DS.spacing.xl,
  },
  sectionTitle: {
    ...DS.typography.metadata,
    color: DS.colors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: DS.spacing.lg,
    marginBottom: DS.spacing.sm,
  },
  menuGroup: {
    backgroundColor: DS.colors.surface,
    marginHorizontal: DS.spacing.lg,
    borderRadius: DS.borderRadius.lg,
    overflow: 'hidden',
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: DS.spacing.md,
    paddingHorizontal: DS.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: DS.spacing.md,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xs,
  },
  menuItemTitle: {
    ...DS.typography.body,
    color: DS.colors.textDark,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    ...DS.typography.caption,
    color: DS.colors.textGray,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
  },
  badge: {
    backgroundColor: DS.colors.error,
    paddingHorizontal: DS.spacing.sm,
    paddingVertical: 2,
    borderRadius: DS.borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    ...DS.typography.caption,
    color: DS.colors.textWhite,
    fontSize: 11,
    fontWeight: '600',
  },
  betaBadge: {
    backgroundColor: DS.colors.primaryOrange,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  betaBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: DS.colors.textWhite,
    textTransform: 'uppercase',
  },
  earningsBadge: {
    backgroundColor: '#10B981',
  },
  newBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
  },
  newBadgeText: {
    textTransform: 'uppercase',
    fontSize: 10,
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.spacing.sm,
    marginHorizontal: DS.spacing.lg,
    marginBottom: DS.spacing.lg,
    paddingVertical: DS.spacing.md,
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.lg,
    borderWidth: 1,
    borderColor: DS.colors.error,
  },
  signOutText: {
    ...DS.typography.button,
    color: DS.colors.error,
  },

  // Version Info
  versionInfo: {
    alignItems: 'center',
    paddingVertical: DS.spacing.xl,
    marginBottom: DS.spacing.xxl,
  },
  versionText: {
    ...DS.typography.caption,
    color: DS.colors.textGray,
    marginBottom: DS.spacing.xs,
  },
  copyrightText: {
    ...DS.typography.caption,
    color: DS.colors.textGray,
  },
});