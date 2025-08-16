# App Store Privacy Nutrition Labels Prep

**Epic**: 12 – App Store Readiness & Compliance  
**Priority**: Medium  
**Estimate**: 0.5 days  
**Status**: 🔴 Not Started

## Overview
Prepare accurate privacy labels for App Store Connect matching real data flows: email, push tokens, crash/analytics (Sentry), Places usage, and any tracking.

## Business Value
- Prevents rejection for mismatched declarations.  
- Builds user trust.

## Dependencies
- Confirm actual data collection + usage in code (auth, push, analytics, logs).

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Accurate privacy labels
  Scenario: Declare data collection and usage
    Given the current app features
    When I complete the privacy questionnaire in App Store Connect
    Then the declarations match the app's actual data flows
```

## Technical Implementation
- Inventory data types: contact info (email), identifiers (user id, push token), usage data, diagnostics (Sentry).  
- Document third‑party services and purposes (app functionality, analytics, developer communications).  
- Ensure policies and in‑app links reflect this.

## Definition of Done
- Questionnaire completed with consistent answers.  
- Policies updated to match.

