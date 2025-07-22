# Task 3.3: Activity Feed & Interactions

## Overview
Implement a comprehensive activity feed system that displays real-time social interactions, trending content, and personalized activity suggestions. This includes user interactions (likes, comments, follows, saves), trending restaurants, achievement milestones, and interactive elements that drive engagement.

## Business Value
- Provides social proof and encourages user engagement through visible interactions
- Creates a sense of community by showing real-time activity from friends and network
- Drives discovery through trending content and restaurant recommendations
- Increases user retention by providing personalized, relevant content
- Encourages social interactions through follow-back suggestions and engagement opportunities

## Dependencies
- Task 3.1 (Restaurant Save Functionality) - for save-related activities
- Task 3.2 (Network Building Implementation) - for follow-related activities
- Task 3.4 (User Profile Implementation) - for user context and achievements
- Task 6.2 (Post Creation & Management) - for post-related activities
- Task 6.3 (Notifications System) - for real-time activity updates

## Acceptance Criteria

### Gherkin Scenarios

**Scenario: View activity feed with real interactions**
```
Given I am on the activity screen
When the app loads my activity feed
Then I should see recent interactions from my network
And I should see likes, comments, follows, and saves
And each activity should show the user, action, and target
And I should be able to tap on activities to view details
```

**Scenario: Follow back from activity feed**
```
Given I see a follow activity in my feed
When I tap the "Follow Back" button
Then I should follow that user
And the button should change to "Following"
And I should see a confirmation message
```

**Scenario: View trending restaurants in activity**
```
Given I am on the activity screen
When the trending section loads
Then I should see restaurants with high engagement
And I should see save counts and activity stats
And I should be able to tap to view restaurant details
```

**Scenario: Interact with activity items**
```
Given I see an activity item in my feed
When I tap on the restaurant image or name
Then I should navigate to the restaurant detail screen
And I should see the full restaurant information
And I should be able to save the restaurant
```

**Scenario: Real-time activity updates**
```
Given I have the activity screen open
When a new interaction occurs (like, comment, follow)
Then I should see the new activity appear at the top
And the activity should be marked as "new"
And I should see a subtle animation for new items
```

**Scenario: Activity filtering and sorting**
```
Given I am on the activity screen
When I apply different filters (All, Likes, Comments, Follows)
Then I should see only relevant activities
And the activities should be sorted by recency
And I should see the filter count for each category
```

## Technical Implementation

### Files to Create/Modify

#### 1. Activity Services
- **`services/activityService.ts`** - Activity feed management and interactions (new)
- **`services/trendingService.ts`** - Trending content and restaurant analytics (new)
- **`services/interactionService.ts`** - Like, comment, follow functionality (new)

#### 2. Activity Components
- **`components/ActivityItem.tsx`** - Individual activity display component (new)
- **`components/TrendingActivityCard.tsx`** - Trending restaurant card (new)
- **`components/ActivityFilter.tsx`** - Activity filtering component (new)
- **`components/ActivityInteraction.tsx`** - Follow back, like buttons (new)

#### 3. Updated Screens
- **`app/(tabs)/activity.tsx`** - Enhanced activity screen with real data
- **`components/EmptyActivityState.tsx`** - Updated empty state with suggestions

#### 4. Database Schema Updates
- **`supabase/migrations/012_activity_feed_schema.sql`** - Activity tables and functions (new)

### Database Schema Updates

#### 1. Activity Feed Table
```sql
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'like', 'comment', 'follow', 'save', 'post', 'achievement', 'trending'
  )),
  target_type VARCHAR(50), -- 'restaurant', 'post', 'user', 'achievement'
  target_id VARCHAR(255), -- ID of the target (restaurant, post, etc.)
  target_data JSONB, -- Additional target information
  action_text VARCHAR(255) NOT NULL, -- "liked your save", "started following you"
  is_read BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration for certain activities
);

-- Index for efficient querying
CREATE INDEX idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_type ON activity_feed(type);
```

#### 2. User Interactions Table
```sql
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN (
    'follow', 'unfollow', 'block', 'mute'
  )),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, target_user_id, interaction_type)
);
```

#### 3. Trending Analytics Table
```sql
CREATE TABLE trending_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id VARCHAR(255) NOT NULL,
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
    'saves', 'visits', 'photos', 'reviews', 'engagement'
  )),
  metric_value INTEGER NOT NULL,
  time_period VARCHAR(20) NOT NULL CHECK (time_period IN (
    'hour', 'day', 'week', 'month'
  )),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Service Implementation

#### 1. ActivityService
```typescript
class ActivityService {
  async getUserActivity(userId: string, limit?: number, offset?: number): Promise<ActivityItem[]>
  async getActivityByType(userId: string, type: string): Promise<ActivityItem[]>
  async markActivityAsRead(activityId: string): Promise<void>
  async markAllActivitiesAsRead(userId: string): Promise<void>
  async getUnreadActivityCount(userId: string): Promise<number>
  async createActivity(activityData: CreateActivityData): Promise<ActivityItem>
  async deleteActivity(activityId: string): Promise<void>
  async getActivityStats(userId: string): Promise<ActivityStats>
}
```

#### 2. TrendingService
```typescript
class TrendingService {
  async getTrendingRestaurants(city: string, limit?: number): Promise<TrendingActivity[]>
  async getTrendingByCategory(category: string): Promise<TrendingActivity[]>
  async updateTrendingMetrics(restaurantId: string, metrics: TrendingMetrics): Promise<void>
  async getTrendingStats(restaurantId: string): Promise<TrendingStats>
  async getPersonalizedTrending(userId: string): Promise<TrendingActivity[]>
}
```

#### 3. InteractionService
```typescript
class InteractionService {
  async followUser(userId: string, targetUserId: string): Promise<void>
  async unfollowUser(userId: string, targetUserId: string): Promise<void>
  async likeContent(userId: string, contentId: string, contentType: string): Promise<void>
  async unlikeContent(userId: string, contentId: string, contentType: string): Promise<void>
  async commentOnContent(userId: string, contentId: string, comment: string): Promise<void>
  async saveRestaurant(userId: string, restaurantId: string): Promise<void>
  async unsaveRestaurant(userId: string, restaurantId: string): Promise<void>
}
```

### Activity Types and Triggers

#### 1. Social Interactions
```typescript
// Like activity
{
  type: 'like',
  actor: {
    id: 'user-123',
    name: 'Sarah Chen',
    avatar: 'https://...',
    username: 'sarahchen'
  },
  action: 'liked your save',
  target: 'The Italian Place',
  targetType: 'restaurant',
  targetId: 'restaurant-456',
  time: '2 hours ago',
  isNew: true
}

// Follow activity
{
  type: 'follow',
  actor: {
    id: 'user-789',
    name: 'Mike Rodriguez',
    avatar: 'https://...',
    username: 'mikerodriguez'
  },
  action: 'started following you',
  time: '5 hours ago',
  isNew: false
}

// Comment activity
{
  type: 'comment',
  actor: {
    id: 'user-101',
    name: 'Alex Johnson',
    avatar: 'https://...',
    username: 'alexjohnson'
  },
  action: 'commented on your post',
  target: 'Pizza Palace',
  targetType: 'post',
  targetId: 'post-123',
  time: '1 hour ago',
  isNew: true
}
```

#### 2. Trending Activities
```typescript
// Trending restaurant
{
  type: 'trending',
  restaurant: {
    id: 'restaurant-789',
    name: 'Sushi Master',
    image: 'https://...',
    cuisine: 'Japanese',
    location: 'Downtown',
    rating: 4.7
  },
  stats: {
    saves: 234,
    visits: 156,
    photos: 89,
    growth: '+45%'
  },
  description: 'Trending this week in Charlotte',
  time: 'Updated 2 hours ago'
}
```

### UI Implementation

#### 1. Enhanced Activity Screen
```typescript
// app/(tabs)/activity.tsx
const ActivityScreen = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [trendingActivities, setTrendingActivities] = useState<TrendingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadActivityFeed();
    loadTrendingActivities();
    loadUnreadCount();
  }, []);

  const loadActivityFeed = async () => {
    try {
      setLoading(true);
      const userActivities = await activityService.getUserActivity(userId, 50);
      setActivities(userActivities);
    } catch (error) {
      console.error('Error loading activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingActivities = async () => {
    try {
      const trending = await trendingService.getTrendingRestaurants('Charlotte', 5);
      setTrendingActivities(trending);
    } catch (error) {
      console.error('Error loading trending activities:', error);
    }
  };

  const handleActivityPress = async (activity: ActivityItem) => {
    try {
      // Mark as read
      await activityService.markActivityAsRead(activity.id);
      
      // Navigate based on activity type
      switch (activity.type) {
        case 'like':
        case 'comment':
          if (activity.targetType === 'restaurant') {
            router.push(`/restaurant/${activity.targetId}`);
          } else if (activity.targetType === 'post') {
            router.push(`/posts/${activity.targetId}`);
          }
          break;
        case 'follow':
          router.push(`/profile/${activity.actor.id}`);
          break;
        case 'trending':
          router.push(`/restaurant/${activity.targetId}`);
          break;
      }
    } catch (error) {
      console.error('Error handling activity press:', error);
    }
  };

  const handleFollowBack = async (userId: string) => {
    try {
      await interactionService.followUser(currentUserId, userId);
      // Update UI to show "Following"
      setActivities(prev => prev.map(activity => 
        activity.actor.id === userId 
          ? { ...activity, isFollowing: true }
          : activity
      ));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <ActivityFilter
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        filterCounts={getFilterCounts()}
      />

      <FlatList
        data={activities}
        renderItem={({ item }) => (
          <ActivityItem
            activity={item}
            onPress={() => handleActivityPress(item)}
            onFollowBack={() => handleFollowBack(item.actor.id)}
            onLike={() => handleLikeActivity(item)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadActivityFeed} />
        }
        ListHeaderComponent={
          trendingActivities.length > 0 ? (
            <TrendingSection activities={trendingActivities} />
          ) : null
        }
        ListEmptyComponent={
          <EmptyActivityState onRefresh={loadActivityFeed} />
        }
      />
    </SafeAreaView>
  );
};
```

#### 2. Activity Item Component
```typescript
// components/ActivityItem.tsx
const ActivityItem = ({ 
  activity, 
  onPress, 
  onFollowBack, 
  onLike 
}: ActivityItemProps) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'like': return Heart;
      case 'comment': return MessageCircle;
      case 'follow': return UserPlus;
      case 'save': return Bookmark;
      case 'post': return Image;
      case 'achievement': return Trophy;
      case 'trending': return TrendingUp;
      default: return Bell;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'like': return '#FF4444';
      case 'comment': return '#3B82F6';
      case 'follow': return '#10B981';
      case 'save': return designTokens.colors.primaryOrange;
      case 'post': return '#8B5CF6';
      case 'achievement': return '#F59E0B';
      case 'trending': return '#06B6D4';
      default: return designTokens.colors.textMedium;
    }
  };

  const Icon = getActivityIcon(activity.type);
  const iconColor = getActivityColor(activity.type);

  return (
    <TouchableOpacity
      style={[
        styles.activityItem,
        activity.isNew && styles.newActivityItem
      ]}
      onPress={onPress}
    >
      <View style={styles.activityHeader}>
        <Image source={{ uri: activity.actor.avatar }} style={styles.avatar} />
        <View style={styles.activityContent}>
          <Text style={styles.activityText}>
            <Text style={styles.userName}>{activity.actor.name}</Text>
            {' '}{activity.action}
            {activity.target && (
              <>
                {' '}
                <Text style={styles.targetText}>{activity.target}</Text>
              </>
            )}
          </Text>
          <Text style={styles.timeText}>{activity.time}</Text>
        </View>
        
        <View style={styles.activityActions}>
          {activity.type === 'follow' && !activity.isFollowing && (
            <TouchableOpacity 
              style={styles.followButton}
              onPress={() => onFollowBack?.(activity.actor.id)}
            >
              <Text style={styles.followButtonText}>Follow Back</Text>
            </TouchableOpacity>
          )}
          
          {activity.type === 'follow' && activity.isFollowing && (
            <View style={styles.followingButton}>
              <Text style={styles.followingButtonText}>Following</Text>
            </View>
          )}
        </View>
      </View>

      {activity.targetType === 'restaurant' && activity.targetData && (
        <TouchableOpacity style={styles.restaurantPreview}>
          <Image 
            source={{ uri: activity.targetData.image }} 
            style={styles.restaurantImage} 
          />
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{activity.targetData.name}</Text>
            <Text style={styles.restaurantCuisine}>{activity.targetData.cuisine}</Text>
            <Text style={styles.restaurantLocation}>{activity.targetData.location}</Text>
          </View>
        </TouchableOpacity>
      )}

      {activity.isNew && <View style={styles.newIndicator} />}
    </TouchableOpacity>
  );
};
```

#### 3. Trending Section Component
```typescript
// components/TrendingSection.tsx
const TrendingSection = ({ activities }: { activities: TrendingActivity[] }) => {
  return (
    <View style={styles.trendingSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trending Now</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {activities.map((activity, index) => (
          <TrendingActivityCard
            key={index}
            activity={activity}
            onPress={() => handleTrendingPress(activity)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const TrendingActivityCard = ({ activity, onPress }: TrendingActivityCardProps) => {
  return (
    <TouchableOpacity style={styles.trendingCard} onPress={onPress}>
      <Image source={{ uri: activity.image }} style={styles.trendingImage} />
      <View style={styles.trendingOverlay}>
        <View style={styles.trendingBadge}>
          <Text style={styles.trendingBadgeText}>{activity.type}</Text>
        </View>
      </View>
      <View style={styles.trendingContent}>
        <Text style={styles.trendingRestaurant}>{activity.restaurant}</Text>
        <Text style={styles.trendingStats}>{activity.stats}</Text>
        <Text style={styles.trendingDescription}>{activity.description}</Text>
      </View>
    </TouchableOpacity>
  );
};
```

## Definition of Done
- [ ] Complete activity feed with real-time updates
- [ ] Activity filtering and sorting functionality
- [ ] Trending content integration with analytics
- [ ] Social interaction buttons (follow back, like, etc.)
- [ ] Database schema for activity feed and interactions
- [ ] Activity services with full CRUD operations
- [ ] Activity UI components with proper styling
- [ ] Integration with existing screens and navigation
- [ ] Real-time activity updates and notifications
- [ ] Activity analytics and engagement tracking
- [ ] Comprehensive error handling and loading states
- [ ] Unit tests for activity services
- [ ] Integration tests for activity flows
- [ ] Performance optimization for large activity feeds

## Notes
- Consider implementing activity pagination for performance
- Plan for activity feed performance optimization as user base grows
- Consider implementing activity grouping for similar activities
- Plan for activity analytics and user engagement metrics
- Consider implementing activity preferences and customization

## Related Files
- `app/(tabs)/activity.tsx` - Enhanced activity screen
- `components/ActivityItem.tsx` - Activity display component (new)
- `components/TrendingActivityCard.tsx` - Trending content component (new)
- `services/activityService.ts` - Activity service (new)
- `services/trendingService.ts` - Trending service (new)
- `components/EmptyActivityState.tsx` - Updated empty state
- `supabase/migrations/012_activity_feed_schema.sql` - Database schema (new) 