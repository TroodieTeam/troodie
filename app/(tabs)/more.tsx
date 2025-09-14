/**
 * MORE SCREEN - V1.0 Design with Account Type Integration
 * Houses secondary features and settings in an organized menu with Creator Marketplace support
 */

import { DS } from '@/components/design-system/tokens';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountType } from '@/hooks/useAccountType';
import { useRouter } from 'expo-router';
import {
  Activity,
  BarChart3,
  Bell,
  Building,
  ChevronRight,
  DollarSign,
  Heart,
  HelpCircle,
  Info,
  LogOut,
  Megaphone,
  MessageSquare,
  Settings,
  Shield,
  Star,
  Store,
  Target,
  TrendingUp,
  UserPlus,
  Users
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: any;
  iconColor?: string;
  action: () => void;
  showBadge?: boolean;
  badgeCount?: number | string;
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
    creatorProfile,
    businessProfile
  } = useAccountType();

  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/onboarding/splash');
          }
        }
      ]
    );
  };

  // Creator Tools Section
  const creatorItems: MenuItem[] = isCreator ? [
    {
      id: 'creator-dashboard',
      title: 'Creator Dashboard',
      subtitle: 'View your creator overview and performance',
      icon: BarChart3,
      iconColor: '#6366F1',
      action: () => router.push('/creator/dashboard'),
      // showBadge: activeCampaigns > 0,
      // badgeCount: activeCampaigns,
    },
    {
      id: 'my-campaigns',
      title: 'My Campaigns',
      subtitle: 'Manage your marketing campaigns',
      icon: Target,
      iconColor: '#8B5CF6',
      action: () => router.push('/creator/campaigns'),
    },
    {
      id: 'earnings',
      title: 'Earnings',
      subtitle: 'View earnings history and payouts',
      icon: DollarSign,
      iconColor: '#10B981',
      action: () => router.push('/creator/earnings'),
      // showBadge: pendingEarnings > 0,
      // badgeCount: '$',
    },
    {
      id: 'creator-analytics',
      title: 'Creator Analytics',
      subtitle: 'Performance insights and metrics',
      icon: TrendingUp,
      iconColor: '#F59E0B',
      action: () => router.push('/creator/analytics'),
    }
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
      id: 'business-analytics',
      title: 'Analytics',
      subtitle: 'Restaurant performance insights',
      icon: BarChart3,
      iconColor: '#059669',
      action: () => router.push('/business/analytics'),
    },
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
        betaFeature: true,
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

  // Discover & Social Section (existing)
  const discoverItems: MenuItem[] = [
    {
      id: 'activity',
      title: 'Activity',
      subtitle: 'See what your friends are up to',
      icon: Activity,
      iconColor: DS.colors.primaryOrange,
      action: () => router.push('/(tabs)/activity'),
      showBadge: true,
      badgeCount: 3,
    },
    {
      id: 'communities',
      title: 'Communities',
      subtitle: 'Join and create communities',
      icon: Users,
      iconColor: '#4ECDC4',
      action: () => router.push('/(tabs)/communities'),
    },
    {
      id: 'trending',
      title: 'Trending',
      subtitle: 'Discover what\'s popular',
      icon: TrendingUp,
      iconColor: '#FF6B6B',
      action: () => router.push('/discover-gems'),
    },
    {
      id: 'invite-friends',
      title: 'Invite Friends',
      subtitle: 'Grow your network',
      icon: UserPlus,
      iconColor: '#5B8DEE',
      action: () => router.push('/friends/invite'),
    },
  ];

  // Account & Settings Section (existing)
  const accountItems: MenuItem[] = [
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      iconColor: '#FFB800',
      action: () => router.push('/notifications'),
      hasToggle: true,
      toggleValue: notificationsEnabled,
      onToggleChange: setNotificationsEnabled,
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Privacy, account, preferences',
      icon: Settings,
      iconColor: '#64748B',
      action: () => router.push('/settings'),
    },
    {
      id: 'saved-places',
      title: 'Quick Saves',
      subtitle: 'Your bookmarked places',
      icon: Heart,
      iconColor: '#FF6B6B',
      action: () => router.push('/quick-saves'),
    },
  ];

  // Support Section (existing)
  const supportItems: MenuItem[] = [
    {
      id: 'help',
      title: 'Help & Support',
      icon: HelpCircle,
      iconColor: '#4ECDC4',
      action: () => router.push('/help'),
    },
    {
      id: 'feedback',
      title: 'Send Feedback',
      icon: MessageSquare,
      iconColor: '#5B8DEE',
      action: () => router.push('/feedback'),
    },
    {
      id: 'about',
      title: 'About Troodie',
      icon: Info,
      iconColor: '#64748B',
      action: () => router.push('/about'),
    },
    {
      id: 'terms',
      title: 'Terms & Privacy',
      icon: Shield,
      iconColor: '#9CA3AF',
      action: () => router.push('/terms'),
    },
  ];

  // Dynamic section ordering based on account type
  const sections: MenuSection[] = useMemo(() => {
    const baseSections: MenuSection[] = [
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
        title: 'Support',
        visible: true,
        items: supportItems,
        priority: 6,
      }
    ];

    return baseSections.sort((a, b) => a.priority - b.priority);
  }, [creatorItems, businessItems, growthItems, discoverItems, accountItems, supportItems]);

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
        {item.showBadge && (item.badgeCount || item.badgeCount === 0) && (
          <View style={[
            styles.badge,
            typeof item.badgeCount === 'string' && item.badgeCount === '$' && styles.earningsBadge
          ]}>
            <Text style={styles.badgeText}>{item.badgeCount}</Text>
          </View>
        )}

        {item.hasToggle ? (
          <Switch
            value={item.toggleValue}
            onValueChange={item.onToggleChange}
            trackColor={{ false: DS.colors.borderLight, true: DS.colors.primaryOrange }}
            thumbColor={DS.colors.textWhite}
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
              {user.user_metadata?.avatar_url ? (
                <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {user.user_metadata?.name?.charAt(0)?.toUpperCase() ||
                      user.email?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.profileText}>
                <Text style={styles.profileName}>
                  {user.user_metadata?.name || 'User'}
                </Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                <View style={styles.accountTypeBadge}>
                  <Text style={styles.accountTypeText}>
                    {accountType === 'consumer' && 'Food Explorer'}
                    {accountType === 'creator' && 'Content Creator'}
                    {accountType === 'business' && 'Business Owner'}
                  </Text>
                </View>
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
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: DS.colors.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: DS.spacing.md,
  },
  avatarText: {
    ...DS.typography.h2,
    color: DS.colors.textWhite,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    ...DS.typography.h3,
    color: DS.colors.textDark,
    marginBottom: DS.spacing.xxs,
  },
  profileEmail: {
    ...DS.typography.metadata,
    color: DS.colors.textGray,
    marginBottom: DS.spacing.xs,
  },
  accountTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: DS.colors.primaryOrange + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: DS.spacing.sm,
  },
  accountTypeText: {
    ...DS.typography.caption,
    color: DS.colors.primaryOrange,
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