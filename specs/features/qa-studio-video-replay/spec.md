# Video Replay & Visual Walkthrough Technical Specification

> Status: APPROVED
> Created: 2026-03-02
> Source: idea: specs/ideas/qa-studio-video-replay.md
> Feature: qa-studio-video-replay

## Overview

Add animated visual walkthroughs to QA Studio scenario pages, allowing stakeholders to watch test journeys unfold frame-by-frame instead of studying disconnected static screenshots. Phase 1 builds a client-side animated slideshow using cross-fade transitions from existing screenshots with Gherkin step synchronization. Phase 2 adds simulator video recording for higher-fidelity playback. Phase 3 adds polish features like slide transitions, fullscreen mode, and frame annotation.

## Problem Statement

Stakeholders reviewing Troodie test scenarios in QA Studio currently see static screenshots alongside Gherkin test steps. There is no way to watch the user journey unfold. A stakeholder reviewing a 7-step scenario sees 4 disconnected images and must mentally reconstruct the transitions between them. This causes:

- Slow comprehension of what the test actually validates
- Missed regressions in transitions, animations, and loading states
- Vague feedback ("looks fine in the screenshot but broken in practice")
- Dependency on live demos or local simulator access for thorough review

## User Stories

- As a stakeholder, I want to watch an animated walkthrough of a test scenario so that I can understand the user journey without needing a simulator
- As a stakeholder, I want to click a Gherkin step and see the corresponding screenshot so that I can verify specific behaviors
- As a stakeholder, I want to control playback speed and pause at specific frames so that I can examine details
- As a developer, I want to compare walkthroughs between branches so that I can visually catch regressions
- As a developer, I want to toggle between static gallery, animated walkthrough, and full video so that I can choose the best view for my needs

## User Experience

### Screens & Views

| Screen | Purpose | Entry Points | Users |
|--------|---------|--------------|-------|
| Scenario Detail (updated) | Animated walkthrough + step sync | Dashboard → Feature → Scenario | Stakeholders, Developers |

### User Flows

1. **Stakeholder Reviews Scenario Walkthrough**
   - Step 1: Navigate to scenario page → See animated walkthrough auto-displayed (or static gallery if no screenshots)
   - Step 2: Click "Play" → Screenshots cross-fade on a timer with step sync
   - Step 3: Click a Gherkin step → Walkthrough jumps to the corresponding screenshot
   - Step 4: Adjust speed / pause / step through frames manually

2. **Developer Toggles View Modes**
   - Step 1: View scenario page → See default walkthrough mode
   - Step 2: Click "Gallery" tab → See static thumbnail gallery (current behavior)
   - Step 3: Click "Video" tab (if recording available) → See full video player with timeline

### Components

- [ ] `AnimatedWalkthrough` — Client-side slideshow player. Props: `screenshots`, `stepSync`, `perspective`. Controls: play/pause, prev/next, speed (1x/2x/3x), progress bar
- [ ] `VisualMediaTabs` — Tab switcher for Gallery | Walkthrough | Video. Conditionally shows Video tab only when recording exists
- [ ] `StepScreenshotSync` — Data layer mapping Gherkin step indices to screenshot indices. Uses existing `scenario-screenshots.ts` mappings

### States

| State | Visual | Trigger |
|-------|--------|---------|
| Loading | Skeleton with shimmer | Page load, fetching screenshot data |
| No Screenshots | Gray dashed border with message | Scenario has no screenshots mapped |
| Slideshow Ready | First screenshot displayed with play button overlay | Screenshots loaded successfully |
| Playing | Cross-fade transitions between frames, progress bar advancing | User clicks play |
| Paused | Current frame displayed, pause icon, frame counter | User clicks pause or frame |
| Video Available | "Video" tab enabled with indicator badge | Recording file exists for scenario |

## Technical Design

### New Components (QA Studio — `troodie-qa-studio/`)

#### `components/AnimatedWalkthrough.tsx`

Client-side animated slideshow component.

```typescript
interface AnimatedWalkthroughProps {
  screenshots: ScreenshotInfo[];
  perspective: 'creator' | 'business' | null;
  description: string | null;
  stepSync?: StepScreenshotMap;
  onFrameChange?: (index: number) => void;
}
```

Features:
- CSS cross-fade transitions between screenshots (opacity transition, ~300ms duration)
- Play/pause, prev/next frame, speed selector (1x, 2x, 3x)
- Default frame duration: 4 seconds at 1x speed
- Progress bar showing current frame position
- Frame counter ("3 of 8")
- Keyboard shortcuts: Space (play/pause), Left/Right (prev/next)
- No auto-play — prominent Play button overlay (YouTube-style) on initial load
- Auto-pause when user interacts with Gherkin steps
- `onFrameChange` callback to sync with `GherkinStepList`

Reuses patterns from existing `VideoPlayer.tsx`:
- Same control bar layout (orange progress bar, dark background)
- Same speed cycling approach
- Same fullscreen toggle

#### `components/VisualMediaTabs.tsx`

Tab switcher between viewing modes.

```typescript
interface VisualMediaTabsProps {
  hasScreenshots: boolean;
  hasRecording: boolean;
  activeTab: 'gallery' | 'walkthrough' | 'video';
  onTabChange: (tab: string) => void;
}
```

- "Gallery" — always available when screenshots exist (current `ScreenshotGallery`)
- "Walkthrough" — available when 2+ screenshots exist (new `AnimatedWalkthrough`)
- "Video" — available when a recording exists for the scenario
- Default tab: "Walkthrough" if screenshots exist, "Gallery" if only 1, "Video" if only video

#### `lib/step-screenshot-sync.ts`

Maps Gherkin step indices to screenshot frame indices.

```typescript
interface StepScreenshotMap {
  /** Gherkin step index → screenshot frame index */
  stepToFrame: Record<number, number>;
  /** Screenshot frame index → Gherkin step index */
  frameToStep: Record<number, number>;
}

function buildStepScreenshotSync(
  scenarioId: string,
  gherkinLines: string[]
): StepScreenshotMap;
```

Uses heuristic mapping:
- Gherkin "Given I am logged in" → first screenshot (home/login)
- Gherkin "When I navigate to X" → screenshot matching navigation target
- Gherkin "Then I should see X" → screenshot matching verification target
- Falls back to even distribution if heuristic fails

#### Update: `components/GherkinStepList.tsx`

Add `onStepClick` and `activeStep` props:

```typescript
interface Props {
  gherkin: string;
  onStepClick?: (stepIndex: number) => void;
  activeStep?: number | null;
}
```

- Highlight the active step (orange left border + light background)
- Click handler on each step line
- Smooth scroll active step into view

#### Update: `app/scenarios/[id]/page.tsx`

Replace the current direct `ScreenshotGallery` usage with `VisualMediaTabs` + conditional rendering:

```tsx
{/* Visual Walkthrough Section */}
<VisualMediaTabs hasScreenshots={...} hasRecording={...} activeTab={...} onTabChange={...} />

{activeTab === 'walkthrough' && <AnimatedWalkthrough ... onFrameChange={setActiveFrame} />}
{activeTab === 'gallery' && <ScreenshotGallery ... />}
{activeTab === 'video' && <VideoPlayer ... />}

{/* Gherkin steps with sync */}
<GherkinStepList gherkin={...} onStepClick={handleStepClick} activeStep={activeStep} />
```

The page remains a Server Component for SSR benefits (header, breadcrumb, account info). The interactive section is extracted into a `ScenarioMediaPanel` client component that receives scenario data as props.

### Phase 2: Simulator Recording Integration

#### `scripts/record-walkthrough.sh` (Troodie repo)

Wrapper around `qa-screenshots.js` that simultaneously records the simulator screen:

```bash
#!/bin/bash
# Start recording
xcrun simctl io booted recordVideo --codec h264 "$OUTPUT_DIR/walkthrough.mp4" &
RECORD_PID=$!

# Run screenshot capture
node scripts/qa-screenshots.js "$@"

# Stop recording
kill -INT $RECORD_PID
wait $RECORD_PID
```

#### Update: `lib/recording-index.ts`

Extend `buildIndex` to support deep-link-based timing. The existing implementation already handles screenshot file modification times relative to recording start — no code change needed, just a new call pattern:

```typescript
// Build index from deep-link walkthrough recording
const index = buildIndex(
  'walkthrough.mp4',
  'qa-screenshots/',
  fakeFlowMetadata  // Built from manifest screenshots
);
```

#### New API: `GET /api/recordings/[id]/video`

Check if a recording exists for a scenario and return its URL. Extend the existing `/api/recordings/[id]` route to include `hasRecording` and `videoUrl` fields.

#### Update: Scenario page Video tab

Wire the existing `VideoPlayer` + `StepTimeline` components into the Video tab of `VisualMediaTabs`. When a recording exists, the Video tab becomes available with full step-synced playback.

### Phase 3: Enhanced Experience

#### Slide transition mode

Add a toggle in `AnimatedWalkthrough` to switch between cross-fade (default) and slide (left-to-right) transitions. Slide mimics mobile screen navigation and feels more app-like.

#### Fullscreen walkthrough mode

Add a fullscreen button that expands the walkthrough to fill the viewport. Reuse the fullscreen pattern from existing `VideoPlayer.tsx`.

#### Frame annotation/comments

Allow stakeholders to leave comments tied to specific frames. Requires:
- `components/FrameAnnotation.tsx` — Comment input anchored to frame index
- `app/api/annotations/route.ts` — CRUD API for annotations
- Persistence in `.data/annotations.json` (local) or Supabase (remote)
- Notification when annotations are added

### Navigation Changes

None — the feature integrates into the existing scenario detail page (`/scenarios/[id]`).

### Integration Points

None — the feature integrates into the existing scenario detail page (`/scenarios/[id]`).

### Integration Points

- `scenario-screenshots.ts` — Source of screenshot mappings per scenario (existing)
- `recording-index.ts` — Step-to-video timestamp mapping (existing, Phase 2)
- `VideoPlayer.tsx` — Full video player with step sync (existing, Phase 2)
- `StepTimeline.tsx` — Interactive step timeline (existing, Phase 2)
- `ScreenshotGallery.tsx` — Static gallery (existing, becomes one tab)
- `GherkinStepList.tsx` — Gherkin display (existing, add click + active step)
- `maestro.ts` — `recordFlow()` with simctl recording (existing, Phase 2 reference)
- `storage.ts` — Supabase Storage upload for recordings (existing, Phase 2)
- `qa-screenshots.js` — Screenshot capture script (existing, Phase 2 wraps it)

## Security

No security concerns — this feature only reads existing screenshot files and serves them through existing authenticated API routes. No new data is written, no new access patterns introduced.

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| Scenario with 0 screenshots | Show "No screenshots" empty state (no walkthrough tab) | `VisualMediaTabs` hides Walkthrough tab |
| Scenario with 1 screenshot | Show Gallery only (no walkthrough) | Walkthrough needs 2+ frames |
| Broken screenshots filtered | Walkthrough plays only valid screenshots | Existing `isBrokenScreenshot()` filtering |
| No step-to-screenshot mapping | Even distribution of frames to steps | Heuristic fallback in `step-screenshot-sync.ts` |
| Slow network loading images | Show skeleton/placeholder per frame | Image preloading in `AnimatedWalkthrough` |
| Video file missing | Hide Video tab entirely | Conditional tab rendering in `VisualMediaTabs` |
| Remote mode (deployed, no local files) | Walkthrough works (screenshots served via API) | Uses existing `/api/screenshots/[name]` |

## Error Handling

| Error Condition | User Message | Recovery Action |
|-----------------|-------------|-----------------|
| Screenshot API returns 404 | "Screenshots not available" | Show empty state, hide walkthrough |
| Image fails to load mid-slideshow | Skip frame, show next | Track failed frames, note in frame counter |
| Video file corrupted | "Recording unavailable" | Hide Video tab, fall back to walkthrough |

## Implementation Phases

### Phase 1: Animated Screenshot Walkthrough (MVP)
**Goal**: Stakeholders can watch an animated walkthrough of any scenario with 2+ screenshots, synced to Gherkin steps.

#### Tasks
- [ ] **Task 1.1**: Create `AnimatedWalkthrough` component
  - Files: `troodie-qa-studio/components/AnimatedWalkthrough.tsx`
  - Acceptance: Displays screenshots with cross-fade transitions, play/pause/speed controls, frame counter
- [ ] **Task 1.2**: Create `step-screenshot-sync.ts` mapping
  - Files: `troodie-qa-studio/lib/step-screenshot-sync.ts`
  - Acceptance: Maps Gherkin step indices to screenshot frame indices for all 12 v1.0.16 scenarios
- [ ] **Task 1.3**: Add `onStepClick` and `activeStep` to `GherkinStepList`
  - Files: `troodie-qa-studio/components/GherkinStepList.tsx`
  - Acceptance: Clicking a Gherkin step emits index; active step highlighted with orange border
- [ ] **Task 1.4**: Create `VisualMediaTabs` component
  - Files: `troodie-qa-studio/components/VisualMediaTabs.tsx`
  - Acceptance: Renders Gallery/Walkthrough/Video tabs, conditionally shows based on available media
- [ ] **Task 1.5**: Integrate walkthrough into scenario page
  - Files: `troodie-qa-studio/app/scenarios/[id]/page.tsx` (extract client wrapper)
  - Acceptance: Scenario page shows tabbed view with walkthrough as default, Gherkin steps sync with active frame
- [ ] **Task 1.6**: Image preloading and keyboard shortcuts
  - Files: `troodie-qa-studio/components/AnimatedWalkthrough.tsx`
  - Acceptance: All images preloaded before playback, Space/Arrow keys work, smooth transitions

### Phase 2: Simulator Recording Integration
**Goal**: Developers can generate full video walkthroughs from the deep link screenshot script, viewable in QA Studio with step-synced playback.
**Depends on**: Phase 1

#### Tasks
- [ ] **Task 2.1**: Create `record-walkthrough.sh` wrapper script
  - Files: `troodie/scripts/record-walkthrough.sh`
  - Acceptance: Wraps `qa-screenshots.js` with `xcrun simctl recordVideo`, produces MP4 + timestamps
- [ ] **Task 2.2**: Build recording index from deep-link timestamps
  - Files: `troodie-qa-studio/lib/recording-index.ts` (extend usage pattern)
  - Acceptance: Generates `RecordingIndex` from screenshot mtimes relative to video birthtime
- [ ] **Task 2.3**: Add video detection to recordings API
  - Files: `troodie-qa-studio/app/api/recordings/[id]/route.ts`
  - Acceptance: API response includes `hasRecording: true` and `videoUrl` when recording exists
- [ ] **Task 2.4**: Wire Video tab to existing `VideoPlayer` + `StepTimeline`
  - Files: `troodie-qa-studio/app/scenarios/[id]/page.tsx`, `troodie-qa-studio/components/ScenarioMediaPanel.tsx`
  - Acceptance: Video tab plays recording with step-synced timeline using existing components
- [ ] **Task 2.5**: Add npm scripts for recording workflow
  - Files: `troodie/package.json`
  - Acceptance: `npm run test:record` wraps screenshot capture + video recording

### Phase 3: Enhanced Experience
**Goal**: Polish and advanced features based on stakeholder feedback.
**Depends on**: Phase 1

#### Tasks
- [ ] **Task 3.1**: Slide transition mode (left-to-right, mimicking navigation)
  - Files: `troodie-qa-studio/components/AnimatedWalkthrough.tsx`
  - Acceptance: Toggle between cross-fade and slide transitions in control bar
- [ ] **Task 3.2**: Fullscreen walkthrough mode
  - Files: `troodie-qa-studio/components/AnimatedWalkthrough.tsx`
  - Acceptance: Fullscreen button expands walkthrough to fill viewport, Esc exits
- [ ] **Task 3.3**: Frame-specific URL deep linking
  - Files: `troodie-qa-studio/app/scenarios/[id]/page.tsx`, `troodie-qa-studio/components/ScenarioMediaPanel.tsx`
  - Acceptance: URL like `/scenarios/[id]?frame=3` loads walkthrough at frame 3, share button copies URL
- [ ] **Task 3.4**: Frame annotation/comments
  - Files: `troodie-qa-studio/components/FrameAnnotation.tsx` (new), `troodie-qa-studio/app/api/annotations/route.ts` (new), `troodie-qa-studio/.data/annotations.json`
  - Acceptance: Stakeholders can leave comments tied to specific frames, visible on hover/click

## Testing Requirements

### Manual Testing
- [ ] Navigate to each v1.0.16 scenario page and verify walkthrough displays correctly
- [ ] Test play/pause/speed controls
- [ ] Test Gherkin step click → frame jump
- [ ] Test frame change → Gherkin step highlight
- [ ] Test keyboard shortcuts (Space, Left, Right)
- [ ] Test with scenarios that have 0, 1, 2+, and 8+ screenshots
- [ ] Test tab switching between Gallery, Walkthrough, Video

### E2E Tests (Playwright)
- [ ] Scenario page loads with walkthrough as default tab
- [ ] Play button starts auto-advancing frames
- [ ] Clicking Gherkin step updates displayed frame

## Acceptance Criteria

- [ ] Animated walkthrough plays smoothly through all screenshots for a scenario
- [ ] Play/pause, prev/next, speed controls work correctly
- [ ] Clicking a Gherkin step jumps the walkthrough to the corresponding frame
- [ ] Advancing frames highlights the corresponding Gherkin step
- [ ] Gallery view (current behavior) is still accessible via tab
- [ ] Scenarios with 0-1 screenshots show appropriate fallback (no walkthrough tab)
- [ ] Works in both local and remote (deployed) modes
- [ ] Perspective badge (Creator/Business) shows on walkthrough view
