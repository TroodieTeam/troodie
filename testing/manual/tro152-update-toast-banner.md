# Manual Test Script: Update Toast Banner (TRO-152)

> Feature: update-toast-banner
> Spec: `specs/features/update-toast-banner/spec.md`
> Date: 2026-02-09

## Prerequisites

- [ ] App built from branch `build/1.0.15-b2`
- [ ] iOS simulator or device running
- [ ] Logged in as any account type (e.g., test-consumer1@bypass.com)
- [ ] Know the current `app.config.js` version (currently `1.0.15`)

## Test Scenarios

### Scenario 1: Banner Appears When Update Available

**Steps:**
1. Ensure the App Store version of Troodie is **newer** than the locally installed version
   - If testing locally with version `1.0.15` and the App Store has a newer version, the banner should appear
   - If the App Store version equals or is older than the local version, the banner will NOT appear (this is expected)
2. Log in and land on the home screen
3. Wait for the version check to complete (1-2 seconds)

**Expected Result:**
- A banner appears near the top of the home screen (inside the ScrollView, below the header)
- Banner text reads: "A new version of Troodie is available"
- Banner has an "Update" button/CTA
- Banner has a dismiss (X) button

### Scenario 2: Update Button Opens App Store

**Steps:**
1. With the update banner visible, tap the "Update" button

**Expected Result:**
- The App Store opens to the Troodie listing page
- URL: `https://apps.apple.com/us/app/troodie/id6746138280`

### Scenario 3: Dismiss Button Hides Banner

**Steps:**
1. With the update banner visible, tap the dismiss (X) button
2. Scroll up and down the home feed

**Expected Result:**
- The banner disappears immediately
- The banner does NOT reappear while scrolling
- Home screen layout adjusts smoothly (no blank gap)

### Scenario 4: Dismissal Persists Across App Restarts

**Steps:**
1. Dismiss the update banner
2. Close the app completely (remove from app switcher)
3. Reopen the app and navigate to the home screen

**Expected Result:**
- The banner remains hidden (dismissal is stored in AsyncStorage keyed by version)
- Banner will only reappear when a **new** version is published to the store

### Scenario 5: No Banner When on Latest Version

**Steps:**
1. If possible, set the local app version to match or exceed the App Store version
   - In development, the local version (`1.0.15`) may already be newer than what's in the store
2. Log in and check the home screen

**Expected Result:**
- No update banner is shown
- Home screen renders normally with no extra space at the top

### Scenario 6: Network Failure Handling

**Steps:**
1. Enable airplane mode on the device/simulator
2. Log in (or navigate to home screen if already logged in)

**Expected Result:**
- No update banner is shown (version check fails silently)
- No error message or toast about the version check failure
- Home screen renders normally

### Scenario 7: Home Screen Scrolling with Banner

**Steps:**
1. With the update banner visible, scroll the home feed up and down vigorously

**Expected Result:**
- The banner scrolls with the content (it's inside the ScrollView, not fixed position)
- No layout glitches, overlapping, or jerky scrolling
- All other home screen sections render correctly below the banner

### Scenario 8: Banner on All Account Types

**Steps:**
1. Log in as consumer, verify banner behavior
2. Log in as creator, verify banner behavior
3. Log in as business, verify banner behavior

**Expected Result:**
- The update banner logic works identically for all account types
- Banner visibility depends only on version comparison, not account type

## Key Implementation Files

| File | Purpose |
|------|---------|
| `services/appUpdateService.ts` | Fetches latest version from iTunes Lookup API |
| `hooks/useUpdateBanner.ts` | Manages banner state, dismissal (AsyncStorage), version comparison |
| `components/home/UpdateBanner.tsx` | Banner UI component with dismiss and update buttons |
| `app/(tabs)/index.tsx` | Integration point on home screen |

## Cleanup

No cleanup needed — the banner is self-managing via version comparison and AsyncStorage.
