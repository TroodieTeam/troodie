# Unify Expo Config and Fix Notifications Entitlements

**Epic**: 12 – App Store Readiness & Compliance  
**Priority**: High  
**Estimate**: 0.75 days  
**Status**: ✅ Completed

## Overview
Unify configuration to `app.config.js`, migrate notification settings/plugin from `app.json`, and ensure iOS entitlements for push are correct.

## Business Value
- Prevents build/submission issues due to conflicting configs.  
- Ensures push works and passes review.

## Dependencies
- EAS build setup  
- `expo-notifications`

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Single source of truth for Expo config
  Scenario: Build uses app.config.js only
    Given the project is built for iOS
    Then notifications entitlements are present
    And assets (icons/splash) match the configured files
    And no duplicate config files cause divergence
```

## Technical Implementation
- Move `notification` block and `expo-notifications` plugin from `app.json` into `app.config.js`.
- Add `ITSAppUsesNonExemptEncryption: false` to `ios.infoPlist`.
- Align icons/splash assets (pick one set).  
- Remove `app.json` after parity (or keep minimal but unused).  
- Verify Transporter validation.

## Definition of Done
- iOS archive validates; push permission prompts work in test build.  
- No drift between config files; CI green.

## Resources
- Expo Notifications: https://docs.expo.dev/push-notifications/overview/  
- Export compliance: https://developer.apple.com/documentation/security/complying_with_encryption_export_regulations

## Implementation Status

### ✅ Completed Changes

1. **Unified Configuration** (`app.config.js`)
   - Migrated all settings from `app.json` to `app.config.js`
   - Backed up original `app.json` as `app.json.backup`
   - Single source of truth for all configuration

2. **Notification Configuration**
   - Moved `notification` block from `app.json` to `app.config.js`
   - Migrated `expo-notifications` plugin with all settings:
     - Icon: `./assets/images/notification-icon.png`
     - Color: `#FF6B35`
     - iOS foreground display enabled
     - Android mode set to default
   - Notification sounds configured

3. **iOS Compliance**
   - Added `ITSAppUsesNonExemptEncryption: false` to iOS infoPlist
   - Ready for App Store submission without encryption export compliance

4. **Asset Alignment**
   - Unified icon: `./assets/images/icon.png`
   - Splash screen: `./assets/images/splash-icon.png`
   - Adaptive icon: `./assets/images/adaptive-icon.png`
   - Notification icon: `./assets/images/notification-icon.png`
   - All assets verified to exist

5. **Environment Variables**
   - Consolidated environment variable handling
   - Support for both process.env and EAS build variables
   - Fallback values for build-time substitution

6. **Additional Plugins**
   - Sentry integration for error tracking
   - Image picker with proper permission strings
   - All plugins properly configured

### Key Benefits
- ✅ No configuration conflicts between files
- ✅ iOS build will include push notification entitlements
- ✅ Ready for EAS Build and App Store submission
- ✅ Cleaner, more maintainable configuration

