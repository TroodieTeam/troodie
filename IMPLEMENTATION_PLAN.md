# Implementation Plan: iOS 26 Nav Bar Fix

> Generated from spec: `specs/features/ios26-navbar-fix/spec.md`
> Created: 2026-02-09

## Overview

Fix the bottom tab bar on iOS 26 where taps are unresponsive. The root cause is `position: 'absolute'` on the iOS tab bar style, which causes screen content to intercept touch events before they reach the tab bar. The fix removes absolute positioning so the tab bar participates in normal layout flow.

## Progress Tracking

See `PROGRESS.md` for current task status.

## Phases

### Phase 1: Critical Fix (MVP)

**Goal**: Restore tab bar touch responsiveness on iOS 26

#### Tasks

- [ ] **Task 1.1**: Remove `position: 'absolute'` from iOS tabBarStyle
  - Description: Remove the `position: 'absolute'` property from the iOS-specific tabBarStyle in the Tabs screenOptions. This restores the tab bar to normal layout flow so touch events are dispatched correctly on iOS 26.
  - Files: `app/(tabs)/_layout.tsx`
  - Tests: `npm run typecheck`, `npm run lint`
  - Acceptance: Tab bar code compiles, no `position: 'absolute'` in iOS tabBarStyle

- [ ] **Task 1.2**: Verify BlurView compatibility and adjust if needed
  - Description: After removing absolute positioning, verify the BlurView in `TabBarBackground.ios.tsx` still renders correctly. The BlurView uses `StyleSheet.absoluteFill` which should still work within the tab bar's bounds. Adjust only if needed.
  - Files: `components/ui/TabBarBackground.ios.tsx` (verify, modify only if needed)
  - Tests: `npm run typecheck`
  - Acceptance: No TypeScript errors, BlurView code is compatible with non-absolute tab bar

- [ ] **Task 1.3**: Run full validation suite
  - Description: Run typecheck, lint, and tests to confirm no regressions
  - Files: None (validation only)
  - Tests: `npm run typecheck`, `npm run lint`, `npm test`
  - Acceptance: All three pass

## Validation Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm test
```

## Notes

- This is a minimal, targeted fix: one line removed from `app/(tabs)/_layout.tsx`
- BlurView is kept per stakeholder decision — verify it still renders but don't remove it
- No dependency updates in this PR
- The `position: 'absolute'` was originally added for the translucent blur-through effect; removing it means the tab bar is opaque in layout flow but functional
