# Implement Push Notification Strategy

- Epic: Notifications
- Priority: High
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Implement proactive push notifications to drive engagement: weekly check-ins, travel alerts, friend activity notifications.

## Business Value
Push notifications are critical for retention. Weekly check-ins create habits. Travel alerts leverage network effects. Timely notifications increase app opens and engagement.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Weekly dining check-in notification
  As the app
  I want to remind users to log their dining activity
  So that they stay engaged weekly

  Scenario: Weekly check-in - active user
    Given it's Sunday evening at 6pm
    And the user dined out this week
    When the notification triggers
    Then they receive "Did you go out to eat this week? Let us know where you went"
    And tapping opens quick-add restaurant flow

  Scenario: Weekly check-in - inactive user
    Given it's Sunday evening
    And the user hasn't opened the app in 7 days
    When the notification triggers
    Then they receive "Time for your weekly Troodie update - let us know what you ate this week"

Feature: Travel opportunity alerts
  As a user
  I want to know when friends are traveling
  So that I can share recommendations

  Scenario: Friend upcoming trip
    Given my friend added a trip to Miami
    And I have saves in Miami
    When the trip is 7 days away
    Then I receive "[Friend] is going to Miami - share your favorite spots!"
    And tapping opens my Miami saves with share option

  Scenario: Friend on trip
    Given my friend is currently in Paris
    And I have Paris recommendations
    When they arrive (timezone detection)
    Then I receive "Help [Friend] discover Paris - send your recs!"
```

## Technical Implementation

### Notification Infrastructure
- Set up Expo push notifications
  - Register for push token
  - Store tokens in user_push_tokens table
  - Handle token refresh
- Create notifications service
  ```typescript
  interface NotificationPayload {
    type: 'weekly_checkin' | 'travel_alert' | 'friend_activity';
    title: string;
    body: string;
    data: any;
    scheduledFor?: Date;
  }

  async function sendNotification(userId: string, payload: NotificationPayload) {
    const tokens = await getPushTokens(userId);
    await expo.sendPushNotificationsAsync(tokens.map(token => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
    })));
  }
  ```

### Notification Scheduling
- Weekly check-in:
  - Cron job every Sunday at 6pm local time
  - Personalize message based on user activity
  - Randomize time slightly to avoid server spike
  ```typescript
  async function scheduleWeeklyCheckins() {
    const users = await getActiveUsers();
    for (const user of users) {
      const hasActivity = await hasActivityThisWeek(user.id);
      const message = hasActivity
        ? "Did you go out to eat this week? Let us know where you went"
        : "Time for your weekly Troodie update - let us know what you ate this week";

      await sendNotification(user.id, {
        type: 'weekly_checkin',
        title: 'Weekly Check-in',
        body: message,
        data: { action: 'quick_add' },
      });
    }
  }
  ```

- Travel alerts:
  - Monitor friend_trips table
  - Send notification 7 days before trip if user has recs for destination
  - Send day-of notification when friend arrives
  ```typescript
  async function checkTravelOpportunities() {
    const upcomingTrips = await getUpcomingTrips();

    for (const trip of upcomingTrips) {
      const friends = await getFriendsWith RecsForCity(trip.city);

      for (const friend of friends) {
        if (trip.daysUntil === 7) {
          await sendNotification(friend.id, {
            type: 'travel_alert',
            title: 'Help a friend out!',
            body: `${trip.user.name} is going to ${trip.city} - share your favorite spots!`,
            data: {
              action: 'share_recs',
              city: trip.city,
              friendId: trip.user.id,
            },
          });
        }
      }
    }
  }
  ```

### Notification Preferences
- Settings screen for notification preferences
  - Weekly check-ins: on/off, preferred time
  - Travel alerts: on/off
  - Friend activity: on/off
  - Marketing: on/off
- Store preferences in user_notification_preferences table
- Respect Do Not Disturb hours (10pm - 8am)

### Deep Linking
- Handle notification taps to open specific screens
- Routes:
  - weekly_checkin → quick add flow
  - travel_alert → city recs share screen
  - friend_activity → activity feed

### Analytics
Track:
- Notification sent
- Notification delivered
- Notification opened
- Action completed from notification
- Opt-out rate by notification type

## Definition of Done
- [ ] Push notification infrastructure set up
- [ ] Weekly check-in notifications working
- [ ] Travel alert notifications working
- [ ] Notification preferences implemented
- [ ] Deep linking functional
- [ ] Analytics tracking implemented
- [ ] Timezone handling correct
- [ ] Tested on iOS and Android
- [ ] Respects Do Not Disturb
- [ ] Unsubscribe flow works

## Notes
From feedback:
- "Did you go out to eat this week? Let us know where you went"
- "Time for your weekly Troodie update - let us know what you ate this week"
- "Proactive travel notifications - alerting users when friends have upcoming trips for recommendation sharing"

Consider A/B testing message copy and timing for optimal engagement.
