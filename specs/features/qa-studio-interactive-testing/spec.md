# QA Studio — Interactive Testing & Stakeholder Review

> Status: APPROVED
> Created: 2026-02-25
> Source: idea: specs/ideas/qa-studio-interactive-testing.md
> Feature: qa-studio-interactive-testing

## Overview

QA Studio is a remotely-accessible Next.js web application that orchestrates Troodie's existing testing infrastructure (Maestro E2E flows, production SQL runner, session injection, test guides) into a single interactive dashboard. It replaces the current multi-day, PDF-and-TestFlight QA cycle with a self-serve experience where stakeholders can watch recorded test walkthroughs, step through scenarios, manipulate test data with natural language, and preview branch-specific changes — all from a browser.

## Problem Statement

Every Troodie release requires the developer to:
1. Write bespoke SQL reset/verify scripts per feature (`testing/v1.0.16/*/reset.sql`, `verify.sql`)
2. Author 350+ line Markdown test guides (`testing/v1.0.16/STAKEHOLDER_TEST_GUIDE.md`)
3. Coordinate TestFlight installs and PDF walkthroughs with stakeholders
4. Reset data and re-deploy after every round of feedback

For v1.0.16 alone this produced 12+ SQL files, 6+ manual test scripts, 20+ Maestro flows, and a 350-line stakeholder guide — all requiring synchronous coordination. The bottleneck is the feedback loop, not code quality.

## User Stories

- As a **developer**, I want to run E2E tests and have the recordings automatically indexed and presented in a web UI so that I don't have to manually coordinate test walkthroughs with stakeholders
- As a **stakeholder**, I want to watch recorded test walkthroughs in my browser and mark each scenario pass/fail so that I don't need TestFlight or a physical device
- As a **stakeholder**, I want to describe data changes in plain English and have the system execute them so that I can reset or manipulate test state without asking the developer
- As a **developer**, I want to preview how a feature branch looks with production-like data so that I can demo changes before merging
- As a **stakeholder**, I want an interactive test guide with linked recordings for each scenario so that I don't have to cross-reference a PDF with the app

## User Experience

### Screens & Views

| Screen | Purpose | Entry Points | Users |
|--------|---------|--------------|-------|
| Dashboard | Version overview: features, scenario counts, pass/fail summary | Root URL `/` | Dev, Stakeholder |
| Feature Detail | Scenarios for one feature with linked recordings/screenshots | Click feature card on Dashboard | Dev, Stakeholder |
| Scenario Player | Video player + step timeline + Gherkin steps + pass/fail | Click scenario in Feature Detail | Dev, Stakeholder |
| Data Control Panel | Quick actions (reset/verify), AI chat for NL->SQL, state inspector | Sidebar or `/data` route | Dev, Stakeholder |
| Branch Preview | Compare main vs feature branch, manage Expo dev server targeting | `/branches` route | Dev |
| Run Manager | Trigger test runs, view in-progress/completed runs, logs | `/runs` route | Dev |
| Report | Exportable summary of all pass/fail results with notes | `/report` route | Dev, Stakeholder |

### User Flows

1. **Developer: Record & Publish a Test Run**
   - Step 1: Dev starts QA Studio (`npm run qa:studio`) -> Dashboard loads
   - Step 2: Dev clicks "New Run" -> selects version (e.g., v1.0.16.b1) and features
   - Step 3: System seeds test data via `run-prod-sql.js` -> runs Maestro flows with `xcrun simctl recordVideo` -> captures screenshots at `takeScreenshot` markers
   - Step 4: Recordings are indexed, uploaded to cloud storage, and mapped to scenarios
   - Step 5: Dev shares the URL with stakeholder

2. **Stakeholder: Self-Serve Review**
   - Step 1: Stakeholder opens shared URL -> sees Dashboard with feature cards
   - Step 2: Clicks "Content Submission Flow" -> sees 5 scenarios with status
   - Step 3: Clicks Scenario 1.1 -> video plays with step-by-step timeline
   - Step 4: Scrubs to "Upload content" step -> sees screenshot + Gherkin assertion
   - Step 5: Marks scenario as "Pass" with optional note
   - Step 6: Repeats for all scenarios -> generates report

3. **Stakeholder: Manipulate Test Data**
   - Step 1: Opens Data Control Panel from sidebar
   - Step 2: Types: "Reset all deliverables for Creator 1 on Sushi Special to pending_review"
   - Step 3: AI generates SQL: `UPDATE campaign_deliverables SET status = 'pending_review' ...`
   - Step 4: System shows SQL preview + affected rows count
   - Step 5: Stakeholder confirms -> SQL executes via `run-prod-sql.js`
   - Step 6: State inspector refreshes showing updated state

4. **Developer: Branch Preview**
   - Step 1: Dev opens Branch Preview -> selects feature branch
   - Step 2: System creates Supabase branch (or data fork) and starts Expo dev server pointing at branch code
   - Step 3: Dev triggers test run against branch -> recordings captured
   - Step 4: Side-by-side comparison: main branch recordings vs feature branch
   - Step 5: Stakeholder can view branch preview recordings at a separate URL

### Components (Next.js)

- [ ] `DashboardPage` — Version cards with feature summaries, aggregate pass/fail
- [ ] `FeatureCard` — Feature name, scenario count, progress bar, status badge
- [ ] `FeatureDetailPage` — Scenario list with thumbnails, status badges, linked recordings
- [ ] `ScenarioCard` — Thumbnail, title, account used, status, duration
- [ ] `ScenarioPlayer` — Video player + step timeline + Gherkin step list + pass/fail controls
- [ ] `StepTimeline` — Clickable timeline synced to video timestamps (derived from `takeScreenshot` markers)
- [ ] `GherkinStepList` — Parsed Gherkin steps from test guide Markdown, with checkmarks
- [ ] `DataControlPanel` — Quick action buttons + AI chat input + SQL preview + state table
- [ ] `AIChatInput` — Natural language input with streaming SQL generation
- [ ] `SQLPreview` — Syntax-highlighted SQL with "Confirm & Execute" button
- [ ] `StateInspector` — Table view of current test data state (accounts, deliverables, campaigns)
- [ ] `BranchPreview` — Branch selector, side-by-side recording comparison
- [ ] `RunManager` — Trigger runs, progress bars, log streaming
- [ ] `ReportPage` — Exportable pass/fail summary with notes and screenshots

### States

| State | Visual | Trigger |
|-------|--------|---------|
| No Runs | Empty dashboard with "Start First Run" CTA | First visit, no recordings |
| Recording In Progress | Progress bar per flow, live log output | Dev triggers test run |
| Run Complete | Feature cards populated with recordings/screenshots | Maestro flows finish |
| Scenario Untested | Gray badge, no pass/fail | Default before stakeholder review |
| Scenario Passed | Green badge with checkmark | Stakeholder marks pass |
| Scenario Failed | Red badge with X, note field expanded | Stakeholder marks fail |
| Data Operation Pending | SQL preview shown, "Confirm" highlighted | AI generates SQL |
| Data Operation Complete | Success toast, state inspector refreshes | SQL executed |
| Branch Loading | Spinner on branch card, "Starting Expo..." | Branch preview initiated |

## Technical Design

### Architecture Overview

```
qa-studio/                          # Standalone Next.js app (sibling to troodie root)
  app/                              # Next.js App Router pages
    layout.tsx                      # Root layout with sidebar nav
    page.tsx                        # Dashboard
    features/[slug]/page.tsx        # Feature detail
    scenarios/[id]/page.tsx         # Scenario player
    data/page.tsx                   # Data control panel
    branches/page.tsx               # Branch preview
    runs/page.tsx                   # Run manager
    report/page.tsx                 # Report export
    api/                            # API routes (Next.js Route Handlers)
      runs/route.ts                 # POST: trigger run, GET: list runs
      runs/[id]/route.ts            # GET: run status, recordings
      sql/route.ts                  # POST: execute SQL via run-prod-sql.js
      sql/ai/route.ts               # POST: NL -> SQL via Claude API
      sql/state/route.ts            # GET: current test data state
      recordings/[id]/route.ts      # GET: video/screenshot URLs
      branches/route.ts             # POST: create branch preview
      guide/route.ts                # GET: parsed test guide data
      guide/[version]/route.ts      # GET: parsed guide for specific version
  lib/
    maestro.ts                      # Maestro CLI wrapper (run, record, parse flows)
    sql-runner.ts                   # Wraps scripts/run-prod-sql.js as a module
    guide-parser.ts                 # Parses STAKEHOLDER_TEST_GUIDE.md -> structured data
    flow-parser.ts                  # Parses Maestro YAML flows -> step metadata
    recording-index.ts              # Maps recordings to scenarios via takeScreenshot markers
    ai-sql.ts                       # Claude API integration for NL -> SQL
    branch-manager.ts               # Git worktree + Expo process management
    storage.ts                      # Cloud storage for recordings (Supabase Storage or S3)
  components/                       # React components (listed above)
  public/                           # Static assets
```

### No Database Schema Changes

QA Studio is a standalone tool. It does NOT modify the Troodie database schema. It stores its own state (runs, reviews, notes) in:
- **Local JSON files** (`qa-studio/.data/runs.json`, `reviews.json`) for MVP
- Optionally: a separate SQLite database or Supabase project for persistence

Test data operations use the existing `scripts/run-prod-sql.js` pathway — no new Supabase tables, no RLS changes.

### Key Services (Backend — Next.js API Routes)

| Service | File | Methods | Description |
|---------|------|---------|-------------|
| MaestroService | `lib/maestro.ts` | `runFlow()`, `runSuite()`, `recordFlow()`, `parseFlow()`, `listFlows()` | Wraps Maestro CLI. `recordFlow()` spawns `xcrun simctl recordVideo` alongside `maestro test`, kills recording when test completes, indexes screenshots as sync points. |
| SQLRunnerService | `lib/sql-runner.ts` | `executeSql()`, `executeFile()`, `queryState()` | Node.js port of `scripts/run-prod-sql.js` as an importable module. Uses same Supabase Management API auth (keychain token). |
| AISQLService | `lib/ai-sql.ts` | `generateSQL()`, `validateSQL()`, `explainSQL()` | Sends NL prompt + schema context to Claude API. Returns SQL + explanation. Schema context derived from `lib/supabase.ts` types and migration files. Includes safety guardrails (see Security section). |
| GuideParser | `lib/guide-parser.ts` | `parseGuide()`, `parseScenarios()`, `parseAccounts()` | Parses `STAKEHOLDER_TEST_GUIDE.md` format: extracts Gherkin blocks, account tables, feature sections. Returns structured JSON. |
| FlowParser | `lib/flow-parser.ts` | `parseYAML()`, `extractSteps()`, `extractScreenshots()` | Parses Maestro YAML flows. Extracts `takeScreenshot` markers with names, `tapOn`/`assertVisible` steps, comments. |
| RecordingIndex | `lib/recording-index.ts` | `indexRecording()`, `mapTimestamps()`, `getScreenshotAtStep()` | Maps video timestamps to Maestro flow steps. Uses screenshot filenames as sync points between video and flow YAML. |
| BranchManager | `lib/branch-manager.ts` | `createWorktree()`, `startExpo()`, `stopExpo()`, `listBranches()` | Creates git worktrees for branch isolation. Manages separate Expo dev server processes per branch. Uses Supabase branching for data isolation. |
| StorageService | `lib/storage.ts` | `uploadRecording()`, `getRecordingURL()`, `uploadScreenshot()` | Uploads recordings to Supabase Storage (new `qa-recordings` bucket) for remote stakeholder access. Falls back to local file serving. |

### Recording Strategy: `xcrun simctl recordVideo`

**Why this approach (over Maestro Cloud or ffmpeg):**
- `xcrun simctl recordVideo` is native to macOS, zero-dependency, captures the exact simulator output
- Maestro Cloud requires a paid subscription and moves execution off-machine
- `ffmpeg` screen capture would need window detection and is fragile across display configurations
- The existing `takeScreenshot` markers in all 20+ production flows provide natural sync points

**Recording pipeline:**
1. Start `xcrun simctl recordVideo <UDID> <output.mp4>` in background
2. Run `maestro test <flow.yaml>` — Maestro writes screenshots to `e2e/screenshots/`
3. When Maestro exits, send SIGINT to recording process (graceful stop)
4. Parse Maestro's output for screenshot timestamps (file modification times)
5. Build a `recording-index.json` mapping `{ screenshot_name -> video_timestamp_seconds }`
6. Upload video + screenshots + index to storage

### AI SQL Service Design

The NL -> SQL layer uses Claude API with these guardrails:

**System prompt context includes:**
- Full table schema from `lib/supabase.ts` Database types (auto-extracted)
- Test account mappings from `e2e/fixtures/prod-test-users-robust.json`
- Current test data state (queried via Management API)

**Safety layers:**
1. **Schema awareness** — AI only generates SQL for known tables/columns
2. **Preview always** — Generated SQL is shown to the user before execution
3. **Dry-run option** — `EXPLAIN` prefix for SELECTs to show query plan
4. **Scope restriction** — System prompt constrains to test data tables only (campaigns, campaign_deliverables, campaign_applications, creator_payouts, creator_ratings). Blocks mutations to `auth.users`, `users`, `restaurants`, or any non-test-data table
5. **Transaction wrapping** — All mutations wrapped in `BEGIN; ... COMMIT;` with rollback on error
6. **Audit log** — Every executed SQL + result stored in local log file

**Example interactions:**
```
User: "Reset Creator 1's deliverables on Sushi Special to pending"
AI SQL: UPDATE campaign_deliverables
        SET status = 'pending_review', workflow_stage = 'upload',
            content_file_url = NULL, proof_submitted_at = NULL
        WHERE creator_id = 'bb111111-1111-4111-b111-111111111111'
          AND application_id IN (
            SELECT id FROM campaign_applications
            WHERE campaign_id IN (
              SELECT id FROM campaigns WHERE title ILIKE '%sushi special%'
            )
          );
Explanation: Resets 3 deliverables for Foodie Lens on Sakura Sushi Bar's campaign.
Affected rows: 3
[Confirm & Execute]
```

### Branch Preview Design

Branch preview uses git worktrees + Expo multi-server:

1. **Git worktree** — `git worktree add /tmp/qa-studio-branches/<branch> <branch>` creates an isolated checkout
2. **Expo dev server** — Starts `npx expo start --port <dynamic>` in the worktree, with `EAS_BUILD_PROFILE=production`
3. **Supabase branching** — Uses Supabase's branch feature (`supabase branches create`) for data isolation, OR uses the same production DB with a "data snapshot + restore" pattern via the reset SQL scripts
4. **Simulator switching** — The developer points the simulator at the branch's Expo server (via QR code or URL scheme)
5. **Recording** — Same `xcrun simctl recordVideo` pipeline, tagged with branch name
6. **Comparison view** — Side-by-side video players: main vs branch, synced to the same flow steps

### Remote Access (Hosting)

The tool must be remotely accessible for stakeholders. Architecture:

**Option A: Deployed instance (recommended)**
- Deploy Next.js app to Vercel or a VPS
- Recordings stored in Supabase Storage (public bucket with signed URLs)
- API routes proxy SQL execution to dev machine via a lightweight WebSocket tunnel
- Stakeholder accesses `qa.troodie.dev` or similar

**Option B: Tunnel from dev machine**
- Dev runs QA Studio locally
- `ngrok` or `cloudflared tunnel` exposes localhost to a public URL
- Simpler setup, but requires dev machine to be running

**Recommended: Hybrid approach**
- Next.js app deployed to Vercel (always accessible, hosts recordings/screenshots/reports)
- SQL execution and Maestro runs happen on the dev machine, triggered via API and streamed back via WebSocket
- Dev machine connects to deployed app as a "runner agent" — when stakeholder clicks "Reset Data" or "Run Tests", the request routes to the connected dev machine

### Integration Points

- **`scripts/run-prod-sql.js`** — Ported to `lib/sql-runner.ts` as importable module (same Supabase Management API, same keychain auth)
- **`e2e/helpers/inject-session.sh`** — Ported to `lib/maestro.ts:injectSession()` for programmatic session injection before recordings
- **`e2e/helpers/run-v1016-demo.sh`** — Pattern replicated in `lib/maestro.ts:runSuite()` (seed -> inject -> run -> capture -> reset)
- **`testing/v1.0.16/STAKEHOLDER_TEST_GUIDE.md`** — Parsed by `lib/guide-parser.ts` to extract Gherkin scenarios, account tables, feature sections
- **`testing/v1.0.16/*/INDEX.md`** — Parsed to discover per-feature artifact manifests
- **`e2e/fixtures/prod-test-users-robust.json`** — Loaded for account display names, UUIDs, and AI SQL context
- **`e2e/flows/production/*.yaml`** — Parsed by `lib/flow-parser.ts` for step metadata and screenshot markers
- **Claude API** — For NL -> SQL generation in `lib/ai-sql.ts`

## Security

### Access Control

| Action | Developer | Stakeholder | Unauthenticated |
|--------|-----------|-------------|-----------------|
| View dashboard/recordings | Yes | Yes (via shared URL) | No |
| Trigger test runs | Yes | No | No |
| Execute SQL (pre-written reset/verify) | Yes | Yes (confirm required) | No |
| Execute AI-generated SQL | Yes | Yes (preview + confirm required) | No |
| Branch preview | Yes | View-only | No |
| Export report | Yes | Yes | No |

### Authentication

- Simple shared secret / password protection for the deployed instance
- No need for full user auth — this is an internal tool with 1-2 users
- API routes that execute SQL require an additional confirmation step

### AI SQL Safety

- **Table allowlist**: Only `campaigns`, `campaign_applications`, `campaign_deliverables`, `creator_payouts`, `creator_ratings`, `campaign_content` (storage)
- **Blocked operations**: `DROP`, `TRUNCATE`, `ALTER`, `CREATE`, any `auth.*` table access, any `DELETE` without `WHERE`
- **Blocked tables**: `auth.users`, `auth.identities`, `users`, `restaurants`, `posts`, `boards` — anything outside the test data domain
- **All mutations** show preview + require explicit "Confirm & Execute"
- **Audit log**: every query logged with timestamp, user, SQL, result

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| Maestro test crashes mid-recording | Recording saved up to crash point, marked as "incomplete" | SIGINT handler on simctl process, partial recording preserved |
| No booted simulator | Run Manager shows error: "No simulator found. Start one first." | Check `xcrun simctl list devices booted` before run |
| SQL execution timeout (>5min) | Show timeout error, suggest simplifying query | Same 300s timeout as `run-prod-sql.js` |
| AI generates unsafe SQL | Preview shows SQL with red warning badge, "Execute" button disabled | SQL validator checks against table allowlist before enabling confirm |
| Stale recording (data changed since record) | Show "Data may have changed since this recording" warning | Timestamp comparison between recording and last SQL mutation |
| Dev machine disconnects during remote SQL exec | Stakeholder sees "Runner disconnected" error | WebSocket heartbeat, auto-reconnect |
| Multiple simultaneous test runs | Queue system — one run at a time (single simulator) | Run Manager shows queue position |
| Large video files (>500MB) | Compress with ffmpeg before upload, or segment into per-scenario clips | Post-processing step after recording |
| Branch preview Expo port conflict | Auto-assign ports (3001, 3002, ...) per worktree | `startExpo()` scans for available ports |

## Error Handling

| Error Condition | User Message | Recovery Action |
|-----------------|--------------|-----------------|
| Maestro not installed | "Maestro CLI not found. Install it first." | Link to Maestro install docs |
| Supabase token expired | "Supabase auth expired. Run `npx supabase login`." | Re-auth prompt |
| Recording failed | "Recording failed: [reason]. Screenshots are still available." | Fall back to screenshot-only mode |
| AI SQL parse error | "Couldn't generate SQL. Try rephrasing." | Show error, keep input, suggest example prompts |
| SQL execution error | "SQL error: [postgres error message]" | Show full error, suggest fix, offer rollback |
| Guide parse error | "Couldn't parse test guide. Check Markdown format." | Show raw Markdown as fallback |
| Branch not found | "Branch [name] not found. Pull latest?" | Offer `git fetch` |
| Port conflict | "Port [N] in use. Using [N+1] instead." | Auto-fallback |

## Implementation Phases

### Phase 1: Foundation + Interactive Test Guide
**Goal**: Replace the PDF/Markdown stakeholder guide with a web-based interactive version. Stakeholders can view test scenarios, see screenshots from existing recordings, and mark pass/fail.

#### Tasks
- [ ] **Task 1.1**: Scaffold Next.js app in `qa-studio/` directory
  - Files: `qa-studio/package.json`, `qa-studio/tsconfig.json`, `qa-studio/app/layout.tsx`
  - Acceptance: `npm run dev` starts at localhost:3456
- [ ] **Task 1.2**: Build guide parser (`lib/guide-parser.ts`)
  - Files: `qa-studio/lib/guide-parser.ts`
  - Input: `testing/v1.0.16/STAKEHOLDER_TEST_GUIDE.md` format
  - Output: `{ features: [{ name, scenarios: [{ title, gherkin, account, campaign }] }] }`
  - Acceptance: Parses v1.0.16 guide into structured JSON
- [ ] **Task 1.3**: Build flow parser (`lib/flow-parser.ts`)
  - Files: `qa-studio/lib/flow-parser.ts`
  - Input: Maestro YAML files from `e2e/flows/production/`
  - Output: `{ steps: [{ type, target, screenshot?, comment? }] }`
  - Acceptance: Parses all 20+ production flows
- [ ] **Task 1.4**: Build Dashboard page + Feature Detail page
  - Files: `qa-studio/app/page.tsx`, `qa-studio/app/features/[slug]/page.tsx`
  - Acceptance: Dashboard shows v1.0.16 features, clicking one shows scenarios
- [ ] **Task 1.5**: Build Scenario view with screenshot gallery
  - Files: `qa-studio/app/scenarios/[id]/page.tsx`, `qa-studio/components/ScenarioPlayer.tsx`
  - Acceptance: Scenario view shows Gherkin steps + linked screenshots from `e2e/screenshots/`
- [ ] **Task 1.6**: Pass/fail + notes system with local persistence
  - Files: `qa-studio/lib/reviews.ts`, `qa-studio/components/ReviewControls.tsx`
  - Acceptance: Stakeholder can mark scenarios pass/fail with notes, persisted to `.data/reviews.json`
- [ ] **Task 1.7**: Report export page
  - Files: `qa-studio/app/report/page.tsx`
  - Acceptance: Shows aggregate results, exportable as PDF/HTML

### Phase 2: Recording Pipeline
**Goal**: Automatically record Maestro test runs as videos, indexed by scenario and step.

#### Tasks
- [ ] **Task 2.1**: Build Maestro wrapper (`lib/maestro.ts`)
  - Files: `qa-studio/lib/maestro.ts`
  - Methods: `runFlow()`, `recordFlow()`, `injectSession()`
  - Acceptance: `recordFlow()` spawns simctl recording + maestro test, produces indexed MP4
- [ ] **Task 2.2**: Build recording indexer (`lib/recording-index.ts`)
  - Files: `qa-studio/lib/recording-index.ts`
  - Acceptance: Maps `takeScreenshot` markers to video timestamps via file modification times
- [ ] **Task 2.3**: Build Run Manager page + API
  - Files: `qa-studio/app/runs/page.tsx`, `qa-studio/app/api/runs/route.ts`
  - Acceptance: Dev can trigger run from UI, see progress, view completed recordings
- [ ] **Task 2.4**: Build video player with step timeline
  - Files: `qa-studio/components/VideoPlayer.tsx`, `qa-studio/components/StepTimeline.tsx`
  - Acceptance: Video scrubs to correct position when clicking a step; steps highlight as video plays
- [ ] **Task 2.5**: Cloud storage integration for recordings
  - Files: `qa-studio/lib/storage.ts`
  - Acceptance: Recordings uploaded to Supabase Storage `qa-recordings` bucket, accessible via signed URLs

### Phase 3: AI Data Control
**Goal**: Enable natural language data manipulation with safety guardrails.

#### Tasks
- [ ] **Task 3.1**: Port `run-prod-sql.js` to importable module (`lib/sql-runner.ts`)
  - Files: `qa-studio/lib/sql-runner.ts`
  - Acceptance: Can execute SQL and return results programmatically
- [ ] **Task 3.2**: Build AI SQL service (`lib/ai-sql.ts`)
  - Files: `qa-studio/lib/ai-sql.ts`
  - Uses: Claude API with schema context from `lib/supabase.ts` types
  - Acceptance: "Reset Creator 1's deliverables to pending" -> valid SQL with correct UUIDs
- [ ] **Task 3.3**: Build Data Control Panel UI
  - Files: `qa-studio/app/data/page.tsx`, `qa-studio/components/DataControlPanel.tsx`, `qa-studio/components/AIChatInput.tsx`, `qa-studio/components/SQLPreview.tsx`
  - Acceptance: NL input -> SQL preview -> confirm -> execute -> state refresh
- [ ] **Task 3.4**: Build State Inspector
  - Files: `qa-studio/components/StateInspector.tsx`
  - Acceptance: Shows current state of test accounts, deliverables, campaigns in a readable table
- [ ] **Task 3.5**: Add quick-action buttons for existing SQL scripts
  - Files: `qa-studio/components/QuickActions.tsx`
  - Acceptance: "Reset v1.0.16 Data" button runs `testing/v1.0.16/reset-v1016-test-cases.sql`
- [ ] **Task 3.6**: SQL safety validator + audit log
  - Files: `qa-studio/lib/sql-validator.ts`, `qa-studio/lib/audit-log.ts`
  - Acceptance: Blocks `DROP`, `TRUNCATE`, auth table access. Logs all executions.

### Phase 4: Remote Access + Branch Preview
**Goal**: Deploy for remote stakeholder access. Enable branch comparison.

#### Tasks
- [ ] **Task 4.1**: Deploy Next.js app to Vercel
  - Files: `qa-studio/vercel.json`, environment config
  - Acceptance: Stakeholder can access dashboard at public URL
- [ ] **Task 4.2**: Build runner agent (dev machine <-> deployed app)
  - Files: `qa-studio/lib/runner-agent.ts`
  - Acceptance: Dev machine connects via WebSocket; remote SQL/Maestro requests route to dev machine
- [ ] **Task 4.3**: Simple auth layer (shared password)
  - Files: `qa-studio/middleware.ts`
  - Acceptance: Unauthenticated users see login prompt
- [ ] **Task 4.4**: Build Branch Manager (`lib/branch-manager.ts`)
  - Files: `qa-studio/lib/branch-manager.ts`
  - Acceptance: Create git worktree, start isolated Expo server, run tests against branch
- [ ] **Task 4.5**: Build Branch Preview UI
  - Files: `qa-studio/app/branches/page.tsx`, `qa-studio/components/BranchPreview.tsx`
  - Acceptance: Side-by-side video comparison of main vs branch for same scenario
- [ ] **Task 4.6**: WebSocket tunnel for SQL execution from deployed app
  - Files: `qa-studio/lib/tunnel.ts`
  - Acceptance: Stakeholder clicks "Reset Data" on deployed app -> executes on dev machine -> result shown

## Testing Requirements

### Unit Tests
- [ ] Guide parser correctly extracts Gherkin scenarios from `STAKEHOLDER_TEST_GUIDE.md`
- [ ] Flow parser correctly extracts steps and screenshot markers from Maestro YAML
- [ ] SQL validator blocks disallowed operations and tables
- [ ] Recording indexer maps screenshot timestamps to video positions

### Integration Tests
- [ ] Full recording pipeline: inject session -> maestro test -> simctl record -> index
- [ ] SQL execution round-trip: NL input -> AI SQL -> preview -> confirm -> execute -> state update
- [ ] Guide parser + flow parser produce consistent scenario IDs for linking

### Manual Testing
- [ ] Stakeholder walkthrough: open URL, view features, watch recording, mark pass/fail, export report
- [ ] Data manipulation: reset via quick action, modify via NL, verify state inspector updates
- [ ] Branch preview: create worktree, run tests, compare side-by-side

## Acceptance Criteria

- [ ] Stakeholder can access QA Studio from a browser without installing anything
- [ ] Dashboard shows all features for a version with pass/fail summary
- [ ] Each scenario has a video recording with step-by-step timeline navigation
- [ ] Stakeholder can mark each scenario pass/fail with optional notes
- [ ] Report page shows aggregate results, exportable
- [ ] Data Control Panel executes pre-written SQL scripts (reset, verify) via button click
- [ ] AI chat generates valid SQL from natural language, with preview and confirmation
- [ ] AI SQL is restricted to test data tables only (campaigns, deliverables, applications, payouts, ratings)
- [ ] Branch preview shows side-by-side comparison of main vs feature branch
- [ ] All recordings are accessible remotely (not just on dev machine)
- [ ] Tool integrates with existing Troodie testing infrastructure without modifying the mobile app
