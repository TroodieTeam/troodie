# Manual Test Script: Hide Communities for Business Accounts

> Feature: hide-communities-business (TRO-168)
> Date: 2026-02-22

## Prerequisites

- Business account
- Consumer account (for counter-testing)

## Scenario 1: Business User — No "Join Community" on Home Screen

1. Log in as business account
2. Go to Home tab
3. Verify "Build Your Network" section does NOT include "Join Community" action
4. Network building shows only 2 steps (Create Board, Create Post) — not 3

## Scenario 2: Business User — No "Create a Community" on Add Screen

1. Log in as business account
2. Go to Add tab (+ button)
3. Verify creation options do NOT include "Create a Community"
4. Should show: Create Post, Add Restaurant, Create Board (no community option)

## Scenario 3: Business User — No "communities" Tab on Explore Screen

1. Log in as business account
2. Go to Explore/Search screen
3. Verify tab bar shows only: restaurants, posts (no "communities" tab)
4. Verify no community data is fetched (check console for community API calls)

## Scenario 4: Consumer User — All Community Features Visible (Counter-Test)

1. Log in as consumer account
2. Home tab: "Join Community" action visible in "Build Your Network"
3. Add tab: "Create a Community" option visible
4. Explore tab: "communities" tab visible and functional
5. Verify all three community touchpoints work end-to-end

## Verification SQL

```sql
-- Verify user's account_type
SELECT id, account_type, username
FROM users
WHERE id = '<user_id>';

-- No DB changes for this feature (UI-only conditional rendering via isBusiness hook)
```
