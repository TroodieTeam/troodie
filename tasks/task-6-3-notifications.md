# Task 6.3: Notifications System

## Overview
Implement a comprehensive notifications system that provides real-time updates to users about social interactions, restaurant recommendations, achievements, and app activities. This includes push notifications, in-app notifications, notification preferences, and notification management.

## Business Value
- Increases user engagement through timely, relevant notifications
- Drives social interactions by notifying users of likes, comments, and follows
- Encourages app usage through achievement and milestone notifications
- Provides personalized restaurant recommendations and updates
- Improves user retention through meaningful engagement touchpoints

## Dependencies
- Task 3.4 (User Profile Implementation) - for user context and preferences
- Task 6.2 (Post Creation & Management) - for post-related notifications
- Task 4.1 (Board-Based Save System) - for board-related notifications
- Task 3.3 (Activity Feed & Interactions) - for social interaction notifications

## Acceptance Criteria

### Gherkin Scenarios

**Scenario: Receive like notification**
```
Given I have created a post
When another user likes my post
Then I should receive a push notification
And the notification should appear in my in-app notifications
And the notification count badge should update
And I should be able to tap the notification to view the post
```

**Scenario: Receive comment notification**
```
Given I have created a post
When another user comments on my post
Then I should receive a notification with the comment preview
And I should be able to reply directly from the notification
And the notification should link to the post with comments open
```

**Scenario: Receive follow notification**
```
Given I have a public profile
When another user follows me
Then I should receive a notification about the new follower
And I should be able to view their profile from the notification
And I should have the option to follow them back
```

**Scenario: Achievement notification**
```
Given I have completed certain actions in the app
When I unlock an achievement
Then I should receive a celebratory notification
And the notification should show the achievement details
And I should be able to view my achievements from the notification
```

**Scenario: Restaurant recommendation notification**
```
Given I have saved restaurants and set preferences
When a new restaurant opens nearby that matches my preferences
Then I should receive a personalized recommendation notification
And the notification should include restaurant details and distance
And I should be able to save the restaurant directly from the notification
```

**Scenario: Notification preferences management**
```
Given I am in the settings screen
When I adjust notification preferences
Then my preferences should be saved
And I should only receive notifications for enabled categories
And the changes should apply immediately
```

## Technical Implementation

### Files to Create/Modify

#### 1. Notification Screens
- **`app/notifications/index.tsx`** - Main notifications list screen (new)
- **`app/notifications/[id].tsx`** - Individual notification detail (new)
- **`app/notifications/settings.tsx`** - Notification preferences (new)

#### 2. Notification Services
- **`services/notificationService.ts`** - Notification CRUD and management (new)
- **`services/pushNotificationService.ts`** - Push notification handling (new)
- **`services/notificationPreferencesService.ts`** - User preferences management (new)

#### 3. UI Components
- **`components/NotificationItem.tsx`** - Individual notification display (new)
- **`components/NotificationBadge.tsx`** - Notification count badge (new)
- **`components/NotificationCenter.tsx`** - Notification dropdown/modal (new)
- **`components/NotificationSettings.tsx`** - Settings form component (new)

#### 4. Updated Components
- **`app/(tabs)/index.tsx`** - Update notification bell with badge and functionality
- **`components/modals/SettingsModal.tsx`** - Update notification settings integration
- **`app/(tabs)/profile.tsx`** - Add notification preferences to settings

### Database Schema Updates

#### 1. Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'like', 'comment', 'follow', 'achievement', 'restaurant_recommendation',
    'board_invite', 'post_mention', 'milestone', 'system'
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional notification data
  related_id VARCHAR(255), -- ID of related content (post, user, etc.)
  related_type VARCHAR(50), -- Type of related content
  is_read BOOLEAN DEFAULT false,
  is_actioned BOOLEAN DEFAULT false, -- User has interacted with notification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5)
);
```

#### 2. Notification Preferences Table
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category)
);
```

#### 3. Push Tokens Table
```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform, device_id)
);
```

### Service Implementation

#### 1. NotificationService
```typescript
class NotificationService {
  async createNotification(userId: string, notificationData: NotificationData): Promise<Notification>
  async getUserNotifications(userId: string, limit?: number): Promise<Notification[]>
  async markAsRead(notificationId: string): Promise<void>
  async markAllAsRead(userId: string): Promise<void>
  async deleteNotification(notificationId: string): Promise<void>
  async getUnreadCount(userId: string): Promise<number>
  async sendPushNotification(userId: string, notification: Notification): Promise<void>
  async sendBulkNotifications(userIds: string[], notificationData: NotificationData): Promise<void>
}
```

#### 2. PushNotificationService
```typescript
class PushNotificationService {
  async registerDevice(userId: string, token: string, platform: string): Promise<void>
  async unregisterDevice(userId: string, token: string): Promise<void>
  async sendPushNotification(token: string, notification: PushNotification): Promise<void>
  async sendBulkPushNotifications(tokens: string[], notification: PushNotification): Promise<void>
  async handleNotificationReceived(notification: any): Promise<void>
  async handleNotificationOpened(notification: any): Promise<void>
}
```

#### 3. NotificationPreferencesService
```typescript
class NotificationPreferencesService {
  async getUserPreferences(userId: string): Promise<NotificationPreferences>
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void>
  async isNotificationEnabled(userId: string, category: string): Promise<boolean>
  async getNotificationFrequency(userId: string, category: string): Promise<string>
  async updatePushToken(userId: string, token: string, platform: string): Promise<void>
}
```

### Notification Types and Triggers

#### 1. Social Notifications
```typescript
// Like notification
{
  type: 'like',
  title: 'New Like',
  message: 'Sarah Chen liked your post about The Italian Place',
  data: {
    postId: 'post-123',
    likerId: 'user-456',
    likerName: 'Sarah Chen',
    restaurantName: 'The Italian Place'
  }
}

// Comment notification
{
  type: 'comment',
  title: 'New Comment',
  message: 'Mike Rodriguez commented: "This place looks amazing!"',
  data: {
    postId: 'post-123',
    commentId: 'comment-789',
    commenterId: 'user-789',
    commenterName: 'Mike Rodriguez',
    commentPreview: 'This place looks amazing!'
  }
}

// Follow notification
{
  type: 'follow',
  title: 'New Follower',
  message: 'Alex Johnson started following you',
  data: {
    followerId: 'user-101',
    followerName: 'Alex Johnson',
    followerAvatar: 'https://...'
  }
}
```

#### 2. Achievement Notifications
```typescript
// Achievement unlocked
{
  type: 'achievement',
  title: 'Achievement Unlocked! 🎉',
  message: 'You\'ve earned the "First Post" badge',
  data: {
    achievementId: 'first-post',
    achievementName: 'First Post',
    achievementDescription: 'Created your first restaurant post',
    points: 50
  }
}
```

#### 3. Restaurant Notifications
```typescript
// New restaurant recommendation
{
  type: 'restaurant_recommendation',
  title: 'New Spot Near You',
  message: 'Pizza Palace just opened 0.3 miles away',
  data: {
    restaurantId: 'restaurant-456',
    restaurantName: 'Pizza Palace',
    distance: 0.3,
    cuisine: 'Italian',
    rating: 4.5
  }
}
```

### UI Implementation

#### 1. Notification Bell with Badge
```typescript
// app/(tabs)/index.tsx
const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  useEffect(() => {
    loadUnreadCount();
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.headerButton} 
      onPress={() => setShowNotificationCenter(true)}
    >
      <View style={styles.notificationContainer}>
        <Bell size={24} color={designTokens.colors.textDark} />
        {unreadCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
      
      {showNotificationCenter && (
        <NotificationCenter
          onClose={() => setShowNotificationCenter(false)}
          onNotificationPress={handleNotificationPress}
        />
      )}
    </TouchableOpacity>
  );
};
```

#### 2. Notification List Screen
```typescript
// app/notifications/index.tsx
const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const userNotifications = await notificationService.getUserNotifications(userId, 50);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as read
      await notificationService.markAsRead(notification.id);
      
      // Navigate based on notification type
      switch (notification.type) {
        case 'like':
        case 'comment':
          router.push(`/posts/${notification.data.postId}`);
          break;
        case 'follow':
          router.push(`/profile/${notification.data.followerId}`);
          break;
        case 'achievement':
          router.push('/profile?tab=achievements');
          break;
        case 'restaurant_recommendation':
          router.push(`/restaurant/${notification.data.restaurantId}`);
          break;
      }
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllRead}>Mark all as read</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handleNotificationPress(item)}
            onSwipeDelete={() => handleDeleteNotification(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadNotifications} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bell size={48} color={designTokens.colors.textLight} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              When you get notifications, they'll appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};
```

#### 3. Notification Item Component
```typescript
// components/NotificationItem.tsx
const NotificationItem = ({ notification, onPress, onSwipeDelete }: NotificationItemProps) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return Heart;
      case 'comment': return MessageCircle;
      case 'follow': return UserPlus;
      case 'achievement': return Trophy;
      case 'restaurant_recommendation': return MapPin;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like': return '#FF4444';
      case 'comment': return '#3B82F6';
      case 'follow': return '#10B981';
      case 'achievement': return '#F59E0B';
      case 'restaurant_recommendation': return '#8B5CF6';
      default: return designTokens.colors.primaryOrange;
    }
  };

  const Icon = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.is_read && styles.unreadNotification
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Icon size={20} color={iconColor} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.time}>
          {formatRelativeTime(notification.created_at)}
        </Text>
      </View>
      
      {!notification.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};
```

## Definition of Done
- [ ] Complete notification system with real-time updates
- [ ] Push notification integration for iOS and Android
- [ ] In-app notification center with badge count
- [ ] Notification preferences management
- [ ] Database schema for notifications, preferences, and push tokens
- [ ] Notification services with full CRUD operations
- [ ] Notification UI components with proper styling
- [ ] Integration with existing screens (home, profile, settings)
- [ ] Notification triggers for all major app events
- [ ] Notification analytics and tracking
- [ ] Comprehensive error handling and loading states
- [ ] Unit tests for notification services
- [ ] Integration tests for notification flows
- [ ] Push notification delivery testing

## Notes
- Consider implementing notification grouping for similar notifications
- Plan for notification performance optimization as user base grows
- Consider implementing notification scheduling for non-urgent notifications
- Plan for notification analytics and user engagement metrics
- Consider implementing notification templates for consistent messaging

## Related Files
- `app/notifications/index.tsx` - Notifications list screen (new)
- `app/notifications/settings.tsx` - Notification preferences (new)
- `components/NotificationItem.tsx` - Notification display component (new)
- `services/notificationService.ts` - Notification service (new)
- `app/(tabs)/index.tsx` - Updated notification bell with badge
- `components/modals/SettingsModal.tsx` - Updated notification settings
- `app/(tabs)/profile.tsx` - Updated settings integration 