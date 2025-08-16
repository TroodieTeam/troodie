# Notifications Permission Timing & UX

**Epic**: 12 – App Store Readiness & Compliance  
**Priority**: Medium  
**Estimate**: 0.5 days  
**Status**: 🔴 Not Started

## Overview
Request push notification permission contextually (e.g., after user toggles notifications in Settings or after a clear value prop) to improve acceptance and avoid review friction.

## Business Value
- Better opt‑in rates; improved review experience.

## Dependencies
- `services/pushNotificationService.ts`

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Contextual notification permission prompt
  Scenario: User enables notifications in Settings
    Given notifications are disabled
    When I toggle notifications on in Settings
    Then the system permission prompt is shown
    And my choice is persisted server‑side
```

## Technical Implementation
- Gate `initialize()` behind an explicit user action (e.g., toggle in Settings) or first relevant feature use.
- Persist token registration only after grant.

## Definition of Done
- No automatic prompt on first launch.  
- QA verified on iOS/Android.

