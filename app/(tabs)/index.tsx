import { RestaurantCardWithSave } from '@/components/cards/RestaurantCardWithSave';
import { ErrorState } from '@/components/ErrorState';
import QuickSavesBoard from '@/components/home/QuickSavesBoard';
import { InfoModal } from '@/components/InfoModal';
import { NotificationBadge } from '@/components/NotificationBadge';
import { NotificationCenter } from '@/components/NotificationCenter';
import { CitySelector } from '@/components/CitySelector';
import { locationService } from '@/services/locationService';
import { applyShadow, designTokens } from '@/constants/designTokens';
import { strings } from '@/constants/strings';
import { theme } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { personas } from '@/data/personas';
import { useSmoothDataFetch } from '@/hooks/useSmoothDataFetch';
import { boardService } from '@/services/boardService';
import { communityService } from '@/services/communityService';
import { InviteService } from '@/services/inviteService';
import { notificationService } from '@/services/notificationService';
import { postService } from '@/services/postService';
import { restaurantService } from '@/services/restaurantService';
import { NetworkSuggestion, TrendingContent } from '@/types/core';
import { getErrorType } from '@/types/errors';
import { Notification } from '@/types/notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Bell,
  Bookmark,
  Coffee,
  Globe,
  Lock,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  Users,
  Utensils
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';



export default function HomeScreen() {
  const router = useRouter();
  const { userState, hasCreatedBoard, hasCreatedPost, hasJoinedCommunity, networkProgress, updateNetworkProgress } = useApp();
  const { user } = useAuth();
  const { state: onboardingState } = useOnboarding();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showRecommendationsInfo, setShowRecommendationsInfo] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedCity, setSelectedCity] = useState('Charlotte');
  const [cityLoading, setCityLoading] = useState(false);
  
  const persona = useMemo(
    () => onboardingState.persona && personas[onboardingState.persona],
    [onboardingState.persona]
  );
  const inviteService = useMemo(() => new InviteService(), []);

  // Data fetching functions
  const fetchHomeData = useCallback(async () => {
    const [topRated, featured] = await Promise.all([
      restaurantService.getTopRatedRestaurants(selectedCity),
      restaurantService.getFeaturedRestaurants(10)
    ]);
    
    return { topRated, featured };
  }, [selectedCity]);

  const fetchUserBoards = useCallback(async () => {
    if (!user?.id) return [];
    try {
      return await boardService.getUserBoards(user.id);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading boards:', error);
      }
      return [];
    }
  }, [user?.id]);

  // Use smooth data fetching hooks
  const { 
    data: restaurantsData, 
    loading, 
    refreshing, 
    error,
    refresh: refreshRestaurants 
  } = useSmoothDataFetch(fetchHomeData, [selectedCity], {
    minLoadingTime: 500,
    showLoadingOnRefetch: false,
    fetchOnFocus: false, // Disable fetch on focus to prevent unnecessary refreshes
    cacheDuration: 5000 // 5 seconds cache to prevent rapid re-fetches
  });

  const { 
    data: userBoards = [], 
    refresh: refreshBoards,
    silentRefresh: silentRefreshBoards
  } = useSmoothDataFetch(fetchUserBoards, [user?.id], {
    minLoadingTime: 300,
    showLoadingOnRefetch: false,
    fetchOnFocus: true,
    cacheDuration: 60000 // 1 minute cache
  });

  const topRatedRestaurants = restaurantsData?.topRated || [];
  const featuredRestaurants = restaurantsData?.featured || [];

  // Check user progress
  const checkUserProgress = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const [boards, posts, communities] = await Promise.all([
        boardService.getUserBoards(user.id),
        postService.getUserPosts(user.id),
        communityService.getUserCommunities(user.id)
      ]);
      
      if (boards.length > 0 && !hasCreatedBoard) {
        updateNetworkProgress('board');
      }
      if (posts.length > 0 && !hasCreatedPost) {
        updateNetworkProgress('post');
      }
      if (communities.length > 0 && !hasJoinedCommunity) {
        updateNetworkProgress('community');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error checking user progress:', error);
      }
    }
  }, [user?.id, hasCreatedBoard, hasCreatedPost, hasJoinedCommunity, updateNetworkProgress]);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading notification count:', error);
      }
    }
  }, [user?.id]);

  // Initialize location service with cleanup
  useEffect(() => {
    let isMounted = true;
    
    const initializeLocation = async () => {
      await locationService.initialize();
      const city = await locationService.detectCurrentCity();
      
      if (isMounted && locationService.isCityAvailable(city)) {
        setSelectedCity(city);
      }
    };
    
    initializeLocation();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle city change with loading state
  const handleCityChange = useCallback((newCity: string) => {
    if (newCity !== selectedCity) {
      setCityLoading(true);
      setSelectedCity(newCity);
      // Loading will be turned off by the data fetch hook
      setTimeout(() => setCityLoading(false), 1000);
    }
  }, [selectedCity]);

  // Remove this useEffect - the dependency array in useSmoothDataFetch already handles city changes

  // Effects
  useEffect(() => {
    if (user?.id) {
      loadUnreadCount();
      checkUserProgress();
    }
  }, [user?.id, loadUnreadCount, checkUserProgress]);

  // Combined refresh function
  const onRefresh = async () => {
    await Promise.all([
      refreshRestaurants(),
      refreshBoards(),
      user?.id && loadUnreadCount(),
      user?.id && checkUserProgress()
    ]);
  };

  const handleBoardUpdate = async () => {
    // Refresh board data silently
    await silentRefreshBoards();
    // Trigger QuickSavesBoard refresh
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNotificationPress = (notification: Notification) => {
    setShowNotificationCenter(false);
    // The notification center will handle navigation
  };

  const transformToTopRatedContent = useCallback((restaurants: any[]): TrendingContent[] => {
    return restaurants.map(restaurant => ({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        image: restaurant.cover_photo_url || restaurant.photos?.[0] || '',
        cuisine: restaurant.cuisine_types?.[0] || 'Restaurant',
        rating: restaurant.troodie_rating || restaurant.google_rating || 0,
        location: restaurant.city || 'Charlotte',
        priceRange: restaurant.price_range || '$$'
      },
      stats: {
        saves: restaurant.troodie_reviews_count || 0,
        visits: restaurant.saves_count || 0,
        photos: restaurant.photos?.length || 0
      },
      highlights: [
        `${restaurant.google_rating?.toFixed(1) || 'N/A'} ★ rating`,
        restaurant.cuisine_types?.[0] || 'Restaurant',
        restaurant.price_range || '$$'
      ],
      type: 'trending_spot' as const
    }));
  }, []);
  
  // Transform top rated restaurants for display
  const topRatedContent = useMemo(
    () => transformToTopRatedContent(topRatedRestaurants),
    [topRatedRestaurants, transformToTopRatedContent]
  );

  const handleInviteFriends = async () => {
    try {
      const inviteLink = await inviteService.generateInviteLink(user!.id);
      // Handle invite link sharing
      // Invite link created
    } catch (error) {
      console.error('Error creating invite link:', error);
    }
  };

  const networkSuggestions: NetworkSuggestion[] = [
    {
      action: 'Create Board',
      description: 'Organize your favorite restaurants into collections',
      icon: Bookmark,
      cta: 'Create Board',
      benefit: 'Keep your saves organized',
      onClick: () => router.push('/add/create-board'),
      condition: () => !hasCreatedBoard,
      completed: hasCreatedBoard
    },
    {
      action: 'Create Post',
      description: 'Share your restaurant experiences with the community',
      icon: MessageSquare,
      cta: 'Share Experience',
      benefit: 'Connect with other food lovers',
      onClick: () => router.push('/add/create-post'),
      condition: () => !hasCreatedPost,
      completed: hasCreatedPost
    },
    {
      action: 'Join Community',
      description: 'Connect with people who share your dining interests',
      icon: Users,
      cta: 'Find Communities',
      benefit: 'Discover new restaurants together',
      onClick: () => router.push('/add/communities'),
      condition: () => !hasJoinedCommunity,
      completed: hasJoinedCommunity
    }
  ];

  // Filter suggestions based on conditions
  const filteredNetworkSuggestions = networkSuggestions.filter(suggestion => 
    suggestion.condition ? suggestion.condition() : true
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.brandName}>{strings.app.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/explore')}>
            <Search size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => setShowNotificationCenter(true)}
          >
            <View style={styles.notificationContainer}>
              <Bell size={24} color={designTokens.colors.textDark} />
              <NotificationBadge count={unreadCount} size="small" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderWelcomeBanner = () => (
    <View style={styles.welcomeBannerContainer}>
      <LinearGradient
        colors={designTokens.gradients.welcomeBanner as any}
        style={styles.welcomeBanner}
      >
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeIconContainer}>
            <Sparkles size={20} color={designTokens.colors.white} />
          </View>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>Welcome to {strings.app.name}!</Text>
            <Text style={styles.welcomeDescription}>
              {strings.app.tagline}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.welcomeCTA} 
            onPress={() => router.push('/explore')}
          >
            <Text style={styles.welcomeCTAText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  const renderNetworkBuilding = () => {
    // Don't show if user has completed all network building actions
    if (hasCreatedBoard && hasCreatedPost && hasJoinedCommunity) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.networkHeader}>
          <View style={styles.networkTitleContainer}>
            <UserPlus size={16} color={designTokens.colors.primaryOrange} />
            <Text style={styles.sectionTitle}>Build Your Network</Text>
          </View>
          <View style={styles.networkProgress}>
            <Text style={styles.progressText}>
              {networkProgress} of 3 completed
            </Text>
          </View>
        </View>
        <View style={styles.networkCards}>
          {filteredNetworkSuggestions.map((suggestion, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.networkCard,
                suggestion.completed && styles.networkCardCompleted
              ]}
              onPress={suggestion.onClick}
            >
              <View style={styles.networkCardIcon}>
                <suggestion.icon size={20} color={designTokens.colors.primaryOrange} />
                {suggestion.completed && (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>✓</Text>
                  </View>
                )}
              </View>
              <View style={styles.networkCardContent}>
                <Text style={styles.networkCardTitle}>{suggestion.action}</Text>
                <Text style={styles.networkCardDescription}>{suggestion.description}</Text>
                <Text style={styles.networkCardBenefit}>{suggestion.benefit}</Text>
              </View>
              <TouchableOpacity 
                style={[
                  styles.networkCardCTA,
                  suggestion.completed && styles.networkCardCTACompleted
                ]} 
                onPress={suggestion.onClick}
              >
                <Text style={styles.networkCardCTAText}>
                  {suggestion.completed ? 'Completed' : suggestion.cta}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderPersonalizedSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Perfect For You</Text>
        {persona && (
          <View style={styles.personaBadge}>
            <Text style={styles.personaEmoji}>{persona.emoji}</Text>
            <Text style={styles.personaName}>{persona.name}</Text>
          </View>
        )}
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        <TouchableOpacity style={styles.categoryCard}>
          <View style={[styles.categoryIcon, { backgroundColor: '#FFE5B4' }]}>
            <Coffee size={24} color="#8B4513" />
          </View>
          <Text style={styles.categoryName}>Quick Lunch Spots</Text>
          <Text style={styles.categoryDescription}>Perfect for your busy schedule</Text>
          <Text style={styles.categoryCount}>12 restaurants</Text>
          <TouchableOpacity style={styles.categoryButton}>
            <Text style={styles.categoryButtonText}>Explore</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity style={styles.categoryCard}>
          <View style={[styles.categoryIcon, { backgroundColor: '#E5D4FF' }]}>
            <Utensils size={24} color="#6B46C1" />
          </View>
          <Text style={styles.categoryName}>Date Night Ready</Text>
          <Text style={styles.categoryDescription}>Romantic spots for special occasions</Text>
          <Text style={styles.categoryCount}>8 restaurants</Text>
          <TouchableOpacity style={styles.categoryButton}>
            <Text style={styles.categoryButtonText}>Explore</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderYourBoards = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Boards</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      
      {(userBoards || []).length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Bookmark size={32} color="#DDD" />
          </View>
          <Text style={styles.emptyStateTitle}>Create Your First Board</Text>
          <Text style={styles.emptyStateDescription}>
            Organize your favorite restaurants into collections
          </Text>
          <TouchableOpacity style={styles.emptyStateCTA} onPress={() => router.push('/add/create-board')}>
            <Text style={styles.emptyStateCTAText}>Create Board</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {(userBoards || []).slice(0, 5).map((board) => (
            <TouchableOpacity 
              key={board.id} 
              style={styles.boardCard}
              onPress={() => router.push(`/boards/${board.id}`)}
            >
              <View style={styles.boardCardHeader}>
                <View style={styles.boardCardIcon}>
                  <Bookmark size={20} color={designTokens.colors.primaryOrange} />
                </View>
                <Text style={styles.boardCardTitle} numberOfLines={1}>
                  {board.title}
                </Text>
              </View>
              <Text style={styles.boardCardDescription} numberOfLines={2}>
                {board.description || 'No description'}
              </Text>
              <View style={styles.boardCardFooter}>
                <Text style={styles.boardCardCount}>
                  {board.restaurant_count || 0} restaurants
                </Text>
                <View style={styles.boardCardPrivacy}>
                  {board.is_private ? (
                    <Lock size={12} color={designTokens.colors.textMedium} />
                  ) : (
                    <Globe size={12} color={designTokens.colors.textMedium} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderTopRatedSection = () => {
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.sectionTitle}>
              Top Rated in {selectedCity}
            </Text>
            <CitySelector
              currentCity={selectedCity}
              onCityChange={handleCityChange}
              compact
            />
          </View>
        </View>
        
        {cityLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
            <Text style={styles.loadingStateText}>Loading {selectedCity} restaurants...</Text>
          </View>
        ) : topRatedRestaurants.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Sparkles size={32} color="#DDD" />
            </View>
            <Text style={styles.emptyStateTitle}>
              No restaurants found in {selectedCity}
            </Text>
            <Text style={styles.emptyStateDescription}>
              Be the first to discover and share amazing restaurants in this area!
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateCTA} 
              onPress={() => router.push('/add/save-restaurant')}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.emptyStateCTAText}>Add Restaurant</Text>
            </TouchableOpacity>
          </View>
        ) : (
          topRatedContent.map((item, index) => (
            <View key={index} style={styles.trendingCard}>
              <RestaurantCardWithSave
  restaurant={item.restaurant}
  stats={item.stats}
  onPress={() => {
    router.push({
      pathname: '/restaurant/[id]',
      params: { id: item.restaurant.id },
    });
  }}
  onRefresh={handleBoardUpdate}
  highlights={item.highlights}
/>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.quickActionButton}>
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.quickActionText}>Add Place</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
          <Text style={styles.loadingText}>Loading {selectedCity}&apos;s best spots...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !trendingRestaurants.length && !featuredRestaurants.length) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <ErrorState
          error={error}
          errorType={getErrorType(error)}
          onRetry={refreshRestaurants}
          retrying={refreshing}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={designTokens.colors.primaryOrange}
          />
        }
      >
        {renderHeader()}
        
        {userState.isNewUser && renderWelcomeBanner()}
        
        {renderNetworkBuilding()}
        
        {user && <QuickSavesBoard refreshTrigger={refreshTrigger} />}
        
        {renderYourBoards()}
        
        {renderTopRatedSection()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {renderQuickActions()}

      {showNotificationCenter && (
        <NotificationCenter
          onClose={() => setShowNotificationCenter(false)}
          onNotificationPress={handleNotificationPress}
        />
      )}

      <InfoModal
        visible={showRecommendationsInfo}
        onClose={() => setShowRecommendationsInfo(false)}
        title={strings.recommendations.modalTitle}
        content={strings.recommendations.modalDescription}
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
    paddingBottom: designTokens.spacing.xxl,
    marginBottom: designTokens.spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandName: {
    ...designTokens.typography.brandHeading,
    color: designTokens.colors.textDark,
  },
  headerActions: {
    flexDirection: 'row',
    gap: designTokens.spacing.lg,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagline: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginTop: designTokens.spacing.xs,
  },
  welcomeBannerContainer: {
    marginHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xxl,
  },
  welcomeBanner: {
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange + '33',
    ...applyShadow('card'),
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
  },
  welcomeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designTokens.colors.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  welcomeDescription: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
  },
  welcomeCTA: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
  },
  welcomeCTAText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  section: {
    marginBottom: designTokens.spacing.xxxl,
  },
  sectionHeader: {
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.lg,
  },
  sectionTitle: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
  seeAll: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
  },
  networkCards: {
    paddingHorizontal: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
  },
  networkCard: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    ...applyShadow('card'),
  },
  networkCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.md,
    position: 'relative', // For completed badge
  },
  networkCardContent: {
    flex: 1,
  },
  networkCardTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  networkCardDescription: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginBottom: 4,
  },
  networkCardBenefit: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
  },
  networkCardCTA: {
    backgroundColor: designTokens.colors.white,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.sm,
  },
  networkCardCTAText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  personaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundGray,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.xl,
    gap: designTokens.spacing.sm,
  },
  personaEmoji: {
    fontSize: 16,
  },
  personaName: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
  horizontalScroll: {
    paddingLeft: designTokens.spacing.lg,
  },
  categoryCard: {
    width: 200,
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.lg,
    marginRight: designTokens.spacing.md,
    ...applyShadow('card'),
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: designTokens.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  categoryName: {
    ...designTokens.typography.bodyMedium,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.xs,
  },
  categoryDescription: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.sm,
  },
  categoryCount: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
    marginBottom: designTokens.spacing.md,
  },
  categoryButton: {
    backgroundColor: designTokens.colors.backgroundGray,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    alignItems: 'center',
  },
  categoryButtonText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxxl,
    paddingHorizontal: designTokens.spacing.xxl,
    marginHorizontal: designTokens.spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.lg,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.xl,
    gap: designTokens.spacing.sm,
  },
  loadingStateText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textSecondary,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: designTokens.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  emptyStateTitle: {
    ...designTokens.typography.cardTitle,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
    textAlign: 'center',
  },
  emptyStateDescription: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  emptyStateCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.xxl,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.full,
  },
  emptyStateCTAText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  placeholderText: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textLight,
    textAlign: 'center',
    paddingVertical: designTokens.spacing.xxxl,
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
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.lg,
  },

  quickActions: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.full,
    gap: designTokens.spacing.sm,
    ...applyShadow('button'),
  },
  quickActionText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  bottomPadding: {
    height: 100,
  },
  networkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.lg,
  },
  networkTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  getStartedBadge: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
  },
  getStartedBadgeText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
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
  boardCard: {
    width: 200,
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.md,
    marginRight: designTokens.spacing.md,
    ...applyShadow('card'),
  },
  boardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  boardCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.sm,
  },
  boardCardTitle: {
    ...designTokens.typography.bodyMedium,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
    flex: 1,
  },
  boardCardDescription: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.sm,
  },
  boardCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boardCardCount: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
  },
  boardCardPrivacy: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContainer: {
    position: 'relative'
  },
  networkProgress: {
    backgroundColor: designTokens.colors.backgroundGray,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
  },
  progressText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
  networkCardCompleted: {
    backgroundColor: designTokens.colors.backgroundLight,
    borderColor: designTokens.colors.primaryOrange,
  },
  completedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: designTokens.colors.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  networkCardCTACompleted: {
    backgroundColor: designTokens.colors.backgroundGray,
    borderColor: designTokens.colors.borderLight,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    flex: 1,
  },
  infoButton: {
    padding: designTokens.spacing.xs,
    marginLeft: designTokens.spacing.xs,
  },
  sectionSubtitle: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    marginTop: 4,
  },
});
