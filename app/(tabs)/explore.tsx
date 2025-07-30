import { ErrorState } from '@/components/ErrorState';
import { RestaurantCardSkeleton } from '@/components/LoadingSkeleton';
import { PostCard } from '@/components/PostCard';
import { RestaurantCard } from '@/components/cards/RestaurantCard';
import { designTokens } from '@/constants/designTokens';
import { theme } from '@/constants/theme';
import { postService } from '@/services/postService';
import { restaurantService } from '@/services/restaurantService';
import { getErrorType } from '@/types/errors';
import { PostWithUser } from '@/types/post';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type TabType = 'restaurants' | 'posts';

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('restaurants');
  const [refreshing, setRefreshing] = useState(false);
  
  // Restaurant tab state
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [restaurantError, setRestaurantError] = useState<Error | null>(null);
  
  // Posts tab state
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithUser[]>([]);
  const [postError, setPostError] = useState<Error | null>(null);
  
  const [retrying, setRetrying] = useState(false);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'restaurants' && restaurants.length === 0) {
      loadRestaurants();
    } else if (activeTab === 'posts' && posts.length === 0) {
      loadPosts();
    }
  }, [activeTab, restaurants.length, posts.length]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter data based on search query and active tab
  useEffect(() => {
    if (activeTab === 'restaurants') {
      filterRestaurants();
    } else {
      filterPostsData();
    }
  }, [debouncedSearchQuery, restaurants, posts, activeTab, filterRestaurants, filterPostsData]);

  const loadRestaurants = async () => {
    try {
      setLoadingRestaurants(true);
      setRestaurantError(null);
      
      // For Charlotte beta, always load Charlotte restaurants
      const data = await restaurantService.getRestaurantsByCity('Charlotte', 50);
      setRestaurants(data);
      setFilteredRestaurants(data);
    } catch (err: any) {
      console.error('Error loading restaurants:', err);
      setRestaurantError(err);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  const loadPosts = async () => {
    try {
      setLoadingPosts(true);
      setPostError(null);
      
      const data = await postService.getExplorePosts({ limit: 50 });
      setPosts(data);
      setFilteredPosts(data);
    } catch (err: any) {
      console.error('Error loading posts:', err);
      setPostError(err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const filterRestaurants = useCallback(() => {
    if (!debouncedSearchQuery) {
      setFilteredRestaurants(restaurants);
      return;
    }

    const query = debouncedSearchQuery.toLowerCase();
    const filtered = restaurants.filter(restaurant => 
      restaurant.name?.toLowerCase().includes(query) ||
      restaurant.cuisine_types?.some((cuisine: string) => 
        cuisine.toLowerCase().includes(query)
      ) ||
      restaurant.neighborhood?.toLowerCase().includes(query) ||
      restaurant.city?.toLowerCase().includes(query)
    );
    
    setFilteredRestaurants(filtered);
  }, [restaurants, debouncedSearchQuery]);

  const filterPostsData = useCallback(() => {
    if (!debouncedSearchQuery) {
      setFilteredPosts(posts);
      return;
    }

    const query = debouncedSearchQuery.toLowerCase();
    const filtered = posts.filter(post => 
      post.caption?.toLowerCase().includes(query) ||
      post.restaurant?.name?.toLowerCase().includes(query) ||
      post.tags?.some((tag: string) => tag.toLowerCase().includes(query))
    );
    
    setFilteredPosts(filtered);
  }, [posts, debouncedSearchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'restaurants') {
      await loadRestaurants();
    } else {
      await loadPosts();
    }
    setRefreshing(false);
  };

  const onRetry = async () => {
    setRetrying(true);
    if (activeTab === 'restaurants') {
      await loadRestaurants();
    } else {
      await loadPosts();
    }
    setRetrying(false);
  };

  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.subtitle}>Discover through your network</Text>
      
      <View style={styles.searchContainer}>
        <Search size={20} color={designTokens.colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'restaurants' ? 'Search restaurants...' : 'Search posts...'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'restaurants' && styles.tabActive]}
          onPress={() => setActiveTab('restaurants')}
        >
          <Text style={[styles.tabText, activeTab === 'restaurants' && styles.tabTextActive]}>
            Restaurants
          </Text>
          {activeTab === 'restaurants' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
            Posts
          </Text>
          {activeTab === 'posts' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>
    </View>
  ), [searchQuery, activeTab]);

  const renderRestaurantItem = useCallback(({ item }: { item: any }) => (
    <RestaurantCard
      restaurant={{
        id: item.id,
        name: item.name,
        image: restaurantService.getRestaurantImage(item),
        cuisine: item.cuisine_types?.[0] || 'Restaurant',
        rating: item.google_rating || item.troodie_rating || 0,
        location: item.neighborhood || item.city || 'Charlotte',
        priceRange: item.price_range || '$$',
      }}
      onPress={() => {
        router.push({
          pathname: '/restaurant/[id]',
          params: { id: item.id }
        });
      }}
    />
  ), [router]);

  const renderPostItem = useCallback(({ item }: { item: PostWithUser }) => (
    <PostCard
      post={item}
      onPress={() => {
        router.push({
          pathname: '/posts/[id]',
          params: { id: item.id }
        });
      }}
      onLike={(postId: string, liked: boolean) => {
        // TODO: Handle post like
      }}
      onComment={(postId: string) => {
        // TODO: Navigate to comment screen
      }}
      onSave={(postId: string) => {
        // TODO: Handle post save
      }}
    />
  ), [router]);

  const loading = activeTab === 'restaurants' ? loadingRestaurants : loadingPosts;
  const error = activeTab === 'restaurants' ? restaurantError : postError;
  const data = activeTab === 'restaurants' ? filteredRestaurants : filteredPosts;
  const hasData = activeTab === 'restaurants' ? restaurants.length > 0 : posts.length > 0;

  if (loading && !error && !hasData) {
    return (
      <SafeAreaView style={styles.container}>
        <FlatList
          ListHeaderComponent={renderHeader}
          data={[1, 2, 3, 4, 5]}
          style={styles.listView}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <RestaurantCardSkeleton />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    );
  }

  if (error && !hasData) {
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

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={renderHeader}
        data={data}
        style={styles.listView}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === 'restaurants' ? renderRestaurantItem : renderPostItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={designTokens.colors.primaryOrange}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
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
              <Text style={styles.emptyTitle}>
                {activeTab === 'restaurants' ? 'No restaurants found' : 'No posts found'}
              </Text>
              <Text style={styles.emptyText}>
                {debouncedSearchQuery 
                  ? 'Try adjusting your search'
                  : activeTab === 'restaurants' 
                    ? 'Check back soon for new restaurants'
                    : 'Be the first to share your experience'
                }
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
    backgroundColor: theme.colors.surface,
  },
  header: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.md,
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
    marginBottom: designTokens.spacing.lg,
  },
  searchIcon: {
    marginRight: designTokens.spacing.md,
  },
  searchInput: {
    flex: 1,
    ...designTokens.typography.inputText,
    color: designTokens.colors.textDark,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: designTokens.spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    // Active tab styling handled by text and indicator
  },
  tabText: {
    ...designTokens.typography.bodyMedium,
    color: designTokens.colors.textMedium,
  },
  tabTextActive: {
    color: designTokens.colors.primaryOrange,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: designTokens.colors.primaryOrange,
  },
  listView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.xl,
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