# Manual Test Script: iOS 26 Nav Bar Fix

> Feature: ios26-navbar-fix
> Spec: `specs/features/ios26-navbar-fix/spec.md`
> Date: 2026-02-09

## Prerequisites

- [ ] Device or simulator running iOS 26 (iPhone 17 Pro or iPhone 14 Pro preferred)
- [ ] Device or simulator running iOS 18 (regression check)
- [ ] Android device or emulator (regression check)
- [ ] App built from branch `build/1.0.15-b2`
- [ ] Logged in with any account type

## Test Scenarios

### Scenario 1: Tab Bar Touch Responsiveness (iOS 26)

**Steps:**
1. Launch the app on an iOS 26 device
2. Tap the **Home** tab icon
3. Tap the **Explore** tab icon
4. Tap the **Add** button (orange circle)
5. Go back, then tap the **Activity** tab icon
6. Tap the **More** tab icon

**Expected Result:**
- Each tap navigates to the correct screen immediately (no double-tap required)
- Tab icons show active state (bold, primary color) when selected
- Haptic feedback fires on each tap (subtle vibration on iOS)

### Scenario 2: Add Button Functionality (iOS 26)

**Steps:**
1. Tap the orange **+** (Add) button in the center of the tab bar
2. Verify the Add screen opens

**Expected Result:**
- Add button is visually correct: orange circle, white plus icon, centered
- Tapping navigates to the Add screen
- Button shadow is visible

### Scenario 3: Tab Bar Visual Appearance (iOS 26)

**Steps:**
1. Navigate to the Home tab
2. Scroll the feed content up and down
3. Observe the tab bar

**Expected Result:**
- Tab bar has a white/blurred background
- Tab bar has a light gray border on top
- Tab bar does not overlap or obscure screen content
- Tab labels are visible below icons (Home, Explore, Activity, More)

### Scenario 4: iOS 18 Regression Check

**Steps:**
1. Repeat Scenarios 1-3 on an iOS 18 device/simulator

**Expected Result:**
- All behavior identical to iOS 26 results
- No visual or functional regression

### Scenario 5: Android Regression Check

**Steps:**
1. Repeat Scenario 1 on an Android device/emulator

**Expected Result:**
- Tab bar works as before (Android was never affected)
- No visual or functional regression

## Cleanup

No cleanup needed — this fix is a styling change with no data impact.
