# Idea: QA Studio — Interactive Testing & Stakeholder Review

> Status: DRAFT
> Created: 2026-02-25
> Source: /explore
> Slug: qa-studio-interactive-testing

## Problem Statement

The current QA cycle for Troodie is a multi-day, high-friction loop:

1. **Dev writes SQL scripts** to get production into the right state for testing (e.g., `testing/v1.0.16/content-submission-flow-fix/reset.sql`, `verify.sql`)
2. **Dev writes manual test guides** as Markdown (e.g., `STAKEHOLDER_TEST_GUIDE.md` — 350 lines of Gherkin scenarios)
3. **Stakeholder installs TestFlight**, reads the PDF/Markdown, and manually walks through test cases
4. **Bugs/questions come back** via async communication — "which screen was that?", "it didn't look right", "can you reset the data?"
5. **Dev resets data**, patches, re-deploys, and the cycle repeats

This costs days per release. For v1.0.16 alone, there are 3 features × ~5 scenarios each × reset/verify SQL × manual test scripts × E2E flows — all needing coordination between dev and stakeholder.

The bottleneck isn't code quality — it's **the feedback loop between dev-produced test artifacts and stakeholder review**.

## User Value

| User | Value |
|------|-------|
| **Developer (you)** | Stop writing bespoke SQL reset scripts and 350-line test guides for every release. Let the tooling present the tests interactively. |
| **Stakeholder** | Self-serve QA review: watch recorded walkthroughs, step through scenarios, reset data themselves, mark pass/fail — no TestFlight or PDF required. |
| **Both** | Reduce QA cycles from days of back-and-forth to a single interactive session. |

## Rough Scope

### What Already Exists

The codebase has a remarkably complete testing infrastructure that this tool would orchestrate — it's not building from scratch, it's building a **UI layer and orchestration layer** on top of:

- **Maestro E2E flows** (`e2e/flows/production/`) — 20+ production flows with `takeScreenshot` at every key step. Already organized by feature and account type.
- **Maestro video/screenshot output** — configured in `e2e/maestro.yaml:55-57` with `screenshots: ./e2e/screenshots`, `videos: ./e2e/videos`
- **Session injection** (`e2e/helpers/inject-session.sh`) — bypasses login UI by injecting Supabase tokens directly into AsyncStorage. Enables fast account switching.
- **Production SQL runner** (`scripts/run-prod-sql.js`) — executes SQL against production Supabase via Management API. Already handles auth via keychain token.
- **Reset/verify SQL scripts** — per-feature reset (`testing/v1.0.16/*/reset.sql`) and verify (`testing/v1.0.16/*/verify.sql`) scripts
- **Demo runner** (`e2e/helpers/run-v1016-demo.sh`) — orchestrates seed → run flows → reset, with per-feature filtering and retry logic
- **Test data setup/teardown** (`data/test-data/prod/10-setup-robust-test-scenario.sql`, `11-reset-robust-test-data.sql`)
- **Structured test guides** (`testing/v1.0.16/STAKEHOLDER_TEST_GUIDE.md`) with Gherkin scenarios, account tables, and smoke checklists
- **Feature INDEX files** (`testing/v1.0.16/*/INDEX.md`) — per-feature artifact manifests
- **Test user fixtures** (`e2e/fixtures/prod-test-users-robust.json`) — complete test account catalog

### What Needs to Be Built

This is **not a change to the React Native app** — it's a separate companion tool (likely a local web app or Electron app) that orchestrates existing infrastructure:

1. **QA Studio Web UI** (new)
   - Dashboard showing all features/versions being tested
   - Per-feature view: scenarios, recordings, pass/fail status
   - Video player with step-by-step scrubbing tied to Maestro flow steps
   - Screenshot gallery aligned to test steps

2. **Recording Orchestrator** (new)
   - Wraps `maestro test` with `--record` or `xcrun simctl recordVideo`
   - Indexes recordings by feature/scenario/timestamp
   - Maps video timestamps to Maestro flow steps (using `takeScreenshot` markers as sync points)

3. **Data Control Panel** (new)
   - UI for running existing reset/verify SQL via `run-prod-sql.js`
   - Natural language → SQL translation (AI layer) for ad-hoc data manipulation
   - Live preview: "show me what this user sees" → inject session + screenshot
   - State inspector: query current test data state and display in human-readable form

4. **Interactive Test Guide Renderer** (new)
   - Parses existing Markdown test guides (`STAKEHOLDER_TEST_GUIDE.md`) and INDEX files
   - Renders each scenario as an interactive card with:
     - Gherkin steps displayed step-by-step
     - Linked recording/screenshots
     - Pass/fail toggle per scenario
     - Notes/comments field
   - Generates summary report when review is complete

5. **Branch Preview Controller** (new, stretch)
   - Manages Expo dev server pointing at different branches
   - "Fork" current test data state for isolated testing
   - Compare: side-by-side of main vs. branch behavior

### Navigation / UX Sketch

This is a **standalone tool**, not part of the Troodie app. Access pattern:

```
Developer: npm run qa:studio        → opens localhost:3456
Stakeholder: visits shared URL      → sees the review dashboard
```

**Dashboard View:**
```
┌─────────────────────────────────────────────────┐
│  QA Studio — v1.0.16.b1                         │
│                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │
│  │ Content Sub. │ │ Payment Dup. │ │ Rate Crt.│ │
│  │ 5 scenarios  │ │ 3 scenarios  │ │ 4 scen.  │ │
│  │ 3/5 passed   │ │ 0/3 tested   │ │ 1/4 fail │ │
│  └──────────────┘ └──────────────┘ └──────────┘ │
│                                                  │
│  [▶ Run All Tests]  [↺ Reset Data]  [📊 Report] │
└─────────────────────────────────────────────────┘
```

**Scenario Detail View:**
```
┌─────────────────────────────────────────────────┐
│  Scenario 1.1: Creator uploads content          │
│                                                  │
│  Account: prod-creator1@bypass.com (Creator)     │
│  Campaign: Spring Menu Launch                    │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  [▶ Video Recording]                        │ │
│  │  00:00 — Login                              │ │
│  │  00:12 — Navigate to campaign ← you are here│ │
│  │  00:18 — Tap Submit Deliverable             │ │
│  │  00:24 — Upload content                     │ │
│  │  00:32 — Success message                    │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  Steps:                                          │
│  ✓ Given I am logged in as creator               │
│  ✓ When I navigate to campaign detail            │
│  → Then I should see step indicator              │
│    ...                                           │
│                                                  │
│  [✅ Pass]  [❌ Fail]  [💬 Add Note]             │
└─────────────────────────────────────────────────┘
```

**Data Control Panel:**
```
┌─────────────────────────────────────────────────┐
│  Data Controls                                   │
│                                                  │
│  Quick Actions:                                  │
│  [Reset v1.0.16 Data]  [Verify State]            │
│                                                  │
│  AI Assistant:                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │ "Set all deliverables for Creator 1 on      │ │
│  │  Sushi Special to pending_review"            │ │
│  │                                    [Run ▶]  │ │
│  └─────────────────────────────────────────────┘ │
│  Preview: UPDATE campaign_deliverables SET...    │
│  [Confirm & Execute]                             │
│                                                  │
│  Current State:                                  │
│  Creator 1 → 3 deliverables (pending_review)     │
│  Creator 2 → 3 deliverables (approved+paid)      │
└─────────────────────────────────────────────────┘
```

## Open Questions

1. **Hosting model** — Should this be a local-only dev tool (`localhost`), or should the stakeholder be able to access it remotely (e.g., via a tunnel like ngrok, or deployed to a staging server)? Remote access would eliminate the "install TestFlight" friction but adds auth/hosting complexity.

2. **Video recording approach** — Maestro has limited native recording. Options: (a) `xcrun simctl recordVideo` wrapping Maestro runs, (b) Maestro Cloud's built-in recording, (c) screen recording the simulator via `ffmpeg`. Which is most reliable for your setup?

3. **AI data manipulation scope** — How much trust should the natural language → SQL layer have? Options range from "only run pre-written reset/verify scripts" (safe) to "generate and execute arbitrary SQL from English prompts" (powerful but risky). Should there be a confirmation step? Read-only vs. read-write?

4. **Stakeholder technical comfort** — Does the stakeholder need this to work on their own machine with zero setup, or is it OK if you (the dev) run it and share a screen/URL? This determines whether it's a simple local tool or needs proper packaging.

5. **Branch preview feasibility** — Branching off a published build requires either (a) Expo OTA updates per branch, (b) separate TestFlight builds, or (c) the stakeholder connecting to your local dev server. Which is acceptable?

6. **Scope of first version** — Given the ambition, what's the MVP? Suggestion: Start with the **Recording Playback + Interactive Test Guide** (no AI data manipulation, no branch preview). This alone would eliminate the "read the PDF" problem.

7. **Tech stack for the UI** — React (Next.js)? Electron? Simple Express + vanilla HTML? The choice affects how shareable and portable this is.

## Feasibility Notes

- **Complexity**: Large
  - New standalone application (web UI)
  - Orchestration layer over multiple existing tools (Maestro, SQL runner, session injection)
  - AI integration for natural language → SQL
  - Video processing/indexing pipeline
  - Interactive state management

- **Technical Risk**: Medium
  - **Low risk**: The underlying infrastructure (Maestro, SQL runner, session injection) is battle-tested and already works. The INDEX.md/STAKEHOLDER_TEST_GUIDE.md parsing is straightforward.
  - **Medium risk**: Video recording reliability (simulator recording can be flaky), AI SQL generation safety (needs guardrails), real-time data state reflection.
  - **Higher risk**: Branch preview (requires Expo multi-environment management), remote stakeholder access (auth, tunneling).

- **Dependencies**:
  - Maestro CLI (already installed)
  - `xcrun simctl` for video recording (macOS only)
  - Supabase Management API access (already configured via `run-prod-sql.js`)
  - AI API (Claude/OpenAI) for natural language → SQL
  - Web framework (Next.js/Express) for the UI
  - Video processing library (ffmpeg) for recording manipulation

- **Effort Estimate**: Large (XL)
  - MVP (recording + interactive guide): ~2-3 weeks
  - Full vision (AI data control + branch preview): ~6-8 weeks
  - The high leverage here is that most of the backend work is already done — the value is in the **UI and orchestration**, not in building new testing primitives

## Codebase References

| Area | File | Relevance |
|------|------|-----------|
| E2E flows | `e2e/flows/production/*.yaml` | 20+ production Maestro flows — the recordings to present |
| Maestro config | `e2e/maestro.yaml:54-57` | Output dirs for screenshots/videos already configured |
| Demo runner | `e2e/helpers/run-v1016-demo.sh` | Existing orchestration pattern: seed → run → reset |
| Session injection | `e2e/helpers/inject-session.sh` | Auth bypass for fast account switching |
| SQL runner | `scripts/run-prod-sql.js` | Production SQL execution via Management API |
| Test data setup | `data/test-data/prod/10-setup-robust-test-scenario.sql` | Seed script for 20 test accounts |
| Test data reset | `data/test-data/prod/11-reset-robust-test-data.sql` | Reset without deleting accounts |
| Feature reset SQL | `testing/v1.0.16/*/reset.sql` | Per-feature data reset scripts |
| Feature verify SQL | `testing/v1.0.16/*/verify.sql` | Per-feature state verification |
| Stakeholder guide | `testing/v1.0.16/STAKEHOLDER_TEST_GUIDE.md` | The 350-line guide this tool replaces |
| Feature INDEX | `testing/v1.0.16/*/INDEX.md` | Per-feature artifact manifests |
| Manual tests | `testing/manual/*.md` | Manual test scripts (parseable for scenarios) |
| Test users | `e2e/fixtures/prod-test-users-robust.json` | Test account catalog |
| Production suite | `e2e/suites/production.yaml` | Suite definition with flow ordering |
| E2E orchestrator | `e2e/scripts/run-production-e2e.js` | Production E2E runner with prerequisites check |
| Fast runner | `e2e/run-fast-production.sh` | Session-injected fast production E2E |
| Feature specs | `specs/features/*/spec.md` | Feature specs (additional context for test guide) |

## Next Steps

To refine this idea into a full technical spec with stakeholder questions, run:
```
/groom qa-studio-interactive-testing
```
