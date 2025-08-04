# Task 6.11: Implement Perfect for You Section

## Epic
Epic 6: Missing Core Screens and Functionality

## Priority
High

## Estimate
5 days

## Status
🔴 Not Started

## Overview
Implement the "Perfect for You" section on the homepage that provides personalized restaurant recommendations based on user preferences, past saves, ratings, and behavior patterns.

## Business Value
- Provides personalized restaurant discovery experience
- Increases user engagement through relevant recommendations
- Improves user retention by showing valuable content
- Creates a differentiated experience from competitors
- Drives restaurant discovery and saves

## Dependencies
- Task 6.7: Implement Quick Saves Board System (for user save data)
- Task 6.8: Define Trending Restaurant Algorithm (for trending data)
- Task 6.9: Implement Traffic Light Rating System (for rating data)
- Task 3.4: User Profile Implementation (for user preferences)

## Blocks
- Enhanced personalized user experience
- Better restaurant discovery and engagement

## Acceptance Criteria

### Gherkin Scenarios

```gherkin
Feature: Perfect for You Section
  As a user
  I want to see personalized restaurant recommendations
  So that I can discover restaurants that match my preferences

Scenario: View Personalized Recommendations
  Given a user has saved restaurants and rated them
  When they visit the homepage
  Then they see a "Perfect for You" section
  And the section shows restaurants based on their preferences
  And the recommendations are different from trending restaurants

Scenario: New User Recommendations
  Given a new user has no save history
  When they visit the homepage
  Then they see popular restaurants in their area
  And the section encourages them to save restaurants
  And they can tap to explore more options

Scenario: Recommendation Based on Cuisine Preferences
  Given a user has saved many Italian restaurants
  When they view the Perfect for You section
  Then they see more Italian restaurant recommendations
  And the recommendations include both saved and new restaurants

Scenario: Recommendation Based on Rating Patterns
  Given a user has rated restaurants with green lights
  When they view recommendations
  Then they see restaurants similar to their highly-rated ones
  And the recommendations consider their positive experiences

Scenario: Location-Based Recommendations
  Given a user is in Charlotte
  When they view the Perfect for You section
  Then they see restaurants in their area
  And the recommendations consider their location preferences

Scenario: Refresh Recommendations
  Given a user has been using the app for a while
  When they pull to refresh the homepage
  Then the Perfect for You section updates with new recommendations
  And the recommendations reflect their latest activity
```

## Technical Implementation

### Backend Changes

#### Recommendation Algorithm
```typescript
// services/recommendationService.ts
interface UserPreferences {
  cuisineTypes: string[];
  priceRanges: string[];
  locations: string[];
  ratingPatterns: {
    greenCount: number;
    yellowCount: number;
    redCount: number;
  };
  saveHistory: string[];
  visitTypes: string[];
}

interface RecommendationFactors {
  cuisineSimilarity: number;
  locationProximity: number;
  ratingCompatibility: number;
  popularityScore: number;
  freshnessScore: number;
  userEngagement: number;
}

export const getPersonalizedRecommendations = async (
  userId: string,
  limit: number = 10
): Promise<Restaurant[]> => {
  // Get user preferences and behavior
  const userPrefs = await getUserPreferences(userId);
  
  // Get candidate restaurants
  const candidates = await getCandidateRestaurants(userId);
  
  // Calculate recommendation scores
  const scoredRestaurants = await Promise.all(
    candidates.map(async (restaurant) => {
      const factors = await calculateRecommendationFactors(restaurant, userPrefs);
      const score = calculateRecommendationScore(factors);
      
      return {
        ...restaurant,
        recommendationScore: score,
        factors
      };
    })
  );
  
  // Sort by score and return top recommendations
  return scoredRestaurants
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit)
    .map(({ recommendationScore, factors, ...restaurant }) => restaurant);
};

const getUserPreferences = async (userId: string): Promise<UserPreferences> => {
  // Get user's save history
  const { data: saves } = await supabase
    .from('restaurant_saves')
    .select(`
      restaurant:restaurants(
        cuisine_types,
        price_range,
        location,
        city,
        state
      ),
      traffic_light_rating,
      created_at
    `)
    .eq('user_id', userId);
  
  // Analyze preferences
  const cuisineTypes = saves
    ?.map(save => save.restaurant.cuisine_types)
    .flat()
    .filter(Boolean) || [];
  
  const priceRanges = saves
    ?.map(save => save.restaurant.price_range)
    .filter(Boolean) || [];
  
  const locations = saves
    ?.map(save => `${save.restaurant.city}, ${save.restaurant.state}`)
    .filter(Boolean) || [];
  
  const ratingPatterns = {
    greenCount: saves?.filter(save => save.traffic_light_rating === 'green').length || 0,
    yellowCount: saves?.filter(save => save.traffic_light_rating === 'yellow').length || 0,
    redCount: saves?.filter(save => save.traffic_light_rating === 'red').length || 0,
  };
  
  return {
    cuisineTypes: [...new Set(cuisineTypes)],
    priceRanges: [...new Set(priceRanges)],
    locations: [...new Set(locations)],
    ratingPatterns,
    saveHistory: saves?.map(save => save.restaurant.id) || [],
    visitTypes: [] // TODO: Add visit type tracking
  };
};

const calculateRecommendationFactors = async (
  restaurant: Restaurant,
  userPrefs: UserPreferences
): Promise<RecommendationFactors> => {
  // Cuisine similarity
  const cuisineSimilarity = calculateCuisineSimilarity(
    restaurant.cuisine_types,
    userPrefs.cuisineTypes
  );
  
  // Location proximity
  const locationProximity = calculateLocationProximity(
    restaurant.location,
    userPrefs.locations
  );
  
  // Rating compatibility
  const ratingCompatibility = calculateRatingCompatibility(
    restaurant,
    userPrefs.ratingPatterns
  );
  
  // Popularity score
  const popularityScore = await calculatePopularityScore(restaurant.id);
  
  // Freshness score (newer restaurants get higher scores)
  const freshnessScore = calculateFreshnessScore(restaurant.created_at);
  
  // User engagement potential
  const userEngagement = calculateUserEngagement(restaurant, userPrefs);
  
  return {
    cuisineSimilarity,
    locationProximity,
    ratingCompatibility,
    popularityScore,
    freshnessScore,
    userEngagement
  };
};

const calculateRecommendationScore = (factors: RecommendationFactors): number => {
  // Weighted scoring algorithm
  return (
    factors.cuisineSimilarity * 0.3 +
    factors.locationProximity * 0.25 +
    factors.ratingCompatibility * 0.2 +
    factors.popularityScore * 0.15 +
    factors.freshnessScore * 0.05 +
    factors.userEngagement * 0.05
  );
};
```

#### Recommendation API Endpoints
```typescript
// services/recommendationService.ts
export const getPerfectForYouRecommendations = async (
  userId: string,
  location?: { lat: number, lng: number }
) => {
  try {
    const recommendations = await getPersonalizedRecommendations(userId, 10);
    
    // Filter by location if provided
    if (location) {
      return recommendations.filter(restaurant => 
        isWithinRadius(restaurant.location, location, 50) // 50km radius
      );
    }
    
    return recommendations;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
};

export const getNewUserRecommendations = async (
  location?: { lat: number, lng: number }
) => {
  // For new users, show popular restaurants in their area
  const { data: popularRestaurants } = await supabase
    .from('restaurants')
    .select('*')
    .eq('is_trending', true)
    .order('trending_score', { ascending: false })
    .limit(10);
  
  if (location) {
    return popularRestaurants?.filter(restaurant => 
      isWithinRadius(restaurant.location, location, 50)
    ) || [];
  }
  
  return popularRestaurants || [];
};
```

### Frontend Changes

#### Perfect for You Component
```typescript
// components/PerfectForYouSection.tsx
interface PerfectForYouSectionProps {
  userId?: string;
  onRestaurantPress: (restaurantId: string) => void;
  onViewAllPress: () => void;
}

export const PerfectForYouSection: React.FC<PerfectForYouSectionProps> = ({
  userId,
  onRestaurantPress,
  onViewAllPress
}) => {
  const [recommendations, setRecommendations] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, [userId]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let recommendations: Restaurant[];
      
      if (userId) {
        // Get personalized recommendations
        recommendations = await getPerfectForYouRecommendations(userId);
      } else {
        // Get new user recommendations
        recommendations = await getNewUserRecommendations();
      }
      
      setRecommendations(recommendations);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadRecommendations();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Perfect for You</Text>
          <LoadingSkeleton />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Perfect for You</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfect for You</Text>
        {recommendations.length > 0 && (
          <TouchableOpacity onPress={onViewAllPress}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {recommendations.length === 0 ? (
        <EmptyRecommendationsState onRefresh={handleRefresh} />
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {recommendations.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onPress={() => onRestaurantPress(restaurant.id)}
              style={styles.restaurantCard}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const EmptyRecommendationsState: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => (
  <View style={styles.emptyState}>
    <Ionicons name="restaurant-outline" size={48} color="#CCC" />
    <Text style={styles.emptyTitle}>No recommendations yet</Text>
    <Text style={styles.emptySubtitle}>
      Start saving restaurants to get personalized recommendations
    </Text>
    <TouchableOpacity style={styles.exploreButton} onPress={onRefresh}>
      <Text style={styles.exploreButtonText}>Explore Restaurants</Text>
    </TouchableOpacity>
  </View>
);
```

#### Homepage Integration
```typescript
// app/(tabs)/index.tsx
const HomeScreen = () => {
  const { user } = useAuth();
  const router = useRouter();

  const handleRestaurantPress = (restaurantId: string) => {
    router.push(`/restaurant/${restaurantId}`);
  };

  const handleViewAllRecommendations = () => {
    router.push('/recommendations');
  };

  return (
    <ScrollView style={styles.container} refreshControl={
      <RefreshControl onRefresh={() => {
        // Refresh all sections
        // This will trigger re-renders of child components
      }} />
    }>
      {/* Welcome Section */}
      <WelcomeSection user={user} />
      
      {/* Perfect for You Section */}
      <PerfectForYouSection
        userId={user?.id}
        onRestaurantPress={handleRestaurantPress}
        onViewAllPress={handleViewAllRecommendations}
      />
      
      {/* Quick Saves Section */}
      <QuickSavesBoard
        userId={user?.id}
        onRestaurantPress={handleRestaurantPress}
      />
      
      {/* Trending Section */}
      <TrendingRestaurantsSection
        onRestaurantPress={handleRestaurantPress}
      />
      
      {/* More sections */}
    </ScrollView>
  );
};
```

#### Recommendations Screen
```typescript
// app/recommendations.tsx
const RecommendationsScreen = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const recs = await getPersonalizedRecommendations(user?.id || '', 50);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfect for You</Text>
        <Text style={styles.subtitle}>
          Restaurants we think you'll love
        </Text>
      </View>
      
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <FlatList
          data={recommendations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RestaurantCard
              restaurant={item}
              onPress={() => router.push(`/restaurant/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};
```

## Definition of Done

- [ ] Recommendation algorithm is implemented and tested
- [ ] Perfect for You section displays on homepage
- [ ] Personalized recommendations work for existing users
- [ ] New user recommendations show popular restaurants
- [ ] Recommendations update based on user activity
- [ ] Location-based filtering is implemented
- [ ] Performance is optimized for recommendation loading
- [ ] Error handling is implemented for all operations
- [ ] User experience is smooth and engaging
- [ ] Recommendations are clearly differentiated from trending

## Resources

### Design References
- Reference `/docs/frontend-design-language.md` for consistent styling
- Use engaging visuals for recommendation cards
- Follow established patterns for section headers

### Technical References
- `/docs/backend-design.md` for database schema
- User save and rating data for preference analysis
- Location services for proximity calculations

### Related Documentation
- User profile and preference tracking
- Restaurant save and rating functionality
- Location-based services implementation

## Notes

### User Experience Considerations
- Make recommendations feel personal and relevant
- Provide clear explanation of why restaurants are recommended
- Allow users to provide feedback on recommendations
- Consider A/B testing different recommendation algorithms

### Technical Considerations
- Cache recommendations to improve performance
- Implement fallback recommendations for edge cases
- Consider privacy implications of recommendation data
- Handle cases where user has no activity history

### Future Enhancements
- Machine learning for more sophisticated recommendations
- Collaborative filtering based on similar users
- Seasonal and time-based recommendations
- Integration with external recommendation APIs 