# Task 1.2 – Inline “Add Restaurant” CTA on No Search Results

**Epic:** 1 – UI/UX Improvements  
**Priority:** Medium  
**Estimate:** 0.5 day  
**Status:** 🔴 Not Started

---

## 1. Overview
When users search for a restaurant and the query returns no results, show an inline call-to-action that lets them immediately start the manual restaurant creation flow.

## 2. Business Value
Prevents dead-ends in the search flow and encourages content growth by guiding users toward adding missing venues.

## 3. Dependencies
None

## 4. Blocks / Enables
- Enables smoother path into the **Add Restaurant** flow, boosting restaurant coverage in the database.

## 5. Acceptance Criteria (Gherkin)
```gherkin
Feature: Add Restaurant Not Found Prompt
  Scenario: User searches for a restaurant not in the database
    Given I search for a restaurant and no results are found
    Then I see a message such as "Can’t find it? Add this restaurant."
    And I can tap to begin the restaurant add flow
```

## 6. Technical Implementation
1. **Search component** (`app/search/index.tsx`, hooks `useSearchPlaces`) – detect zero-result state.
2. Render a `ThemedView` with informative text + `AddRestaurantModal` trigger button.
3. Pass the original search query to pre-populate the restaurant name field.

## 7. Definition of Done
- [ ] Inline CTA appears only when there are zero results
- [ ] Tapping CTA opens add-restaurant flow with pre-filled name
- [ ] Unit tests added for zero-result component
- [ ] Manual QA across dark/light mode

## 8. Resources
- Existing `AddRestaurantModal` component.

## 9. Notes
None
