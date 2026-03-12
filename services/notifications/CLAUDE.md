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
- `createCampaignOpportunityNotification()` - New campaign matches creator
- `createCampaignApplicationNotification()` - Creator applied to campaign

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

**Preference Categories** (each has push/in_app/email toggles):
- `social` - likes, comments, follows, mentions
- `achievements` - achievements, milestones
- `restaurants` - restaurant recommendations
- `boards` - board invites
- `system` - app announcements
- `campaigns` - all campaign lifecycle notifications
- `engagement` - friend posts, weekly recaps

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

### All Types (18 total)
```typescript
type NotificationType =
  // Social (standard)
  | 'like'                        // Post liked
  | 'comment'                     // Post commented
  | 'follow'                      // User followed
  | 'post_mention'                // Mentioned in post
  // Achievements & Milestones
  | 'achievement'                 // Achievement unlocked
  | 'milestone'                   // Milestone reached
  // Restaurants
  | 'restaurant_recommendation'   // New restaurant nearby
  // Boards
  | 'board_invite'                // Board invitation
  // System
  | 'system'                      // App announcement
  // Campaign lifecycle (new)
  | 'campaign_opportunity'        // New campaign matches creator's location
  | 'campaign_application'        // Creator applied to business's campaign
  | 'application_approved'        // Creator's application accepted
  | 'campaign_deadline'           // Campaign ending in 2 days
  | 'deliverable_submitted'       // Creator submitted deliverables
  | 'payment_sent'                // Payment available/paid to creator
  | 'campaign_invite'             // Business invited creator to campaign
  // Engagement (new)
  | 'friend_post'                 // Followed user published a post
  | 'weekly_recap';               // Weekly activity summary
```

### Notification Categories & Preferences
```typescript
type NotificationCategory =
  | 'social'        // like, comment, follow, post_mention
  | 'achievements'  // achievement, milestone
  | 'restaurants'   // restaurant_recommendation
  | 'boards'        // board_invite
  | 'system'        // system
  | 'campaigns'     // campaign_opportunity, campaign_application, application_approved,
                    //   campaign_deadline, deliverable_submitted, payment_sent, campaign_invite
  | 'engagement';   // friend_post, weekly_recap
```

Each category has `push_enabled`, `in_app_enabled`, `email_enabled` columns in `notification_preferences`.

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

**campaign_opportunity:**
```json
{
  "campaign_id": "uuid",
  "restaurant_id": "uuid",
  "restaurant_name": "Restaurant Name",
  "budget": 500,
  "title": "Campaign Title"
}
```

**campaign_application:**
```json
{
  "campaign_id": "uuid",
  "campaign_title": "Campaign Title",
  "creator_id": "uuid",
  "creator_name": "Creator Name",
  "creator_avatar": "url"
}
```

**application_approved:**
```json
{
  "campaign_id": "uuid",
  "campaign_title": "Campaign Title",
  "restaurant_name": "Restaurant Name"
}
```

**campaign_deadline:**
```json
{
  "campaign_id": "uuid",
  "campaign_title": "Campaign Title",
  "end_date": "2026-03-14T00:00:00Z",
  "days_remaining": 2
}
```

**deliverable_submitted:**
```json
{
  "campaign_id": "uuid",
  "campaign_title": "Campaign Title",
  "creator_id": "uuid",
  "creator_name": "Creator Name"
}
```

**payment_sent:**
```json
{
  "campaign_id": "uuid",
  "campaign_title": "Campaign Title",
  "amount": 250.00,
  "currency": "usd"
}
```

**campaign_invite:**
```json
{
  "campaign_id": "uuid",
  "campaign_title": "Campaign Title",
  "restaurant_name": "Restaurant Name",
  "restaurant_id": "uuid"
}
```

**friend_post:**
```json
{
  "post_id": "uuid",
  "post_type": "review",
  "author_id": "uuid",
  "author_name": "Author Name",
  "author_avatar": "url",
  "restaurant_name": "Restaurant Name"
}
```

**weekly_recap:**
```json
{
  "week": "2026-03-09"
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
  case 'post_mention':
    router.push(`/posts/${notification.related_id}`);
    break;

  case 'follow':
    router.push(`/user/${notification.related_id}`);
    break;

  case 'restaurant_recommendation':
    router.push(`/restaurant/${notification.related_id}`);
    break;

  // Campaign types → creator/business screens
  case 'campaign_opportunity':
  case 'campaign_application':
  case 'application_approved':
  case 'campaign_deadline':
  case 'deliverable_submitted':
  case 'payment_sent':
  case 'campaign_invite':
    // Routes to campaign detail or creator/business dashboard
    break;

  // Engagement types
  case 'friend_post':
    router.push(`/posts/${notification.related_id}`);
    break;

  case 'weekly_recap':
    router.push('/(tabs)');  // Navigate to feed
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

## Push Notification Architecture

### Flow: Database → Edge Function → Expo Push API

1. **Triggers** insert rows into the `notifications` table
2. **Database webhook** fires on `notifications` INSERT → calls Edge Function
3. **Edge Function** (`supabase/functions/push-notifications/index.ts`):
   - Looks up user's `push_tokens` (active tokens only)
   - Validates Expo push token format (`ExponentPushToken[...]`)
   - Sends via Expo Push API in batches of 100
   - Processes receipts and deactivates `DeviceNotRegistered` tokens
   - Maps notification `priority` to Expo priority levels
   - Sets `channelId` based on notification type

### Database Triggers (auto-create notifications)

| Trigger | Table | Event | Who gets notified |
|---------|-------|-------|-------------------|
| campaign_opportunity | campaigns | UPDATE → 'active' | Local creators (matching city) |
| campaign_application | campaign_applications | INSERT | Business owner |
| application_approved | campaign_applications | UPDATE → 'accepted' | Creator |
| campaign_deadline | pg_cron (daily 9 AM UTC) | Active campaigns ending in 2 days | Hired creators |
| deliverable_submitted | creator_campaigns | UPDATE (deliverables_status change) | Business owner |
| payment_sent | creator_earnings | INSERT/UPDATE → 'available'/'paid' | Creator |
| campaign_invite | campaign_invitations | INSERT | Creator |
| friend_post | posts | INSERT | Followers (rate-limited: 1/author/follower/hour) |
| weekly_recap | pg_cron (Sunday 6 PM UTC) | Active users (signed in within 30 days) | User |

All triggers check `notification_preferences` before inserting.

### Client-Side Setup

#### 1. Register Device Token
```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function App() {
  usePushNotifications();  // Auto-registers on mount
}
```

#### 2. Handle Incoming Notifications
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

### Deployment
```bash
npm run functions:deploy:push   # Deploy Edge Function
npm run functions:logs:push     # View Edge Function logs
```

See `specs/features/push-notifications/deployment.md` for webhook setup and configuration.

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
- `app/notifications/index.tsx` - Notifications screen with deep link navigation
- `components/NotificationItem.tsx` - Single notification display (icon/color mapping for all 18 types)
- `components/NotificationSettings.tsx` - Notification preferences UI (7 categories)
- `hooks/useRealtimeNotifications.ts` - Real-time subscription
- `hooks/usePushNotifications.ts` - Push notification setup
- `types/notifications.ts` - TypeScript types (all 18 notification types + data interfaces)
- `services/notificationService.ts` - Core notification service
- `services/notificationPreferencesService.ts` - Preference management (7 categories)
- `services/pushNotificationService.ts` - Client-side push token management
- `supabase/functions/push-notifications/index.ts` - Edge Function for push delivery
- `specs/features/push-notifications/spec.md` - Full feature specification
- `specs/features/push-notifications/deployment.md` - Edge Function deployment guide
- `testing/push-notifications/` - SQL verification and cleanup scripts
