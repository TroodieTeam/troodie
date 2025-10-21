# Maestro E2E Testing Setup Guide

## Overview

Running Maestro for End-to-End (E2E) testing with Expo requires using an **Expo Development Build** instead of the standard **Expo Go** app, as Maestro needs a built application binary (`.apk` or `.app`) with a consistent `appId`.

This guide provides step-by-step instructions for setting up and running Maestro tests locally for the Troodie app.

## Prerequisites

Before starting, ensure you have the following installed:

### 1. Install Maestro CLI

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

After installation, verify:
```bash
maestro --version
```

### 2. Install EAS CLI (if not already installed)

```bash
npm install -g eas-cli
```

### 3. Install Expo Development Client

This should already be in the project, but verify in `package.json`. If not present:
```bash
npx expo install expo-dev-client
```

### 4. Running Emulator/Simulator

**For iOS:**
```bash
open -a Simulator
```

**For Android:**
Ensure you have Android Studio installed and an emulator configured.

---

## Step 1: Configure EAS Build Profile

Your project should already have an `eas.json` file. Verify it includes a development profile:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { 
        "simulator": true 
      },
      "android": { 
        "buildType": "apk" 
      }
    }
  }
}
```

If you need to create or modify this, run:
```bash
eas build:configure
```

---

## Step 2: Create Development Build

You have two options: build locally (faster) or build in the cloud.

### Option A: Local Build (Recommended for Development)

**For iOS Simulator:**
```bash
eas build --platform ios --profile development --local
```

**For Android Emulator:**
```bash
eas build --platform android --profile development --local
```

### Option B: Cloud Build

**For iOS:**
```bash
eas build --platform ios --profile development
```

**For Android:**
```bash
eas build --platform android --profile development
```

**Note:** Cloud builds take longer but don't require local build tools.

---

## Step 3: Install the Development Build

### iOS Simulator

After the build completes, install the `.app` file to your simulator:

```bash
# Find the path to your built .app file (shown in build output)
xcrun simctl install booted /path/to/Troodie.app
```

Or simply run:
```bash
npx expo run:ios
```

### Android Emulator

After the build completes, install the `.apk`:

```bash
# Find the path to your built .apk file
adb install /path/to/Troodie.apk
```

Or simply run:
```bash
npx expo run:android
```

---

## Step 4: Verify App Installation

### Check Your App ID

Your Troodie app uses the bundle identifier: **`com.troodie.troodie.com`**

This is configured in `app.config.js` and should match the `appId` in all `.maestro/*.yaml` files.

### Verify App is Installed

**iOS:**
```bash
xcrun simctl listapps booted | grep troodie
```

**Android:**
```bash
adb shell pm list packages | grep troodie
```

You should see your app listed with the bundle ID `com.troodie.troodie.com`.

---

## Step 5: Run Maestro Tests

### Start Your Development Server

In a separate terminal, keep your Expo dev server running:
```bash
npx expo start --dev-client
```

### Run Individual Test Flows

```bash
# Test authentication and save functionality
maestro test .maestro/01-auth-and-save-restaurant.yaml

# Test board creation
maestro test .maestro/02-create-board.yaml

# Test post creation
maestro test .maestro/03-create-post.yaml

# Test restaurant review
maestro test .maestro/04-create-restaurant-review.yaml

# Test community creation
maestro test .maestro/05-create-community.yaml
```

### Run Full Test Suite

```bash
maestro test .maestro/00-full-test-suite.yaml
```

### Run All Tests

```bash
maestro test .maestro/
```

### Run with Analysis

```bash
maestro test .maestro/00-full-test-suite.yaml --analyze
```

**Note:** Do NOT pipe `--analyze` output to bash. It's for reading, not executing.

---

## Step 6: Using Maestro Studio (Interactive Testing)

Maestro Studio provides a visual interface for creating and debugging tests:

```bash
maestro studio
```

Or use the npm script:
```bash
npm run test:e2e:studio
```

This opens an interactive UI where you can:
- Record interactions with your app
- View the element hierarchy
- Test selectors in real-time
- Generate flow YAML files

---

## Available NPM Scripts

Add these scripts to your `package.json` for convenience:

```json
{
  "scripts": {
    "test:e2e": "maestro test .maestro/",
    "test:e2e:auth": "maestro test .maestro/01-auth-and-save-restaurant.yaml",
    "test:e2e:boards": "maestro test .maestro/02-create-board.yaml",
    "test:e2e:posts": "maestro test .maestro/03-create-post.yaml",
    "test:e2e:review": "maestro test .maestro/04-create-restaurant-review.yaml",
    "test:e2e:community": "maestro test .maestro/05-create-community.yaml",
    "test:e2e:full": "maestro test .maestro/00-full-test-suite.yaml",
    "test:e2e:studio": "maestro studio"
  }
}
```

Then run tests with:
```bash
npm run test:e2e:full
```

---

## Troubleshooting

### App Won't Launch

**Error:** `Unable to launch app com.troodie.troodie.com`

**Solutions:**
1. Verify the app is installed: `xcrun simctl listapps booted | grep troodie` (iOS)
2. Check the `appId` in your `.maestro/*.yaml` files matches `com.troodie.troodie.com`
3. Ensure your simulator/emulator is running
4. Try reinstalling the development build

### Element Not Found

**Error:** `Could not find element "Button Text"`

**Solutions:**
1. Use Maestro Studio to inspect element hierarchy
2. Try using `testID` or `accessibilityLabel` props in your React Native components
3. Use regex patterns: `"Button.*Text"`
4. Add wait conditions: `- waitForAnimationToEnd`

### Flaky Tests

**Solutions:**
1. Add explicit waits: `- waitForAnimationToEnd` after navigation/actions
2. Use `assertVisible` with timeout: `assertVisible: { text: "Success", timeout: 5000 }`
3. Add `clearState: true` when launching app to ensure clean state

### Keyboard Issues

If keyboard input isn't working:
```yaml
- inputText: "your text"
- hideKeyboard  # Explicitly hide keyboard after input
```

---

## CI/CD Integration (Future)

For automated testing on every pull request, you can use **EAS Workflows** and **Maestro Cloud**.

Example EAS workflow configuration:

```yaml
# .eas/workflows/e2e-test.yml
jobs:
  maestro_test:
    type: maestro
    params:
      build_id: ${{ needs.build_job.outputs.build_id }}
      flow_path: 
        - '.maestro/00-full-test-suite.yaml'
```

Learn more: [How to run end to end tests on EAS Build](https://www.youtube.com/watch?v=-o-bfIRrg9U)

---

## Test Account Information

The Maestro tests use the following bypass account:

- **Email:** `consumer2@bypass.com`
- **OTP Code:** `000000` (magic code for bypass accounts)

See `docs/TEST_ACCOUNTS.md` for more test account details.

---

## Additional Resources

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro Studio Guide](https://maestro.mobile.dev/getting-started/maestro-studio)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

---

## Quick Start Checklist

- [ ] Install Maestro CLI
- [ ] Install EAS CLI
- [ ] Create development build (`eas build --platform ios --profile development --local`)
- [ ] Install app on simulator/emulator (`npx expo run:ios`)
- [ ] Verify app ID in `.maestro/*.yaml` files is `com.troodie.troodie.com`
- [ ] Start Expo dev server (`npx expo start --dev-client`)
- [ ] Run test (`maestro test .maestro/00-full-test-suite.yaml`)

---

**Ready to test!** 🎉

