# Task 6.9: Implement Traffic Light Rating System

## Epic
Epic 6: Missing Core Screens and Functionality

## Priority
High

## Estimate
4 days

## Status
🔴 Not Started

## Overview
Implement a traffic light rating system (Red: Hate it, Yellow: Meh, Green: Love it) for restaurants, replacing traditional star ratings with a more intuitive and engaging rating mechanism.

## Business Value
- Provides a more intuitive and fun rating experience
- Reduces rating fatigue with simple three-option system
- Creates clear visual distinction between positive and negative experiences
- Encourages more user engagement with rating system
- Aligns with modern social media rating patterns

## Dependencies
- Task 2.2: Restaurant Search & Discovery (for restaurant data)
- Task 6.1: Restaurant Detail Screen (for rating display)
- Task 6.2: Post Creation & Management (for rating integration)

## Blocks
- Task 6.11: Implement Perfect for You Section (can use rating data)
- Enhanced restaurant discovery and recommendation features

## Acceptance Criteria

### Gherkin Scenarios

```gherkin
Feature: Traffic Light Rating System
  As a user
  I want to rate restaurants with a simple traffic light system
  So that I can quickly share my dining experience

Scenario: Rate Restaurant with Green Light
  Given a user is viewing a restaurant
  When they tap the green light rating
  Then the restaurant is marked as "Love it"
  And the rating is saved to their profile
  And the restaurant's overall rating is updated

Scenario: Rate Restaurant with Yellow Light
  Given a user is viewing a restaurant
  When they tap the yellow light rating
  Then the restaurant is marked as "Meh"
  And the rating is saved to their profile
  And the restaurant's overall rating is updated

Scenario: Rate Restaurant with Red Light
  Given a user is viewing a restaurant
  When they tap the red light rating
  Then the restaurant is marked as "Hate it"
  And the rating is saved to their profile
  And the restaurant's overall rating is updated

Scenario: View Restaurant Rating Summary
  Given a restaurant has multiple user ratings
  When a user views the restaurant
  Then they see the traffic light rating summary
  And the percentage of each rating type is displayed
  And the overall rating is calculated

Scenario: Update Existing Rating
  Given a user has already rated a restaurant
  When they tap a different traffic light
  Then their previous rating is updated
  And the restaurant's rating summary is recalculated

Scenario: Rating Display on Explore Page
  Given restaurants are displayed on the explore page
  When users browse restaurants
  Then they see traffic light ratings for each restaurant
  And the ratings are visually distinct and easy to understand
```

## Technical Implementation

### Backend Changes

#### Database Schema Updates
```sql
-- Add traffic light rating fields to restaurant_saves table
ALTER TABLE public.restaurant_saves 
ADD COLUMN traffic_light_rating character varying CHECK (
  traffic_light_rating::text = ANY (
    ARRAY['red'::character varying, 'yellow'::character varying, 'green'::character varying]
  )
);

-- Add rating summary fields to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN red_ratings_count integer DEFAULT 0,
ADD COLUMN yellow_ratings_count integer DEFAULT 0,
ADD COLUMN green_ratings_count integer DEFAULT 0,
ADD COLUMN total_ratings_count integer DEFAULT 0,
ADD COLUMN overall_rating character varying DEFAULT 'neutral';

-- Create function to update restaurant rating summary
CREATE OR REPLACE FUNCTION update_restaurant_rating_summary(restaurant_id uuid)
RETURNS void AS $$
DECLARE
  red_count integer;
  yellow_count integer;
  green_count integer;
  total_count integer;
  overall_rating character varying;
BEGIN
  -- Count ratings by type
  SELECT 
    COUNT(*) FILTER (WHERE traffic_light_rating = 'red'),
    COUNT(*) FILTER (WHERE traffic_light_rating = 'yellow'),
    COUNT(*) FILTER (WHERE traffic_light_rating = 'green'),
    COUNT(*)
  INTO red_count, yellow_count, green_count, total_count
  FROM public.restaurant_saves
  WHERE restaurant_id = $1 AND traffic_light_rating IS NOT NULL;
  
  -- Calculate overall rating
  IF total_count = 0 THEN
    overall_rating := 'neutral';
  ELSIF green_count > (red_count + yellow_count) THEN
    overall_rating := 'green';
  ELSIF red_count > (green_count + yellow_count) THEN
    overall_rating := 'red';
  ELSE
    overall_rating := 'yellow';
  END IF;
  
  -- Update restaurant rating summary
  UPDATE public.restaurants 
  SET 
    red_ratings_count = red_count,
    yellow_ratings_count = yellow_count,
    green_ratings_count = green_count,
    total_ratings_count = total_count,
    overall_rating = overall_rating
  WHERE id = $1;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update rating summary when saves change
CREATE OR REPLACE FUNCTION trigger_update_rating_summary()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_restaurant_rating_summary(NEW.restaurant_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_restaurant_rating_summary(OLD.restaurant_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.restaurant_saves
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_rating_summary();
```

#### Rating Service
```typescript
// services/ratingService.ts
export type TrafficLightRating = 'red' | 'yellow' | 'green';

interface RatingSummary {
  redCount: number;
  yellowCount: number;
  greenCount: number;
  totalCount: number;
  overallRating: TrafficLightRating | 'neutral';
  userRating?: TrafficLightRating;
}

export const rateRestaurant = async (
  userId: string,
  restaurantId: string,
  rating: TrafficLightRating
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if user already rated this restaurant
    const { data: existingRating } = await supabase
      .from('restaurant_saves')
      .select('id, traffic_light_rating')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();
    
    if (existingRating) {
      // Update existing rating
      const { error } = await supabase
        .from('restaurant_saves')
        .update({ traffic_light_rating: rating })
        .eq('id', existingRating.id);
      
      if (error) throw error;
    } else {
      // Create new rating
      const { error } = await supabase
        .from('restaurant_saves')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          traffic_light_rating: rating,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getRestaurantRatingSummary = async (
  restaurantId: string,
  userId?: string
): Promise<RatingSummary> => {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select(`
      red_ratings_count,
      yellow_ratings_count,
      green_ratings_count,
      total_ratings_count,
      overall_rating
    `)
    .eq('id', restaurantId)
    .single();
  
  let userRating: TrafficLightRating | undefined;
  
  if (userId) {
    const { data: userSave } = await supabase
      .from('restaurant_saves')
      .select('traffic_light_rating')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();
    
    userRating = userSave?.traffic_light_rating;
  }
  
  return {
    redCount: restaurant?.red_ratings_count || 0,
    yellowCount: restaurant?.yellow_ratings_count || 0,
    greenCount: restaurant?.green_ratings_count || 0,
    totalCount: restaurant?.total_ratings_count || 0,
    overallRating: restaurant?.overall_rating || 'neutral',
    userRating
  };
};
```

### Frontend Changes

#### Traffic Light Rating Component
```typescript
// components/TrafficLightRating.tsx
interface TrafficLightRatingProps {
  restaurantId: string;
  onRatingChange?: (rating: TrafficLightRating) => void;
  showUserRating?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const TrafficLightRating: React.FC<TrafficLightRatingProps> = ({
  restaurantId,
  onRatingChange,
  showUserRating = true,
  size = 'medium'
}) => {
  const { user } = useAuth();
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [userRating, setUserRating] = useState<TrafficLightRating | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRatingSummary();
  }, [restaurantId]);

  const loadRatingSummary = async () => {
    try {
      const summary = await getRestaurantRatingSummary(restaurantId, user?.id);
      setRatingSummary(summary);
      setUserRating(summary.userRating);
    } catch (error) {
      console.error('Error loading rating summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingPress = async (rating: TrafficLightRating) => {
    if (!user) return;
    
    try {
      const result = await rateRestaurant(user.id, restaurantId, rating);
      if (result.success) {
        setUserRating(rating);
        await loadRatingSummary(); // Refresh summary
        onRatingChange?.(rating);
      }
    } catch (error) {
      console.error('Error rating restaurant:', error);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Rating Summary */}
      {ratingSummary && (
        <View style={styles.summaryContainer}>
          <View style={styles.ratingBar}>
            <View style={[styles.ratingSegment, styles.redSegment, { flex: ratingSummary.redCount }]} />
            <View style={[styles.ratingSegment, styles.yellowSegment, { flex: ratingSummary.yellowCount }]} />
            <View style={[styles.ratingSegment, styles.greenSegment, { flex: ratingSummary.greenCount }]} />
          </View>
          <Text style={styles.ratingText}>
            {ratingSummary.totalCount} ratings
          </Text>
        </View>
      )}
      
      {/* User Rating Buttons */}
      {showUserRating && user && (
        <View style={styles.ratingButtons}>
          <TouchableOpacity
            style={[
              styles.ratingButton,
              styles.redButton,
              userRating === 'red' && styles.selectedRating
            ]}
            onPress={() => handleRatingPress('red')}
          >
            <Text style={styles.ratingButtonText}>Hate it</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.ratingButton,
              styles.yellowButton,
              userRating === 'yellow' && styles.selectedRating
            ]}
            onPress={() => handleRatingPress('yellow')}
          >
            <Text style={styles.ratingButtonText}>Meh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.ratingButton,
              styles.greenButton,
              userRating === 'green' && styles.selectedRating
            ]}
            onPress={() => handleRatingPress('green')}
          >
            <Text style={styles.ratingButtonText}>Love it</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  summaryContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  ratingSegment: {
    height: '100%',
  },
  redSegment: {
    backgroundColor: '#E74C3C',
  },
  yellowSegment: {
    backgroundColor: '#F39C12',
  },
  greenSegment: {
    backgroundColor: '#2ECC71',
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
  },
  redButton: {
    backgroundColor: '#E74C3C',
    borderColor: '#E74C3C',
  },
  yellowButton: {
    backgroundColor: '#F39C12',
    borderColor: '#F39C12',
  },
  greenButton: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  selectedRating: {
    borderColor: '#333',
    borderWidth: 3,
  },
  ratingButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});
```

#### Restaurant Card Integration
```typescript
// components/RestaurantCard.tsx
export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onPress,
  showRating = true
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={{ uri: restaurant.cover_photo_url }} style={styles.image} />
      
      <View style={styles.content}>
        <Text style={styles.name}>{restaurant.name}</Text>
        <Text style={styles.cuisine}>{restaurant.cuisine_types?.join(', ')}</Text>
        
        {showRating && (
          <TrafficLightRating 
            restaurantId={restaurant.id}
            size="small"
            showUserRating={false}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};
```

#### Restaurant Detail Integration
```typescript
// app/restaurant/[id].tsx
const RestaurantDetailScreen = () => {
  return (
    <ScrollView style={styles.container}>
      {/* Restaurant info */}
      
      <View style={styles.ratingSection}>
        <Text style={styles.sectionTitle}>What do you think?</Text>
        <TrafficLightRating 
          restaurantId={restaurantId}
          onRatingChange={(rating) => {
            // Handle rating change
            console.log('User rated:', rating);
          }}
        />
      </View>
      
      {/* More sections */}
    </ScrollView>
  );
};
```

## Definition of Done

- [ ] Traffic light rating system is implemented in database
- [ ] Rating summary calculation is automated
- [ ] Frontend components display traffic light ratings
- [ ] Users can rate restaurants with red/yellow/green
- [ ] Rating summaries are displayed on restaurant cards
- [ ] Restaurant detail screen shows full rating interface
- [ ] Rating data is properly synced and updated
- [ ] Performance is optimized for rating operations
- [ ] Error handling is implemented for all rating operations
- [ ] Rating system is accessible and user-friendly

## Resources

### Design References
- Reference `/docs/frontend-design-language.md` for consistent styling
- Use traffic light colors: Red (#E74C3C), Yellow (#F39C12), Green (#2ECC71)
- Follow established button and card patterns

### Technical References
- `/docs/backend-design.md` for database schema
- Restaurant save functionality for integration
- User authentication for rating permissions

### Related Documentation
- Restaurant detail screen implementation
- Restaurant card component patterns
- User profile and save functionality

## Notes

### User Experience Considerations
- Traffic light system should be intuitive and fun
- Consider adding haptic feedback for rating actions
- Provide clear visual feedback for user's current rating
- Make rating process quick and seamless

### Technical Considerations
- Ensure rating updates are atomic and consistent
- Handle edge cases where user rates multiple times
- Consider caching rating summaries for performance
- Implement proper error handling for network issues

### Future Enhancements
- Add rating analytics and insights
- Consider rating-based recommendations
- Add rating trends and changes over time
- Implement rating-based social features 