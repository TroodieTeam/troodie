# Manual Test Script: Multi-Restaurant Claims

> Feature: multi-restaurant-claims (TRO-170)
> Date: 2026-02-22

## Prerequisites

- Business account with one verified restaurant
- Access to Supabase dashboard or SQL runner for verification

## Scenario 1: "Claim Location" in Dashboard Quick Actions

1. Log in as business account
2. Navigate to Business Dashboard
3. Verify "Claim Location" appears in Quick Actions row (with MapPin icon)
4. Subtitle: "Add restaurant"

## Scenario 2: "Claim Location" Opens Claim Flow (No Beta Gate)

1. From Business Dashboard, tap "Claim Location"
2. Verify claim flow opens at restaurant search step (no passcode prompt)
3. Search for a new restaurant -> select -> submit claim

## Scenario 3: Multiple Business Profiles Per User

1. Business user claims a second restaurant (approved via admin)
2. Verify `business_profiles` has two rows for the same `user_id`, each with a different `restaurant_id`
3. Verify no constraint error (old UNIQUE(user_id) replaced by UNIQUE(user_id, restaurant_id))

## Scenario 4: Restaurant Switcher

1. Business user with 2+ verified restaurants
2. Open Business Dashboard
3. Verify RestaurantSwitcher is visible at top
4. Switch to second restaurant -> dashboard data updates (restaurant name, campaigns)

## Scenario 5: Campaign List Filters by currentRestaurantId

1. Business user with 2+ restaurants, each having campaigns
2. View campaigns list for restaurant A -> only restaurant A's campaigns shown
3. Switch to restaurant B -> only restaurant B's campaigns shown

## Scenario 6: Duplicate Claim Rejected

1. Business user tries to claim the same restaurant again
2. Verify UNIQUE(user_id, restaurant_id) constraint prevents duplicate business_profiles
3. Claim submission should show error or be blocked

## Scenario 7: Max 10 Claims Enforced

1. Business user with 10 existing claims (pending or verified)
2. Attempt to submit claim #11
3. Verify trigger raises: "Maximum of 10 restaurant claims per user reached"

## Verification SQL

```sql
-- Check UNIQUE constraint exists
SELECT conname, contype
FROM pg_constraint
WHERE conname = 'business_profiles_user_restaurant_unique';

-- Count business_profiles per user
SELECT user_id, COUNT(*) AS profile_count
FROM business_profiles
GROUP BY user_id
ORDER BY profile_count DESC;

-- Verify claim limit trigger exists
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname = 'enforce_claim_limit';
```
