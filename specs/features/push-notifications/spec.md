# Push Notifications System (TRO-18)

## Overview

Implement a complete push notification system for Troodie covering social interactions, campaign lifecycle, and engagement prompts. Notifications fire via database triggers (server-side), are delivered through an Edge Function webhook, and render in-app with deep linking to relevant screens.

## Architecture

```
Database Trigger (INSERT on source table)
  → Creates row in `notifications` table
  → Database Webhook fires on `notifications` INSERT
  → Supabase Edge Function `push-notifications`
  → Fetches push tokens for user from `push_tokens`
  → Sends to Expo Push API
  → Device receives push notification
```

**Key principle**: All notification creation happens server-side via SQL triggers. The frontend only reads/displays notifications and manages preferences. No client-side notification creation for these types.

## Notification Types

### Social Notifications (existing triggers, need push delivery)
| Type | Trigger | Recipient | Navigation |
|------|---------|-----------|------------|
| `follow` | User follows another | Followed user | `/user/${actorId}` |
| `like` | User likes a post | Post owner | `/posts/${postId}` |
| `comment` | User comments on post | Post owner | `/posts/${postId}` |
| `board_invite` | User invited to board | Invitee | `/boards/${boardId}` |

### Campaign Notifications (new)
| Type | Trigger | Recipient | Navigation |
|------|---------|-----------|------------|
| `campaign_opportunity` | Campaign status → `active` | Local creators | `/creator/campaigns/${campaignId}` |
| `campaign_application` | Creator applies to campaign | Business owner | `/business/campaigns/${campaignId}?tab=applications` |
| `application_approved` | Application status → `accepted` | Creator | `/creator/campaigns` |
| `campaign_deadline` | pg_cron daily check, 2 days before end_date | Hired creators | `/creator/campaigns` |
| `deliverable_submitted` | Creator uploads content | Business owner | `/business/campaigns/${campaignId}?tab=deliverables` |
| `payment_sent` | Deliverable approved / payout completed | Creator | `/creator/earnings` |
| `campaign_invite` | Business invites creator | Creator | `/creator/campaigns/${campaignId}` |

### Engagement Notifications (new)
| Type | Trigger | Recipient | Navigation |
|------|---------|-----------|------------|
| `friend_post` | Followed user creates a post | Followers | `/posts/${postId}` |
| `weekly_recap` | pg_cron every Sunday 6 PM | All active users | `/add/create-post` |

## Database Changes

### 1. Notification Type Constraint
Single consolidated constraint replacing per-migration drops:

```sql
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  -- Social (existing)
  'like', 'comment', 'follow', 'achievement',
  'restaurant_recommendation', 'board_invite', 'post_mention',
  'milestone', 'system',
  -- Campaign (new)
  'campaign_opportunity', 'campaign_application', 'application_approved',
  'campaign_deadline', 'deliverable_submitted', 'payment_sent', 'campaign_invite',
  -- Engagement (new)
  'friend_post', 'weekly_recap'
));
```

### 2. Notification Preferences Columns
Add per-category toggle columns to `notification_preferences`:

```sql
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS campaigns_push_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS campaigns_in_app_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS engagement_push_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS engagement_in_app_enabled BOOLEAN DEFAULT true;
```

### 3. Database Triggers (one per notification type)
Each trigger function:
1. Fires on INSERT/UPDATE of the source table
2. Checks user preferences before inserting
3. Inserts into `notifications` with correct type, title, message, data JSON, related_id, related_type

### 4. Cron Jobs (pg_cron)
- `send-campaign-deadline-reminders`: Daily 9 AM UTC, checks campaigns ending in 2 days
- `send-weekly-recap`: Every Sunday 6 PM UTC

## Edge Function: `push-notifications`

Single Edge Function deployed to handle all push delivery:

```typescript
// Triggered by database webhook on notifications INSERT
// 1. Read the new notification row
// 2. Fetch user's active push tokens from push_tokens
// 3. Skip if no valid tokens
// 4. Send via Expo Push API (batch)
// 5. Handle ticket receipts — mark invalid tokens as is_active = false
```

### Webhook Configuration
- **Table**: `public.notifications`
- **Events**: `INSERT`
- **Endpoint**: `https://<project-ref>.supabase.co/functions/v1/push-notifications`
- **Headers**: `Authorization: Bearer <service-role-key>`

## Frontend Changes

### TypeScript Types (`types/notifications.ts`)
Add new notification types to `NotificationType` union and create data interfaces for each new type.

### Notification Type Constraint (`lib/supabase.ts`)
Update the generated database types to include all new notification type values in the type union.

### `NotificationItem.tsx`
Add icon/color mapping and deep link navigation for each new notification type:
- Campaign types → briefcase icon, blue color
- Engagement types → heart icon, pink color
- Navigate using `router.push()` based on notification type + `data` payload

### `NotificationSettings.tsx`
Add UI sections for new preference categories:
- **Campaigns** toggle (push + in-app)
- **Engagement** toggle (push + in-app)

### `NotificationCenter.tsx`
Ensure all new types render correctly with appropriate formatting.

## Preference Checking Logic

Triggers must respect user preferences:

```sql
-- Check if user has disabled this notification category
AND NOT EXISTS (
  SELECT 1 FROM notification_preferences np
  WHERE np.user_id = target_user_id
  AND np.campaigns_push_enabled = false  -- for push
)
```

For in-app notifications, check `campaigns_in_app_enabled` separately.

## Acceptance Criteria

1. All 9 new notification types fire correctly from database triggers
2. Push notifications delivered to devices via Edge Function
3. In-app notifications appear in real-time via existing Supabase subscription
4. Tapping a notification navigates to the correct screen
5. Users can toggle notification categories on/off in settings
6. Invalid push tokens are deactivated automatically
7. Cron jobs run on schedule (deadline reminders + weekly recap)
8. No TypeScript errors — all types aligned between SQL and TS
9. Existing notification types (like, comment, follow, etc.) continue working

## Out of Scope

- Email notifications
- Rich push notification content (images, action buttons)
- Notification grouping/batching
- Analytics on notification engagement
- Restaurant mention notifications (PR #40 — separate concern)
