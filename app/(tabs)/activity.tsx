import { EmptyActivityState } from '@/components/EmptyActivityState';
import { designTokens } from '@/constants/designTokens';
import { theme } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { restaurantService } from '@/services/restaurantService';
import { ActivityItem, TrendingActivity } from '@/types/core';
import { useRouter } from 'expo-router';
import {
  ChevronLeft
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trendingRestaurants, setTrendingRestaurants] = useState<any[]>([]);

  useEffect(() => {
    loadTrendingRestaurants();
  }, []);

  const loadTrendingRestaurants = async () => {
    try {
      setLoading(true);
      const trending = await restaurantService.getTrendingRestaurants('Charlotte');
      setTrendingRestaurants(trending.slice(0, 3)); // Get top 3 for activity screen
    } catch (error) {
      console.error('Error loading trending restaurants:', error);
    } finally {
      setLoading(false);
    }
  };


  // Transform restaurant data to trending activities
  const transformToTrendingActivities = (restaurants: any[]): TrendingActivity[] => {
    const activityTypes: Array<'trending_save' | 'new_opening' | 'local_favorite'> = ['trending_save', 'new_opening', 'local_favorite'];
    
    return restaurants.map((restaurant, index) => ({
      type: activityTypes[index % activityTypes.length],
      restaurant: restaurant.name,
      image: restaurant.photos?.[0] || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
      stats: `${Math.floor(Math.random() * 300) + 100} saves this week`,
      description: `${restaurant.cuisine_types?.[0] || 'Restaurant'} in ${restaurant.neighborhood || 'Charlotte'}`
    }));
  };

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

  const handleExploreRestaurants = () => {
    router.push('/explore');
  };

  const handleDiscoverGems = () => {
    router.push('/explore');
  };

  const handleShareExperience = () => {
    // TODO: Implement post creation when available
    console.log('Post creation not yet implemented');
  };

  const renderEmptyState = () => (
    <EmptyActivityState
      onExploreRestaurants={handleExploreRestaurants}
      onSaveRestaurant={handleExploreRestaurants}
      onDiscoverGems={handleDiscoverGems}
      onShareExperience={handleShareExperience}
    />
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
        {(userState.hasLimitedActivity ?? true) ? renderEmptyState() : renderActiveState()}
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
  section: {
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xxxl,
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