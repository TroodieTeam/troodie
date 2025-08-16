# Legal Links: Privacy Policy and Terms of Service

**Epic**: 12 – App Store Readiness & Compliance  
**Priority**: Critical  
**Estimate**: 0.5 days  
**Status**: ✅ Completed

## Overview
Add in‑app links to Privacy Policy and Terms of Service. Ensure links are provided in the App Store listing as well.

## Business Value
- Required to pass review (Apple 5.1.1/5.1.2).  
- Establishes trust and clarity on data usage.

## Dependencies
- Hosted policy pages (e.g., `https://troodie.com/privacy`, `https://troodie.com/terms`).

## Blocks
- None

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Legal links available in app
  Scenario: Access Privacy Policy and Terms
    Given I open Settings
    When I tap "Privacy Policy" or "Terms of Service"
    Then the respective document opens in the device browser
```

## Technical Implementation
- Update `components/modals/SettingsModal.tsx` to add a Legal section:
  - Use `Linking.openURL('https://troodie.com/privacy')` and `Linking.openURL('https://troodie.com/terms')`.
- Update App Store Connect metadata to include the same links.

## Definition of Done
- Legal section visible in Settings; links work on iOS/Android.  
- App Store listing includes URLs.  
- QA verified.

## Resources
- Apple Guidelines 5.1.1/5.1.2: https://developer.apple.com/app-store/review/guidelines/

## Implementation Status

### ✅ Completed Features

1. **Settings Modal** (`components/modals/SettingsModal.tsx`)
   - Added new "Legal" section with Privacy Policy and Terms of Service links
   - Used React Native's Linking API for opening URLs in device browser
   - Icons: Lock for Privacy Policy, FileText for Terms of Service
   - Proper error handling if links cannot be opened

2. **Sign Up Screen** (`app/onboarding/signup.tsx`)
   - Updated disclaimer text with clickable Privacy Policy and Terms links
   - Links are highlighted in brand color (#FFAD27) with underline
   - Clear indication that creating an account means accepting terms

3. **Login Screen** (`app/onboarding/login.tsx`)
   - Added legal links at the bottom of the screen
   - Clean design with bullet separator between links
   - Easily accessible during the authentication flow

### URLs Used
- Privacy Policy: `https://www.troodieapp.com/privacy-policy`
- Terms of Service: `https://www.troodieapp.com/terms-of-service`

### User Experience
- Links open in the device's default browser
- Consistent placement across all screens
- Clear visual indicators (underlines and color) for clickable links
- Fallback error messages if links fail to open

### App Store Compliance
- ✅ Privacy Policy accessible from Settings
- ✅ Terms of Service accessible from Settings
- ✅ Legal links shown during account creation
- ✅ Links use HTTPS protocol

### Next Steps for App Store
Remember to add these same URLs to:
1. App Store Connect metadata (App Information section)
2. Google Play Console (Store Listing → App Content)
3. Any marketing website or landing pages

