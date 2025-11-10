# Fix Board Collaboration - Add Invite Option

- Epic: UX
- Priority: High
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Collaboration boards are missing the option to invite others. Users cannot add collaborators to their boards.

## Business Value
Collaboration is a key differentiator for Troodie. Without the ability to invite friends, the social aspect of the app is broken. This directly impacts virality and user retention.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Board collaboration invites
  As a board owner
  I want to invite friends to collaborate on my board
  So that we can plan together

  Scenario: Access invite functionality
    Given I am the owner of a board
    When I tap on board settings/options
    Then I see an "Invite Collaborators" option

  Scenario: Invite by username
    Given I am on the invite screen
    When I search for a friend by username
    And I tap "Invite"
    Then they receive a board invitation notification
    And they appear in "Pending Invites" list

  Scenario: Invite by link
    Given I am on the invite screen
    When I tap "Share Invite Link"
    Then I can share a link via native share sheet
    And anyone with the link can join the board

  Scenario: Accept invitation
    Given I received a board invite
    When I tap accept
    Then I am added as a collaborator
    And I can view and edit the board
    And I see a notification "[Name] accepted your invitation"
```

## Technical Implementation
- Add "Invite" button to board header/menu
- Create invite modal/screen with search functionality
- Implement user search by username/name
- Create board_invitations table (if not exists)
  - id, board_id, inviter_id, invitee_id, status, created_at
- Add board_members table for tracking collaborators
- Generate shareable board invite links
- Send push notification on invite
- Add invite acceptance/decline endpoints
- Update board permissions for collaborators
- Add activity feed entry for new collaborators

## Definition of Done
- [ ] Meets all acceptance criteria
- [ ] Database tables created with proper RLS
- [ ] Push notifications working
- [ ] Invite links functional
- [ ] Permissions properly enforced
- [ ] Activity feed updates
- [ ] Tested invite/accept/decline flows
- [ ] UI matches design system

## Notes
Critical bug blocking core social functionality. Should be prioritized.
