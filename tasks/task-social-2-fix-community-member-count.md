# Fix Community Member Count Shows 0

- Epic: Social Features
- Priority: Medium
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Community member list is accurate, but the count displays as 0. Visual inconsistency between list and count.

## Business Value
Accurate member counts provide social proof and help users discover active communities. A count of 0 makes communities appear inactive even when they're not.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Community member count
  As a user
  I want to see accurate member counts
  So that I can find active communities

  Scenario: View community with members
    Given a community has 5 members
    When I view the community
    Then the member count shows "5 members"
    And the member list shows all 5 members

  Scenario: Join a community
    Given a community has 3 members
    When I join the community
    Then the count increases to 4
    And I appear in the member list

  Scenario: Leave a community
    Given I am a member of a community with 10 members
    When I leave the community
    Then the count decreases to 9
    And I'm removed from the member list
```

## Technical Implementation
- Debug the community member count query
  - Check if using COUNT(*) or .length on array
  - Verify the query is pulling from correct table
- Possible issues:
  - Count query hitting wrong table/column
  - RLS blocking the count query
  - Aggregation logic error
  - State management not updating count
- Fix the count display:
  ```typescript
  // Example fix - use list length if count query fails
  const memberCount = community.member_count || community.members?.length || 0;
  ```
- Add real-time subscription for member count updates
- Ensure consistency between:
  - community_members table COUNT
  - community.member_count field (if cached)
  - UI display

Database verification:
```sql
-- Check member count
SELECT community_id, COUNT(*) as member_count
FROM community_members
WHERE community_id = 'test-community-id'
GROUP BY community_id;

-- Verify RLS policies allow SELECT
EXPLAIN SELECT COUNT(*) FROM community_members WHERE community_id = 'test-id';
```

## Definition of Done
- [ ] Member count displays correctly
- [ ] Count matches actual number of members in list
- [ ] Real-time updates when members join/leave
- [ ] Count works for all communities
- [ ] RLS policies verified
- [ ] Tested with 0, 1, and many members

## Notes
From feedback: "Member list is accurate, but count says 0"
This suggests the query for the list works but the count query doesn't.
