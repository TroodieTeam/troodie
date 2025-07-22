# Notifications System Documentation

## Overview

The notifications system provides real-time updates to users about social interactions, restaurant recommendations, achievements, and app activities. It includes push notifications, in-app notifications, notification preferences, and notification management.

## Architecture

### Database Schema

The system uses three main tables:

1. **notifications** - Stores all user notifications
2. **notification_preferences** - User notification settings
3. **push_tokens** - Device tokens for push notifications

### Services

- **NotificationService** - Core notification CRUD operations
- **NotificationPreferencesService** - Manages user notification settings
- **PushNotificationService** - Handles push notification delivery

### Components

- **NotificationBadge** - Displays unread notification count
- **NotificationItem** - Individual notification display
- **NotificationCenter** - Modal/dropdown for notifications
- **NotificationSettings** - Settings management UI

### Hooks

- **useNotifications** - Main notification state management
- **useRealtimeNotifications** - Real-time subscription handling

## Features

### Notification Types

1. **Social Notifications**
   - Likes on posts
   - Comments on posts
   - New followers
   - Post mentions

2. **Achievement Notifications**
   - Badge unlocks
   - Milestone achievements
   - Points earned

3. **Restaurant Notifications**
   - New restaurant recommendations
   - Restaurant updates
   - Special offers

4. **Board Notifications**
   - Board invitations
   - Board updates
   - Member activity

5. **System Notifications**
   - App updates
   - Maintenance notices
   - General announcements

### Notification Preferences

Users can control:
- **Push notifications** - Device notifications
- **In-app notifications** - App internal notifications
- **Email notifications** - Email delivery
- **Frequency** - Immediate, daily digest, or weekly digest

### Real-time Updates

The system uses Supabase real-time subscriptions to:
- Update notification counts instantly
- Show new notifications without refresh
- Sync notification states across devices

## Usage Examples

### Creating a Notification

```typescript
import { notificationService } from '@/services/notificationService';

// Like notification
await notificationService.createLikeNotification(
  postOwnerId,
  likerId,
  likerName,
  restaurantName,
  postId,
  likerAvatar
);

// Achievement notification
await notificationService.createAchievementNotification(
  userId,
  achievementId,
  achievementName,
  achievementDescription,
  points,
  icon
);
```

### Using the Notification Hook

```typescript
import { useNotifications } from '@/hooks/useNotifications';

const MyComponent = () => {
  const {
    notifications,
    unreadCount,
    preferences,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  // Component logic...
};
```

### Real-time Notifications

```typescript
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

const MyComponent = () => {
  useRealtimeNotifications({
    onNotificationReceived: (notification) => {
      // Handle new notification
      console.log('New notification:', notification);
    },
    onUnreadCountChanged: (count) => {
      // Update badge count
      setUnreadCount(count);
    }
  });
};
```

## Database Migration

Run the migration to create the notification tables:

```sql
-- Run the migration file
-- supabase/migrations/20250123_notifications_system.sql
```

## Push Notifications

The system is prepared for push notifications but requires:

1. **Expo Notifications** setup
2. **Push notification service** integration
3. **Device token management**

### Setup Steps

1. Install Expo Notifications:
```bash
npx expo install expo-notifications
```

2. Configure push notifications in app.json:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ]
  }
}
```

3. Initialize push notifications:
```typescript
import { pushNotificationService } from '@/services/pushNotificationService';

// In your app initialization
await pushNotificationService.initialize();
```

## Testing

### Manual Testing

1. **Create test notifications**:
```typescript
// Test like notification
await notificationService.createLikeNotification(
  'user-id',
  'liker-id',
  'John Doe',
  'Pizza Place',
  'post-id'
);
```

2. **Test notification preferences**:
```typescript
// Update preferences
await notificationPreferencesService.updatePreferences(userId, {
  social: {
    push_enabled: false,
    in_app_enabled: true,
    email_enabled: false,
    frequency: 'daily'
  }
});
```

### Automated Testing

Create test files for:
- Notification service methods
- Preference management
- Real-time subscriptions
- UI components

## Performance Considerations

1. **Pagination** - Load notifications in chunks
2. **Caching** - Cache notification data locally
3. **Optimistic updates** - Update UI immediately, sync later
4. **Background sync** - Sync when app becomes active

## Security

1. **Row Level Security** - Users can only access their notifications
2. **Input validation** - Validate all notification data
3. **Rate limiting** - Prevent notification spam
4. **Token management** - Secure push token storage

## Monitoring

Track these metrics:
- Notification delivery rates
- User engagement with notifications
- Preference changes
- Error rates

## Future Enhancements

1. **Notification grouping** - Group similar notifications
2. **Smart scheduling** - Send notifications at optimal times
3. **A/B testing** - Test different notification strategies
4. **Analytics** - Track notification effectiveness
5. **Customization** - Allow users to customize notification content

## Troubleshooting

### Common Issues

1. **Notifications not showing**
   - Check user preferences
   - Verify database permissions
   - Check real-time subscription status

2. **Push notifications not working**
   - Verify device token registration
   - Check notification permissions
   - Test with Expo push tool

3. **Real-time not updating**
   - Check Supabase connection
   - Verify channel subscription
   - Check network connectivity

### Debug Commands

```typescript
// Check notification count
const count = await notificationService.getUnreadCount(userId);
console.log('Unread count:', count);

// Check user preferences
const prefs = await notificationPreferencesService.getUserPreferences(userId);
console.log('User preferences:', prefs);

// Test real-time connection
const { data } = await supabase.from('notifications').select('count');
console.log('Database connection:', data);
``` 