# Troodie TestFlight Deployment Guide

## Prerequisites

### 1. Apple Developer Account
- [x] Active Apple Developer Program membership ($99/year)
- [x] Access to App Store Connect (https://appstoreconnect.apple.com)
- [x] iOS App ID created in Apple Developer Portal (Apple ID: 6746138280)

### 2. Development Environment
- [x] macOS with latest Xcode (15.0+)
- [x] Expo CLI installed globally: `npm install -g @expo/cli`
- [x] Expo Development Builds: `npx expo install expo-dev-client`
- [x] Apple Developer account added to Xcode
- [x] EAS CLI installed and logged in

### 3. Project Setup
- [ ] All assets verified (see Asset Review section below)
- [ ] Environment variables configured
- [ ] Supabase production environment ready
- [ ] Google Places API key configured for production

## Asset Review & Requirements

### ✅ Required Assets (All Present)
- **App Icon**: `assets/images/icon.png` (1024x1024px)
- **Adaptive Icon**: `assets/images/adaptive-icon.png` (Android)
- **Splash Screen**: `assets/images/splash-icon.png` (200px width)
- **Notification Icon**: `assets/images/notification-icon.png`
- **Favicon**: `assets/images/favicon.png` (Web)

### ⚠️ Missing Assets
- **Notification Sound**: `assets/sounds/notification.wav` (referenced in app.json but missing)
- **App Store Screenshots**: Need to create (6.7" iPhone, 5.5" iPhone, 12.9" iPad)
- **App Store Icon**: 1024x1024px PNG (can use existing icon.png)

### 📱 App Store Assets Needed
1. **App Store Icon**: 1024x1024px PNG
2. **Screenshots** (minimum 1, maximum 10 per device):
   - iPhone 6.7" (1290x2796)
   - iPhone 5.5" (1242x2208) 
   - iPad Pro 12.9" (2048x2732)
3. **App Preview Videos** (optional but recommended)
4. **App Description** (170 characters)
5. **App Keywords** (100 characters)
6. **App Category**: Food & Drink
7. **Age Rating**: 4+ (no objectionable content)

## EAS Deployment Process (Simplified)

### Phase 1: Quick Setup (30 minutes)

#### 1.1 Install EAS CLI & Login
```bash
npm install -g @expo/eas-cli
eas login
```

#### 1.2 Configure EAS Build
```bash
eas build:configure
```

#### 1.3 iOS Configuration Already Updated ✅
The app.config.js already contains the correct iOS configuration:
- **Bundle ID**: com.troodie.troodie.com (matches App Store Connect)
- **Build Number**: 1
- **Required Permissions**: Location, Camera, Photo Library

### Phase 2: One-Command Build & Submit

#### 2.1 Build for TestFlight
```bash
eas build --platform ios --profile production
```

#### 2.2 Submit to TestFlight
```bash
eas submit --platform ios --latest
```

#### 2.3 Build and Submit in One Command (Recommended)
```bash
eas build --platform ios --profile production --auto-submit
```

**That's it!** EAS handles:
- ✅ Building the app
- ✅ Code signing
- ✅ Uploading to App Store Connect
- ✅ Creating TestFlight builds
- ✅ Managing provisioning profiles

### Phase 3: Environment Setup (Optional)

#### 3.1 Add Environment Secrets (if needed)
```bash
# Only if you have production environment variables
eas secret:create --scope project --name SUPABASE_URL --value "your-production-supabase-url"
eas secret:create --scope project --name SUPABASE_ANON_KEY --value "your-production-supabase-anon-key"
eas secret:create --scope project --name GOOGLE_PLACES_API_KEY --value "your-production-google-places-api-key"
```

### Phase 4: App Store Connect Setup

#### 4.1 App Already Created in App Store Connect ✅
The app is already configured in App Store Connect with:
- **Name**: Troodie
- **Bundle ID**: com.troodie.troodie.com
- **SKU**: com.troodie.troodie.com
- **Apple ID**: 6746138280
- **Primary Language**: English (U.S.)
- **Category**: Food & Drink / Entertainment
- **License Agreement**: Apple's Standard License Agreement

#### 4.2 Configure TestFlight
1. In App Store Connect, go to your app
2. Click "TestFlight" tab
3. Add build to testing
4. Fill in required information:
   - **What to Test**: Core functionality, onboarding, restaurant discovery
   - **App Review Information**: Contact details
   - **Beta App Description**: Brief description for testers

### Phase 5: Testing

#### 5.1 Internal Testing
- [ ] Test on multiple iOS devices
- [ ] Test all core features
- [ ] Verify notifications work
- [ ] Test onboarding flow
- [ ] Test restaurant discovery
- [ ] Test profile features

#### 5.2 External Testing
- [ ] Invite external testers
- [ ] Collect feedback
- [ ] Fix critical issues
- [ ] Submit new builds as needed

## Critical Issues to Fix Before Deployment

### 1. Infinite Loop in Explore Screen
**Issue**: Maximum update depth exceeded in `app/(tabs)/explore.tsx`
**Fix**: Update the useEffect dependency array to prevent infinite re-renders

### 2. Missing Notification Sound
**Issue**: `assets/sounds/notification.wav` referenced but missing
**Fix**: Create or remove the reference from app.json

### 3. Environment Variables
**Issue**: Need production environment variables
**Fix**: Configure production Supabase and API keys

## Estimated Timeline

- **Day 1**: Setup & first build (2-3 hours)
- **Day 2**: TestFlight submission & internal testing (1-2 hours)
- **Week 1**: External testing & iteration (as needed)

**Total**: 1-2 days to TestFlight ready

## Cost Breakdown

- **Apple Developer Program**: $99/year
- **EAS Build Credits**: ~$5-10 per build (first build is free)
- **Supabase Production**: ~$25/month
- **Google Places API**: ~$5-20/month (depending on usage)

**Total Monthly**: ~$35-55

## Success Criteria

- [ ] App builds successfully
- [ ] All core features work in production
- [ ] TestFlight build approved by Apple
- [ ] Internal testing completed
- [ ] External testing feedback collected
- [ ] Ready for App Store submission

## Next Steps After TestFlight

1. **App Store Submission**: Prepare App Store listing
2. **Marketing Assets**: Create promotional materials
3. **Launch Strategy**: Plan release timeline
4. **Analytics Setup**: Configure crash reporting and analytics
5. **Support System**: Set up user support channels

## Troubleshooting

### Common Issues
1. **Build Fails**: Check EAS build logs
2. **App Rejected**: Review Apple's feedback
3. **TestFlight Issues**: Verify provisioning profiles
4. **Performance Issues**: Monitor crash reports

### Support Resources
- [Expo Documentation](https://docs.expo.dev)
- [Apple Developer Documentation](https://developer.apple.com)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/) 