# Support Entry Point (Help & Contact)

**Epic**: 12 – App Store Readiness & Compliance  
**Priority**: Medium  
**Estimate**: 0.5 days  
**Status**: 🔴 Not Started

## Overview
Provide a functional Help & Support entry point in Settings with at least an email contact and/or FAQ link.

## Business Value
- Improves reviewability and user trust.  
- Reduces churn by offering assistance.

## Dependencies
- Support email (e.g., support@troodie.com) or hosted FAQ.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Help & Support
  Scenario: Launch email support
    Given I open Settings → Help & Support
    When I tap "Contact Support"
    Then my mail app opens with a prefilled email to support@troodie.com
```

## Technical Implementation
- Update `SettingsModal` Help item to open `mailto:` link or navigate to an in‑app FAQ screen.

## Definition of Done
- Help entry is functional on iOS/Android.  
- QA verified.

