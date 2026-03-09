# Stakeholder Questions: QA Studio — Interactive Testing

> Feature: qa-studio-interactive-testing
> Spec: `specs/features/qa-studio-interactive-testing/spec.md`
> Created: 2026-02-25

## Priority Questions (Blocking)

These MUST be answered before implementation can begin.

### Q1: Hosting model — local-only or remotely accessible?
- **Context**: Remote access eliminates the "install TestFlight" friction but adds auth/hosting complexity.
- **Options**:
  - A) Local-only dev tool (localhost) — simplest, but stakeholder needs dev to share screen
  - B) Remotely accessible — stakeholder visits a URL, no install needed
- **AI Recommendation**: B — the whole point is reducing stakeholder friction
- **Answer**: Remotely accessible for stakeholders. Implemented as hybrid: Next.js deployed to Vercel for UI/recordings, dev machine as "runner agent" via WebSocket for SQL/Maestro execution.

### Q2: Video recording approach?
- **Context**: Maestro has limited native recording. Three options evaluated.
- **Options**:
  - A) `xcrun simctl recordVideo` — native macOS, zero-dependency, captures exact simulator output
  - B) Maestro Cloud — built-in recording, but requires paid subscription and moves execution off-machine
  - C) `ffmpeg` screen capture — needs window detection, fragile across display configs
- **AI Recommendation**: A — `xcrun simctl recordVideo`. Native, reliable, free. Existing `takeScreenshot` markers in all 20+ production flows provide natural sync points for video indexing.
- **Answer**: Engineer's choice. Recommendation accepted: `xcrun simctl recordVideo` with `takeScreenshot` markers as sync points.

### Q3: AI data manipulation scope?
- **Context**: Options range from pre-written scripts only (safe) to arbitrary NL->SQL (powerful but risky).
- **Options**:
  - A) Pre-written reset/verify scripts only — safe, limited
  - B) Natural language -> arbitrary SQL — powerful, needs guardrails
- **AI Recommendation**: B with guardrails (table allowlist, preview+confirm, audit log)
- **Answer**: Natural language -> arbitrary SQL. Full power with safety guardrails: table allowlist (campaigns, deliverables, applications, payouts, ratings only), SQL preview before execution, audit log, blocked operations (DROP, TRUNCATE, auth tables).

### Q4: MVP scope — phased or everything?
- **Context**: Full vision is ambitious (4 phases). Could start with recording + guide only.
- **Options**:
  - A) MVP: Recording Playback + Interactive Test Guide only
  - B) Full: All four capabilities (recording, guide, AI data, branch preview)
- **AI Recommendation**: A for faster time-to-value, then iterate
- **Answer**: Everything. All four phases will be implemented: Recording Playback, Interactive Test Guide, AI Data Control, and Branch Preview.

### Q5: Tech stack?
- **Context**: Affects shareability and development speed.
- **Options**:
  - A) Next.js — full-featured, easy Vercel deploy, good for remote access
  - B) Electron — native desktop feel, but harder to share remotely
  - C) Express + vanilla HTML — lightweight, but more manual UI work
- **AI Recommendation**: A — Next.js, aligns with remote access requirement
- **Answer**: Next.js.

## Design Tradeoffs (Affects Scope)

### Q6: Recording storage — local files or cloud?
- **Context**: Recordings can be 100-500MB per run. Local is simpler but not remotely accessible.
- **Options**:
  - A) Local files served by dev machine — simplest, requires dev machine running
  - B) Supabase Storage bucket — remote access, but upload time and storage costs
  - C) S3/R2 — cheaper storage, more setup
- **AI Recommendation**: B — Supabase Storage (already integrated, new `qa-recordings` bucket)
- **Default if unanswered**: B — Supabase Storage
- **Answer**: Using default (B — Supabase Storage).

### Q7: Authentication for deployed instance?
- **Context**: Need some auth to prevent public access, but this is a 1-2 person internal tool.
- **Options**:
  - A) Shared password (simple env var)
  - B) Vercel Auth / NextAuth with Google SSO
  - C) No auth (rely on obscure URL)
- **AI Recommendation**: A — shared password. Minimal friction for internal tool.
- **Default if unanswered**: A — shared password
- **Answer**: Using default (A — shared password).

### Q8: How should the branch preview create data isolation?
- **Context**: Branch preview needs its own test data to avoid polluting the main test state.
- **Options**:
  - A) Supabase branching (native feature) — true isolation, but adds Supabase branch management
  - B) Snapshot + restore via SQL scripts — use existing reset scripts, simpler but shared DB
  - C) Separate Supabase project for testing — full isolation, but significant setup
- **AI Recommendation**: B for MVP (snapshot + restore), upgrade to A if it becomes a problem
- **Default if unanswered**: B — snapshot + restore
- **Answer**: Using default (B — snapshot + restore via SQL scripts).

## Nice-to-Know (Non-blocking)

### Q9: Will there be more than one stakeholder reviewer at a time?
- **Context**: Affects whether we need multi-user state (separate pass/fail per reviewer) or single shared state.
- **Answer**: _pending_ — defaulting to single shared state for now.

### Q10: Should recordings persist across versions or be ephemeral?
- **Context**: Keeping all recordings from all versions could use significant storage. Could auto-purge after N days.
- **Answer**: _pending_ — defaulting to keeping last 3 versions, auto-purging older.

---

## How to Approve

All Priority Questions have been answered. Spec is **APPROVED**.

To begin implementation:
```
/execute qa-studio-interactive-testing
```
