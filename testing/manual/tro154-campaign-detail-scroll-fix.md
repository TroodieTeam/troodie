# Manual Test Script: Campaign Detail Scroll Fix (TRO-154)

> Feature: campaign-detail-scroll-fix
> Spec: `specs/features/campaign-detail-scroll-fix/spec.md`
> Date: 2026-02-09

## Prerequisites

- [ ] App built from branch `build/1.0.15-b2`
- [ ] iOS simulator or device running
- [ ] Logged in as a **business** account (e.g., test-business1@bypass.com)
- [ ] The business account must have at least one campaign with 2+ applicants

## Test Scenarios

### Scenario 1: Applications Tab - All Applicant Cards Fully Visible

**Steps:**
1. Log in as a business user
2. Navigate to More tab > Manage Campaigns
3. Tap on a campaign that has 2 or more applicants
4. Tap the "Applications" tab
5. Scroll down to the last applicant card

**Expected Result:**
- The last applicant card is **fully visible**, including the bottom edge
- The "Reject" and "Accept" buttons on the last card are fully visible and tappable
- The screen does NOT bounce back up when scrolling to the bottom
- Content is not clipped behind the tab bar

### Scenario 2: Overview Tab - Recent Activity Fully Visible

**Steps:**
1. On the same campaign detail screen, tap the "Overview" tab
2. Scroll down to the "Recent Activity" section at the bottom

**Expected Result:**
- All Recent Activity items are fully visible
- The last activity item is not cut off or hidden behind the tab bar
- Scrolling is smooth and content stays in place

### Scenario 3: Scroll Behavior Is Smooth

**Steps:**
1. On the Applications tab, swipe up and down repeatedly
2. Switch to Overview tab and swipe up and down repeatedly

**Expected Result:**
- Scrolling is smooth without jank or stuttering
- Content does not jump or snap unexpectedly
- The extra bottom padding feels natural (not excessive whitespace)

### Scenario 4: Other Tabs Not Affected

**Steps:**
1. Tap the "Deliverables" tab (if available)
2. Scroll the content
3. Tap the "Invitations" tab (if available)
4. Scroll the content

**Expected Result:**
- Deliverables and Invitations tabs also have correct bottom padding
- Content is not clipped behind the tab bar on any tab
- No visual regressions from the padding change

### Scenario 5: Single Applicant Campaign

**Steps:**
1. Navigate to a campaign with exactly 1 applicant
2. Tap the Applications tab
3. Check the single applicant card

**Expected Result:**
- The single applicant card is fully visible with proper spacing
- Reject/Accept buttons are tappable
- No excessive whitespace below the card (padding is proportional)

### Scenario 6: Empty Campaign (No Applicants)

**Steps:**
1. Navigate to a campaign with 0 applicants
2. Tap the Applications tab

**Expected Result:**
- The empty state renders correctly
- No layout issues from the padding change

### Scenario 7: Different Device Sizes

**Steps:**
1. Test on iPhone SE (small screen) if available
2. Test on iPhone 17 Pro Max (large screen) if available

**Expected Result:**
- The dynamic padding (using `useBottomTabBarHeight()`) adapts to each device's tab bar height
- Content is not clipped on any device size

## Technical Details

The fix uses `useBottomTabBarHeight()` from `@react-navigation/bottom-tabs` to dynamically calculate padding:

```tsx
const tabBarHeight = useBottomTabBarHeight();
// contentContainerStyle={{ paddingBottom: tabBarHeight + DS.spacing.xxxl }}
```

This replaces the previous hard-coded `paddingBottom: DS.spacing.xxxl` (32px) which was insufficient to clear the tab bar (~80-90px).

**Key file:** `app/(tabs)/business/campaigns/[id].tsx`

## Cleanup

No cleanup needed — this is a styling fix with no data impact.
