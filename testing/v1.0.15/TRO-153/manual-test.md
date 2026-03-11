# Manual Test Script: Remove Join Team Button (TRO-153)

> Feature: remove-join-team-button
> Spec: `specs/features/remove-join-team-button/spec.md`
> Date: 2026-02-09

## Prerequisites

- [ ] App built from branch `build/1.0.15-b2`
- [ ] iOS simulator or device running
- [ ] Logged in as a **consumer** account (e.g., test-consumer1@bypass.com)

## Test Scenarios

### Scenario 1: Join Team Button Removed from Home Screen

**Steps:**
1. Log in and land on the home screen
2. Look at the bottom-right area of the screen (above the tab bar)
3. Scroll the entire home feed up and down

**Expected Result:**
- No floating "Join Team" button visible anywhere on the home screen
- No orange pill/FAB button with a UserPlus icon in the bottom-right

### Scenario 2: No Invite Code Modal

**Steps:**
1. On the home screen, long-press or tap various areas where the Join Team button used to be (bottom-right, above tab bar)

**Expected Result:**
- No modal/dialog appears asking for an invite code
- No `InviteCodeModal` is rendered in the component tree

### Scenario 3: Home Screen Content Intact

**Steps:**
1. On the home screen, verify the following sections are still present:
   - "Your Saves" section
   - "Top Rated" section (if applicable)
   - "Build Your Network" section (if applicable)
2. Scroll down through the full feed

**Expected Result:**
- All home screen content renders correctly
- No blank areas or layout shifts where the button used to be
- The UserPlus icon still appears in the "Build Your Network" section (it was only removed from the floating button, not from other UI)

### Scenario 4: Magic Link Flow Still Works

**Steps:**
1. Open a team magic link URL (format: `troodie://invite/[token]`)
2. Verify the invite flow loads

**Expected Result:**
- The magic link invite screen (`app/invite/[token].tsx`) still renders
- Users can still join teams via magic links — only the manual button was removed

### Scenario 5: Multiple Account Types

**Steps:**
1. Log in as a **creator** account
2. Check the home screen for the Join Team button
3. Log out, log in as a **business** account
4. Check the home screen again

**Expected Result:**
- The Join Team button is absent for all account types (consumer, creator, business)

## Cleanup

No cleanup needed — this is a UI removal with no data impact.
