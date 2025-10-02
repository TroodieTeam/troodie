# Implement Mark as Visited Functionality

- Epic: Restaurant Management
- Priority: High
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Add "Mark as Visited" button next to save icon that triggers a review prompt. Support tracking multiple visits to show ongoing ROI for restaurants.

## Business Value
Visit tracking is critical for understanding user behavior and restaurant ROI. Multiple visits indicate high satisfaction and are valuable signals for recommendations. Review prompts increase content generation.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Mark restaurant as visited
  As a user
  I want to mark when I visit a restaurant
  So that I can track my dining history

  Scenario: First visit to a restaurant
    Given I'm at a restaurant I've never visited
    When I tap "Mark as Visited"
    Then I see a review prompt
    And I can add photos, rating, and comments
    And the visit is recorded with timestamp

  Scenario: Multiple visits
    Given I previously visited a restaurant
    When I tap "Mark as Visited" again
    Then my visit count increments
    And I can add a new review/note for this visit
    And I see "Visited 3 times" badge

  Scenario: Skip review
    Given I marked a restaurant as visited
    When I dismiss the review prompt
    Then the visit is still recorded
    And I can add a review later

  Scenario: View visit history
    Given I visited a restaurant multiple times
    When I view the restaurant detail
    Then I see my visit dates and notes
    And my visit count is displayed
```

## Technical Implementation
- Create restaurant_visits table:
  ```sql
  CREATE TABLE restaurant_visits (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    restaurant_id UUID REFERENCES restaurants(id),
    visited_at TIMESTAMP,
    visit_number INT, -- 1st, 2nd, 3rd visit
    notes TEXT,
    rating INT,
    created_at TIMESTAMP,
    UNIQUE(user_id, restaurant_id, visited_at)
  );

  CREATE INDEX idx_visits_user ON restaurant_visits(user_id);
  CREATE INDEX idx_visits_restaurant ON restaurant_visits(restaurant_id);
  ```
- Add "Mark as Visited" icon/button next to save button
  - Use checkmark or location pin icon
  - Show visit count if > 0
- Implement visit tracking service:
  ```typescript
  async function markAsVisited(restaurantId, userId) {
    const visitCount = await getVisitCount(restaurantId, userId);
    await createVisit(restaurantId, userId, visitCount + 1);
    showReviewPrompt(restaurantId, visitCount + 1);
  }
  ```
- Create review prompt modal:
  - Quick rating (stars)
  - Photo upload
  - Notes/comments field
  - "Skip" option that still saves visit
- Display visit count badge on restaurant cards
- Add visit history section to restaurant detail page
- Update restaurant for business dashboard:
  - Show unique visitors
  - Show return visitor rate
  - Track visit → review conversion rate
- Add analytics events:
  - visit_marked
  - review_from_visit_prompt
  - repeat_visit

## Definition of Done
- [ ] Mark as visited button implemented
- [ ] Visit tracking persists correctly
- [ ] Multiple visits tracked separately
- [ ] Review prompt appears after marking visited
- [ ] Visit count displays correctly
- [ ] Visit history viewable
- [ ] Business dashboard shows visit metrics
- [ ] Analytics tracking verified
- [ ] Tested with 1, 2, and many visits

## Notes
From feedback: "Mark as visited icon next to save icon. Triggers review prompt. Ability to mark a restaurant as visited multiple times (important for showing ongoing ROI)"

This creates valuable data for both users and businesses.
