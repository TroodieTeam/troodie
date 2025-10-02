# Fix Posts Like Counter Not Updating

- Epic: Social Features
- Priority: High
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Like button shows as red (liked state) but the like counter remains at 0. The UI state and counter are out of sync.

## Business Value
Broken like counters reduce social proof and engagement. Users won't engage with content if they don't see others engaging. This directly impacts content virality.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Post like counter
  As a user
  I want to see accurate like counts
  So that I know which content is popular

  Scenario: Like a post
    Given a post has 0 likes
    When I tap the heart icon
    Then the icon turns red
    And the counter increments to 1
    And the like is persisted to the database

  Scenario: Unlike a post
    Given I previously liked a post
    When I tap the heart icon again
    Then the icon turns gray
    And the counter decrements by 1
    And the like is removed from the database

  Scenario: View post with existing likes
    Given a post has 5 likes from other users
    When I view the post
    Then I see "5" in the like counter
    And the heart is gray (unless I liked it)

  Scenario: Real-time counter updates
    Given I'm viewing a post
    When another user likes it
    Then the counter updates automatically
```

## Technical Implementation
- Debug the like mutation/update flow
  - Check if post_likes table is being updated correctly
  - Verify RLS policies allow inserts/deletes
- Check the like count query/aggregation
  - Ensure COUNT is pulling from post_likes table
  - Verify user_id matching logic
- Update like button component to:
  - Optimistically update local state
  - Increment/decrement counter immediately
  - Rollback on API error
- Add Supabase real-time subscription for like updates
- Ensure proper error handling and retry logic
- Add analytics event for like/unlike actions

Database check:
```sql
-- Verify post_likes structure
SELECT * FROM post_likes WHERE post_id = 'test-post-id';

-- Check if count query is correct
SELECT COUNT(*) FROM post_likes WHERE post_id = 'test-post-id';
```

## Definition of Done
- [ ] Like counter increments/decrements correctly
- [ ] Visual state (heart color) matches counter
- [ ] Database persists likes accurately
- [ ] Real-time updates working (if applicable)
- [ ] Optimistic UI updates implemented
- [ ] Error handling for network failures
- [ ] Tested with multiple users liking same post
- [ ] Analytics tracking verified

## Notes
Example from feedback: "tried to like a post from @des2impress and the heart is red but the count is still 0"
Check if this is a UI issue or database issue first.
