# Update Toast Banner Technical Specification

> Status: APPROVED
> Created: 2026-02-09
> Source: TRO-152 — New update toast
> Feature: update-toast-banner

## Overview

Add a persistent toast/banner on the home screen that informs users when a new version of Troodie is available and prompts them to update. Sprint 1 covers the toast/banner. Sprint 2 (future) covers a popup with user-friendly release notes.

## Problem Statement

Users on older versions of Troodie don't know a new update is available. There's no in-app mechanism to nudge them to update. This leads to fragmented user bases and users missing bug fixes and new features.

## User Stories

- As a user, I want to know when a new version of Troodie is available so I can update
- As a user, I want a non-intrusive way to be informed of updates without blocking my experience
- As a user, I want to easily navigate to the App Store/Play Store to update

## User Experience

### Sprint 1: Update Banner on Home Screen

#### Screens & Views

| Screen | Purpose | Entry Points | Account Types |
|--------|---------|--------------|---------------|
| Home Screen | Show update banner when new version available | App launch / focus | all |

#### User Flow

1. User opens the app or returns to the home screen
2. App checks if a newer version is available (comparing current version against a remote source)
3. If update available: a dismissible banner/toast appears at the top of the home screen below the header
4. Banner shows: "A new version of Troodie is available" with an "Update" CTA button
5. Tapping "Update" opens the App Store (iOS) or Play Store (Android)
6. User can dismiss the banner (persists dismissal for the session or 24 hours)

#### Components

- [ ] `UpdateBanner` (new) — A styled banner component rendered at the top of the home screen ScrollView content
  - Props: `latestVersion: string`, `onUpdate: () => void`, `onDismiss: () => void`
  - Styled as a colored bar with icon, text, and CTA button
  - Dismissible with an X button

#### States

| State | Visual | Trigger |
|-------|--------|---------|
| Hidden | No banner | App is on latest version, or user dismissed |
| Visible | Banner at top of feed | New version detected |
| Loading | No banner (check in progress) | Version check API call in flight |

### Sprint 2: Release Notes Popup (Future)

_Deferred — will be specced separately._

## Technical Design

### Version Check Strategy (Approved: App Store/Play Store API)

The app queries the App Store lookup API (iOS) and Play Store (Android) to automatically detect the latest published version. No database table required.

#### iOS Version Check
Use the iTunes Lookup API (public, no auth required):
```
GET https://itunes.apple.com/lookup?bundleId=com.troodie.troodie.com&country=us
```
Response includes `results[0].version` with the latest App Store version.

#### Android Version Check
Parse the Play Store listing page or use a lightweight library. For Sprint 1, focus on iOS (primary platform) and add Android support as a fast follow.

### Services

| Service | File | Methods | Description |
|---------|------|---------|-------------|
| AppUpdateService (new) | `services/appUpdateService.ts` | `getLatestStoreVersion()`, `isUpdateAvailable()`, `openStore()` | Fetches latest version from App Store/Play Store APIs and compares against current |

### Hooks

| Hook | File | Purpose | Dependencies |
|------|------|---------|--------------|
| `useUpdateBanner` (new) | `hooks/useUpdateBanner.ts` | Manages version check, dismissal state, and store linking | `appUpdateService`, `expo-constants`, `AsyncStorage` |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `UpdateBanner` (new) | `components/home/UpdateBanner.tsx` | Renders the dismissible update banner |

### Integration

In `app/(tabs)/index.tsx`:
1. Import `useUpdateBanner` hook
2. Call hook to get `{ showBanner, latestVersion, onUpdate, onDismiss }`
3. Render `<UpdateBanner>` between the header and welcome banner (inside ScrollView)

### Version Comparison Logic

```typescript
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const currentVersion = Constants.expoConfig?.version || '0.0.0';
// Compare using semver: '1.0.14' < '1.0.15' → show banner
```

### Store Linking

```typescript
import { Linking, Platform } from 'react-native';

const APP_STORE_URL = 'https://apps.apple.com/us/app/troodie/id6746138280';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.troodie.troodie.com';

const openStore = () => {
  const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  Linking.openURL(url);
};
```

### Dismissal Logic

- Dismiss state stored in AsyncStorage keyed by version
- Banner stays hidden until a new version is released
- Key: `update_banner_dismissed_${latestVersion}`
- When a new version is published to the store, the key changes and the banner reappears

## Security

### Access Control

| Action | Consumer | Creator | Business | Unauthenticated |
|--------|----------|---------|----------|-----------------|
| Read app_config | Yes | Yes | Yes | No |
| Write app_config | No | No | No | No (admin only via dashboard) |

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| No network | Don't show banner | Fail silently on fetch error |
| Same version | Don't show banner | Version comparison returns false |
| Version format mismatch | Don't show banner | Wrap in try/catch |
| User dismisses | Hide until new version | AsyncStorage keyed by version |
| New version after dismiss | Show again | Key includes version number |

## Error Handling

| Error Condition | User Message | Recovery Action |
|-----------------|--------------|-----------------|
| Failed to fetch config | None (silent) | Banner stays hidden |
| Failed to open store | Toast: "Couldn't open store" | Show manual instructions |

## Implementation Phases

### Phase 1: Update Banner (Sprint 1 — MVP)
**Goal**: Users see a banner when a new version is available

#### Tasks
- [ ] **Task 1.1**: Create `appUpdateService.ts` with App Store/Play Store version lookup
  - Files: `services/appUpdateService.ts`
  - Acceptance: Can fetch latest version from App Store lookup API, compare with current version, open store
- [ ] **Task 1.2**: Create `useUpdateBanner` hook
  - Files: `hooks/useUpdateBanner.ts`
  - Acceptance: Returns correct show/hide state, handles dismissal
- [ ] **Task 1.3**: Create `UpdateBanner` component
  - Files: `components/home/UpdateBanner.tsx`
  - Acceptance: Renders banner with message and CTA
- [ ] **Task 1.4**: Integrate into home screen
  - Files: `app/(tabs)/index.tsx`
  - Acceptance: Banner appears when version mismatch detected

### Phase 2: Release Notes Popup (Sprint 2 — Future)
**Goal**: Show user-friendly release notes in a popup
**Depends on**: Phase 1

_Deferred — to be specced separately._

## Testing Requirements

### Manual Testing
- [ ] Verify banner appears when running an older app version vs. what's in the App Store
- [ ] Tap "Update" button, verify App Store opens to Troodie listing
- [ ] Dismiss banner, verify it stays hidden for the rest of the session
- [ ] Reopen app, verify dismissed banner stays hidden (same version)
- [ ] Verify banner doesn't appear when app is on the latest version
- [ ] Verify banner re-appears when a new version is published to the store

## Acceptance Criteria

- [ ] Update banner appears on home screen when a newer version exists in the App Store/Play Store
- [ ] "Update" button opens the correct app store
- [ ] Banner is dismissible and stays hidden until a new version is released
- [ ] No banner shown when app is on the latest version
- [ ] Silent failure when version check fails (no crash, no error UI)
