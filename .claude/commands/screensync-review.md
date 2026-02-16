# ScreenSync AI — PRD Validation Interview

You are reviewing the ScreenSync AI PRD — a Git-driven, AI-powered Product Documentation Engine that auto-generates visual + contextual documentation from a React Native app into Figma + Notion.

## Context

ScreenSync AI is a CI-integrated documentation pipeline that:
- Captures screenshots of updated React Native screens via Maestro
- Generates structured release documentation via Claude API
- Syncs visual artifacts into Figma (screenshot embedding)
- Publishes release intelligence to Notion
- Triggers on release tags
- Runs entirely in GitHub Actions

## Interview Flow

Conduct a 4-round structured interview using AskUserQuestion to validate these critical areas:

### Round 1 — App & Team Context
1. App maturity (screen count, shipping cadence, current documentation pain)
2. Primary documentation consumer (engineers, PMs, stakeholders, all)
3. MVP scope (screenshots only, Notion only, full pipeline, change detection only)
4. Existing E2E testing infrastructure (Detox, Maestro, none, basic CI only)

### Round 2 — Architecture Decisions
1. Figma approach (embed screenshots vs AI-rebuilt components vs hybrid vs skip)
2. Documentation trigger (every PR merge, release tags, label-based, hybrid)
3. Screen map maintenance (manual JSON, auto-detect navigation, Maestro flows, git diff)
4. AI runtime (Claude API, OpenAI, local LLM, Claude Code in CI)

### Round 3 — Integration Details
1. Notion workspace readiness (existing organized, existing messy, new, flexible)
2. Platform scope (iOS only, both always, iOS primary + Android on release, platform-specific)
3. Dynamic content handling (mock all, staging, mix, already handled in Maestro)
4. Infrastructure preference (GitHub Actions only, +AWS, +Supabase, self-hosted)

### Round 4 — Scope & Strategy
1. Version Intelligence Layer timing (Day 1, Phase 2, investor summaries only, skip)
2. Bootstrap strategy for existing screens (full baseline, start fresh, incremental, manual seed)
3. Budget tolerance for API costs (<$50/mo, $50-200/mo, unlimited, need estimates)
4. Distribution model (internal, open-source Day 1, internal then open-source, SaaS)

## After Interview

Produce a validated direction summary with:
- Decision table mapping each question to the user's choice
- PRD refinements (add, remove, change, defer)
- Recommended phase plan
- Cost estimation requirements
- Risk register with mitigations
