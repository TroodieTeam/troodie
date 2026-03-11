# Idea: Per-Scenario QR Code Testing

> Status: DRAFT
> Created: 2026-03-02
> Source: /explore
> Slug: per-scenario-qr-testing

## Problem Statement

Stakeholder testing today requires a multi-step manual process: open TestFlight, launch the app, find the right test account email from a guide, type it in, enter OTP `000000`, navigate through multiple screens to reach the correct state, then read a separate document to know what to verify. This creates friction at every step:

1. **Account confusion** -- stakeholders pick the wrong test account for a scenario
2. **Navigation confusion** -- stakeholders cannot find the right screen (e.g., "More > Manage Campaigns > Sushi Special > Deliverables tab")
3. **State confusion** -- stakeholders test against stale data or the wrong deliverable status
4. **Context-switching** -- stakeholders must flip between the test guide (PDF/Markdown/QA Studio) and the app itself

The ideal experience: **scan a QR code, the app opens logged into the right account on the right screen with the right data, and the test instructions are visible inline**.

## User Value

| User | Value |
|------|-------|
| **Stakeholder** | Zero-friction testing: scan one QR code per scenario, everything is pre-configured. No more reading test guides or figuring out navigation. |
| **Developer** | Stop fielding "which account do I use?" and "how do I get to that screen?" questions. QR codes are generated automatically from existing test guide data. |
| **Both** | Faster QA cycles -- stakeholders can test 12 scenarios in the time it used to take to test 3. |

## What Already Exists

This idea builds on a substantial amount of existing infrastructure across both repos:

### Troodie App (React Native / Expo)

**Deep linking infrastructure** -- The app already handles `troodie://` deep links with support for 15+ route patterns. The handler in `app/_layout.tsx:64-178` parses URLs, extracts paths, and navigates via `expo-router`. Existing routes include:

| Pattern | Example | Handler Location |
|---------|---------|-----------------|
| `restaurant/:id` | `troodie://restaurant/abc123` | `_layout.tsx:87-89` |
| `user/:id` | `troodie://user/abc123` | `_layout.tsx:91-94` |
| `posts/:id` | `troodie://posts/abc123` | `_layout.tsx:95-98` |
| `boards/:id` | `troodie://boards/abc123` | `_layout.tsx:99-102` |
| `invite/:token` | `troodie://invite/xyz` | `_layout.tsx:103-117` |
| `creator/deliverables` | `troodie://creator/deliverables` | `_layout.tsx:118-120` |
| `creator/campaigns` | `troodie://creator/campaigns` | `_layout.tsx:121-123` |
| `business/campaigns` | `troodie://business/campaigns` | `_layout.tsx:127-129` |
| `business/deliverables` | `troodie://business/deliverables` | `_layout.tsx:130-132` |
| `business/applications` | `troodie://business/applications` | `_layout.tsx:133-135` |
| `more` | `troodie://more` | `_layout.tsx:136-138` |
| `home` | `troodie://home` | `_layout.tsx:139-141` |
| `stripe/onboarding/*` | (with query params) | `_layout.tsx:142-173` |

The linking config in `constants/linking.ts:5-31` defines the URL scheme `troodie://` and maps routes to screen paths. The `Linking.parse()` function handles both production (`troodie://path`) and dev (`exp://host/--/path`) URL formats.

**Auth bypass system** -- Test accounts use `@bypass.com` email domain. When a user enters OTP `000000` for a bypass account, `authService.ts:210-214` calls `supabase.auth.signInWithPassword()` with a fixed password instead of OTP verification. The bypass password comes from `EXPO_PUBLIC_TEST_AUTH_PASSWORD` (defaults to `BypassPassword123` in `authService.ts:29-30`). This is available in both dev and production builds because `.env.development` persists variables not overridden by `.env.production` (see `app.config.js:37-64` and `LEARNINGS.md:136`).

**Session injection for E2E** -- `e2e/helpers/inject-session.sh` authenticates via the Supabase REST API and writes the session token directly into the iOS simulator's AsyncStorage. This creates a real `Session` object without any UI interaction. The script authenticates against `https://cacrjcekanesymdzpjtt.supabase.co/auth/v1/token?grant_type=password`.

**20 pre-seeded test accounts** -- `data/test-data/prod/10-setup-robust-test-scenario.sql` creates 10 consumers, 7 creators, and 3 businesses with deterministic UUIDs (e.g., `bb111111-1111-4111-b111-111111111111` for Creator 1). All use password `000000` and `@bypass.com` domain. Includes `auth.identities` rows so `signInWithPassword` works.

**No `expo-updates` installed** -- The project does not use `expo-updates` (confirmed by searching `package.json`). EAS Update channels/branches are not configured in `eas.json`. This rules out scenario-specific OTA update bundles as a delivery mechanism.

**URL scheme is `troodie://`** -- Defined in `app.config.js:76` as `scheme: "troodie"`. This is the custom URL scheme registered on iOS/Android. Deep links work on installed builds (TestFlight, dev client) but NOT in Expo Go (which uses `exp://` scheme).

### QA Studio (Next.js)

**Scenario data model** -- `lib/guide-parser.ts` already parses `STAKEHOLDER_TEST_GUIDE.md` into structured `Scenario` objects with: `id`, `slug`, `number`, `title`, `gherkin`, `featureSlug`, `versionSlug`. Each scenario ID follows the pattern `v1.0.16--content-submission-flow-fix--creator-uploads-content-for-review`.

**Account extraction from Gherkin** -- `app/scenarios/[id]/page.tsx:26-33` already extracts the test account from Gherkin text by matching `logged in as "([^"]+)"`, then looks up the account from the guide's account table to display email, type, and purpose.

**Scenario detail page** -- `app/scenarios/[id]/page.tsx` renders: breadcrumb navigation, scenario title, related account info (email, type, purpose), media panel (walkthrough screenshots, gallery, video), Gherkin test steps, and review controls (pass/fail/skip with notes).

**Component library** -- QA Studio already has: `ScenarioMediaPanel.tsx` (screenshots + video), `GherkinStepList.tsx` (parsed Gherkin steps), `ReviewControls.tsx` (pass/fail/skip), `AnimatedWalkthrough.tsx`, `ScreenshotGallery.tsx`, `VideoPlayer.tsx`, `StepTimeline.tsx`.

**Test account data** -- The guide parser produces `TestAccount` objects with: `label`, `email`, `otp`, `accountType`, `campaigns`, `useFor`.

## What Needs to Be Built

### Phase 1: QR Code Generation in QA Studio (QA Studio repo only)

**Goal**: Add a QR code to each scenario page that encodes a deep link URL.

1. **QR code component** (`components/ScenarioQRCode.tsx`)
   - Renders a QR code encoding a `troodie://` deep link
   - Shows the deep link URL as copyable text below the QR code
   - Uses a lightweight QR library (e.g., `qrcode.react` or `next-qrcode`)

2. **Deep link URL construction** (`lib/scenario-deeplink.ts`)
   - Maps each scenario to a deep link URL based on the Gherkin context
   - Example mappings:
     - Scenario 1.1 (Creator uploads content): `troodie://creator/deliverables`
     - Scenario 1.2 (Business reviews content): `troodie://business/deliverables`
     - Scenario 2.1 (Business approves deliverables): `troodie://business/deliverables`
     - Scenario 3.1 (Rate creator hidden): `troodie://business/applications`
   - Includes query params for context: `?scenario=1.1&account=prod-creator1@bypass.com`

3. **Integration into scenario page** (`app/scenarios/[id]/page.tsx`)
   - Add the QR code component between the account info card and the media panel
   - Show a collapsible "Test on Device" section with the QR code and login instructions

### Phase 2: Auto-Login Deep Link Handler (Troodie app repo)

**Goal**: Add a new deep link route that handles authentication + navigation in one step.

1. **New deep link route**: `troodie://qa/scenario`
   - Query params: `email`, `screen`, `campaign` (optional), `scenarioId` (optional)
   - Example: `troodie://qa/scenario?email=prod-creator1@bypass.com&screen=creator/deliverables`

2. **Deep link handler extension** (`app/_layout.tsx`)
   - Add a new `cleanPath.startsWith('qa/scenario')` branch in the deep link handler
   - Extract `email` and `screen` from query params
   - If user is not logged in as the specified email, trigger auto-login:
     a. Call `supabase.auth.signInWithPassword({ email, password: bypassPassword })`
     b. Wait for session to establish
     c. Navigate to the specified `screen` path
   - If user is already logged in as the correct account, just navigate

3. **Auto-login service** (`services/qaDeepLinkService.ts`)
   - Encapsulates the auto-login + navigate logic
   - Validates that the email is a bypass account (security: never auto-login real users)
   - Handles errors (account not found, wrong password, etc.)
   - Provides a brief loading indicator ("Setting up test scenario...")

4. **Test scenario overlay** (stretch)
   - After navigating, show a small floating overlay with:
     - Scenario title and number
     - Key test steps (from QA Studio via the `scenarioId` param)
     - "Done Testing" button to dismiss
   - This eliminates the need to look at QA Studio while testing on the device

### Phase 3: Campaign-Specific Deep Links (Troodie app repo)

**Goal**: Navigate directly to a specific campaign's deliverables/applications tab.

1. **Enhanced deep link routes**:
   - `troodie://business/campaigns/:campaignId/deliverables`
   - `troodie://business/campaigns/:campaignId/applications`
   - `troodie://creator/campaigns/:campaignId/deliverables`

2. **Screen-level routing** in `app/_layout.tsx`:
   - Parse campaign ID from the path
   - Navigate to the campaign detail screen with the correct tab pre-selected

3. **QA Studio mapping update**:
   - Include campaign IDs in the deep link construction
   - Use the campaign name from the Gherkin `Background` to look up the campaign ID from test data

## Technical Approach for QR Codes

### What the QR Code Encodes

The QR code encodes a `troodie://` custom URL scheme deep link. This is the most practical option because:

| Option | Viability |
|--------|-----------|
| **`troodie://qa/scenario?...`** (custom scheme) | Best option. Works on TestFlight and dev builds where the app is installed. No server needed. |
| **`exp://host:port/--/qa/scenario?...`** (Expo Go) | Only works in Expo Go on the developer's LAN. Not useful for stakeholders. |
| **EAS Update link** | Not viable -- `expo-updates` is not installed, no update channels configured. |
| **Universal Link (HTTPS)** | Would require `associatedDomains` config and a hosted `apple-app-site-association` file. Not currently set up (`app.config.js` has no `associatedDomains`). Future enhancement. |

**Example QR code URL**:
```
troodie://qa/scenario?email=prod-creator1@bypass.com&screen=creator/deliverables&scenario=1.1&version=v1.0.16
```

### Auth Flow via Deep Link

```
QR Code scanned on phone
    |
    v
iOS opens Troodie app with troodie://qa/scenario?email=...&screen=...
    |
    v
_layout.tsx deep link handler fires
    |
    v
Extract email and screen from query params
    |
    v
Check: is email a @bypass.com address?
    |-- No: ignore (security guard)
    |-- Yes: continue
    |
    v
Check: is current session already this user?
    |-- Yes: navigate to screen
    |-- No: call signInWithPassword(email, '000000')
         |
         v
         Wait for session + profile load
         |
         v
         Navigate to screen
```

### Security Considerations

- Auto-login ONLY works for `@bypass.com` emails (enforced by `authService._isBypassEmail()`)
- The bypass password is already present in production builds (by design -- see `LEARNINGS.md:136`)
- The `qa/` deep link prefix is clearly namespaced and would not conflict with real app routes
- No real user accounts can be accessed via this mechanism
- The QR codes contain no secrets -- the bypass password is not in the URL

## Rough UX Sketch

### Stakeholder Experience

```
1. Open QA Studio on laptop (or phone browser)
   ┌──────────────────────────────────────────────┐
   │  Scenario 1.1: Creator uploads content        │
   │  Account: prod-creator1@bypass.com (Creator)  │
   │                                                │
   │  ┌──────────────────────────┐                  │
   │  │  Test on Your Device     │                  │
   │  │                          │                  │
   │  │     ┌──────────┐        │                  │
   │  │     │ QR CODE  │        │                  │
   │  │     │          │        │                  │
   │  │     └──────────┘        │                  │
   │  │                          │                  │
   │  │  Scan to open app as:   │                  │
   │  │  prod-creator1@bypass   │                  │
   │  │  Screen: My Deliverables │                  │
   │  └──────────────────────────┘                  │
   │                                                │
   │  [Walkthrough] [Gallery] [Steps]               │
   │  ...test steps and media below...              │
   └──────────────────────────────────────────────┘

2. Stakeholder scans QR code with iPhone camera
   → iOS shows "Open in Troodie" banner
   → Taps to open

3. Troodie app opens
   → Brief "Setting up test scenario..." indicator
   → Auto-logs in as prod-creator1@bypass.com
   → Navigates to My Deliverables screen
   → (Phase 3 stretch) Shows floating overlay:
     "Scenario 1.1: Upload content for review
      - Tap Submit Deliverable
      - Select a photo/video
      - Add caption, tap Submit for Review
      [Done Testing]"

4. Stakeholder tests the feature on their actual phone
   → Goes back to QA Studio on laptop
   → Marks Pass/Fail/Skip
   → Scans next scenario's QR code
```

### Developer Experience

```
1. Write STAKEHOLDER_TEST_GUIDE.md (already done for each release)
2. QR codes are auto-generated from the guide data
3. No additional work needed per scenario
4. If a test account or screen path changes, QR codes update automatically
```

## Open Questions

1. **App installation prerequisite** -- The `troodie://` scheme only works if the app is already installed (via TestFlight or dev build). Should the QR code include a fallback URL (e.g., to the App Store or a "download TestFlight" page) if the app is not installed? This could use a Universal Link with an `apple-app-site-association` fallback.

2. **Session switching cost** -- When scanning a QR code for a different account, the app must sign out and sign in. This takes 2-5 seconds. Is that acceptable, or should we pre-authenticate multiple accounts and switch between cached sessions?

3. **Data state verification** -- The QR code gets the stakeholder to the right screen, but how do we ensure the test data is in the right state? Options:
   - (a) Include a "Reset Data" button in the QA Studio QR section that runs the reset SQL before the stakeholder scans
   - (b) Add a `resetFirst=true` query param that triggers a data reset API call from the app before navigating
   - (c) Just document that stakeholders should check data state in QA Studio before scanning

4. **Deep link scope for Phase 1** -- Should Phase 1 use the simpler approach of just generating QR codes with existing deep link routes (no auto-login), paired with manual login instructions? This would be much simpler to ship:
   - QR encodes: `troodie://creator/deliverables`
   - QA Studio shows: "Log in as prod-creator1@bypass.com first, then scan"
   - Auto-login (Phase 2) comes later

5. **Offline / low-connectivity** -- If the stakeholder scans a QR code while on a slow network, the `signInWithPassword` call may fail. How should the app handle this? Queue the intent and retry?

6. **Android support** -- The `troodie://` scheme is also registered for Android (`eas.json` has an Android build config, `app.config.js` has `android.package`). Do QR codes work the same way on Android, or do we need `intent://` URLs?

7. **Campaign ID availability** -- Phase 3 requires campaign IDs in the QR code. The test data SQL uses deterministic UUIDs for users but auto-generated UUIDs for campaigns. Should we switch to deterministic campaign UUIDs in the test data setup script?

## Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `troodie://` scheme requires app to be installed | Stakeholders without the app see nothing | Add fallback instructions or use Universal Links |
| Auto-login may conflict with existing session state | User gets stuck in a broken auth state | Sign out first, then sign in; add error recovery |
| Deep link handler runs before auth context is ready | Navigation fires before profile loads, app crashes or shows wrong state | Use the existing `authLoading` guard in `_layout.tsx:269`; queue navigation until auth is settled |
| QR codes with long URLs may be hard to scan | Complex URLs with many query params generate dense QR codes | Keep URLs short; use scenario IDs that map to a lookup table instead of encoding all params in the URL |
| Test data drift (auto-approval 72h timer) | Stakeholder scans QR but data is no longer in expected state | Show data state warning in QA Studio; integrate with reset button |

## Feasibility Notes

- **Complexity**: Medium
  - Phase 1 (QR generation only): Small -- just a new component in QA Studio
  - Phase 2 (auto-login deep link): Medium -- new deep link handler + auth flow
  - Phase 3 (campaign-specific navigation): Medium -- new routes + data mapping

- **Technical Risk**: Low-Medium
  - Deep linking infrastructure is mature and battle-tested (15+ routes working)
  - Auth bypass mechanism is already production-proven
  - QR code generation is a solved problem (many React libraries)
  - Main risk is the auto-login flow timing (auth state vs. navigation readiness)

- **Dependencies**:
  - QR code library for QA Studio (e.g., `qrcode.react`, ~20KB)
  - Troodie app must be installed via TestFlight or dev build
  - Test data must be seeded (existing `10-setup-robust-test-scenario.sql`)

- **Effort Estimate**:
  - Phase 1 (QR codes in QA Studio): ~1 day
  - Phase 2 (auto-login deep link): ~2-3 days
  - Phase 3 (campaign-specific deep links): ~2 days
  - Total: ~1 week for full implementation

## Codebase References

| Area | File | Relevance |
|------|------|-----------|
| Deep link handler | `/Users/kndri/projects/troodie/app/_layout.tsx:64-178` | Existing handler to extend with `qa/scenario` route |
| Linking config | `/Users/kndri/projects/troodie/constants/linking.ts:5-31` | URL scheme config and route mapping |
| App config (scheme) | `/Users/kndri/projects/troodie/app.config.js:76` | `scheme: "troodie"` definition |
| Auth bypass | `/Users/kndri/projects/troodie/services/authService.ts:16-35` | Bypass domain detection + password retrieval |
| Password auth | `/Users/kndri/projects/troodie/services/authService.ts:206-224` | `signInWithPassword` flow for bypass accounts |
| Auth context | `/Users/kndri/projects/troodie/contexts/AuthContext.tsx:34-100` | Session state management, profile loading |
| Session injection | `/Users/kndri/projects/troodie/e2e/helpers/inject-session.sh` | Pattern for programmatic auth (API-level) |
| Login bypass (E2E) | `/Users/kndri/projects/troodie/e2e/helpers/login-bypass.yaml` | Maestro-level login flow pattern |
| EAS config | `/Users/kndri/projects/troodie/eas.json` | Build profiles (no expo-updates) |
| Test data setup | `/Users/kndri/projects/troodie/data/test-data/prod/10-setup-robust-test-scenario.sql` | 20 test accounts with deterministic UUIDs |
| Stakeholder guide | `/Users/kndri/projects/troodie/testing/v1.0.16/STAKEHOLDER_TEST_GUIDE.md` | Source of scenario/account/campaign data |
| QA Studio scenario page | `/Users/kndri/projects/troodie-qa-studio/app/scenarios/[id]/page.tsx` | Page to add QR code component to |
| Guide parser | `/Users/kndri/projects/troodie-qa-studio/lib/guide-parser.ts` | Parses test guides into structured Scenario/Account objects |
| QA Studio config | `/Users/kndri/projects/troodie-qa-studio/lib/config.ts` | TROODIE_ROOT and project ref config |
| QA Studio package.json | `/Users/kndri/projects/troodie-qa-studio/package.json` | No QR library yet -- needs to be added |
| Env config | `/Users/kndri/projects/troodie/lib/config.ts` | Runtime config including buildProfile |
| Share service | `/Users/kndri/projects/troodie/services/shareService.ts:56-66` | Existing deep link URL generation pattern |

## Next Steps

To refine this idea into a full technical spec with stakeholder questions, run:
```
/groom per-scenario-qr-testing
```
