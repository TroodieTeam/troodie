# Maestro Local Build Guide - Step by Step

This guide provides the exact steps needed to create a local development build for Maestro E2E testing.

## Prerequisites Checklist

- [ ] macOS computer
- [ ] Xcode installed (from App Store)
- [ ] Xcode Command Line Tools installed
- [ ] Homebrew installed
- [ ] iOS Simulator available
- [ ] Node.js and npm installed

---

## Step 1: Fix Terminal Encoding (Required for CocoaPods)

CocoaPods requires UTF-8 encoding. Add this to your shell profile:

**For zsh (default on macOS):**
```bash
echo 'export LANG=en_US.UTF-8' >> ~/.zshrc
source ~/.zshrc
```

**For bash:**
```bash
echo 'export LANG=en_US.UTF-8' >> ~/.bash_profile
source ~/.bash_profile
```

---

## Step 2: Install Maestro CLI

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Add Maestro to your PATH:
```bash
export PATH="$PATH":"$HOME/.maestro/bin"
```

Verify installation:
```bash
maestro --version
```

You should see a version number like `2.0.5`.

---

## Step 3: Configure EAS for Local Simulator Builds

Update your `eas.json` to support iOS simulator builds:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EAS_BUILD_PROFILE": "development"
      },
      "ios": {
        "simulator": true,  // ← Add this
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk",  // ← Add this
        "resourceClass": "medium"
      }
    }
  }
}
```

---

## Step 4: Start iOS Simulator

Open the iOS Simulator app:
```bash
open -a Simulator
```

Or launch a specific device:
```bash
xcrun simctl boot "iPhone 16 Pro"
open -a Simulator
```

Verify the simulator is booted:
```bash
xcrun simctl list devices booted
```

You should see something like:
```
iPhone 16 Pro (UUID) (Booted)
```

---

## Step 5: Install CocoaPods Dependencies

Navigate to your project root and install pods:

```bash
cd /path/to/your/project

# Set UTF-8 encoding for this session
export LANG=en_US.UTF-8

# Install CocoaPods dependencies
pod install --project-directory=ios
```

This will:
- Install CocoaPods if not present (via Homebrew)
- Download and install all iOS dependencies
- Generate the `.xcworkspace` file
- Configure React Native and Expo modules

**Expected output:**
```
Pod installation complete! There are 110 dependencies from the Podfile and 117 total pods installed.
```

**Note:** This step can take 5-10 minutes on first run.

---

## Step 6: Build the Development Client

Now build and install the app on the simulator:

```bash
export LANG=en_US.UTF-8
npx expo run:ios
```

Or target a specific simulator:
```bash
npx expo run:ios --device "iPhone 16 Pro"
```

**What this does:**
1. Creates the native iOS project (if not exists)
2. Runs Expo prebuild
3. Installs CocoaPods (if needed)
4. Builds the app with Xcode
5. Installs the app on the simulator
6. Starts the Metro bundler
7. Launches the app

**Expected timeline:**
- First build: **10-20 minutes**
- Subsequent builds: **2-5 minutes**

**Progress indicators you'll see:**
```
- Creating native directory (./ios)
✔ Created native directory
- Running prebuild
✔ Finished prebuild
- Installing CocoaPods...
✔ Installed CocoaPods CLI.
- Running `pod install` in the `ios` directory.
✔ Pod installation complete
› Planning build
› Building with xcodebuild
```

---

## Step 7: Verify App Installation

Once the build completes and the app launches, verify it's installed:

```bash
xcrun simctl listapps booted | grep -i troodie
```

You should see:
```
com.troodie.troodie.com = {
    ApplicationType = "User";
    Bundle = "path/to/Troodie.app";
    ...
}
```

---

## Step 8: Run Maestro Tests

With the app installed and the Metro bundler running, you can now run Maestro tests.

**Run full test suite:**
```bash
maestro test .maestro/00-full-test-suite.yaml
```

**Run individual tests:**
```bash
maestro test .maestro/01-auth-and-save-restaurant.yaml
maestro test .maestro/02-create-board.yaml
maestro test .maestro/03-create-post.yaml
maestro test .maestro/04-create-restaurant-review.yaml
maestro test .maestro/05-create-community.yaml
```

**Run all tests in directory:**
```bash
maestro test .maestro/
```

**Use npm scripts:**
```bash
npm run test:e2e:full
npm run test:e2e:auth
npm run test:e2e:boards
```

---

## Common Issues & Solutions

### Issue 1: CocoaPods Encoding Error

**Error:**
```
WARNING: CocoaPods requires your terminal to be using UTF-8 encoding.
Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError)
```

**Solution:**
```bash
export LANG=en_US.UTF-8
# Then retry the pod install or build command
```

Make it permanent by adding to `~/.zshrc` or `~/.bash_profile`.

---

### Issue 2: Build Failed - Sandbox Not in Sync

**Error:**
```
The sandbox is not in sync with the Podfile.lock. Run 'pod install'
```

**Solution:**
```bash
cd ios
export LANG=en_US.UTF-8
pod install
cd ..
npx expo run:ios
```

---

### Issue 3: Xcode License Not Accepted

**Error:**
```
xcodebuild: error: Xcode license has not been accepted
```

**Solution:**
```bash
sudo xcodebuild -license accept
```

---

### Issue 4: No Devices Available

**Error:**
```
No iOS devices or simulators available
```

**Solution:**
```bash
# List available simulators
xcrun simctl list devices

# Boot a simulator
xcrun simctl boot "iPhone 16 Pro"
open -a Simulator
```

---

### Issue 5: Maestro Can't Find App

**Error:**
```
Unable to launch app com.troodie.troodie.com
```

**Solutions:**

1. **Verify app ID in maestro files:**
   Check that `.maestro/*.yaml` files have:
   ```yaml
   appId: com.troodie.troodie.com
   ```

2. **Verify app is installed:**
   ```bash
   xcrun simctl listapps booted | grep troodie
   ```

3. **Reinstall the app:**
   ```bash
   npx expo run:ios
   ```

4. **Check bundle identifier:**
   Verify `app.config.js` has:
   ```javascript
   ios: {
     bundleIdentifier: "com.troodie.troodie.com"
   }
   ```

---

### Issue 6: Metro Bundler Connection Issues

**Error:**
```
Unable to connect to Metro bundler
```

**Solution:**
```bash
# Kill any existing Metro processes
pkill -f "metro"

# Clear Metro cache
npx expo start --clear

# Or manually start Metro
npx expo start --dev-client
```

---

### Issue 7: Build Taking Too Long

If the build seems stuck:

1. **Check Xcode activity:**
   - Open Activity Monitor
   - Search for "xcodebuild"
   - Verify it's actively using CPU

2. **View detailed logs:**
   ```bash
   npx expo run:ios --no-build-cache
   ```

3. **Clean build folder:**
   ```bash
   cd ios
   xcodebuild clean
   cd ..
   npx expo run:ios
   ```

---

## Quick Start Command Sequence

For a fresh setup, run these commands in order:

```bash
# 1. Set encoding
export LANG=en_US.UTF-8
echo 'export LANG=en_US.UTF-8' >> ~/.zshrc

# 2. Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH":"$HOME/.maestro/bin"

# 3. Start simulator
open -a Simulator

# 4. Install pods & build (from project root)
cd /path/to/troodie
pod install --project-directory=ios
npx expo run:ios

# 5. Wait for build to complete and app to launch (10-20 min)

# 6. Run tests
maestro test .maestro/00-full-test-suite.yaml
```

---

## Maintenance Commands

**Rebuild after code changes:**
```bash
npx expo run:ios
```

**Clean rebuild:**
```bash
cd ios
rm -rf build
xcodebuild clean
cd ..
npx expo run:ios
```

**Update pods:**
```bash
cd ios
pod install --repo-update
cd ..
```

**Reset Metro bundler:**
```bash
watchman watch-del-all
rm -rf node_modules
npm install
npx expo start --clear
```

---

## Development Workflow

1. **Start simulator:** `open -a Simulator`
2. **Start Metro (if not running):** `npx expo start --dev-client`
3. **Run tests:** `maestro test .maestro/`
4. **Make code changes**
5. **Hot reload should work automatically**
6. **For native changes, rebuild:** `npx expo run:ios`

---

## Build Time Expectations

| Build Type | Duration | When Needed |
|------------|----------|-------------|
| **First build** | 10-20 min | Initial setup |
| **Full rebuild** | 5-10 min | Native dependencies changed |
| **Incremental** | 2-5 min | Code changes only |
| **No changes** | < 1 min | Just launching app |

---

## Next Steps

- See `MAESTRO_E2E_SETUP.md` for detailed Maestro testing guide
- See `TESTING_QUICK_START.md` for test strategy overview
- Check `docs/TEST_ACCOUNTS.md` for test account credentials

---

## Verification Checklist

After completing all steps, verify:

- [ ] Maestro CLI installed (`maestro --version`)
- [ ] iOS simulator running (`xcrun simctl list devices booted`)
- [ ] CocoaPods installed (`pod --version`)
- [ ] App installed (`xcrun simctl listapps booted | grep troodie`)
- [ ] Metro bundler running (check terminal)
- [ ] App launches on simulator
- [ ] Maestro can run tests (`maestro test .maestro/01-auth-and-save-restaurant.yaml`)

**If all checks pass, you're ready to run E2E tests! 🎉**

