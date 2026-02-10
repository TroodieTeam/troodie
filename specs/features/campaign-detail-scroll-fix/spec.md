# Campaign Detail Scroll Fix Technical Specification

> Status: APPROVED
> Created: 2026-02-09
> Source: TRO-154 — Creator Marketplace UI fix - padding
> Feature: campaign-detail-scroll-fix

## Overview

The campaign detail screen's ScrollView has insufficient bottom padding, causing the last applicant card and overview activity items to be clipped behind the tab bar. Users can only see half of the bottom card and the screen bounces back when trying to scroll down.

## Problem Statement

Business users managing campaigns cannot see the full list of applicants or the bottom of the overview tab. The `contentContainerStyle` on the ScrollView uses `paddingBottom: DS.spacing.xxxl` (32px), which is not enough space to clear the bottom tab bar (~80-90px on iOS). This means the Reject/Accept buttons on the last applicant card and the Recent Activity section on the Overview tab are obscured.

## User Stories

- As a business owner, I want to scroll to see all applicant cards fully so I can accept or reject them
- As a business owner, I want to see the full Recent Activity section on the Overview tab

## User Experience

### Screens & Views

| Screen | Purpose | Entry Points | Account Types |
|--------|---------|--------------|---------------|
| Campaign Detail | View campaign overview, applications, deliverables, invitations | Business campaigns list | business |

### Current Issue

1. **Applications tab**: When 2+ applicants exist, the last card's Reject/Accept buttons are hidden behind the tab bar
2. **Overview tab**: Recent Activity items at the bottom are clipped behind the tab bar

### Fix

Increase `paddingBottom` on the ScrollView's `contentContainerStyle` from `DS.spacing.xxxl` (32px) to a value that accounts for the tab bar height (~120px).

## Technical Design

### File Changes

| File | Change | Description |
|------|--------|-------------|
| `app/(tabs)/business/campaigns/[id].tsx:132` | Increase `paddingBottom` | Change `DS.spacing.xxxl` to `120` (or use `useBottomTabBarHeight()` + padding) |

### Approved Approach: Dynamic padding (tab-bar-aware)
Import `useBottomTabBarHeight` from `@react-navigation/bottom-tabs` and compute padding dynamically:
```tsx
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
// ...
const tabBarHeight = useBottomTabBarHeight();
// ...
contentContainerStyle={{ paddingBottom: tabBarHeight + DS.spacing.xxxl }}
```
This follows the same pattern as the home screen (`app/(tabs)/index.tsx:63`) and adapts to different device tab bar heights.

## Implementation Phases

### Phase 1: Scroll Fix (MVP)
**Goal**: Users can see all content on the campaign detail screen

#### Tasks
- [ ] **Task 1.1**: Update paddingBottom on ScrollView in `app/(tabs)/business/campaigns/[id].tsx`
  - Files: `app/(tabs)/business/campaigns/[id].tsx`
  - Acceptance: Last applicant card is fully visible with Reject/Accept buttons. Recent Activity items on Overview tab are fully visible.

## Testing Requirements

### Manual Testing
- [ ] Open a campaign with 2+ applicants, verify last card is fully visible
- [ ] Switch to Overview tab with activity items, verify all items are visible
- [ ] Verify scrolling is smooth and doesn't bounce back

## Acceptance Criteria

- [ ] All applicant cards are fully visible and scrollable on the Applications tab
- [ ] Recent Activity section is fully visible on the Overview tab
- [ ] No visual regressions on other tabs (Deliverables, Invitations)
