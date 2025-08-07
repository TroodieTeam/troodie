# Task 2.1 – Create Comprehensive Activity Feed Page

**Epic:** 2 – New Features  
**Priority:** High  
**Estimate:** 2 days  
**Status:** ✅ Completed

---

## 1. Overview
Develop a unified **Activity** tab that aggregates platform-wide actions: posts, community joins, saved restaurants, follows, etc. Provide filters for *All Troodie* vs *Friends / Following* and group items by type & recency.

## 2. Business Value
A central timeline keeps users engaged, surfaces social proof, and encourages exploration of new content, boosting daily active usage.

## 3. Dependencies
- Requires real-time updates from existing notification/feed services (supabase channels already in place).

## 4. Blocks / Enables
- Enables future social algorithms (e.g., reactions, trending logic) by consolidating events in one feed.

## 5. Acceptance Criteria (Gherkin)
```gherkin
Feature: Centralized Activity Feed
  Scenario: Viewing activity
    Given I navigate to the Activity tab
    Then I see a scrollable feed of platform-wide activity (e.g., X user joined a community, saved a place, shared a board)
    And the feed is grouped by type and recency with an option to filter between all of Troodie and just friends / network
```

## 6. Technical Implementation
1. **Route**: `app/(tabs)/activity.tsx` – convert placeholder to functional screen.
2. **Data model**: Extend `supabase.public.activity_feed` view (SQL) combining events from posts, saves, follows, etc.
3. **Realtime**: Subscribe to supabase channel triggers for inserts on underlying tables.
4. **UI**:
   - `ActivityItem` component with icon per type.
   - Sticky segmented control (`All` / `Friends`).
5. **Pagination**: Implement infinite scroll using timestamp + `range` query.
6. **Cache**: Use `useSmoothDataFetch` for optimistic updates.

## 7. Definition of Done
- [x] Feed shows at least 4 event types (post, follow, save, community join)
- [x] Filter toggles between global vs friends data sets
- [x] Real-time event appears <2s after action
- [x] Performance: initial load <300 ms on wifi
- [x] Unit tests for reducer / SQL view

## 8. Resources
- `services/socialActivityService.ts`
- Supabase SQL migrations folder for examples of existing views.

## 9. Notes
Consider future support for reactions & comments on activity items.
