# Streamline Add Restaurant Flow (Already in Database)

- Epic: MVP
- Priority: Critical
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: task-mvp-10-add-restaurant-not-in-db

## Overview
When users try to add a restaurant that's already in the database, they see "Already in system" but then must search again to actually save it. This should be a single action.

## Business Value
Eliminating redundant steps reduces user frustration and increases successful save completions. The current flow confuses users who think they've saved when they haven't.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Efficient restaurant saving for existing venues
  As a user wanting to save an existing restaurant
  I want to save it in one action
  So that I don't waste time with redundant steps

  Scenario: Adding restaurant already in database
    Given I search for a restaurant already in our database
    When I select it from search results
    Then it should immediately:
      - Save to my profile
      - Show success confirmation
      - Keep me on current screen
    And I should NOT see "Already in system" error
    And I should NOT need to search again

  Scenario: Clear save action
    Given I find an existing restaurant
    When I tap to select it
    Then I should see one of:
      - "Save" button if not saved
      - "Saved" indicator if already saved
    And tapping Save should complete immediately
```

## Technical Implementation
Current problematic flow:
1. Type restaurant name
2. Select from list
3. See "Already in system" toast
4. Back to explore
5. Type restaurant name AGAIN
6. Select from list again
7. Click on restaurant
8. Save

New streamlined flow:
1. Type restaurant name
2. Select from list
3. Automatically saves to profile
4. Toast: "Restaurant saved!"
5. Stay on current screen

Implementation steps:
- Change selection behavior in search
- Check if restaurant exists in DB
- If exists: save directly to user profile
- If not exists: show add form
- Remove confusing "Already in system" message
- Add visual indicator for saved restaurants
- Implement unsave option if already saved

## Definition of Done
- [ ] Single tap to save existing restaurants
- [ ] No "Already in system" error message
- [ ] No need to search twice
- [ ] Clear saved/unsaved status
- [ ] Toast confirmation on save
- [ ] Can unsave if needed
- [ ] Works consistently everywhere
- [ ] User testing confirms improvement

## Notes
- This pairs with task-mvp-10 for complete flow
- Consider showing save count for restaurants
- Add to favorites vs. save distinction?