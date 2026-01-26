# TRO-146: Creator Contact Method - Push Notifications

## Overview

Implement push notifications and in-app notifications to alert:
1. Creators when a new campaign matches their profile
2. Restaurants when a creator applies to their campaign

## Jobs To Be Done

- Creators receive timely alerts about new campaign opportunities
- Restaurants receive timely alerts about new applicants
- Both user types can see notification history in-app

## Acceptance Criteria

### New Campaign Alert (to Creators)

- [ ] When restaurant posts new campaign, identify matching creators
- [ ] Matching criteria: location, compensation type, availability
- [ ] Send push notification: "New campaign opportunity from [Restaurant Name]!"
- [ ] Create in-app notification record
- [ ] Tapping notification opens campaign detail screen
- [ ] Respect user notification preferences

### New Applicant Alert (to Restaurants)

- [ ] When creator applies to campaign, notify restaurant owner
- [ ] Send push notification: "[Creator Name] applied to your campaign!"
- [ ] Create in-app notification record
- [ ] Tapping notification opens applications list for that campaign
- [ ] Respect user notification preferences

### In-App Notification Records

- [ ] Store notifications in existing `notifications` table
- [ ] Notification types:
  - `new_campaign_opportunity` - for creators
  - `new_campaign_applicant` - for restaurants
- [ ] Include metadata: campaign_id, creator_id, restaurant_id
- [ ] Show in notification center with correct deep links

### Notification Preferences

- [ ] Add preference toggles:
  - Creators: "New campaign opportunities" (on by default)
  - Restaurants: "New applicants" (on by default)
- [ ] Store in `notification_preferences` table
- [ ] Check preferences before sending push

## Technical Implementation

### Trigger Points

1. **New Campaign Posted** (`campaignService.ts` → `createCampaign()`)
   - After successful campaign creation
   - Query for matching creators (location, compensation, open_to_collabs)
   - Batch send notifications

2. **Creator Applies** (`creatorApplicationService.ts` → `applyToCampaign()`)
   - After successful application submission
   - Get restaurant owner's user_id
   - Send single notification

### Database Changes

- [ ] Add notification preference rows for new types:
  ```sql
  INSERT INTO notification_preference_types (key, label, default_enabled)
  VALUES
    ('new_campaign_opportunity', 'New campaign opportunities', true),
    ('new_campaign_applicant', 'New campaign applicants', true);
  ```

### Push Notification Payload

**New Campaign (to Creator)**:
```json
{
  "title": "New Campaign Opportunity!",
  "body": "[Restaurant Name] is looking for creators",
  "data": {
    "type": "new_campaign_opportunity",
    "campaign_id": "uuid",
    "route": "/creator/campaigns/[id]"
  }
}
```

**New Applicant (to Restaurant)**:
```json
{
  "title": "New Campaign Applicant",
  "body": "[Creator Name] applied to [Campaign Name]",
  "data": {
    "type": "new_campaign_applicant",
    "campaign_id": "uuid",
    "application_id": "uuid",
    "route": "/business/campaigns/[id]/applications"
  }
}
```

## Files to Modify

1. `services/campaignService.ts` - Add notification trigger on campaign create
2. `services/creatorApplicationService.ts` - Add notification trigger on apply
3. `services/notificationService.ts` - Add helper functions for new notification types
4. `services/pushNotificationService.ts` - Ensure proper payload handling
5. `supabase/migrations/XXXXXX_campaign_notification_types.sql` - Add preference types

## Existing Infrastructure

- Push notifications: `services/pushNotificationService.ts`
- In-app notifications: `services/notificationService.ts`
- Real-time hook: `hooks/useRealtimeNotifications.ts`
- Notification preferences: `notification_preferences` table

## Testing Checklist

- [ ] Creator receives push when new campaign posted in their city
- [ ] Creator does NOT receive push if preferences disabled
- [ ] Creator sees in-app notification in notification center
- [ ] Restaurant receives push when creator applies
- [ ] Restaurant sees in-app notification
- [ ] Tapping push opens correct screen
- [ ] Batch notifications don't spam (reasonable throttling)

## Out of Scope

- Email notifications
- SMS notifications
- Notification scheduling/digest
- Notification analytics
