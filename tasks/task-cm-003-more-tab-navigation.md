# More Tab Navigation System Enhancement

- Epic: CM (Creator Marketplace)
- Priority: High
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: CM-001

## Overview
Enhance the existing More tab implementation to seamlessly integrate Creator Marketplace features. The current More tab has a well-structured section-based design that will be extended to include Creator Tools and Business Tools sections based on user roles, while maintaining the existing UX patterns.

## Business Value
- Leverages existing familiar More tab patterns users already know
- Provides natural integration point for Creator Marketplace features
- Maintains consistent user experience while adding powerful new capabilities
- Enables progressive feature discovery without overwhelming existing users
- Critical for Creator Marketplace adoption and user retention

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Enhanced More Tab with Creator Marketplace
  As a Troodie user with multiple roles
  I want the More tab to show relevant features for my roles
  So that I can access all functionality through familiar navigation

  Scenario: Regular user sees growth opportunities
    Given I am a regular user
    When I open the More tab
    Then I see existing "Discover & Social", "Account & Settings", "Support" sections
    And I see a new "Growth Opportunities" section
    And I see "Become a Creator" and "Claim Restaurant" options
    And existing functionality remains unchanged

  Scenario: Creator sees creator tools
    Given I am a verified creator
    When I open the More tab
    Then I see a new "Creator Tools" section at the top
    And I see "Creator Dashboard", "My Campaigns", "Earnings", "Analytics"
    And I see growth opportunities section with "Claim Restaurant" if applicable
    And existing sections remain below creator tools

  Scenario: Restaurant owner sees business tools
    Given I am a restaurant owner
    When I open the More tab
    Then I see a new "Business Tools" section at the top
    And I see "Business Dashboard", "Manage Campaigns", "Analytics", "Restaurant Settings"
    And I see creator tools section if I'm also a creator
    And existing sections remain at bottom

  Scenario: Multi-role user experience
    Given I have both creator and restaurant owner roles
    When I open the More tab
    Then I see both "Creator Tools" and "Business Tools" sections
    And sections are clearly labeled and visually distinct
    And I can access all features for both roles
    And existing sections remain accessible
```

## Technical Implementation

### Enhanced MenuItem Interface
```typescript
interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: any;
  iconColor?: string;
  action: () => void;
  showBadge?: boolean;
  badgeCount?: number;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  // New properties for Creator Marketplace
  requiresRole?: UserRole[];
  betaFeature?: boolean;
  earningsAmount?: number;
}

interface MenuSection {
  id: string;
  title: string;
  visible: boolean;
  items: MenuItem[];
  priority: number; // For ordering sections
}
```

### Enhanced More Screen Component
```typescript
export default function MoreScreen() {
  const router = useRouter();
  const { user, isAuthenticated, signOut, roles } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  
  // Hook to get Creator Marketplace data
  const {
    pendingEarnings,
    activeCampaigns,
    newApplications,
    isCreatorVerified,
    hasClaimedRestaurant
  } = useCreatorMarketplaceData(user?.id);

  // Creator Tools Section
  const creatorItems: MenuItem[] = roles.includes('creator') ? [
    {
      id: 'creator-dashboard',
      title: 'Creator Dashboard',
      subtitle: activeCampaigns > 0 ? `${activeCampaigns} active campaigns` : 'View your creator overview',
      icon: BarChart3,
      iconColor: '#6366F1',
      action: () => router.push('/creator/dashboard'),
      showBadge: activeCampaigns > 0,
      badgeCount: activeCampaigns,
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
      subtitle: pendingEarnings > 0 
        ? `$${pendingEarnings} pending payout` 
        : 'View earnings history',
      icon: DollarSign,
      iconColor: '#10B981',
      action: () => router.push('/creator/earnings'),
      showBadge: pendingEarnings > 0,
      badgeCount: '$',
      earningsAmount: pendingEarnings,
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
  const businessItems: MenuItem[] = roles.includes('restaurant_owner') ? [
    {
      id: 'business-dashboard',
      title: 'Business Dashboard',
      subtitle: user.restaurants?.length 
        ? `Managing ${user.restaurants.length} restaurant${user.restaurants.length > 1 ? 's' : ''}`
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
      showBadge: newApplications > 0,
      badgeCount: newApplications,
    },
    {
      id: 'business-analytics',
      title: 'Analytics',
      subtitle: 'Restaurant performance insights',
      icon: BarChart2,
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
  const growthItems: MenuItem[] = [];
  if (!roles.includes('creator')) {
    growthItems.push({
      id: 'become-creator',
      title: 'Become a Creator',
      subtitle: 'Earn money sharing your food discoveries',
      icon: Star,
      iconColor: '#F59E0B',
      action: () => router.push('/creator/onboarding'),
      betaFeature: true,
    });
  }
  if (!roles.includes('restaurant_owner')) {
    growthItems.push({
      id: 'claim-restaurant',
      title: 'Claim Your Restaurant',
      subtitle: 'Access business tools and analytics',
      icon: Building,
      iconColor: '#DC2626',
      action: () => router.push('/business/claim'),
    });
  }

  // Existing sections (preserved from original implementation)
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
    // ... rest of existing discover items
  ];

  // Dynamic section ordering based on user roles
  const sections: MenuSection[] = [
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
  ].sort((a, b) => a.priority - b.priority);

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
        {item.showBadge && (
          <View style={[
            styles.badge,
            item.earningsAmount && styles.earningsBadge
          ]}>
            <Text style={styles.badgeText}>
              {item.earningsAmount ? '$' : item.badgeCount}
            </Text>
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
      {/* Existing header implementation */}
      <View style={styles.header}>
        <ProfileAvatar size={36} style={styles.profileAvatar} />
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Existing profile card implementation */}
        {isAuthenticated && user && (
          <TouchableOpacity 
            style={styles.profileCard}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            {/* Existing profile card content */}
          </TouchableOpacity>
        )}

        {/* Dynamic sections rendering */}
        {sections.map(renderSection)}

        {/* Existing sign out and version info */}
        {isAuthenticated && (
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color={DS.colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Troodie v1.0.14</Text>
          <Text style={styles.copyrightText}>© 2024 Troodie Inc.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### Creator Marketplace Data Hook
```typescript
const useCreatorMarketplaceData = (userId?: string) => {
  const [data, setData] = useState({
    pendingEarnings: 0,
    activeCampaigns: 0,
    newApplications: 0,
    isCreatorVerified: false,
    hasClaimedRestaurant: false,
  });

  useEffect(() => {
    if (!userId) return;

    const fetchMarketplaceData = async () => {
      try {
        const [earnings, campaigns, applications, creatorStatus, restaurantStatus] = await Promise.all([
          getPendingEarnings(userId),
          getActiveCampaigns(userId),
          getNewApplications(userId),
          getCreatorVerificationStatus(userId),
          getRestaurantOwnershipStatus(userId),
        ]);

        setData({
          pendingEarnings: earnings,
          activeCampaigns: campaigns,
          newApplications: applications,
          isCreatorVerified: creatorStatus.verified,
          hasClaimedRestaurant: restaurantStatus.hasClaimed,
        });
      } catch (error) {
        console.error('Failed to fetch marketplace data:', error);
      }
    };

    fetchMarketplaceData();

    // Set up real-time updates
    const unsubscribe = setupRealtimeUpdates(userId, fetchMarketplaceData);
    return unsubscribe;
  }, [userId]);

  return data;
};
```

### Additional Styles for Creator Marketplace
```typescript
const additionalStyles = StyleSheet.create({
  menuItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xs,
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
    backgroundColor: DS.colors.success || '#10B981',
  },
  // Section priority indicators could be added for visual hierarchy
  prioritySection: {
    borderLeftWidth: 3,
    borderLeftColor: DS.colors.primaryOrange,
    paddingLeft: DS.spacing.sm,
  },
});
```

## Definition of Done
- [ ] Creator Tools section appears when user has creator role
- [ ] Business Tools section appears when user has restaurant owner role  
- [ ] Growth Opportunities section shows for users without those roles
- [ ] Badge system shows pending earnings, campaigns, and applications
- [ ] Beta indicators appear for new features
- [ ] All existing More tab functionality preserved
- [ ] Section ordering respects user role priorities
- [ ] Real-time updates for marketplace data work correctly
- [ ] Responsive design maintains existing patterns
- [ ] Accessibility support matches existing implementation
- [ ] Unit tests cover new section logic
- [ ] Integration tests verify role-based visibility
- [ ] Performance impact is minimal

## Notes
- Builds directly on existing More tab implementation patterns
- Preserves all current functionality and design consistency
- Uses existing DS (Design System) tokens for visual coherence
- Maintains established UX patterns users already understand
- Extends existing MenuItem interface rather than replacing it
- Follows current section-based organization approach
- Ready for immediate development on existing codebase