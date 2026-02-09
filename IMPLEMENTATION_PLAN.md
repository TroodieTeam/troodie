# Implementation Plan: Creator Marketplace Name Fix

> Generated from spec: `specs/features/creator-marketplace-name-fix/spec.md`
> Created: 2026-02-09

## Overview

Fix the Browse Creators screen and creator profile views to show the creator's real name instead of the hardcoded "Creator" fallback. Fallback chain: display_name → users.name → username (bold) → "Unknown Creator".

## Progress Tracking

See `PROGRESS.md` for current task status.

## Phases

### Phase 1: Fix Creator Name Display (MVP — single phase)

**Goal**: Creator's real name shown in bold, username in grey, no more "Creator" fallback

#### Tasks

- [ ] **Task 1.1**: Update `transformCreator()` fallback in `creatorDiscoveryService.ts`
  - Description: Change hardcoded "Creator" fallback to "Unknown Creator"
  - Files: `services/creatorDiscoveryService.ts:247`
  - Tests: typecheck, lint
  - Acceptance: `transformCreator` uses "Unknown Creator" as final fallback

- [ ] **Task 1.2**: Update Browse Creators user data fetch and displayName fallback chain
  - Description: Fetch `name` alongside `username` from users table; build proper fallback chain; when username promoted to bold, hide grey @username to avoid duplication
  - Files: `app/(tabs)/business/creators/browse.tsx:371,393-397`
  - Tests: typecheck, lint
  - Acceptance: Creators with `users.name` show their real name; creators with only username show username in bold with no grey duplicate

- [ ] **Task 1.3**: Update `getCreatorProfile()` fallback
  - Description: Change final fallback from "Creator" to "Unknown Creator"
  - Files: `services/creatorDiscoveryService.ts:460`
  - Tests: typecheck, lint
  - Acceptance: Creator profile screen shows consistent "Unknown Creator" fallback

- [ ] **Task 1.4**: Validation and testing artifacts
  - Description: Run full validation suite, generate manual test script and verification SQL
  - Files: `testing/manual/`, `testing/sql/`
  - Tests: typecheck, lint, test
  - Acceptance: All validation passes, testing artifacts created

## Validation Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm test
```

## Notes

- No database migration needed — the RPC `get_creators()` already does COALESCE correctly
- The fix is purely client-side fallback handling
- Q1 decision: use `users.name` as-is (single field)
- Q2 decision: promote @username to bold when no display_name or name; hide grey duplicate
