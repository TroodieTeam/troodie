# Maestro E2E Testing Best Practices

> Troodie's guide to writing reliable, maintainable Maestro E2E tests.

## Quick Start

```bash
# 1. Start the app in development mode (uses dev Supabase with bypass accounts)
npm start

# 2. Boot iOS Simulator (if not already running)
open -a Simulator

# 3. Run a single test
maestro test e2e/flows/home-screen-cleanup/no-join-team-button.yaml

# 4. Run a suite
maestro test e2e/suites/build-1015-b2.yaml

# 5. Interactive development
npm run test:e2e:studio
```

---

## Authentication Pattern

All tests use `@bypass.com` accounts with OTP code `000000`. Never use real user accounts.

### How to Login in a Test

```yaml
appId: com.troodie.troodie.com
env:
  TEST_EMAIL: test-consumer1@bypass.com
---
- runFlow: ../../helpers/login-bypass.yaml
```

### Available Test Accounts (Dev Supabase)

| Account | Email | Type | Purpose |
|---------|-------|------|---------|
| consumer1 | `test-consumer1@bypass.com` | consumer | General testing, home screen |
| creator1 | `test-creator1@bypass.com` | creator | Campaign applications |
| business1 | `test-business1@bypass.com` | business | Campaign management, business tools |

These accounts exist in the **dev** Supabase instance (`tcultsriqunnxujqiwea.supabase.co`). They use bypass OTP authentication — enter `000000` as the verification code.

---

## Navigation: Direct Linking After Login

**Always prefer deep links over UI tap chains** to reach a target screen. This makes tests faster, less fragile, and focused on the feature being tested rather than the navigation path.

### Deep Link Format

```yaml
# After login completes:
- openLink: troodie://[path]

# Handle iOS "Open in app?" dialog
- tapOn:
    text: "Open"
    optional: true
```

### Available Deep Link Routes

| Route | Deep Link | Screen |
|-------|-----------|--------|
| Home | `troodie://` | Home tab |
| Explore | `troodie://explore` | Explore tab |
| Activity | `troodie://activity` | Activity tab |
| Profile | `troodie://profile` | Profile tab |
| Restaurant | `troodie://restaurant/{id}` | Restaurant detail |
| Board | `troodie://boards/{id}` | Board detail |
| Post | `troodie://posts/{id}` | Post detail |
| User Profile | `troodie://user/{id}` | User profile |
| Creator Edit | `troodie://creator/profile/edit` | Creator profile edit |
| Quick Saves | `troodie://quick-saves` | Quick saves |

### When Deep Links Aren't Available

For screens not in the linking config (e.g., campaign detail under `(tabs)/business/`), navigate via the UI:

```yaml
# Navigate through tabs
- tapOn:
    id: "tab-more"
    optional: true

- tapOn:
    text: "Campaigns"
```

---

## Selector Priority (Most to Least Reliable)

### 1. testID (Best)

```yaml
- tapOn: { id: "campaign-tab-applications" }
- assertVisible: { id: "update-banner" }
```

Always add `testID` props to components you need to test. Naming convention: `kebab-case`, descriptive, scoped.

```tsx
// Good testIDs
testID="campaign-tab-overview"
testID="application-card-{id}"
testID="update-banner-dismiss"
testID="reject-button"

// Bad testIDs
testID="btn1"
testID="component"
```

### 2. Text Selector (Good)

```yaml
- tapOn: "Applications"
- assertVisible: "Recent Activity"
```

### 3. Text with optional (Safe)

```yaml
- tapOn:
    text: "Open"
    optional: true
```

### 4. Point-Based (Last Resort)

```yaml
- tapOn:
    point: "50%,95%"
```

---

## Writing a New Test Flow

### File Structure

```
e2e/flows/
  [feature-name]/
    [test-name].yaml
```

### Template

```yaml
appId: com.troodie.troodie.com
env:
  TEST_EMAIL: test-consumer1@bypass.com
tags:
  - regression
  - tro-XXX
---
# TRO-XXX: [Ticket Title]
# [One-line description of what this test verifies]
#
# Prerequisites: [Any setup needed]
# Account: [Which test account and why]

# Step 1: Login
- runFlow: ../../helpers/login-bypass.yaml
- waitForAnimationToEnd

# Step 2: Navigate to target screen
- openLink: troodie://[path]
- tapOn:
    text: "Open"
    optional: true
- extendedWaitUntil:
    visible: "[Expected screen content]"
    timeout: 10000

# Step 3: Perform action
- tapOn: { id: "target-element" }
- waitForAnimationToEnd

# Step 4: Assert result
- assertVisible: "[Expected result]"
- takeScreenshot: "troXXX-descriptive-name"
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Flow file | `kebab-case.yaml` | `campaign-detail-scroll.yaml` |
| Flow directory | `kebab-case/` | `campaign-scroll-fix/` |
| Screenshots | `troXXX-descriptive-name` | `tro154-applications-bottom-visible` |
| Tags | ticket number | `tro-154` |
| testIDs | `kebab-case` | `campaign-tab-applications` |

---

## Key Patterns

### Assert Something Is NOT Visible

```yaml
- assertNotVisible:
    text: "Join Team"
```

Use this for verifying removals (e.g., TRO-153 removed the Join Team button).

### Wait for Slow Content

```yaml
- extendedWaitUntil:
    visible: "Your Saves"
    timeout: 15000
```

Use `extendedWaitUntil` (not `assertVisible`) when content depends on network requests. Default timeout is 5s; bump to 10-15s for API-dependent screens.

### Scroll to Verify Content Below the Fold

```yaml
# Scroll until element is visible
- scrollUntilVisible:
    element:
      text: "Recent Activity"
    direction: DOWN
    timeout: 10000

# Or use swipe for simpler checks
- swipe:
    direction: UP
- waitForAnimationToEnd
```

### Handle Optional Dialogs

iOS may show permission dialogs, "Open in app?" prompts, or Expo dev overlays. Always handle them:

```yaml
- tapOn:
    text: "Open"
    optional: true

- tapOn:
    text: "Allow"
    optional: true

- tapOn:
    text: "Don't Allow Paste"
    optional: true
```

### Test Conditional UI

When a feature may or may not be visible (e.g., update banner depends on store version):

```yaml
# Try to interact - won't fail if not present
- tapOn:
    id: "update-banner-dismiss"
    optional: true

# Then assert the expected steady state
- assertNotVisible:
    id: "update-banner"
```

---

## Test Suites

### Running Multiple Flows

Maestro runs multiple flows by passing them as arguments or using tag filtering:

```bash
# Pass multiple flow files
maestro test \
  e2e/flows/feature-a/test-a.yaml \
  e2e/flows/feature-b/test-b.yaml

# Run all flows in a directory
maestro test e2e/flows/

# Run by tag
maestro test --include-tags=regression e2e/flows/
maestro test --include-tags=smoke e2e/flows/
maestro test --include-tags=tro-154 e2e/flows/
```

Suite command references are stored in `e2e/suites/` as comment-only YAML files.

### Suite Tiers

| Suite | Purpose | Runtime | When to Run |
|-------|---------|---------|-------------|
| `smoke.yaml` | Critical paths | ~10 min | Every PR |
| `regression.yaml` | All P0+P1 | ~30 min | Before release |
| `nightly.yaml` | Everything | ~60 min | Nightly CI |
| `build-*.yaml` | Build-specific | ~5-8 min | Per build verification |

---

## Running Tests

### Local Development

```bash
# Start app first (separate terminal) - must be dev mode for bypass accounts
npm start

# Run single flow
maestro test e2e/flows/home-screen-cleanup/no-join-team-button.yaml

# Run a suite
maestro test e2e/suites/build-1015-b2.yaml

# Interactive mode (see element hierarchy)
npm run test:e2e:studio

# Record a new flow
npm run test:e2e:record
```

### Debugging Failed Tests

1. **Screenshots**: Every `takeScreenshot` saves to the Maestro output dir
2. **Studio**: Run `maestro studio` to inspect the element tree live
3. **Verbose**: `maestro test --debug-output ./debug-out flow.yaml`
4. **Retry**: Tests auto-retry 2x (configured in `e2e/maestro.yaml`)

### Common Failures & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Element not found" | Missing testID or text changed | Add testID, use `optional: true` |
| Login timeout | OTP screen layout changed | Update `login-bypass.yaml` |
| Scroll assertion fails | Content behind tab bar | Increase `paddingBottom` in screen |
| "Open in app?" blocks test | iOS deep link dialog | Add `tapOn: { text: "Open", optional: true }` |
| Flaky on CI | Animation timing | Add `waitForAnimationToEnd` between steps |
| `kAXErrorInvalidUIElement` crash | Toast/ephemeral UI corrupts accessibility tree | See **iOS 26 Toast Handling** below |
| `Invalid login credentials` | Wrong Supabase instance or missing accounts | Use `npm start` (dev mode), `test-*@bypass.com` emails |
| OTP only fills 4 of 6 fields | Auto-focus transitions lose characters | Use 6 individual `inputText: "0"` calls, not one `"000000"` |

### iOS 26 Toast Handling

On iOS 26 simulators, a persistent "Error getting current location" toast can interfere with Maestro's accessibility tree inspection, causing `kAXErrorInvalidUIElement` crashes. This happens because:

1. The toast appears/disappears as an ephemeral UI element
2. Maestro tries to inspect the element frame after it's been removed from the tree
3. The XCTest driver returns a 500 error

**Mitigation strategies:**

```yaml
# 1. Add extra waitForAnimationToEnd after login to let toast settle
- waitForAnimationToEnd
- waitForAnimationToEnd
- waitForAnimationToEnd

# 2. Dismiss the toast by tapping its close area (point-based, optional)
- tapOn:
    point: "93%,95%"
    optional: true

# 3. Use point-based taps instead of text selectors on affected screens
# Text selectors require accessibility tree inspection which can crash
- tapOn:
    point: "90%,97%"  # e.g., More tab

# 4. Avoid assertVisible/assertNotVisible on screens with active toasts
# Use extendedWaitUntil instead (more tolerant of transient failures)
- extendedWaitUntil:
    visible: "Your Saves"
    timeout: 15000
```

---

## Adding testIDs to Components

When writing a new feature, always add testIDs to:

1. **Interactive elements**: Buttons, tabs, toggles, inputs
2. **Scrollable containers**: ScrollView, FlatList
3. **Key content sections**: Cards, headers, empty states
4. **Conditional UI**: Banners, modals, alerts

```tsx
// Button
<TouchableOpacity testID="submit-button" onPress={onSubmit}>

// Tab
<TouchableOpacity testID={`tab-${tabName}`} onPress={() => setTab(tabName)}>

// Card in a list
<View testID={`card-${item.id}`} style={styles.card}>

// Banner
<View testID="update-banner" style={styles.banner}>

// ScrollView
<ScrollView testID="campaign-detail-scroll">
```

---

## File Organization

```
e2e/
  maestro.yaml              # Global config (timeouts, retries, env)
  MAESTRO_BEST_PRACTICES.md # This file
  config/
    environments.json       # Env-specific URLs
  fixtures/
    prod-test-users.json    # Test accounts
    test-users.json         # Dev/staging accounts
  helpers/
    login-bypass.yaml       # Production OTP login (use this one)
    auth.yaml               # Dev password login
    navigation.yaml         # Tab navigation helpers
  flows/
    [feature-name]/         # One directory per feature
      [test-name].yaml      # One file per test scenario
  suites/
    smoke.yaml              # Quick critical-path suite
    regression.yaml         # Full regression suite
    build-*.yaml            # Build-specific verification
```

---

## Checklist for New Tests

- [ ] Uses `login-bypass.yaml` helper for authentication
- [ ] Uses deep links where possible for navigation
- [ ] Has `appId: com.troodie.troodie.com` in header
- [ ] Sets appropriate `TEST_EMAIL` env var
- [ ] Has `tags` for suite filtering (smoke, regression, tro-XXX)
- [ ] Includes comments explaining what's being tested
- [ ] Uses `testID` selectors over text when available
- [ ] Handles optional dialogs with `optional: true`
- [ ] Has `takeScreenshot` at key verification points
- [ ] Uses `extendedWaitUntil` for network-dependent content
- [ ] Uses `waitForAnimationToEnd` between navigation steps
- [ ] Follows the naming conventions above
