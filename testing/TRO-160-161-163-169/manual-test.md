# Manual Test Script: Restaurant Onboarding UX Fixes

> Feature: restaurant-onboarding-ux-fixes (TRO-160, 161, 163, 169)
> Date: 2026-02-22

## Prerequisites

- Consumer account (no business profile)
- Business account (verified restaurant owner)
- Consumer account with a pending restaurant claim

## Scenario 1: Claim Flow — No Beta Gate

1. Log in as consumer
2. Go to More tab -> "Claim Your Restaurant"
3. Verify flow starts at restaurant search step (no passcode screen, no TROODIE2025 prompt)
4. Search for a restaurant -> select -> verify claim form renders

## Scenario 2: Creator Onboarding — No Beta Gate

1. Log in as consumer (non-creator)
2. Go to More tab -> "Become a Creator"
3. Verify onboarding starts directly (no BetaAccessGate, no invite code)

## Scenario 3: Business User — No "Claim Your Restaurant" on More Tab

1. Log in as business account
2. Go to More tab
3. Verify "Grow with Troodie" section is NOT shown (or does not include "Claim Your Restaurant")
4. Verify "Business Tools" section IS visible with Business Dashboard, Manage Campaigns, etc.

## Scenario 4: Business User — "Business Tools" Section Visible

1. Log in as business account
2. Go to More tab
3. Verify section titled "Business Tools" is rendered with items:
   - Business Dashboard (shows restaurant name in subtitle)
   - Manage Campaigns
   - Discover Creators
   - Campaign Analytics
   - Restaurant Analytics
   - Restaurant Settings

## Scenario 5: Consumer with Pending Claim — "Claim Status" Shown

1. Log in as consumer with pending claim
2. Go to More tab
3. Verify "Grow with Troodie" section shows "Claim Status" (not "Claim Your Restaurant")
4. Subtitle should read: `<restaurant name> — under review`
5. Tapping opens `/business/claim?status=pending`

## Scenario 6: Consumer with Pending Claim — "Become a Creator" Hidden

1. Log in as consumer with pending claim
2. Go to More tab
3. Verify "Become a Creator" is NOT shown while claim is pending

## Verification SQL

```sql
-- Check pending claims for a user
SELECT rc.id, rc.user_id, rc.restaurant_id, r.name AS restaurant_name, rc.status
FROM restaurant_claims rc
JOIN restaurants r ON r.id = rc.restaurant_id
WHERE rc.user_id = '<user_id>'
ORDER BY rc.created_at DESC;

-- Check business_profiles for user
SELECT bp.id, bp.user_id, bp.restaurant_id, bp.verification_status
FROM business_profiles bp
WHERE bp.user_id = '<user_id>';
```
