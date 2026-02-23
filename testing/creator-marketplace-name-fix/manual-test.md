# Manual Test Script: Creator Marketplace Name Fix

> Feature: creator-marketplace-name-fix
> Spec: `specs/features/creator-marketplace-name-fix/spec.md`
> Date: 2026-02-09

## Prerequisites

- [ ] Account type: **business** (required to access Browse Creators)
- [ ] At least one creator in the database with `display_name` set
- [ ] At least one creator with `display_name` NULL but `users.name` set
- [ ] At least one creator with both `display_name` and `users.name` NULL but `username` set
- [ ] Environment: dev

## Test Scenarios

### Scenario 1: Creator with display_name set

**Steps:**
1. Log in as a business account
2. Navigate to Creators tab → Browse Creators
3. Find a creator whose `display_name` is set in `creator_profiles`

**Expected Result:**
- Bold text shows the `display_name` value
- Grey text shows `@username` below

**Verification SQL:**
```sql
SELECT cp.display_name, u.name, u.username
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE cp.display_name IS NOT NULL
LIMIT 5;
```

### Scenario 2: Creator without display_name but with users.name

**Steps:**
1. Find a creator whose `creator_profiles.display_name` is NULL but `users.name` is set
2. View their card in Browse Creators

**Expected Result:**
- Bold text shows the `users.name` value (e.g. "Taylor Arielle")
- Grey text shows `@username` below

**Verification SQL:**
```sql
SELECT cp.display_name, u.name, u.username
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE cp.display_name IS NULL AND u.name IS NOT NULL
LIMIT 5;
```

### Scenario 3: Creator with only username (no display_name or name)

**Steps:**
1. Find a creator whose `display_name` AND `users.name` are both NULL
2. View their card in Browse Creators

**Expected Result:**
- Bold text shows the username (e.g. "firelordsim")
- Grey @username line is **hidden** (not duplicated)

**Verification SQL:**
```sql
SELECT cp.display_name, u.name, u.username
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE cp.display_name IS NULL AND u.name IS NULL AND u.username IS NOT NULL
LIMIT 5;
```

### Scenario 4: Creator profile screen

**Steps:**
1. Tap on any creator card to open their profile
2. Verify the name display follows the same fallback chain

**Expected Result:**
- Profile header shows: display_name → users.name → username → "Unknown Creator"
- Same fallback behavior as browse screen

### Scenario 5: Avatar placeholder letter

**Steps:**
1. Find a creator without a profile photo
2. Check the avatar placeholder circle

**Expected Result:**
- The placeholder letter matches the first letter of the displayed bold name
- If name is "Taylor", avatar shows "T"
- If username promoted to bold and is "firelordsim", avatar shows "F"

## Cleanup

No cleanup required — this fix is display-only with no data changes.
