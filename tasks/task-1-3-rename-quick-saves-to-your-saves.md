# Task 1.3 – Rename “Quick Saves” to “Your Saves”

**Epic:** 1 – UI/UX Improvements  
**Priority:** Low  
**Estimate:** 0.25 day  
**Status:** ✅ Completed

---

## 1. Overview
Change all user-facing instances of “Quick Saves” to **“Your Saves”** to create a more personal tone in the home feed and related areas.

## 2. Business Value
Aligns terminology with user-centric language, improving clarity and perceived ownership of saved content.

## 3. Dependencies
None

## 4. Blocks / Enables
Provides consistency for future save-related features and documentation.

## 5. Acceptance Criteria (Gherkin)
```gherkin
Feature: Standardize Save Terminology
  Scenario: Viewing saved content
    Given I navigate to my saved restaurants on home page
    Then the section header reads "Your Saves" instead of "Quick Saves"
```

## 6. Technical Implementation
1. Search codebase (`rg "Quick Saves"`) and replace with “Your Saves”.
2. Update `constants/strings.ts` to use new key if necessary.
3. Verify `QuickSavesBoard.tsx` component naming / exports – may keep filename to avoid large diff but update displayed text.

## 7. Definition of Done
- [x] All visible instances updated on iOS & Android
- [x] No references to "Quick Saves" remain in strings or tests
- [x] Snapshot tests updated

## 8. Resources
- `components/home/QuickSavesBoard.tsx`

## 9. Notes
Low-risk copy change.
