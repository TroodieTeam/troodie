# Fix Activity Feed - Show Save Events

- Epic: Social Features
- Priority: High
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Save events aren't showing in the activity feed. Example: "Taylor saved Las Lap Miami" should appear but doesn't.

## Business Value
Activity feed is critical for social engagement and discovery. Users should see what their friends are saving to get restaurant recommendations. Missing saves reduces feed value.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Activity feed save events
  As a user
  I want to see when friends save restaurants
  So that I can discover new places

  Scenario: Friend saves restaurant
    Given I follow Taylor
    And Taylor saves "Las Lap Miami"
    When I view my activity feed
    Then I see "Taylor saved Las Lap Miami"
    And I can tap to view the restaurant

  Scenario: Multiple saves
    Given multiple friends save different restaurants
    When I view my activity feed
    Then I see all save events in chronological order
    And each shows the user, action, and restaurant name

  Scenario: Save to specific board
    Given Taylor saves a restaurant to "Miami Favorites"
    When I view the activity feed
    Then I see "Taylor saved Las Lap Miami to Miami Favorites"
    And I can tap to view the board
```

## Technical Implementation
- Add activity_feed table if not exists:
  ```sql
  CREATE TABLE activity_feed (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR (save, board_create, review, etc),
    entity_type VARCHAR (restaurant, board, etc),
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMP
  );
  ```
- Create trigger on restaurant_saves table:
  ```sql
  CREATE TRIGGER on_restaurant_save
  AFTER INSERT ON restaurant_saves
  FOR EACH ROW EXECUTE FUNCTION create_save_activity();
  ```
- Implement activity creation function
- Update save restaurant flow to create activity entry
- Query activity feed with proper joins:
  ```sql
  SELECT af.*, u.name, u.avatar, r.name as restaurant_name
  FROM activity_feed af
  JOIN users u ON af.user_id = u.id
  LEFT JOIN restaurants r ON af.entity_id = r.id
  WHERE af.user_id IN (SELECT following_id FROM follows WHERE follower_id = $userId)
  ORDER BY created_at DESC;
  ```
- Add RLS policies for activity feed
- Implement activity feed UI component
- Add real-time subscriptions for live updates

## Definition of Done
- [ ] Save events appear in activity feed
- [ ] Correct user name and restaurant name shown
- [ ] Tappable to view restaurant/board
- [ ] Real-time updates working
- [ ] Performance optimized (pagination/infinite scroll)
- [ ] RLS policies secure
- [ ] Works for all save types (individual, board)
- [ ] Analytics tracking feed engagement

## Notes
This is part of a larger activity feed system. Should also show:
- Board creations (already mentioned in feedback)
- Reviews posted
- Board collaborations
- Friend follows
