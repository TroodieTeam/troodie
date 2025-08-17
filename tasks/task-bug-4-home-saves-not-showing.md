# Fix: Home "Your Saves" Not Showing After Save

- Epic: bug
- Priority: Medium
- Estimate: 1 day
- Status: ✅ Completed
- Assignee: -
- Dependencies: -

## Overview
User saved a restaurant; it appears in Quick Saves but the Home screen section "Your Saves" shows empty. Likely missing data refresh or incorrect source for the home widget.

## Business Value
Home is the primary surface for return engagement; saved content must reflect immediately.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Home shows recent saves
  As a user
  I want my recent saves to appear on Home
  So that I can quickly access them

  Scenario: Save appears in Home
    Given I save a restaurant
    When I navigate to Home
    Then I see that restaurant in the "Your Saves" carousel

  Scenario: Real-time/refresh
    Given I am on Home
    When I save a restaurant in another screen
    Then the Home list updates within a second or on pull-to-refresh
```

## Technical Implementation
- Component: `components/home/QuickSavesBoard.tsx`
  - Confirm data source `boardService.getQuickSavesRestaurants(user.id, 10)` includes latest save.
  - Add dependency on a global refresh event or navigation focus listener to trigger `loadQuickSaves()` after a save.
  - Consider using `useFocusEffect` or an app-level event bus published by `saveService`.
- Services: `saveService.ts`, `boardService.ts`
  - Verify the save persists to the same table/query the home widget reads from.
- Optional: Integrate with `useRealtimeFeed` to push new saves into the list.

## Definition of Done
- [x] Newly saved restaurants appear on Home within 1s or on focus
- [x] Pull-to-refresh reloads data
- [x] Works offline-safe with graceful errors
- [x] Lint/types pass

## Notes
Screenshot shows Quick Saves count increasing while Home section stays empty.
