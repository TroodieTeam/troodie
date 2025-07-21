# Task 3.2: Network Building Implementation

## Epic: Core Social Features
- **Priority**: High
- **Estimate**: 3 days
- **Status**: 🔴 Not Started
- **Depends on**: Task 1.2 (Email Authentication)

## Overview
Implement the Build Your Network section on the home screen with three key actions: Invite Friends, Discover Local Gems (replacing Follow Local Troodies), and Share Your First Save. This implementation focuses on early-stage engagement when the user base is small.

## Business Value
- Drives early user engagement
- Creates viral growth through invites
- Encourages content creation
- Builds initial community engagement

## Dependencies
- Email Authentication system
- Restaurant data in Supabase
- Share functionality

## Blocks
- Task 3.3: Activity Feed & Interactions

## Acceptance Criteria

```gherkin
Feature: Network Building Section
  As a new user
  I want to see engaging network building options
  So that I can start building my food community

  Scenario: Inviting Friends
    Given I am on the home screen
    When I tap "Send Invites" in the network building section
    Then I should see options to:
      * Share app invite link
      * Access contacts (with permission)
      * Send email invites
    And each invite should include a personalized referral code

  Scenario: Discovering Local Gems
    Given I am on the home screen
    When I tap "Discover Gems" in the network building section
    Then I should see:
      * A curated list of highly-rated local restaurants
      * Popular dishes from these restaurants
      * Option to save restaurants for later
    And I should see a "Be the first to review" badge for unreviewed restaurants

  Scenario: Sharing First Save
    Given I am on the home screen
    When I tap "Add Restaurant" in the network building section
    Then I should be taken to the restaurant selection flow
    And after saving, I should see sharing options
    And I should get a "First Save" achievement badge
```

## Technical Implementation

### 1. Update Network Building UI
```typescript
const networkSuggestions: NetworkSuggestion[] = [
  {
    action: 'Invite Friends',
    description: 'Connect with friends to see their favorite spots',
    icon: UserPlus,
    cta: 'Send Invites',
    benefit: 'Get personalized recommendations',
    onClick: () => handleInviteFriends()
  },
  {
    action: 'Discover Local Gems',
    description: 'Be among the first to review Charlotte\'s hidden gems',
    icon: Sparkles,
    cta: 'Discover Gems',
    benefit: 'Earn Early Reviewer badges',
    onClick: () => handleDiscoverGems()
  },
  {
    action: 'Share Your First Save',
    description: 'Save a restaurant and share your experience',
    icon: Camera,
    cta: 'Add Restaurant',
    benefit: 'Build your food profile',
    onClick: () => handleFirstSave()
  },
];
```

### 2. Implement Invite System
```typescript
async function handleInviteFriends() {
  const inviteLink = await generateInviteLink(userState.userId);
  
  const shareOptions = {
    message: 'Join me on Troodie to discover Charlotte\'s best food spots!',
    url: inviteLink
  };

  return Share.share(shareOptions);
}
```

### 3. Implement Local Gems Discovery
```typescript
async function handleDiscoverGems() {
  // Fetch restaurants with no or few reviews
  const gems = await supabase
    .from('restaurants')
    .select('*')
    .order('rating', { ascending: false })
    .limit(10);

  return router.push({
    pathname: '/discover-gems',
    params: { gems: JSON.stringify(gems) }
  });
}
```

### 4. First Save Flow
```typescript
async function handleFirstSave() {
  router.push('/add/save-restaurant');
  
  // After successful save
  if (isFirstSave) {
    await unlockAchievement('first_save');
    showShareSheet({
      message: 'I just saved my first restaurant on Troodie!',
      url: `troodie://restaurant/${restaurantId}`
    });
  }
}
```

### 5. Achievement System Integration
```typescript
const achievements = {
  first_save: {
    id: 'first_save',
    title: 'First Save',
    description: 'Saved your first restaurant',
    icon: '🏆',
    points: 100
  },
  early_reviewer: {
    id: 'early_reviewer',
    title: 'Early Reviewer',
    description: 'Among the first to review a restaurant',
    icon: '⭐',
    points: 150
  }
};
```

## Definition of Done
- [ ] All three network building actions implemented and functional
- [ ] Invite system with tracking and referral codes
- [ ] Local Gems discovery feature with proper sorting and filtering
- [ ] First Save achievement system
- [ ] Share functionality for all actions
- [ ] Analytics tracking for each action
- [ ] Loading states and error handling
- [ ] Unit tests for all new functions
- [ ] E2E tests for main user flows
- [ ] Documentation updated
- [ ] Performance tested with varying data loads
- [ ] Accessibility requirements met

## Resources
- [React Native Share API](https://reactnative.dev/docs/share)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Achievement System Design](../docs/achievement-system.md)

## Notes
- Consider implementing a waitlist system if invite-only launch
- Track which CTAs are most effective for early user acquisition
- Consider adding gamification elements to encourage participation
- Plan for scaling the Local Gems feature as restaurant reviews grow 