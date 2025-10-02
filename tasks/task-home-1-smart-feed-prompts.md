# Implement Smart Home Feed with Engagement Prompts

- Epic: Smart Home Feed
- Priority: High
- Estimate: 3 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Replace generic feed with smart prompts that drive engagement: "Invite your favorite friend to dinner → start a collab board together", "Prompts to earn points / build out profile", etc.

## Business Value
Empty feed = low engagement. Smart prompts guide users to take valuable actions, increase retention, and build network effects. Gamification (points) increases daily active usage.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Smart engagement prompts
  As a user
  I want actionable prompts on my home feed
  So that I know what to do next

  Scenario: New user with no activity
    Given I'm a new user with empty profile
    When I view the home feed
    Then I see "Complete your profile to get better recommendations (+50 points)"
    And "Add your first restaurant (+10 points)"
    And "Invite a friend (+25 points)"

  Scenario: User with friends but no boards
    Given I have 3 friends but no boards
    When I view the home feed
    Then I see "Create your first board with [Friend Name]"
    And tapping it opens board creation with friend pre-selected

  Scenario: Returning user
    Given I haven't logged activity this week
    When I view the home feed
    Then I see "Did you go out to eat this week? Tell us where!"
    And tapping it opens quick-add restaurant flow

  Scenario: Travel opportunity
    Given my friend has an upcoming trip to Miami
    When I view the home feed
    Then I see "[Friend] is going to Miami - share your recs!"
    And tapping opens my Miami saves to share
```

## Technical Implementation

### Prompt Engine
Create intelligent prompt system that considers:
- User profile completeness
- Recent activity (or lack thereof)
- Friend activity and travel plans
- Time of day/week (weekly check-in on Sundays)
- Onboarding stage

```typescript
interface Prompt {
  id: string;
  type: 'action' | 'social' | 'content' | 'gamification';
  priority: number;
  title: string;
  description: string;
  cta: string;
  action: () => void;
  points?: number;
  dismissable: boolean;
}

async function generatePrompts(user: User): Promise<Prompt[]> {
  const prompts: Prompt[] = [];

  // Profile completion
  if (!user.bio) {
    prompts.push({
      type: 'gamification',
      priority: 8,
      title: 'Complete your profile',
      description: 'Add a bio and profile photo',
      cta: 'Get +50 points',
      points: 50,
      action: () => router.push('/profile/edit'),
      dismissable: false,
    });
  }

  // Social prompts
  const friendsWithoutBoards = await getFriendsWithoutSharedBoards(user.id);
  if (friendsWithoutBoards.length > 0) {
    prompts.push({
      type: 'social',
      priority: 7,
      title: `Create a board with ${friendsWithoutBoards[0].name}`,
      description: 'Plan your next dinner together',
      cta: 'Start collaborating',
      action: () => createBoardWithFriend(friendsWithoutBoards[0].id),
      dismissable: true,
    });
  }

  // Activity prompts
  const lastActivity = await getLastActivity(user.id);
  if (daysSince(lastActivity) > 7) {
    prompts.push({
      type: 'content',
      priority: 6,
      title: 'Did you go out to eat this week?',
      description: 'Share where you went',
      cta: 'Add visit',
      action: () => openQuickAddFlow(),
      dismissable: true,
    });
  }

  // Travel opportunity
  const friendTrips = await getUpcomingFriendTrips(user.id);
  for (const trip of friendTrips) {
    prompts.push({
      type: 'social',
      priority: 9,
      title: `${trip.friend.name} is visiting ${trip.city}`,
      description: 'Share your favorite spots',
      cta: 'Send recommendations',
      action: () => shareRecsForCity(trip.city, trip.friend.id),
      dismissable: true,
    });
  }

  // Sort by priority
  return prompts.sort((a, b) => b.priority - a.priority);
}
```

### Gamification System
- Create points/achievements system
- Award points for key actions:
  - Complete profile: 50 points
  - Add first restaurant: 10 points
  - Invite friend: 25 points
  - Create board: 15 points
  - Write review: 20 points
  - Visit restaurant: 5 points
- Display points in profile
- Add achievements/badges

### Prompt Cards UI
- Design visually distinct prompt cards
- Show point rewards prominently
- Use gradients/colors for different prompt types
- Add micro-interactions (haptic, animations)
- Dismissable vs persistent prompts

### Analytics
Track:
- Prompt impressions
- Prompt tap-through rate
- Action completion rate
- Points earned
- Time to action

## Definition of Done
- [ ] Prompt engine generates contextual prompts
- [ ] At least 5 prompt types implemented
- [ ] Gamification/points system working
- [ ] Friend activity integration
- [ ] Travel opportunity detection
- [ ] Weekly check-in prompt
- [ ] Prompt cards UI polished
- [ ] Analytics tracking implemented
- [ ] A/B test framework for prompt variations
- [ ] Performance optimized (no lag on feed load)

## Notes
From feedback: "Instead of saves / boards / top rated > let's add some prompts like 'invite your favorite friend to go to dinner with > start a collab board together'. Prompts to earn points / build out profile"

This is a major UX shift from passive feed to active engagement engine.
