import { ErrorState } from '@/components/ErrorState';
import { RestaurantCardSkeleton } from '@/components/LoadingSkeleton';
import { PostCard } from '@/components/PostCard';
import { RestaurantCard } from '@/components/cards/RestaurantCard';
import { AddRestaurantModal } from '@/components/AddRestaurantModal';
import { compactDesign, designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { postService } from '@/services/postService';
import { restaurantService } from '@/services/restaurantService';
import { getErrorType } from '@/types/errors';
import { PostWithUser } from '@/types/post';
import { useFocusEffect, useRouter } from 'expo-router';
import { Search, SlidersHorizontal, Users, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type TabType = 'restaurants' | 'posts' | 'communities';

interface TabState<T> {
  data: T[];
  filtered: T[];
  loading: boolean;
  error: Error | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Fisher-Yates shuffle algorithm for randomizing arrays
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

const useTabData = <T extends any>(
  loadFn: () => Promise<T[]>,
  filterFn: (items: T[], query: string) => T[],
  shouldRandomize: boolean = false
) => {
  const [state, setState] = useState<TabState<T>>({
    data: [],
    filtered: [],
    loading: true,
    error: null,
  });

  const load = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await loadFn();
      const processedData = shouldRandomize ? shuffleArray(data) : data;
      setState({ data: processedData, filtered: processedData, loading: false, error: null });
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: err }));
    }
  };

  const filter = (query: string) => {
    const filtered = query ? filterFn(state.data, query) : state.data;
    setState(prev => ({ ...prev, filtered }));
  };

  return { ...state, load, filter };
};

export default function ExploreScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('restaurants');
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [isReRandomizing, setIsReRandomizing] = useState(false);
  const [showAddRestaurantModal, setShowAddRestaurantModal] = useState(false);
  
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Restaurant data management with randomization - now showing ALL restaurants
  const restaurants = useTabData(
    () => restaurantService.getAllRestaurants(100), // Increased limit to show more restaurants
    (items, query) => {
      const q = query.toLowerCase();
      return items.filter(r => 
        r.name?.toLowerCase().includes(q) ||
        r.cuisine_types?.some((c: string) => c.toLowerCase().includes(q)) ||
        r.city?.toLowerCase().includes(q) ||
        r.state?.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q)
      );
    },
    true // Enable randomization for restaurants
  );

  // Posts data management
  const posts = useTabData(
    () => postService.getExplorePosts({ limit: 50 }),
    (items, query) => {
      const q = query.toLowerCase();
      return items.filter(p => 
        p.caption?.toLowerCase().includes(q) ||
        p.restaurant?.name?.toLowerCase().includes(q) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(q))
      );
    }
  );

  // Handle user blocking - refresh posts to remove blocked user's content
  const handleUserBlocked = useCallback((blockedUserId: string) => {
    // Simply reload the posts, the backend will filter out blocked users
    posts.load();
  }, []);

  // Handle post deletion - refresh posts to remove deleted post
  const handlePostDeleted = useCallback((postId: string) => {
    // Simply reload the posts to get the updated list
    posts.load();
  }, []);

  const currentTab = activeTab === 'restaurants' ? restaurants : posts;

  // Load data on tab change
  useEffect(() => {
    if (activeTab === 'restaurants' && restaurants.data.length === 0) {
      restaurants.load().then(() => setHasInitiallyLoaded(true));
    } else if (activeTab === 'posts' && posts.data.length === 0) {
      posts.load();
    }
    // Clear re-randomizing state when switching tabs
    setIsReRandomizing(false);
  }, [activeTab]);

  // Reload and re-randomize restaurants when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Only reload restaurants if we're on the restaurants tab and have already loaded once
      if (activeTab === 'restaurants' && hasInitiallyLoaded) {
        const performReRandomization = async () => {
          setIsReRandomizing(true);
          await restaurants.load();
          // Small delay to ensure smooth transition
          setTimeout(() => {
            setIsReRandomizing(false);
          }, 300);
        };
        performReRandomization();
      }
    }, [activeTab, hasInitiallyLoaded])
  );

  // Filter on search change
  useEffect(() => {
    currentTab.filter(debouncedSearch);
  }, [debouncedSearch, activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await currentTab.load();
    
    // Ensure we mark as initially loaded after refresh
    if (activeTab === 'restaurants' && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    }
    setRefreshing(false);
  };

  const Header = useMemo(() => (
    <View style={styles.header}>
      {/* Compact Title Bar */}
      <View style={styles.titleBar}>
        <Text style={styles.title}>Explore</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/find-friends')}
          >
            <Users size={compactDesign.icon.small} color={designTokens.colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <SlidersHorizontal size={compactDesign.icon.small} color={designTokens.colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Compact Search Bar */}
      <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
        <Search size={compactDesign.icon.small} color={designTokens.colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          testID="search-input"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Minimal Tab Switcher */}
      <View style={styles.tabBar}>
        {(['restaurants', 'posts', 'communities'] as const).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => {
              if (tab === 'communities') {
                router.push('/add/communities');
              } else {
                setActiveTab(tab);
              }
            }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  ), [searchQuery, activeTab, router, searchFocused]);



  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    // Handle regular items
    if (activeTab === 'restaurants') {
      return (
        <View style={styles.restaurantCardWrapper}>
          <RestaurantCard
            testID={`restaurant-card-${index}`}
            restaurant={{
              id: item.id,
              name: item.name,
              image: restaurantService.getRestaurantImage(item),
              cuisine: item.cuisine_types?.[0] || 'Restaurant',
              rating: item.google_rating || item.troodie_rating || 0,
              location: item.neighborhood || item.city || 'Charlotte',
              priceRange: item.price_range || '$$',
            }}
            onPress={() => router.push({
              pathname: '/restaurant/[id]',
              params: { id: item.id }
            })}
          />
        </View>
      );
    }
    
    return (
      <PostCard
        post={item as PostWithUser}
        onPress={() => router.push({
          pathname: '/posts/[id]',
          params: { id: item.id }
        })}
        onLike={() => {}}
        onComment={() => {}}
        onSave={() => {}}
        onBlock={handleUserBlocked}
        onDelete={handlePostDeleted}
      />
    );
  }, [activeTab, router]);

  const EmptyComponent = useCallback(() => {
    if (currentTab.error) {
      return (
        <ErrorState
          error={currentTab.error}
          errorType={getErrorType(currentTab.error)}
          onRetry={currentTab.load}
          retrying={false}
        />
      );
    }

    // Show Add Restaurant CTA for restaurant search with no results
    const showAddRestaurantCTA = activeTab === 'restaurants' && debouncedSearch && debouncedSearch.length > 0;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>{activeTab === 'restaurants' ? '🍴' : '📝'}</Text>
        <Text style={styles.emptyTitle}>
          No {activeTab} found
        </Text>
        <Text style={styles.emptyText}>
          {debouncedSearch 
            ? showAddRestaurantCTA
              ? `Can't find "${debouncedSearch}"?`
              : 'Try adjusting your search'
            : activeTab === 'restaurants' 
              ? 'Check back soon for new restaurants'
              : 'Be the first to share your experience'
          }
        </Text>
        
        {showAddRestaurantCTA && (
          <TouchableOpacity
            style={styles.addRestaurantButton}
            onPress={() => setShowAddRestaurantModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={compactDesign.icon.small} color="#FFFFFF" />
            <Text style={styles.addRestaurantButtonText}>Add Restaurant</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [currentTab, activeTab, debouncedSearch]);

  // Loading state for initial load or re-randomization (but not when searching)
  if ((currentTab.loading && currentTab.data.length === 0) || (isReRandomizing && !searchQuery)) {
    return (
      <SafeAreaView style={styles.container}>
        <FlatList
          ListHeaderComponent={Header}
          data={[1, 2, 3, 4, 5]}
          renderItem={() => <RestaurantCardSkeleton />}
          keyExtractor={item => item.toString()}
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={Header}
        data={currentTab.filtered}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={designTokens.colors.primaryOrange}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={EmptyComponent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews
      />
      
      {/* Add Restaurant Modal */}
      <AddRestaurantModal
        visible={showAddRestaurantModal}
        onClose={() => setShowAddRestaurantModal(false)}
        initialSearchQuery={searchQuery}
        onRestaurantAdded={(restaurant) => {
          // Reload the restaurants list after adding a new one
          if (activeTab === 'restaurants') {
            restaurants.load();
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingBottom: compactDesign.content.gap,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: compactDesign.header.paddingHorizontal,
    paddingVertical: compactDesign.header.paddingVertical,
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: compactDesign.button.heightSmall,
    height: compactDesign.button.heightSmall,
    borderRadius: compactDesign.button.heightSmall / 2,
    backgroundColor: designTokens.colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundGray,
    marginHorizontal: compactDesign.content.padding,
    marginBottom: compactDesign.content.gap,
    paddingHorizontal: compactDesign.input.paddingHorizontal,
    height: compactDesign.input.height,
    borderRadius: designTokens.borderRadius.sm,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchBarFocused: {
    borderColor: designTokens.colors.primaryOrange,
    backgroundColor: '#FFF',
  },
  searchInput: {
    flex: 1,
    ...designTokens.typography.inputText,
    color: designTokens.colors.textDark,
    padding: 0,
  },
  clearText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.primaryOrange,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: compactDesign.content.padding,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: designTokens.borderRadius.sm,
    backgroundColor: designTokens.colors.backgroundGray,
  },
  tabActive: {
    backgroundColor: designTokens.colors.primaryOrange,
  },
  tabText: {
    ...designTokens.typography.filterText,
    fontWeight: '600',
    color: designTokens.colors.textMedium,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: compactDesign.content.padding,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
    marginBottom: 8,
  },
  emptyText: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
  },
  restaurantCardWrapper: {
    paddingHorizontal: compactDesign.content.padding,
  },
  addRestaurantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: designTokens.borderRadius.md,
    marginTop: 20,
    gap: 8,
  },
  addRestaurantButtonText: {
    ...designTokens.typography.buttonText,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});