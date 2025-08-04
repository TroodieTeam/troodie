# Task 6.8: Define Trending Restaurant Algorithm

## Epic
Epic 6: Missing Core Screens and Functionality

## Priority
Medium

## Estimate
2 days

## Status
🔴 Not Started

## Overview
Define and implement the backend algorithm for determining which restaurants are "trending" based on user activity, saves, posts, and engagement metrics.

## Business Value
- Provides users with discovery of popular and engaging restaurants
- Creates social proof and FOMO (fear of missing out) for restaurant discovery
- Drives user engagement through trending content
- Helps surface high-quality restaurants that are gaining popularity

## Dependencies
- Task 2.2: Restaurant Search & Discovery (for restaurant data)
- Task 3.1: Restaurant Save Functionality (for save metrics)
- Task 6.2: Post Creation & Management (for post engagement)

## Blocks
- Task 6.11: Implement Perfect for You Section (can use trending data)
- Enhanced restaurant discovery and recommendation features

## Acceptance Criteria

### Gherkin Scenarios

```gherkin
Feature: Trending Restaurant Algorithm
  As a user
  I want to see trending restaurants
  So that I can discover popular and engaging dining spots

Scenario: Calculate Trending Score
  Given a restaurant has user activity data
  When the trending algorithm runs
  Then it calculates a trending score based on multiple factors
  And the score reflects recent popularity and engagement

Scenario: Update Trending Status
  Given a restaurant's trending score changes
  When the score exceeds the trending threshold
  Then the restaurant is marked as trending
  And it appears in trending restaurant lists

Scenario: Time-Based Trending
  Given a restaurant was trending last week
  When the trending algorithm runs today
  Then recent activity is weighted more heavily
  And older activity has reduced impact

Scenario: Location-Based Trending
  Given a user is in Charlotte
  When they view trending restaurants
  Then they see trending restaurants in their area
  And national trending restaurants are also included

Scenario: Trending Decay
  Given a restaurant stops receiving engagement
  When the trending algorithm runs
  Then its trending score decreases over time
  And it may lose trending status
```

## Technical Implementation

### Backend Algorithm

#### Trending Score Calculation
```typescript
// services/trendingService.ts
interface TrendingFactors {
  saves: number;
  posts: number;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  timeDecay: number;
  locationWeight: number;
}

export const calculateTrendingScore = (
  restaurantId: string,
  timeWindow: number = 7 // days
): number => {
  const factors = await getTrendingFactors(restaurantId, timeWindow);
  
  // Base score calculation
  let score = 0;
  score += factors.saves * 10;        // Saves are high value
  score += factors.posts * 15;        // Posts indicate strong engagement
  score += factors.likes * 2;         // Likes show approval
  score += factors.comments * 5;      // Comments show discussion
  score += factors.shares * 8;        // Shares show virality
  score += factors.views * 0.1;       // Views are low value
  
  // Apply time decay (recent activity weighted more)
  score *= factors.timeDecay;
  
  // Apply location weight
  score *= factors.locationWeight;
  
  return Math.round(score);
};

export const getTrendingFactors = async (
  restaurantId: string,
  timeWindow: number
): Promise<TrendingFactors> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeWindow);
  
  // Get engagement metrics
  const { data: saves } = await supabase
    .from('restaurant_saves')
    .select('created_at')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', cutoffDate.toISOString());
  
  const { data: posts } = await supabase
    .from('posts')
    .select('created_at, likes_count, comments_count, saves_count, shares_count')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', cutoffDate.toISOString());
  
  // Calculate time decay (recent activity = higher weight)
  const timeDecay = calculateTimeDecay(cutoffDate);
  
  // Calculate location weight based on user density
  const locationWeight = await calculateLocationWeight(restaurantId);
  
  return {
    saves: saves?.length || 0,
    posts: posts?.length || 0,
    likes: posts?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0,
    comments: posts?.reduce((sum, post) => sum + (post.comments_count || 0), 0) || 0,
    shares: posts?.reduce((sum, post) => sum + (post.shares_count || 0), 0) || 0,
    views: await getRestaurantViews(restaurantId, cutoffDate),
    timeDecay,
    locationWeight
  };
};
```

#### Trending Threshold and Updates
```typescript
// services/trendingService.ts
export const updateTrendingStatus = async () => {
  const TRENDING_THRESHOLD = 100; // Minimum score to be trending
  const MAX_TRENDING_RESTAURANTS = 50; // Limit trending list size
  
  // Get all restaurants with recent activity
  const { data: activeRestaurants } = await supabase
    .from('restaurants')
    .select('id')
    .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  
  const trendingScores: Array<{id: string, score: number}> = [];
  
  // Calculate trending scores
  for (const restaurant of activeRestaurants || []) {
    const score = await calculateTrendingScore(restaurant.id);
    if (score > 0) {
      trendingScores.push({ id: restaurant.id, score });
    }
  }
  
  // Sort by score and get top trending
  trendingScores.sort((a, b) => b.score - a.score);
  const trendingRestaurants = trendingScores
    .slice(0, MAX_TRENDING_RESTAURANTS)
    .filter(r => r.score >= TRENDING_THRESHOLD);
  
  // Update trending status in database
  await updateTrendingFlags(trendingRestaurants);
};

export const updateTrendingFlags = async (
  trendingRestaurants: Array<{id: string, score: number}>
) => {
  // Clear all trending flags
  await supabase
    .from('restaurants')
    .update({ is_trending: false });
  
  // Set trending flags for top restaurants
  if (trendingRestaurants.length > 0) {
    const restaurantIds = trendingRestaurants.map(r => r.id);
    await supabase
      .from('restaurants')
      .update({ is_trending: true })
      .in('id', restaurantIds);
  }
};
```

### Database Schema Updates

#### Restaurant Table Updates
```sql
-- Add trending fields to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN is_trending boolean DEFAULT false,
ADD COLUMN trending_score integer DEFAULT 0,
ADD COLUMN trending_updated_at timestamp with time zone;

-- Create index for trending queries
CREATE INDEX idx_restaurants_trending ON restaurants (is_trending, trending_score DESC);

-- Create function to update trending scores
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS void AS $$
BEGIN
  -- This function will be called by a scheduled job
  -- Implementation will be in the trending service
  PERFORM update_trending_status();
END;
$$ LANGUAGE plpgsql;
```

### Scheduled Job Setup

#### Trending Score Updates
```typescript
// supabase/functions/update-trending-scores/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  try {
    // Update trending scores
    await updateTrendingStatus();
    
    return new Response(
      JSON.stringify({ success: true, message: 'Trending scores updated' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### API Endpoints

#### Get Trending Restaurants
```typescript
// services/trendingService.ts
export const getTrendingRestaurants = async (
  location?: { lat: number, lng: number },
  limit: number = 20
) => {
  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('is_trending', true)
    .order('trending_score', { ascending: false })
    .limit(limit);
  
  // Add location filter if provided
  if (location) {
    query = query.near('location', location.lng, location.lat, 50000); // 50km radius
  }
  
  const { data, error } = await query;
  return { data, error };
};
```

## Definition of Done

- [ ] Trending score algorithm is defined and implemented
- [ ] Trending status is automatically updated on a schedule
- [ ] Trending restaurants are marked in the database
- [ ] API endpoint returns trending restaurants
- [ ] Algorithm considers multiple engagement factors
- [ ] Time decay is properly applied to recent activity
- [ ] Location weighting is implemented
- [ ] Trending threshold is configurable
- [ ] Performance is optimized for large datasets
- [ ] Error handling is implemented for all operations

## Resources

### Design References
- Reference `/docs/frontend-design-language.md` for trending indicators
- Use consistent styling for trending restaurant cards
- Follow established patterns for displaying trending content

### Technical References
- `/docs/backend-design.md` for database schema
- Restaurant engagement metrics from existing features
- Location-based services for geographic weighting

### Related Documentation
- Restaurant save and post functionality
- Location services implementation
- Scheduled job configuration

## Notes

### Algorithm Considerations
- Balance between recency and sustained popularity
- Consider different weights for different types of engagement
- Account for restaurant size and capacity
- Factor in seasonal trends and events

### Performance Considerations
- Cache trending results to avoid repeated calculations
- Use database indexes for efficient queries
- Implement pagination for large trending lists
- Consider batch processing for score updates

### Future Enhancements
- Machine learning for more sophisticated trending prediction
- Personalization based on user preferences
- Trending categories (by cuisine, price range, etc.)
- Real-time trending updates for high-engagement periods 