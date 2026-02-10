# iOS 26 Nav Bar Fix — Technical Specification

> Status: APPROVED
> Created: 2026-02-09
> Source: "We have received multiple messages around the nav bar not working on iOS 26 with iPhone 17 Pro, iPhone 14 Pro, etc. Triage and fix."
> Feature: ios26-navbar-fix

## Overview

The bottom tab bar navigation is broken on iOS 26 across multiple iPhone models (iPhone 17 Pro, iPhone 14 Pro, etc.). The tab bar is **visible but unresponsive to taps** — users can see it but tapping on tabs does not navigate. This is a touch target interception issue caused by `position: 'absolute'` on the tab bar, which allows screen content to overlay and steal touch events on iOS 26. The BlurView transparency effect will be preserved.

## Problem Statement

After users updated to iOS 26, the bottom tab bar in Troodie became unresponsive to taps. The tab bar renders correctly and is visible, but touch events do not reach the tab bar buttons. This is a critical P0 issue — the tab bar is the primary navigation mechanism and without it users cannot access core app features (Home, Explore, Add, Activity, More).

Multiple device models are affected (iPhone 17 Pro, iPhone 14 Pro), confirming this is an iOS 26 platform-level change in how touch events are dispatched to absolute-positioned views, rather than device-specific.

## Root Cause Analysis

### Confirmed Issue: Touch Events Not Reaching Absolute-Positioned Tab Bar

**Symptom**: Tab bar is visible but taps don't register. Users can see the icons but nothing happens on tap.

**1. `position: 'absolute'` Causes Touch Interception (ROOT CAUSE)**
- **File:** `app/(tabs)/_layout.tsx:31-43`
- The iOS tab bar uses `position: 'absolute'`, which removes it from the normal layout flow
- Screen content fills the full height and renders **on top of** the tab bar in the view hierarchy
- On iOS 26, the touch event system was changed: absolute-positioned sibling views behind content views no longer receive touch events reliably
- The screen content layer intercepts all touches before they can reach the tab bar
- **Fix:** Remove `position: 'absolute'` so the tab bar participates in normal layout flow. React-navigation will handle positioning natively, and the tab bar will be in the correct z-order to receive touch events.

**2. BlurView Interaction (NOT the root cause — keeping BlurView per stakeholder decision)**
- **File:** `components/ui/TabBarBackground.ios.tsx:7-12`
- The BlurView with `StyleSheet.absoluteFill` renders correctly (tab bar is visible)
- However, removing `position: 'absolute'` from `tabBarStyle` may require the BlurView to be tested to ensure it still renders as expected without the absolute parent context
- **Decision:** Keep BlurView. If removing absolute positioning breaks the blur, we'll adjust the BlurView implementation to work with the new layout.

**3. React Native 0.81.4 / Expo SDK 54 + iOS 26 Compatibility (CONTRIBUTING)**
- **File:** `package.json:73,89,103,109`
- `react-native: 0.81.4`, `expo: ~54.0.0`, `react-native-screens: ~4.16.0`
- These versions predate iOS 26 and may not include touch dispatching fixes
- New Architecture is enabled (`app.config.js:72` — `newArchEnabled: true`), which uses Fabric renderer and may compound the touch interception issue
- **Decision:** No dep updates in this PR (minimal fix approach)

## User Stories

- As a user on iOS 26, I want the tab bar to be visible and tappable so I can navigate the app
- As a user on any iOS version, I want consistent tab bar behavior across device models

## Technical Design

### Fix Strategy

#### Fix 1: Remove `position: 'absolute'` from iOS Tab Bar (CRITICAL)

Remove `position: 'absolute'` from the iOS tab bar style so the tab bar participates in normal layout flow and receives touch events correctly. This is the primary fix.

**File:** `app/(tabs)/_layout.tsx:31-43`

**Before:**
```tsx
tabBarStyle: Platform.select({
  ios: {
    position: 'absolute',  // ← REMOVE THIS
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  ...
}),
```

**After:**
```tsx
tabBarStyle: Platform.select({
  ios: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  ...
}),
```

Note: `position: 'absolute'` was originally added to enable the BlurView transparency effect (content scrolling behind the translucent tab bar). Without it, the tab bar will be opaque in the layout flow. The BlurView will still render but the see-through-content effect may be lost. This is an acceptable tradeoff — functional navigation > visual effect.

#### Fix 2: Verify BlurView Still Renders (KEEP BLUR)

Per stakeholder decision, keep the BlurView. After removing `position: 'absolute'`, verify that:
- BlurView still renders as the tab bar background
- No visual artifacts or blank backgrounds
- If BlurView breaks without absolute positioning, adjust its styling to work in normal flow

**File:** `components/ui/TabBarBackground.ios.tsx` — verify, modify only if needed

#### Fix 3: Verify HapticTab Touch Handling

The `HapticTab` component uses `PlatformPressable` from `@react-navigation/elements`. Verify that:
- `onPressIn` still fires correctly after the layout change
- Haptic feedback triggers on tap
- Tab navigation completes on press

**File:** `components/HapticTab.tsx` — verify, no changes expected

### Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `app/(tabs)/_layout.tsx` | Remove `position: 'absolute'` from iOS tabBarStyle | CRITICAL |
| `components/ui/TabBarBackground.ios.tsx` | Verify BlurView still works; adjust if needed | MEDIUM |

### Components Affected

- `app/(tabs)/_layout.tsx` — Tab layout configuration (primary change)
- `components/ui/TabBarBackground.ios.tsx` — iOS tab bar background (verify only)
- `components/HapticTab.tsx` — Touch handler (verify only)

### Navigation Changes

No route changes. Tab structure remains identical. Only visual rendering/positioning is fixed.

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| iOS 25 and below | Tab bar still works as before | Removing `position: 'absolute'` is safe — react-navigation handles positioning natively |
| Android | No change | Android path doesn't use absolute positioning or BlurView |
| iPad (if ever enabled) | Tab bar renders correctly | Same fix applies; `supportsTablet: false` currently |
| Landscape orientation | N/A | App is portrait-only (`app.config.js:68`) |
| Keyboard open | Tab bar hides appropriately | Default react-navigation behavior preserved |

## Error Handling

| Error Condition | User Message | Recovery Action |
|-----------------|--------------|-----------------|
| Tab bar still unresponsive after removing absolute positioning | N/A | Investigate: try disabling New Architecture (`newArchEnabled: false`), check `react-native-screens` version |
| BlurView stops rendering after layout change | N/A (cosmetic) | Adjust BlurView to use explicit dimensions instead of `absoluteFill`, or fall back to opaque background |
| Tab bar height changes after removing absolute positioning | N/A (cosmetic) | Set explicit `height` in tabBarStyle to match previous appearance |

## Implementation Phases

### Phase 1: Critical Fix (MVP)
**Goal**: Restore tab bar touch responsiveness on iOS 26

#### Tasks
- [ ] **Task 1.1**: Remove `position: 'absolute'` from iOS tabBarStyle in `app/(tabs)/_layout.tsx`
  - Files: `app/(tabs)/_layout.tsx`
  - Acceptance: Tab bar taps register and navigate correctly on iOS 26
- [ ] **Task 1.2**: Verify BlurView still renders correctly without absolute positioning
  - Files: `components/ui/TabBarBackground.ios.tsx`
  - Acceptance: Tab bar background still shows blur effect (or gracefully falls back to opaque white)
- [ ] **Task 1.3**: Verify floating Add button still renders and is tappable
  - Files: `app/(tabs)/_layout.tsx` (FloatingAddButton styles)
  - Acceptance: Plus button is centered, circular, tappable, navigates to /add
- [ ] **Task 1.4**: Verify HapticTab touch feedback still works
  - Files: `components/HapticTab.tsx`
  - Acceptance: Haptic feedback fires on tab press on iOS
- [ ] **Task 1.5**: Test on multiple iOS versions (iOS 26, iOS 18) and Android
  - Acceptance: Tab bar works on all tested platforms, no regressions

## Testing Requirements

### Manual Testing
- [ ] Tapping Home tab navigates to Home on iOS 26
- [ ] Tapping Explore tab navigates to Explore on iOS 26
- [ ] Tapping Add button navigates to Add screen on iOS 26
- [ ] Tapping Activity tab navigates to Activity on iOS 26
- [ ] Tapping More tab navigates to More on iOS 26
- [ ] Tab bar responds on first tap (not requiring double-tap)
- [ ] Haptic feedback fires on tab press (iOS)
- [ ] BlurView background still renders on tab bar (iOS)
- [ ] Tab bar does not overlap screen content
- [ ] All above still works on iOS 18 (regression check)
- [ ] Android tab bar unaffected (regression check)

### E2E Tests (Maestro)
- [ ] Existing tab navigation flows still pass (`test:e2e` suite)

## Acceptance Criteria

- [ ] Tab bar taps register and navigate on iOS 26 across reported device models (iPhone 17 Pro, iPhone 14 Pro)
- [ ] BlurView transparency effect preserved on iOS tab bar
- [ ] No visual or functional regression on iOS 18 and below
- [ ] No regression on Android
- [ ] All existing E2E tests pass
- [ ] Floating Add button renders and navigates correctly
- [ ] Haptic feedback on tab press still works
