import { AddRestaurantModal } from '@/components/AddRestaurantModal';
import { ErrorState } from '@/components/ErrorState';
import { RestaurantCardSkeleton } from '@/components/LoadingSkeleton';
import { PostCard } from '@/components/PostCard';
import { RestaurantCard } from '@/components/cards/RestaurantCard';
import { compactDesign, designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { postService } from '@/services/postService';
import { restaurantService } from '@/services/restaurantService';
import { Community, communityService } from '@/services/communityService';
import { userService } from '@/services/userService';
import { getErrorType } from '@/types/errors';
import { PostWithUser } from '@/types/post';
import { useFocusEffect, useRouter } from 'expo-router';
import { Calendar, Lock, MapPin, Plus, Search, SlidersHorizontal, TrendingUp, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
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
  loadFn: (searchQuery?: string) => Promise<T[]>,
  filterFn?: (items: T[], query: string) => T[],
  shouldRandomize: boolean = false
) => {
  const [state, setState] = useState<TabState<T>>({
    data: [],
    filtered: [],
    loading: true,
    error: null,
  });

  const load = async (searchQuery?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await loadFn(searchQuery);
      const processedData = shouldRandomize && !searchQuery ? shuffleArray(data) : data;
      setState({ data: processedData, filtered: processedData, loading: false, error: null });
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: err }));
    }
  };

  const filter = (query: string) => {
    // For restaurants, we'll reload with server-side search
    // For posts, we'll still use client-side filtering
    if (filterFn) {
      const filtered = query ? filterFn(state.data, query) : state.data;
      setState(prev => ({ ...prev, filtered }));
    } else {
      // Server-side search - reload data
      load(query);
    }
  };

  return { ...state, load, filter };
};

export default function ExploreScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { updateNetworkProgress } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('restaurants');
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [isReRandomizing, setIsReRandomizing] = useState(false);
  const [showAddRestaurantModal, setShowAddRestaurantModal] = useState(false);
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);


  const debouncedSearch = useDebounce(searchQuery, 300);

  // Restaurant data management with server-side search
  const restaurants = useTabData(
    (searchQuery?: string) => restaurantService.getRestaurantsForExplore(searchQuery, 200),
    undefined, // No client-side filtering - using server-side search
    true // Enable randomization for restaurants (only when no search query)
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

  // Communities data management
  const communities = useTabData(
    async () => {
      const allCommunities = await communityService.getCommunities(user?.id);
      // Fetch user's joined communities if logged in
      if (user) {
        const { joined, created } = await communityService.getUserCommunities(user.id);
        setUserCommunities([...joined, ...created]);
      }
      return allCommunities;
    },
    (items, query) => {
      const q = query.toLowerCase();
      return items.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q)
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

  // Check if user is member of a community
  const isUserMember = useCallback((communityId: string) => {
    return userCommunities.some(c => c.id === communityId);
  }, [userCommunities]);

  // Handle join community
  const handleJoinCommunity = async (community: Community) => {
    if (!user) {
      router.push('/onboarding/login' as any);
      return;
    }

    // Optimistic update - immediately add to user communities
    const previousUserCommunities = [...userCommunities];
    setUserCommunities([...userCommunities, community]);

    try {
      const { success, error } = await communityService.joinCommunity(user.id, community.id);

      if (success) {
        // Update network progress in background
        try {
          await userService.updateNetworkProgress(user.id, 'community');
          updateNetworkProgress('community');
        } catch (error) {
          console.error('Error updating network progress:', error);
        }

        // Refresh communities in background to sync any other changes
        communities.load();
      } else {
        // Revert optimistic update on failure
        setUserCommunities(previousUserCommunities);

        // Only show error if it's a real failure, not a duplicate join
        if (error && !error.includes('already')) {
          Alert.alert('Unable to join', error);
        }
      }
    } catch (err) {
      // Revert optimistic update on network error
      setUserCommunities(previousUserCommunities);
      console.error('Error joining community:', err);
    }
  };

  const currentTab = activeTab === 'restaurants' ? restaurants : activeTab === 'posts' ? posts : communities;

  // Load data on tab change
  useEffect(() => {
    if (activeTab === 'restaurants' && restaurants.data.length === 0) {
      restaurants.load().then(() => setHasInitiallyLoaded(true));
    } else if (activeTab === 'posts' && posts.data.length === 0) {
      posts.load();
    } else if (activeTab === 'communities' && communities.data.length === 0) {
      communities.load();
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
          await restaurants.load(); // Load without search query for re-randomization
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
    // For restaurants, reload with current search query; for posts and communities, load normally
    if (activeTab === 'restaurants') {
      await restaurants.load(debouncedSearch);
    } else if (activeTab === 'posts') {
      await posts.load();
    } else {
      await communities.load();
    }

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
            onPress={() => setActiveTab(tab)}
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

    if (activeTab === 'posts') {
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
    }

    // Render compact community card with image
    const community = item as Community;
    const isMember = isUserMember(community.id);
    const coverImage = community.is_event_based
      ? 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'
      : 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800';

    return (
      <TouchableOpacity
        style={styles.communityCard}
        onPress={() => router.push({
          pathname: '/add/community-detail',
          params: { communityId: community.id }
        })}
        activeOpacity={0.7}
      >
        <View style={styles.communityCardInner}>
          {/* Community Image */}
          <Image source={{ uri: coverImage }} style={styles.communityImageCompact} />

          {/* Badges on image */}
          {community.type === 'private' && (
            <View style={styles.privateBadgeCompact}>
              <Lock size={10} color="#FFFFFF" />
              <Text style={styles.privateBadgeTextCompact}>Private</Text>
            </View>
          )}

          {community.is_event_based && (
            <View style={styles.eventBadgeCompact}>
              <Calendar size={10} color="#FFFFFF" />
            </View>
          )}

          {/* Community Info */}
          <View style={styles.communityInfo}>
            <Text style={styles.communityName} numberOfLines={1}>
              {community.name}
            </Text>
            <Text style={styles.communityDescription} numberOfLines={2}>
              {community.description || `Discover ${community.location}'s best food spots`}
            </Text>
            <View style={styles.communityMetaRow}>
              <View style={styles.communityStats}>
                <Users size={12} color={designTokens.colors.textLight} />
                <Text style={styles.communityMetaCompact}>
                  {community.member_count.toLocaleString()}
                </Text>
                <Text style={styles.communityDivider}>•</Text>
                <MapPin size={12} color={designTokens.colors.textLight} />
                <Text style={styles.communityMetaCompact}>
                  {community.location}
                </Text>
              </View>

              {/* Join/Member Button */}
              {isMember ? (
                <View style={styles.memberBadgeCompact}>
                  <Text style={styles.memberBadgeTextCompact}>Joined</Text>
                </View>
              ) : community.type === 'public' ? (
                <TouchableOpacity
                  style={styles.joinButtonCompact}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleJoinCommunity(community);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.joinButtonTextCompact}>Join</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [activeTab, router, isUserMember, handleJoinCommunity]);

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
        <Text style={styles.emptyIcon}>{activeTab === 'restaurants' ? '🍴' : activeTab === 'posts' ? '📝' : '👥'}</Text>
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
              : activeTab === 'posts'
              ? 'Be the first to share your experience'
              : 'Join or create communities to connect with food enthusiasts'
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
        contentInsetAdjustmentBehavior="automatic"
      />
      
      {/* Add Restaurant Modal */}
      <AddRestaurantModal
        visible={showAddRestaurantModal}
        onClose={() => setShowAddRestaurantModal(false)}
        initialSearchQuery={searchQuery}
        onRestaurantAdded={(restaurant) => {
          // Reload the restaurants list after adding a new one
          if (activeTab === 'restaurants') {
            restaurants.load(); // Load without search query to show all restaurants including the new one
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
    paddingBottom: 100, // Increased to account for tab bar
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
  // Compact Community card styles with image
  communityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.borderRadius.md,
    marginBottom: 10,
    marginHorizontal: compactDesign.content.padding,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  communityCardInner: {
    flexDirection: 'row',
    height: 100,
    position: 'relative',
  },
  communityImageCompact: {
    width: 100,
    height: '100%',
    backgroundColor: '#F5F5F5',
  },
  communityInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  communityName: {
    fontSize: 15,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  communityDescription: {
    fontSize: 13,
    color: designTokens.colors.textMedium,
    lineHeight: 18,
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  communityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  communityMetaCompact: {
    fontSize: 11,
    color: designTokens.colors.textLight,
    letterSpacing: -0.1,
  },
  communityDivider: {
    fontSize: 11,
    color: designTokens.colors.textLight,
    marginHorizontal: 2,
  },
  privateBadgeCompact: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  privateBadgeTextCompact: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eventBadgeCompact: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonCompact: {
    height: 28,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: designTokens.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonTextCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  memberBadgeCompact: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberBadgeTextCompact: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    letterSpacing: -0.1,
  },
});