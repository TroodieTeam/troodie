# Google Places Attribution Compliance

**Epic**: 12 – App Store Readiness & Compliance  
**Priority**: High  
**Estimate**: 0.25 days  
**Status**: 🔴 Not Started

## Overview
Show required "Powered by Google" attribution wherever Places autocomplete or details are displayed.

## Business Value
- Compliant with Google Places terms; avoids TOS violations.

## Dependencies
- `components/AddRestaurantModal.tsx`

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Google Places attribution
  Scenario: Show attribution under search results
    Given I search for places
    Then a visible "Powered by Google" label appears under the results list

  Scenario: Show attribution near selected details
    Given I view selected place details
    Then the attribution remains visible near the details
```

## Technical Implementation
- In `AddRestaurantModal`, render a small label after the results list and within the selected details section:
  - `Text` with style `{ fontSize: 10, color: '#999' }` reading "Powered by Google".

## Definition of Done
- Attribution visible on all Places UI surfaces (results and selected details).  
- Visual QA confirms legibility.

## Resources
- Google Places Policies: https://developers.google.com/maps/documentation/places/web-service/policies

