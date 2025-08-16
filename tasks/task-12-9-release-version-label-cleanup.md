# Release Version Label Cleanup

**Epic**: 12 – App Store Readiness & Compliance  
**Priority**: Low  
**Estimate**: 0.1 days  
**Status**: 🔴 Not Started

## Overview
Remove "(Beta)" or other pre‑release wording from in‑app version labels for production builds.

## Business Value
- Avoids confusing users/reviewers.  
- Looks polished and production‑ready.

## Dependencies
- `components/modals/SettingsModal.tsx`

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Clean production version label
  Scenario: Version label without Beta
    Given I open Settings in a production build
    Then I see a neutral version label without Beta wording
```

## Technical Implementation
- Replace hardcoded "(Beta)" with `__DEV__` conditional or show plain version from app config.

## Definition of Done
- Production build shows clean version string.  
- QA verified.

