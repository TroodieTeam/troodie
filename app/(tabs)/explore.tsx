import { ExplorePostCard } from '@/components/cards/ExplorePostCard';
import { designTokens } from '@/constants/designTokens';
import { theme } from '@/constants/theme';
import { ExploreFilter, ExplorePost } from '@/types/core';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from 'react-native';
import { restaurantService } from '@/services/restaurantService';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ErrorState } from '@/components/ErrorState';
import { getErrorType } from '@/types/errors';
import { RestaurantCardSkeleton } from '@/components/LoadingSkeleton';

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ExploreFilter>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [retrying, setRetrying] = useState(false);
  const { user } = useAuth();

  const filters: ExploreFilter[] = ['All', 'Friends', 'Trending', 'Nearby', 'New', 'Top Rated'];

  // Load restaurants from Supabase
  useEffect(() => {
    loadRestaurants();
  }, []);

  // Filter restaurants based on active filter and search query
  useEffect(() => {
    filterRestaurants();
  }, [activeFilter, searchQuery, restaurants]);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);
      let data = [];
      
      // For Charlotte beta, always load Charlotte restaurants
      data = await restaurantService.getRestaurantsByCity('Charlotte', 50);
      
      setRestaurants(data);
    } catch (err: any) {
      console.error('Error loading restaurants:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const filterRestaurants = async () => {
    try {
      let filtered = [...restaurants];

      // Apply search query
      if (searchQuery) {
        filtered = filtered.filter(restaurant => 
          restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          restaurant.cuisine_types?.some((cuisine: string) => 
            cuisine.toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          restaurant.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Apply filter
      switch (activeFilter) {
        case 'Trending':
          // Get trending restaurants
          const trending = await restaurantService.getTrendingRestaurants('Charlotte');
          const trendingIds = trending.map(r => r.id);
          filtered = filtered.filter(r => trendingIds.includes(r.id));
          break;
        case 'Top Rated':
          filtered = filtered.sort((a, b) => ((b.google_rating || b.troodie_rating || 0) - (a.google_rating || a.troodie_rating || 0))).slice(0, 20);
          break;
        case 'New':
          // Sort by created_at if available, otherwise show random selection
          filtered = filtered.sort(() => Math.random() - 0.5).slice(0, 20);
          break;
        // For now, Friends and Nearby filters will show all restaurants
        // These will be implemented when user social features are ready
        default:
          break;
      }

      setFilteredRestaurants(filtered);
    } catch (err: any) {
      console.error('Error filtering restaurants:', err);
      // If filtering fails, show all restaurants
      setFilteredRestaurants(restaurants);
    }
  };

  // Transform restaurant data to match ExplorePost format
  const transformToExplorePosts = (restaurants: any[]): ExplorePost[] => {
    return restaurants.map((restaurant, index) => ({
      id: restaurant.id,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        image: restaurant.photos?.[0] || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
        cuisine: restaurant.cuisine_types?.[0] || 'Restaurant',
        rating: restaurant.google_rating || restaurant.troodie_rating || 4.5,
        location: restaurant.neighborhood || restaurant.city,
        priceRange: restaurant.price_range || '$$',
      },
      user: {
        id: index + 1,
        name: 'Charlotte Foodie',
        username: 'charlotte_foodie',
        avatar: `https://i.pravatar.cc/150?img=${(index % 10) + 1}`,
        persona: 'Local Explorer',
        verified: false,
        followers: 0
      },
      socialProof: {
        friendsVisited: [],
        friendsPhotos: [],
        totalFriendVisits: 0,
        mutualFriends: 0
      },
      photos: restaurant.photos || ['https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800'],
      engagement: {
        likes: 0,
        saves: 0,
        comments: 0
      },
      trending: false,
      caption: restaurant.description || '',
      time: ''
    }));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    setRefreshing(false);
  };

  const onRetry = async () => {
    setRetrying(true);
    await loadRestaurants();
    setRetrying(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.subtitle}>Discover through your network</Text>
      
      <View style={styles.searchContainer}>
        <Search size={20} color={designTokens.colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants, friends, or cuisines..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.filterButton}>
          <SlidersHorizontal size={20} color={designTokens.colors.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterPill,
              activeFilter === filter && styles.filterPillActive
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[
              styles.filterText,
              activeFilter === filter && styles.filterTextActive
            ]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading && !error) {
    return (
      <SafeAreaView style={styles.container}>
        <FlatList
          ListHeaderComponent={renderHeader}
          data={[1, 2, 3, 4, 5]}
          style={styles.listView}
          renderItem={() => <RestaurantCardSkeleton />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    );
  }

  if (error && restaurants.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>Discover through your network</Text>
        </View>
        <ErrorState
          error={error}
          errorType={getErrorType(error)}
          onRetry={onRetry}
          retrying={retrying}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  const explorePosts = transformToExplorePosts(filteredRestaurants);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={renderHeader}
        data={explorePosts}
        style={styles.listView}
        renderItem={({ item }) => (
          <ExplorePostCard
            post={item}
            onPress={() => {
              router.push({
                pathname: '/restaurant/[id]',
                params: { id: item.restaurant.id }
              });
            }}
            onLike={() => {}}
            onComment={() => {}}
            onSave={() => {}}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={designTokens.colors.primaryOrange}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          error ? (
            <ErrorState
              error={error}
              errorType={getErrorType(error)}
              onRetry={onRetry}
              retrying={retrying}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No restaurants found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search or filters
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.lg,
  },
  title: {
    ...designTokens.typography.screenTitle,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.xs,
  },
  subtitle: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundGray,
    borderRadius: designTokens.borderRadius.md,
    paddingHorizontal: designTokens.spacing.lg,
    height: 48,
    marginBottom: designTokens.spacing.md,
  },
  searchIcon: {
    marginRight: designTokens.spacing.md,
  },
  searchInput: {
    flex: 1,
    ...designTokens.typography.inputText,
    color: designTokens.colors.textDark,
  },
  filterButton: {
    padding: designTokens.spacing.sm,
    marginLeft: designTokens.spacing.sm,
  },
  filtersContainer: {
    marginHorizontal: -designTokens.spacing.lg,
    paddingHorizontal: designTokens.spacing.lg,
  },
  filtersContent: {
    paddingRight: 40,
    gap: designTokens.spacing.sm,
  },
  filterPill: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.backgroundGray,
    marginRight: designTokens.spacing.sm,
  },
  filterPillActive: {
    backgroundColor: designTokens.colors.primaryOrange,
  },
  filterText: {
    ...designTokens.typography.filterText,
    color: designTokens.colors.textMediumDark,
  },
  filterTextActive: {
    color: designTokens.colors.white,
  },
  listView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    marginTop: designTokens.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxxl,
  },
  emptyTitle: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
  },
  emptyText: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
  },
});
