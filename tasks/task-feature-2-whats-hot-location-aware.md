# Feature: Make "What's Hot Right Now" Location-Aware

- Epic: discovery
- Priority: Medium
- Estimate: 1 day
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: -

## Overview
Users want "What's Hot Right Now" on Home to reflect their current city/region. When traveling (e.g., NY this week, Triad next week), show trending content for the current location to avoid confusion.

## Business Value
Improves relevance, CTR, and conversion for saves/visits by aligning content to user context.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Location-aware trending module
  As a user
  I want What's Hot to use my current location
  So that I see relevant restaurants and posts

  Scenario: Auto-select city
    Given location permission is granted
    When I open Home
    Then What's Hot shows trends for my current metro/region

  Scenario: Manual override
    Given I change the city selector
    When I select a different city
    Then What's Hot refreshes using that city

  Scenario: Permission denied
    Given I deny location
    Then What's Hot falls back to last-used or a default city
```

## Technical Implementation
- Data: `useRealtimeFeed`/trending service — add query param `city/region` derived from current `restaurant.location` or geo lookup.
- UI: add a small city pill/button on the module header for override.
- Permissions: use existing reviewed location permission copy; do not auto-prompt—surface inline CTA.

## Definition of Done
- [ ] Module filters by derived city/region
- [ ] Manual override persists for session
- [ ] Sensible fallback when permission denied
- [ ] Type/lint clean

## Notes
Initial granularity can be city-level string match on `restaurants.location`. Enhance later with geohash proximity.

