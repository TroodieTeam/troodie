import { EmptyActivityState } from '@/components/EmptyActivityState';
import { compactDesign, designTokens } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { strings } from '@/constants/strings';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSmoothDataFetch } from '@/hooks/useSmoothDataFetch';
import { restaurantService } from '@/services/restaurantService';
import { ActivityItem } from '@/types/core';
import { useRouter } from 'expo-router';
import { Bell, TrendingUp } from 'lucide-react-native';
import React, { useCallback, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock data for demonstration
const MOCK_ACTIVITIES: ActivityItem[] = [
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
    time: '2h',
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
    time: '5h'
  },
  {
    id: 3,
    type: 'comment',
    user: {
      id: 3,
      name: 'Emma Davis',
      username: 'emmadavis',
      avatar: 'https://i.pravatar.cc/150?img=5'
    },
    action: 'commented on your post',
    target: 'Sushi Paradise',
    time: '1d',
  },
];

export default function ActivityScreen() {
  const router = useRouter();
  const { userState } = useApp();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'likes' | 'follows' | 'comments'>('all');
  const [userSaves, setUserSaves] = useState<any[]>([]);

  // Fetch trending restaurants with smooth loading
  const fetchTrendingRestaurants = useCallback(async () => {
    const trending = await restaurantService.getTrendingRestaurants('Charlotte');
    return trending.slice(0, 5);
  }, []);

  const { 
    data: trendingRestaurants = [], 
    loading 
  } = useSmoothDataFetch(fetchTrendingRestaurants, [], {
    minLoadingTime: 400,
    showLoadingOnRefetch: false,
    fetchOnFocus: true,
    cacheDuration: 120000 // 2 minutes cache
  });

  // Fetch user saves to determine if they have saved any restaurants
  useEffect(() => {
    const fetchUserSaves = async () => {
      if (user?.id) {
        try {
          const saves = await restaurantService.getUserSaves(user.id);
          setUserSaves(saves);
        } catch (error) {
          console.error('Error fetching user saves:', error);
        }
      }
    };
    
    fetchUserSaves();
  }, [user?.id]);

  const handleExploreAction = () => router.push('/explore');

  const filteredActivities = MOCK_ACTIVITIES.filter(item => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter.slice(0, -1); // Remove 's' from filter name
  });

  const ActivityListItem = ({ item }: { item: ActivityItem }) => (
    <TouchableOpacity style={styles.activityItem}>
      <View style={styles.activityLeft}>
        <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
        <View style={styles.activityIndicator}>
          {item.type === 'like' && <Text style={styles.activityIcon}>❤️</Text>}
          {item.type === 'follow' && <Text style={styles.activityIcon}>👤</Text>}
          {item.type === 'comment' && <Text style={styles.activityIcon}>💬</Text>}
        </View>
      </View>
      
      <View style={styles.activityContent}>
        <Text style={styles.activityText} numberOfLines={2}>
          <Text style={styles.boldText}>{item.user.name}</Text>
          {' '}{item.action}
          {item.target && (
            <>
              {' '}
              <Text style={styles.boldText}>{item.target}</Text>
            </>
          )}
        </Text>
        <Text style={styles.timeText}>{item.time}</Text>
      </View>

      {item.type === 'follow' ? (
        <TouchableOpacity style={styles.followButton}>
          <Text style={styles.followButtonText}>Follow</Text>
        </TouchableOpacity>
      ) : item.restaurant ? (
        <Image 
          source={{ uri: item.restaurant.image || DEFAULT_IMAGES.restaurant }} 
          style={styles.thumbnail} 
        />
      ) : null}
    </TouchableOpacity>
  );

  const TrendingItem = ({ restaurant, index }: { restaurant: any; index: number }) => (
    <TouchableOpacity 
      style={styles.trendingItem}
      onPress={() => router.push(`/restaurant/${restaurant.id}`)}
    >
      <Image 
        source={{ uri: restaurant.photos?.[0] || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800' }} 
        style={styles.trendingImage} 
      />
      <View style={styles.trendingOverlay}>
        <Text style={styles.trendingRank}>#{index + 1}</Text>
        <Text style={styles.trendingName} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.trendingCuisine}>{restaurant.cuisine_types?.[0] || 'Restaurant'}</Text>
      </View>
    </TouchableOpacity>
  );

  const hasActivity = !(userState.hasLimitedActivity ?? true) || userSaves.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={20} color={designTokens.colors.text} />
          <Text style={styles.title}>Activity</Text>
        </View>
        <TouchableOpacity style={styles.markAllRead}>
          <Text style={styles.markAllReadText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {hasActivity ? (
          <>
            {/* Filter Pills */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterContainer}
              contentContainerStyle={styles.filterContent}
            >
              {(['all', 'likes', 'follows', 'comments'] as const).map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Activity List */}
            <View style={styles.activitySection}>
              {filteredActivities.map(item => (
                <ActivityListItem key={item.id} item={item} />
              ))}
            </View>

            {/* Trending Section */}
            <View style={styles.trendingSection}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={16} color={designTokens.colors.primaryOrange} />
                <Text style={styles.sectionTitle}>{strings.trending.title}</Text>
              </View>
              {loading ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.trendingList}
                >
                  {[1, 2, 3, 4, 5].map((_, index) => (
                    <View key={index} style={[styles.trendingItem, styles.trendingSkeleton]}>
                      <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={trendingRestaurants}
                  renderItem={({ item, index }) => (
                    <TrendingItem restaurant={item} index={index} />
                  )}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.trendingList}
                />
              )}
            </View>
          </>
        ) : (
          <EmptyActivityState
            onExploreRestaurants={handleExploreAction}
            onSaveRestaurant={userSaves.length === 0 ? handleExploreAction : undefined}
            onDiscoverGems={handleExploreAction}
            onShareExperience={handleExploreAction}
          />
        )}
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
    paddingHorizontal: compactDesign.header.paddingHorizontal,
    paddingVertical: compactDesign.header.paddingVertical,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
  markAllRead: {
    paddingVertical: 4,
    paddingHorizontal: compactDesign.button.paddingHorizontalSmall,
  },
  markAllReadText: {
    ...designTokens.typography.smallText,
    fontWeight: '600',
    color: designTokens.colors.primaryOrange,
  },
  filterContainer: {
    backgroundColor: designTokens.colors.white,
    paddingVertical: compactDesign.content.gap,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  filterContent: {
    paddingHorizontal: compactDesign.content.padding,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: compactDesign.button.paddingHorizontalSmall,
    paddingVertical: 6,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.backgroundGray,
  },
  filterPillActive: {
    backgroundColor: designTokens.colors.primaryOrange,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  activitySection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: compactDesign.content.padding,
    paddingVertical: compactDesign.content.paddingCompact,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  activityLeft: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 32, // Reduced from 36
    height: 32,
    borderRadius: 16,
  },
  activityIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 2,
  },
  activityIcon: {
    ...designTokens.typography.smallText,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    ...designTokens.typography.bodyRegular,
    lineHeight: 18,
    color: '#333',
    marginBottom: 2,
  },
  boldText: {
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  timeText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textLight,
  },
  followButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  trendingSection: {
    marginTop: 24,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  trendingList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  trendingItem: {
    width: SCREEN_WIDTH * 0.35,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  trendingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  trendingRank: {
    fontSize: 12,
    fontWeight: '700',
    color: designTokens.colors.primaryOrange,
    marginBottom: 2,
  },
  trendingName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  trendingCuisine: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  trendingSkeleton: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});