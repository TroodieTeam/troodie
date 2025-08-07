# Task 1.1 – Prioritize “Add Restaurant” and “Find Friends”

**Epic:** 1 – UI/UX Improvements  
**Priority:** High  
**Estimate:** 1 day  
**Status:** ✅ Completed

---

## 1. Overview
Re-order and visually elevate the “Add Restaurant” and “Find Friends” actions in the **Add** tab to make them the primary discovery CTAs. Also rename the existing “Search Places” entry to **Add Restaurant** for consistent verbiage.

## 2. Business Value
Core actions that drive content creation and social graph growth should be instantly discoverable. Surfacing them first reduces friction, increases daily active content contributions, and improves user onboarding.

## 3. Dependencies
None

## 4. Blocks / Enables
Unlocks higher engagement metrics for Add-flow related tasks and improves success of friend-finding features.

## 5. Acceptance Criteria (Gherkin)
```gherkin
Feature: Prioritize Core Discovery Actions
  Scenario: User visits Add tab
    Given I am on the Add tab
    Then "Add Restaurant" and "Find Friends" are prominently displayed above other options
    And their design encourages engagement
```

## 6. Technical Implementation
1. **Add tab layout** (`app/(tabs)/add.tsx`)
   - Re-order list so the two CTAs appear first.
   - Consider larger icon size or accent color to indicate primacy.
2. **Rename text**
   - Replace all UI labels “Search Places” → “Add Restaurant”. Search codebase with `Search\s*Places` for occurrences.
3. **A/B test flag (optional)** – wrap new ordering behind a remote config flag for easy rollback.

## 7. Definition of Done
- [x] UI reflects new order on iOS & Android
- [x] All text says "Add Restaurant" (no lingering "Search Places")
- [x] Accessibility labels updated
- [x] Unit/UI tests pass
- [x] PR merged & deployed to staging

## 8. Resources
- Existing Add tab implementation for reference.

## 9. Notes
None
