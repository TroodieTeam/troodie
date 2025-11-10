# Fix Activity Feed - Show Board Creation Events

- Epic: Social Features
- Priority: High
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: task-social-3-activity-feed-saves.md

## Overview
Board creation events aren't showing in activity feed. Example: "Taylor created new board 'Luxury Restaurants'" should appear but doesn't.

## Business Value
Board creation is a key engagement signal. Seeing friends create boards encourages others to explore and collaborate. Missing these events reduces social discovery.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Activity feed board creation events
  As a user
  I want to see when friends create boards
  So that I can discover interesting collections

  Scenario: Friend creates board
    Given I follow Taylor
    And Taylor creates "Luxury Restaurants" board
    When I view my activity feed
    Then I see "Taylor created new board 'Luxury Restaurants'"
    And I can tap to view the board

  Scenario: Collaborative board creation
    Given Taylor creates a collaborative board
    When I view the activity feed
    Then I see the creation event
    And I can request to join or view the board
```

## Technical Implementation
- Add database trigger on boards table:
  ```sql
  CREATE TRIGGER on_board_create
  AFTER INSERT ON boards
  FOR EACH ROW EXECUTE FUNCTION create_board_activity();
  ```
- Implement activity creation function:
  ```sql
  CREATE OR REPLACE FUNCTION create_board_activity()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO activity_feed (
      user_id,
      activity_type,
      entity_type,
      entity_id,
      metadata,
      created_at
    ) VALUES (
      NEW.user_id,
      'board_create',
      'board',
      NEW.id,
      jsonb_build_object('board_name', NEW.name),
      NOW()
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```
- Update board creation flow to trigger activity
- Update activity feed query to include board creation events
- Design UI component for board creation activity items
- Add navigation to board detail on tap

## Definition of Done
- [ ] Board creation events appear in feed
- [ ] Shows board name correctly
- [ ] Tappable to view board
- [ ] Works with activity feed real-time updates
- [ ] Consistent styling with other feed items
- [ ] Database trigger tested
- [ ] No performance regression

## Notes
Depends on activity feed infrastructure from task-social-3. Can be completed in parallel if activity_feed table exists.
