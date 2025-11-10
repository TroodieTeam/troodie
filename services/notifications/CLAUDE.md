# Notification Services Documentation

Notification services handle in-app notifications, push notifications, and user preferences.

## Files

### notificationService.ts
Core notification creation and retrieval.

**Key Functions:**
- `createNotification()` - Create generic notification
- `getUserNotifications()` - Get paginated notifications for user
- `markAsRead()` - Mark single notification as read
- `markAllAsRead()` - Mark all user notifications as read
- `deleteNotification()` - Delete notification
- `getUnreadCount()` - Get unread notification count
- `sendPushNotification()` - Send push to user's devices
- `sendBulkNotifications()` - Batch create notifications

**Specialized Notification Creators:**
- `createLikeNotification()` - When post is liked
- `createCommentNotification()` - When post is commented on
- `createFollowNotification()` - When user is followed
- `createAchievementNotification()` - When achievement unlocked
- `createRestaurantRecommendationNotification()` - New nearby restaurant
- `createBoardInviteNotification()` - Board collaboration invite
- `createPostMentionNotification()` - User mentioned in post
- `createMilestoneNotification()` - User reaches milestone
- `createSystemNotification()` - App announcements

**Database Table:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50),  -- like, comment, follow, board_invite, etc.
  title VARCHAR(255),
  message TEXT,
  data JSONB,  -- Type-specific payload
  related_id UUID,  -- ID of related entity
  related_type VARCHAR(50),  -- 'post', 'board', 'user', etc.
  priority INTEGER DEFAULT 1,
  is_read BOOLEAN DEFAULT false,
  is_actioned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### notificationPreferencesService.ts
User notification settings and preferences.

**Key Functions:**
- `getPreferences()` - Get user's notification preferences
- `updatePreferences()` - Update notification settings
- `shouldSendNotification()` - Check if user wants this notification type

**Preference Types:**
- Push notifications on/off
- Email notifications on/off
- Per-type preferences (likes, comments, follows, etc.)

### pushNotificationService.ts
Push notification delivery via Expo.

**Key Functions:**
- `registerPushToken()` - Register device for push
- `unregisterPushToken()` - Remove device token
- `sendPushToDevice()` - Send to specific device
- `scheduleNotification()` - Schedule future push

**Integration:**
```typescript
import * as Notifications from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

### statusNotificationService.ts
Status update notifications (less common).

## Notification Types

### Standard Types
```typescript
type NotificationType =
  | 'like'           // Post liked
  | 'comment'        // Post commented
  | 'follow'         // User followed
  | 'achievement'    // Achievement unlocked
  | 'restaurant_recommendation'  // New restaurant nearby
  | 'board_invite'   // Board invitation
  | 'post_mention'   // Mentioned in post
  | 'milestone'      // Milestone reached
  | 'system';        // App announcement
```

### Notification Data Structure

Each notification has type-specific data in the `data` JSONB field:

**board_invite:**
```json
{
  "invitation_id": "uuid",
  "board_id": "uuid",
  "board_name": "Board Name",
  "inviter_id": "uuid",
  "inviter_name": "John Doe",
  "inviter_avatar": "url"
}
```

**like:**
```json
{
  "postId": "uuid",
  "likerId": "uuid",
  "likerName": "Jane Smith",
  "restaurantName": "Restaurant Name",
  "likerAvatar": "url"
}
```

**comment:**
```json
{
  "postId": "uuid",
  "commentId": "uuid",
  "commenterId": "uuid",
  "commenterName": "Bob Jones",
  "commentPreview": "Great recommendation!",
  "restaurantName": "Restaurant Name"
}
```

## Navigation Pattern

Notifications use `related_id` and `related_type` for navigation:

```typescript
// In app/notifications/index.tsx
switch (notification.type) {
  case 'board_invite':
    const invitationId = notification.data.invitation_id;
    router.push(`/boards/${notification.related_id}?invitation_id=${invitationId}`);
    break;

  case 'like':
  case 'comment':
    router.push(`/posts/${notification.related_id}`);
    break;

  case 'follow':
    router.push(`/user/${notification.related_id}`);
    break;

  case 'restaurant_recommendation':
    router.push(`/restaurant/${notification.related_id}`);
    break;
}
```

## Real-time Notifications

Use `hooks/useRealtimeNotifications.ts` for live updates:

```typescript
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

function NotificationsScreen() {
  const { notifications, unreadCount } = useRealtimeNotifications(user.id);

  return (
    <View>
      <Badge count={unreadCount} />
      {notifications.map(n => <NotificationItem key={n.id} notification={n} />)}
    </View>
  );
}
```

## Creating Notifications

### Example: Board Invitation

When sending a board invitation (from `boardInvitationService.ts`):

```typescript
// 1. Create invitation record
const { data: invitation } = await supabase
  .from('board_invitations')
  .insert({ board_id, inviter_id, invitee_id })
  .select()
  .single();

// 2. Get board and inviter details
const { data: board } = await supabase
  .from('boards')
  .select('title')
  .eq('id', boardId)
  .single();

const { data: inviter } = await supabase
  .from('users')
  .select('name, avatar_url')
  .eq('id', inviterId)
  .single();

// 3. Create notification
await supabase.from('notifications').insert({
  user_id: inviteeId,
  type: 'board_invite',
  title: 'Board Invitation',
  message: `${inviter.name} invited you to collaborate on "${board.title}"`,
  related_id: boardId,         // Navigation target
  related_type: 'board',
  data: {
    invitation_id: invitation.id,  // For modal
    board_id: boardId,
    board_name: board.title,
    inviter_id: inviterId,
    inviter_name: inviter.name,
    inviter_avatar: inviter.avatar_url
  }
});
```

### Example: Like Notification

```typescript
await notificationService.createLikeNotification(
  postOwnerId,
  likerId,
  likerName,
  restaurantName,
  postId,
  likerAvatar
);
```

## RLS Policies

Notifications use strict RLS:

```sql
-- Users can only see their own notifications
CREATE POLICY "Users can see their notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- System can create any notification
CREATE POLICY "Service role can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
```

## Performance Optimization

### Indexes
```sql
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
```

### Pagination
Always use limits and offsets:
```typescript
const notifications = await notificationService.getUserNotifications(
  userId,
  50  // Limit
);
```

### Unread Count Function
Optimized database function:
```sql
CREATE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE user_id = user_uuid AND is_read = false;
$$ LANGUAGE SQL STABLE;
```

## Push Notification Setup

### 1. Register Device Token
```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function App() {
  usePushNotifications();  // Auto-registers on mount
}
```

### 2. Handle Incoming Notifications
```typescript
// In app/_layout.tsx
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;

  // Navigate based on notification type
  if (data.type === 'board_invite') {
    router.push(`/boards/${data.boardId}?invitation_id=${data.invitationId}`);
  }
});
```

### 3. Send Push Notification
```typescript
await pushNotificationService.sendPushToDevice(
  expoPushToken,
  {
    title: 'New Invitation',
    body: 'You have a new board invitation',
    data: { type: 'board_invite', boardId, invitationId }
  }
);
```

## Troubleshooting

### Notifications Not Appearing
1. Check RLS policies allow user to read
2. Verify `user_id` matches current user
3. Check notification was created (query DB)
4. Ensure real-time subscription is active

### Push Not Delivered
1. Verify device token registered
2. Check token is valid (not expired)
3. Test with Expo push notification tool
4. Check device notification permissions

### Navigation Not Working
1. Verify `related_id` is set correctly
2. Check notification handler in `app/notifications/index.tsx`
3. Ensure proper URL format for deep links
4. Test navigation manually

## Related Files
- `app/notifications/index.tsx` - Notifications screen
- `components/NotificationItem.tsx` - Single notification display
- `hooks/useRealtimeNotifications.ts` - Real-time subscription
- `hooks/usePushNotifications.ts` - Push notification setup
- `types/notifications.ts` - TypeScript types
