# Permissions & Usage Strings Review

**Epic**: 12 – App Store Readiness & Compliance  
**Priority**: Medium  
**Estimate**: 0.25 days  
**Status**: ✅ Completed

## Overview
Ensure only necessary permissions are requested, and Info.plist usage descriptions accurately reflect usage for camera, photos, and location.

## Business Value
- Avoids review flags and improves user trust.

## Dependencies
- `app.config.js`

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Accurate permission prompts
  Scenario: Camera/photo permissions
    Given I update my profile picture
    Then the camera/photo permission prompts match the described usage

  Scenario: Location permission (if used)
    Given I use a feature requiring location
    Then the app requests location permission contextually
```

## Technical Implementation
- Verify and refine `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSLocationWhenInUseUsageDescription` in `app.config.js`.
- Only call permission APIs at the point of need (already largely done in image picker flows).

## Definition of Done
- Prompts are accurate; no unused permissions requested.  
- QA verified flows on iOS/Android.

## Implementation Status

### ✅ Completed Review and Updates

1. **Permissions Audit**
   - Verified all permission requests in codebase
   - Removed unused location permissions (app doesn't use GPS)
   - Kept only necessary permissions:
     - Camera (for taking food photos)
     - Photo Library (for selecting images)
     - Push Notifications (for engagement)

2. **iOS Permission Strings** (`app.config.js`)
   - **NSCameraUsageDescription**: "Troodie needs camera access to let you take photos of your food and restaurant experiences to share with the community."
   - **NSPhotoLibraryUsageDescription**: "Troodie needs access to your photos to let you select images for your posts and profile."
   - **NSPhotoLibraryAddUsageDescription**: "Troodie would like to save photos to your library so you can keep your favorite food memories."
   - ~~NSLocationWhenInUseUsageDescription~~ - REMOVED (not used)
   - ~~NSUserTrackingUsageDescription~~ - REMOVED (not used)

3. **Android Permissions** (`app.config.js`)
   - `CAMERA` - For taking photos
   - `READ_EXTERNAL_STORAGE` - For selecting images
   - `WRITE_EXTERNAL_STORAGE` - For saving images
   - ~~ACCESS_FINE_LOCATION~~ - REMOVED (not used)
   - ~~ACCESS_COARSE_LOCATION~~ - REMOVED (not used)

4. **Contextual Permission Requests**
   - ✅ Camera permission requested only when user taps "Take Photo"
   - ✅ Gallery permission requested only when user taps "Choose from Library"
   - ✅ Push notification permission requested during onboarding or settings
   - ✅ No permissions requested on app launch

5. **Code Verification**
   - Confirmed permissions are requested in:
     - `services/storageService.ts` - Image picker and camera
     - `services/pushNotificationService.ts` - Push notifications
     - `components/modals/EditProfileModal.tsx` - Profile photo
     - `app/onboarding/profile-image.tsx` - Onboarding photo
   - No location permission code found in codebase

### Benefits
- ✅ Minimal permission footprint improves user trust
- ✅ Clear, user-friendly permission descriptions
- ✅ App Store compliance with accurate usage strings
- ✅ No unnecessary permissions that could trigger review flags

