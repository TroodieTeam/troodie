# Remove Join Team Button Technical Specification

> Status: APPROVED
> Created: 2026-02-09
> Source: TRO-153 — Remove 'join team' button from home screen
> Feature: remove-join-team-button

## Overview

Remove the floating "Join Team" button from the home screen. Only select users need this functionality, and a magic link workflow now handles team invitations, making the button unnecessary for the general user base.

## Problem Statement

The home screen has a floating "Join Team" button (bottom-right FAB) that opens an `InviteCodeModal` for entering restaurant team invitation codes. This workflow has been replaced by a magic link flow (`app/invite/[token].tsx`), so the button clutters the UI for the vast majority of users who will never use it.

## User Stories

- As a user, I want a clean home screen without unnecessary action buttons
- As a business user needing to join a team, I use the magic link sent to me instead of manually entering a code

## User Experience

### Current Behavior
- A floating orange "Join Team" pill button is rendered at the bottom-right of the home screen (above the tab bar)
- Tapping it opens `InviteCodeModal` which accepts a 6-digit code
- This button is visible to ALL users regardless of account type

### New Behavior
- The floating button is removed entirely
- The `InviteCodeModal` component and its import can be removed from the home screen
- Team joining is handled exclusively through magic links (`/invite/[token]`)

## Technical Design

### File Changes

| File | Change | Description |
|------|--------|-------------|
| `app/(tabs)/index.tsx` | Remove `renderQuickActions()` function and its call | Lines 630-641: the floating button renderer |
| `app/(tabs)/index.tsx` | Remove `InviteCodeModal` usage | Lines 713-716: modal component and line 69 state |
| `app/(tabs)/index.tsx` | Remove unused imports | `InviteCodeModal` import (line 6), `showInviteModal` state (line 69), `UserPlus` icon if no longer needed |

### What to Remove

1. **Import**: `import { InviteCodeModal } from '@/components/InviteCodeModal';` (line 6)
2. **State**: `const [showInviteModal, setShowInviteModal] = useState(false);` (line 69)
3. **Function**: `renderQuickActions()` (lines 630-641)
4. **Call**: `{renderQuickActions()}` (line 697)
5. **Component**: `<InviteCodeModal visible={showInviteModal} onClose={() => setShowInviteModal(false)} />` (lines 713-716)
6. **Style**: `quickActions`, `quickActionButton`, `quickActionText` styles (lines 1036-1056)
7. **Import**: `UserPlus` from lucide-react-native if no longer used elsewhere in the file (check `renderNetworkBuilding` — it uses `UserPlus` at line 416, so keep it)

### What to Keep
- `InviteCodeModal` component file (`components/InviteCodeModal.tsx`) — may be used by other screens or deep links
- `app/invite/[token].tsx` — the magic link route (unchanged)
- `UserPlus` icon import — still used in `renderNetworkBuilding()`

## Implementation Phases

### Phase 1: Remove Button (MVP)
**Goal**: Clean home screen without the floating Join Team button

#### Tasks
- [ ] **Task 1.1**: Remove Join Team button and InviteCodeModal from home screen
  - Files: `app/(tabs)/index.tsx`
  - Acceptance: No floating button visible, no InviteCodeModal rendered, no TypeScript errors

## Testing Requirements

### Manual Testing
- [ ] Home screen loads without floating button
- [ ] No console errors or TypeScript errors
- [ ] Magic link flow (`/invite/[token]`) still works independently
- [ ] Network Building section still renders correctly (uses UserPlus icon)

## Acceptance Criteria

- [ ] "Join Team" floating button is removed from home screen
- [ ] No unused imports, state variables, or styles remain
- [ ] Home screen renders cleanly with no visual regressions
- [ ] Magic link team join flow is unaffected
