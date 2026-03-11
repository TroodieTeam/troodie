# Per-Scenario QR Code Testing — Technical Specification

> Status: APPROVED
> Created: 2026-03-02
> Source: idea: specs/ideas/per-scenario-qr-testing.md
> Feature: per-scenario-qr-testing

## Overview

Add QR codes to each QA Studio scenario page that encode `troodie://` deep links. Stakeholders scan a QR code, the app auto-logs into the correct test account, navigates to the right screen, and the stakeholder tests with zero setup friction. Eliminates "which account?", "how do I get there?", and "what data state?" questions.

## Problem Statement

Stakeholder testing requires 4-6 manual steps per scenario: look up account email, open app, type email, enter OTP, navigate multiple screens, cross-reference test guide. A 12-scenario test session takes an hour of setup alone. QR codes reduce each scenario to a single scan.

## User Stories

- As a **stakeholder**, I want to scan a QR code and have the app open pre-logged-in on the correct screen so I can test immediately
- As a **developer**, I want QR codes auto-generated from test guide data so I do zero manual work per scenario
- As a **stakeholder**, I want to see which account and screen each QR code targets so I know what to expect before scanning

## User Experience

### Screens & Views

| Screen | Purpose | Repo | Entry Points |
|--------|---------|------|--------------|
| QA Studio: Scenario page | Shows QR code + deep link info | troodie-qa-studio | `/scenarios/[id]` |
| Troodie: QA loading screen | Brief "Setting up..." overlay | troodie | Deep link handler |

### User Flows

1. **Scan & Test**
   - Step 1: Stakeholder opens QA Studio scenario page on laptop
   - Step 2: QR code is visible inside the account info card, showing target account + screen
   - Step 3: Stakeholder scans QR with phone camera → iOS shows "Open in Troodie"
   - Step 4: App opens → auto-login (2-3s) → navigates to target screen
   - Step 5: Stakeholder tests the feature, returns to QA Studio to mark pass/fail

### Components

**QA Studio (troodie-qa-studio repo):**

- [ ] `ScenarioQRCode` — Client component using `qrcode.react` (`QRCodeSVG`). Renders QR code + copyable deep link + screen label. Props: `deepLinkUrl: string`, `accountEmail: string`, `screenLabel: string`
- [ ] `lib/scenario-deeplink.ts` — Maps scenario Gherkin to a `troodie://` deep link URL. Uses account email from Gherkin `Given I am logged in as "..."` and screen path from navigation keywords

**Troodie App (troodie repo):**

- [ ] `services/qaDeepLinkService.ts` — Auto-login + navigate logic. Validates `@bypass.com`, calls `signInWithPassword`, waits for session, navigates
- [ ] Deep link handler extension in `app/_layout.tsx` — New `qa/scenario` route branch

### States

| State | Visual | Trigger |
|-------|--------|---------|
| QR Code Ready | QR code + deep link shown | Scenario page loads |
| No Account Mapped | "No account found in Gherkin" message | Scenario has no `logged in as` line |
| Auto-Login Loading | "Setting up test scenario..." overlay | Phase 2: deep link opens app |
| Auth Error | Toast: "Login failed" + manual login instructions | Password auth fails |

## Technical Design

### Database Schema

No database changes. This feature is purely client-side (QA Studio components + Troodie deep link handler).

### Deep Link URL Format

All QR codes use the auto-login format from day one:
```
troodie://qa/scenario?email=prod-creator1@bypass.com&screen=creator/deliverables
```

### Scenario-to-DeepLink Mapping

The mapper (`lib/scenario-deeplink.ts`) extracts data from Gherkin:

| Gherkin Pattern | Deep Link Screen |
|-----------------|------------------|
| `"prod-creatorN@bypass.com"` + `navigate to the accepted campaign` | `creator/deliverables` |
| `"prod-creatorN@bypass.com"` + `campaign` (generic) | `creator/campaigns` |
| `"prod-businessN@bypass.com"` + `Review Deliverables` | `business/deliverables` |
| `"prod-businessN@bypass.com"` + `campaign` (generic) | `business/campaigns` |
| `"prod-businessN@bypass.com"` + `applications` | `business/applications` |
| Any other | `home` (fallback) |

### Services

| Service | File | Repo | Methods | Description |
|---------|------|------|---------|-------------|
| scenarioDeeplink | `lib/scenario-deeplink.ts` | qa-studio | `buildDeepLink(scenario, accounts, guide)` | Maps Gherkin → deep link URL |
| qaDeepLinkService (Phase 2) | `services/qaDeepLinkService.ts` | troodie | `handleQADeepLink(email, screen)` | Auto-login + navigate |

### Integration Points

- **guide-parser.ts**: Already extracts accounts and Gherkin — `scenario-deeplink.ts` consumes this data
- **authService.ts**: Phase 2 uses existing `_isBypassEmail()` and `signInWithPassword()` — no changes needed
- **app/_layout.tsx**: Phase 2 adds one `else if` branch for `qa/scenario` path in the deep link handler
- **ResetTestData component**: Already exists on feature pages — stakeholders can reset data before scanning

### Security

- Auto-login ONLY works for `@bypass.com` emails (enforced by `authService._isBypassEmail()`)
- Bypass password is NOT in the QR code URL — the app retrieves it from env config
- `qa/` prefix is clearly namespaced and won't conflict with real routes
- No real user accounts can be accessed via this mechanism

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| App not installed | iOS shows nothing / Android shows Play Store | Phase 1 limitation — document in QA Studio |
| Slow network | Auth timeout after 10s → error toast + manual login instructions | Phase 2: retry once, then show error |
| Already logged in as correct account | Skip auth, just navigate | Phase 2: check `session.user.email` first |
| Already logged in as different account | Sign out, sign in as new account | Phase 2: call `supabase.auth.signOut()` first |
| Gherkin has no `logged in as` pattern | Show QR with `home` route + "No account detected" warning | Graceful fallback |
| QR URL too long / dense | Keep URL under 100 chars | Use short screen paths, no unnecessary params |

## Error Handling

| Error Condition | User Message | Recovery Action |
|-----------------|--------------|-----------------|
| signInWithPassword fails (Phase 2) | Toast: "Could not log in. Try manually." | Show account email + OTP instructions |
| Navigation target doesn't exist | Navigate to home tab | Log warning |
| Gherkin parse fails | "QR code unavailable for this scenario" | Hide QR section |

## Implementation Phases

### Phase 1: QR Code Generation + Deep Link Mapper (QA Studio)
**Goal**: Show a scannable QR code on each scenario page with auto-login deep links using `qrcode.react`. QR code lives inside the existing account info card.

#### Tasks
- [ ] **Task 1.1**: Install `qrcode.react`
  - Files: `package.json` (add `qrcode.react`)
  - Acceptance: `npm install` succeeds, library available
- [ ] **Task 1.2**: Create `lib/scenario-deeplink.ts`
  - Files: `lib/scenario-deeplink.ts` (new)
  - Acceptance: Given a Scenario + TestAccount[], returns `troodie://qa/scenario?email=...&screen=...` URL
- [ ] **Task 1.3**: Create `ScenarioQRCode` component
  - Files: `components/ScenarioQRCode.tsx` (new)
  - Acceptance: Renders `QRCodeSVG`, copyable URL, screen label. Fits inside account info card.
- [ ] **Task 1.4**: Integrate into scenario page
  - Files: `app/scenarios/[id]/page.tsx` (modify)
  - Acceptance: QR code renders inside the existing account info card (blue box)
- [ ] **Task 1.5**: Typecheck + lint pass

### Phase 2: Auto-Login Deep Link Handler (Troodie app)
**Goal**: Scanning the QR code auto-logs in and navigates — zero manual steps.
**Depends on**: Phase 1

#### Tasks
- [ ] **Task 2.1**: Create `services/qaDeepLinkService.ts`
  - Files: `services/qaDeepLinkService.ts` (new)
  - Acceptance: `handleQADeepLink(email, screen)` validates bypass email, signs in, navigates
- [ ] **Task 2.2**: Extend deep link handler in `_layout.tsx`
  - Files: `app/_layout.tsx` (modify)
  - Acceptance: `troodie://qa/scenario?email=...&screen=...` triggers auto-login + navigation
- [ ] **Task 2.3**: Typecheck + lint pass

### Phase 3: Campaign-Specific Navigation (DEFERRED)
**Goal**: Deep link directly to a specific campaign's deliverables tab. Deferred — will be groomed separately if generic screen navigation proves insufficient.

## Testing Requirements

### Manual Testing
- [ ] Scan QR code from scenario page → verify app opens to correct screen
- [ ] Verify QR code renders for all scenarios in the test guide
- [ ] Verify fallback when Gherkin has no account info
- [ ] Phase 2: verify auto-login works for creator, business, and consumer accounts
- [ ] Phase 2: verify switching between accounts (scan QR for different account)

### E2E Tests
- [ ] QA Studio: Playwright test that verifies QR code renders on scenario pages

## Acceptance Criteria

- [ ] Every scenario page shows a QR code with the correct deep link
- [ ] Deep link URLs encode the correct screen path per scenario Gherkin
- [ ] QR code section shows account email and target screen for clarity
- [ ] Copying the deep link URL works
- [ ] Phase 2: scanning auto-logs in and navigates with zero manual steps
- [ ] Phase 2: auto-login is restricted to `@bypass.com` accounts only
