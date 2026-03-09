# Stakeholder Questions: Video Replay & Visual Walkthrough

> Feature: qa-studio-video-replay
> Spec: `specs/features/qa-studio-video-replay/spec.md`
> Created: 2026-03-02

## Priority Questions (Blocking)

These MUST be answered before implementation can begin.

### Q1: Which transition style should the animated walkthrough use?
- **Context**: The `AnimatedWalkthrough` component needs to transition between screenshots. The existing `VideoPlayer` uses continuous video, so there's no precedent for frame transitions in the codebase.
- **Options**:
  - A) Cross-fade (opacity transition) — Simpler, feels like a slideshow, easy to implement with CSS
  - B) Slide (left-to-right) — Mimics mobile screen navigation, feels more app-like, slightly more complex
  - C) Both, with a toggle — Maximum flexibility but more UI complexity and code to maintain
- **AI Recommendation**: A) Cross-fade. Simpler to implement, works universally, and avoids implying directional navigation that may not match the actual app flow. Slide can be added in Phase 3 if stakeholders want it.
- **Answer**: **A) Cross-fade.** Simpler to implement, works universally. Slide can be added later if stakeholders want it.

### Q2: Should the walkthrough auto-play when the scenario page loads?
- **Context**: Stakeholders visit scenario pages to review test results. The current `ScreenshotGallery` is static — the user manually clicks through thumbnails. Auto-play would be more engaging but could be distracting on repeat visits.
- **Options**:
  - A) Auto-play on first visit, remember preference — Uses localStorage to track if the user has seen this scenario before
  - B) Never auto-play — User always clicks Play to start. Less surprising.
  - C) Always auto-play — Walkthrough starts immediately on page load. Most engaging.
- **AI Recommendation**: B) Never auto-play. Stakeholders reviewing multiple scenarios will find auto-play disruptive. A prominent Play button overlay (like YouTube) makes the affordance clear without being pushy.
- **Answer**: **B) Never auto-play.** User always clicks Play to start. A prominent Play button overlay makes the affordance clear without being pushy.

### Q3: Should this be Phase 1 only or Phase 1 + Phase 2?
- **Context**: Phase 1 (animated slideshow) is a pure client-side feature that works with existing screenshots — ~2-3 days of work. Phase 2 (simulator video recording) requires a shell script wrapper, recording index generation, and video serving — ~3-5 additional days. Phase 2 also only works locally (macOS + Xcode simulator).
- **Options**:
  - A) Phase 1 only — Ship the animated slideshow, evaluate feedback before building Phase 2
  - B) Phase 1 + Phase 2 together — Build both now for a complete experience
  - C) Phase 1 now, Phase 2 later as a separate feature — Groom Phase 2 separately when ready
- **AI Recommendation**: A) Phase 1 only. The animated slideshow delivers 80% of the value with 30% of the effort. Phase 2's simulator recording is only useful for local developers and can be groomed separately once the screenshot infrastructure is stable.
- **Answer**: **B) All 3 phases.** Build the animated slideshow (Phase 1), simulator recording integration (Phase 2), and enhanced experience (Phase 3) together for a complete experience.

## Design Tradeoffs (Affects Scope)

These have sensible defaults but stakeholder input is valuable.

### Q4: Default frame duration (how long each screenshot displays)?
- **Context**: The walkthrough auto-advances frames on a timer. Too fast and stakeholders can't read the screen; too slow and the walkthrough feels sluggish. Speed control (1x/2x/3x) lets users adjust, but the default matters.
- **Options**:
  - A) 3 seconds — Quick pace, good for overview
  - B) 4 seconds — Medium pace, time to scan the screen
  - C) 5 seconds — Slow pace, time to read details
- **AI Recommendation**: B) 4 seconds at 1x speed. With speed control, users can go 2s (2x) or 8s (0.5x).
- **Default if unanswered**: 4 seconds per frame at 1x speed
- **Answer**: **B) 4 seconds** (default accepted). With speed control, users can go 2s (2x) or 8s (0.5x).

### Q5: Should the scenario page convert to a Client Component?
- **Context**: The current `scenarios/[id]/page.tsx` is a Server Component that fetches data server-side. The walkthrough needs client-side state (active frame, active tab, play state). Two approaches: (A) convert the whole page to a Client Component, or (B) keep the page as a Server Component and extract the interactive section into a `ScenarioInteractiveContent` client component that receives data as props.
- **Options**:
  - A) Convert to Client Component — Simpler but loses SSR benefits for static content
  - B) Extract client wrapper — More idiomatic Next.js, keeps SSR for header/breadcrumb/account info
- **AI Recommendation**: B) Extract client wrapper. Keeps the page Server Component for SEO and initial load performance. The interactive walkthrough + Gherkin section becomes a `ScenarioMediaPanel` client component.
- **Default if unanswered**: B) Extract client wrapper
- **Answer**: **B) Extract client wrapper** (default accepted). Keeps SSR for header/breadcrumb, interactive section becomes a `ScenarioMediaPanel` client component.

## Nice-to-Know (Non-blocking)

These provide helpful context but won't block implementation.

### Q6: Is frame annotation/commenting on the roadmap?
- **Context**: The idea spec mentions stakeholders leaving comments tied to specific frames (e.g., "this screen looks wrong at step 3"). This would require comment storage, threading, and notifications — significant additional scope. It's listed as Phase 3, Task 3.3.
- **Answer**: _pending_

### Q7: Should walkthroughs be shareable via URL with a specific frame?
- **Context**: A URL like `/scenarios/[id]?frame=3` could deep-link to a specific screenshot in the walkthrough, useful for pointing teammates to exact moments. This is easy to add (URL query params + useSearchParams) but adds edge cases.
- **Answer**: _pending_

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve qa-studio-video-replay Q1: [answer] Q2: [answer] Q3: [answer]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
