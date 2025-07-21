import { theme } from '@/constants/theme';
import { designTokens } from '@/constants/designTokens';
import { useApp } from '@/contexts/AppContext';
import { ActivityItem, SuggestedActivity, TrendingActivity } from '@/types/core';
import { useRouter } from 'expo-router';
import {
    Bell,
    Bookmark,
    Camera,
    ChevronLeft,
    MessageCircle,
    TrendingUp,
    UserPlus,
    Users
} from 'lucide-react-native';
import React from 'react';
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function ActivityScreen() {
  const router = useRouter();
  const { userState } = useApp();

  // Mock data for suggested activities
  const suggestedActivities: SuggestedActivity[] = [
    {
      title: 'Save Your First Restaurant',
      description: 'Start building your collection and get recommendations',
      icon: Bookmark,
      action: 'Explore Restaurants',
      benefit: '💡 Get personalized suggestions',
      color: 'blue',
      onClick: () => router.push('/explore')
    },
    {
      title: 'Follow Local Troodies',
      description: 'Connect with food enthusiasts in your area',
      icon: UserPlus,
      action: 'Find Troodies',
      benefit: '💡 See what\'s trending nearby',
      color: 'green',
      onClick: () => router.push('/explore')
    },
    {
      title: 'Share Your Experience',
      description: 'Post photos and reviews to help others discover',
      icon: Camera,
      action: 'Add Post',
      benefit: '💡 Build your reputation',
      color: 'purple',
      onClick: () => {}
    },
  ];

  // Mock data for trending activity
  const trendingActivities: TrendingActivity[] = [
    {
      type: 'trending_save',
      restaurant: 'RoofTop Garden',
      image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
      stats: '247 saves today',
      description: 'Mediterranean restaurant trending in SoHo'
    },
    {
      type: 'new_opening',
      restaurant: 'Corner Coffee Co',
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
      stats: '189 early visits',
      description: 'New coffee shop getting great reviews'
    },
    {
      type: 'local_favorite',
      restaurant: 'Sakura Omakase',
      image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
      stats: '195 saves this week',
      description: 'Local favorite for authentic Japanese cuisine'
    },
  ];

  // Mock data for activity items (when user has activity)
  const activityItems: ActivityItem[] = [
    {
      id: 1,
      type: 'like',
      user: {
        id: 1,
        name: 'Sarah Chen',
        username: 'sarahchen',
        avatar: 'https://i.pravatar.cc/150?img=1'
      },
      action: 'liked your save',
      target: 'The Italian Place',
      time: '2 hours ago',
      restaurant: {
        id: 1,
        name: 'The Italian Place',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
        cuisine: 'Italian',
        rating: 4.8,
        location: 'West Village',
        priceRange: '$$$'
      }
    },
    {
      id: 2,
      type: 'follow',
      user: {
        id: 2,
        name: 'Mike Rodriguez',
        username: 'mikerodriguez',
        avatar: 'https://i.pravatar.cc/150?img=3'
      },
      action: 'started following you',
      time: '5 hours ago'
    },
  ];

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.title}>Activity</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderEmptyState = () => (
    <>
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyIconContainer}>
          <Bell size={32} color={designTokens.colors.primaryOrange} />
        </View>
        <Text style={styles.emptyTitle}>Your Activity Will Appear Here</Text>
        <Text style={styles.emptyDescription}>
          When you start saving restaurants and connecting with other Troodies, you'll see likes, comments, and follows here.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.suggestionsContainer}>
          {suggestedActivities.map((activity, index) => {
            const getCardColors = () => {
              switch (activity.color) {
                case 'blue':
                  return {
                    bg: '#EBF5FF',
                    border: '#BEE3F8',
                    iconBg: '#FFFFFF',
                    iconColor: '#2B6CB0',
                    titleColor: '#1A365D',
                    descColor: '#2C5282',
                    benefitColor: '#2B6CB0',
                    buttonBg: '#2B6CB0',
                    buttonHover: '#2C5282'
                  };
                case 'green':
                  return {
                    bg: '#F0FDF4',
                    border: '#BBF7D0',
                    iconBg: '#FFFFFF',
                    iconColor: '#059669',
                    titleColor: '#064E3B',
                    descColor: '#047857',
                    benefitColor: '#059669',
                    buttonBg: '#059669',
                    buttonHover: '#047857'
                  };
                case 'purple':
                  return {
                    bg: '#FAF5FF',
                    border: '#E9D8FD',
                    iconBg: '#FFFFFF',
                    iconColor: '#7C3AED',
                    titleColor: '#44337A',
                    descColor: '#6B46C1',
                    benefitColor: '#7C3AED',
                    buttonBg: '#7C3AED',
                    buttonHover: '#6B46C1'
                  };
                default:
                  return {
                    bg: '#F9FAFB',
                    border: '#E5E7EB',
                    iconBg: '#FFFFFF',
                    iconColor: designTokens.colors.primaryOrange,
                    titleColor: designTokens.colors.textDark,
                    descColor: designTokens.colors.textMedium,
                    benefitColor: designTokens.colors.primaryOrange,
                    buttonBg: designTokens.colors.primaryOrange,
                    buttonHover: designTokens.colors.primaryOrange
                  };
              }
            };

            const colors = getCardColors();

            return (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.activityCard,
                  { 
                    backgroundColor: colors.bg,
                    borderColor: colors.border
                  }
                ]}
                onPress={activity.onClick}
                activeOpacity={0.7}
              >
                <View style={[styles.activityIcon, { backgroundColor: colors.iconBg }]}>
                  <activity.icon size={20} color={colors.iconColor} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: colors.titleColor }]}>
                    {activity.title}
                  </Text>
                  <Text style={[styles.activityDescription, { color: colors.descColor, opacity: 0.8 }]}>
                    {activity.description}
                  </Text>
                  <Text style={[styles.activityBenefit, { color: colors.benefitColor }]}>
                    {activity.benefit}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.activityCTA, { backgroundColor: colors.buttonBg }]} 
                  onPress={activity.onClick}
                >
                  <Text style={styles.activityCTAText}>{activity.action}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What&apos;s Happening</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>
        
        {trendingActivities.map((trending, index) => (
          <TouchableOpacity key={index} style={styles.trendingCard}>
            <Image source={{ uri: trending.image }} style={styles.trendingImage} />
            <View style={styles.trendingContent}>
              <Text style={styles.trendingRestaurant}>{trending.restaurant}</Text>
              <Text style={styles.trendingDescription}>{trending.description}</Text>
              <View style={styles.trendingStats}>
                <TrendingUp size={14} color={theme.colors.primary} />
                <Text style={styles.trendingStatsText}>{trending.stats}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.trendingButton}>
              <Text style={styles.trendingButtonText}>Save</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderActiveState = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {activityItems.map((item) => (
        <TouchableOpacity key={item.id} style={styles.activityItem}>
          <Image source={{ uri: item.user.avatar }} style={styles.activityAvatar} />
          <View style={styles.activityItemContent}>
            <Text style={styles.activityText}>
              <Text style={styles.activityUserName}>{item.user.name}</Text>
              {' '}{item.action}
              {item.target && (
                <>
                  {' '}
                  <Text style={styles.activityTarget}>{item.target}</Text>
                </>
              )}
            </Text>
            <Text style={styles.activityTime}>{item.time}</Text>
          </View>
          {item.type === 'follow' && (
            <TouchableOpacity style={styles.followBackButton}>
              <Text style={styles.followBackText}>Follow</Text>
            </TouchableOpacity>
          )}
          {item.restaurant && (
            <Image 
              source={{ uri: item.restaurant.image }} 
              style={styles.activityRestaurantImage} 
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false}>
        {userState.hasLimitedActivity ? renderEmptyState() : renderActiveState()}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
  placeholder: {
    width: 40,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxxl,
    paddingHorizontal: designTokens.spacing.lg,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  emptyTitle: {
    ...designTokens.typography.cardTitle,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
  },
  emptyDescription: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 352,
    marginBottom: designTokens.spacing.xxl,
  },
  section: {
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xxxl,
  },
  suggestionsContainer: {
    gap: designTokens.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...designTokens.typography.cardTitle,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  liveText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#FF4444',
  },
  activityCard: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
  activityDescription: {
    ...designTokens.typography.smallText,
    marginBottom: designTokens.spacing.xs,
  },
  activityBenefit: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    marginTop: designTokens.spacing.xs,
  },
  activityCTA: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    height: 36,
    justifyContent: 'center',
  },
  activityCTAText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  trendingCard: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  trendingImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  trendingContent: {
    flex: 1,
  },
  trendingRestaurant: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  trendingDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 4,
  },
  trendingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingStatsText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
  },
  trendingButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
  },
  trendingButtonText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  activityItemContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    marginBottom: 2,
  },
  activityUserName: {
    fontFamily: 'Inter_600SemiBold',
  },
  activityTarget: {
    fontFamily: 'Inter_600SemiBold',
  },
  activityTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
  },
  followBackButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
  },
  followBackText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  activityRestaurantImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginLeft: 12,
  },
  bottomPadding: {
    height: 100,
  },
});