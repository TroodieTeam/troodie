# Development Test Data

This directory contains reference data IDs for the **development** environment.

## Quick Reference

### Test Accounts
- **Consumer:** `consumer1@troodieapp.com` (ID: `30e818f9-a28d-4ab2-824f-725a1d5b8956`)
- **Creator:** `creator1@troodieapp.com` (ID: `90ace8c5-b26d-434a-bbe9-a9babbec5bad`)
- **Business:** `business1@troodieapp.com` (ID: `5b9d6a94-de0d-4bbb-a666-b1797fdd7b4b`)

### Beta Passcode
**`TROODIE2025`** (all uppercase, no spaces)

## Setting Up Test Data

### Robust Test Scenario (Recommended)

Run the comprehensive test scenario setup script for a fully realistic testing environment:

```sql
-- In Supabase SQL Editor, run:
-- data/test-data/dev/setup-robust-test-scenario.sql
```

This creates:
- ✅ **20 test users**:
  - **10 Consumers:** test-consumer1 through test-consumer10@troodieapp.com
  - **7 Creators:** test-creator1 through test-creator7@troodieapp.com
  - **3 Businesses:** test-business1, test-business2, test-business3@troodieapp.com
- ✅ **20 default boards** (one per user)
- ✅ **7 creator profiles** with portfolios (images/videos)
- ✅ **8 restaurants** (3 claimed, 5 unclaimed)
- ✅ **3 business profiles** claiming restaurants
- ✅ **~50+ posts** with realistic engagement:
  - Likes (5-50 per post)
  - Comments (2-10 per post, from different users)
  - Saves (3-15 per post)
- ✅ **~45 restaurant saves** via board_restaurants (for analytics testing - matches actual app behavior)
- ✅ **User follows** (social graph with 3-8 follows per user)
- ✅ **13 campaigns**:
  - Business 19 (Medium): 3 campaigns
  - Business 20 (High): 10 campaigns
- ✅ **~25 campaign applications** (various statuses)
- ✅ **~20 deliverables** (pending, approved, auto-approved, etc.)

**Business Activity Levels:**
- **test-business1@troodieapp.com** (NEW): Just claimed restaurant, no campaigns yet
- **test-business2@troodieapp.com** (MEDIUM): 3 campaigns, ~8 applications, ~5 deliverables
- **test-business3@troodieapp.com** (HIGH): 10 campaigns, ~25 applications, ~15 deliverables

**All accounts use OTP: `000000` for authentication**

### Simple Test Scenario

For a minimal setup, use the simple script:

```sql
-- In Supabase SQL Editor, run:
-- data/test-data/dev/setup-test-scenario.sql
```

This creates basic test data with 3 users (consumer, creator, business).

### Manual Setup

If you prefer to set up test data manually or need specific scenarios:

#### 1. Find IDs for Test Setup

Each JSON file includes SQL queries to find the actual IDs in your database:

```sql
-- Example: Find creator profile ID
SELECT cp.id, cp.user_id, u.email 
FROM creator_profiles cp 
JOIN users u ON cp.user_id = u.id 
WHERE u.email = 'creator1@troodieapp.com';
```

### 2. Create Test Scenarios

Use the IDs to set up realistic test scenarios:

```sql
-- Example: Create a test deliverable for auto-approval testing
UPDATE campaign_deliverables 
SET submitted_at = NOW() - INTERVAL '73 hours'
WHERE id = '<deliverable_id_from_json>';
```

### 3. Verify Test State

Check that test data matches expected state:

```sql
-- Example: Verify creator profile state
SELECT 
  cp.id,
  cp.open_to_collabs,
  COUNT(cpi.id) as portfolio_items_count
FROM creator_profiles cp
LEFT JOIN creator_portfolio_items cpi ON cpi.creator_profile_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'creator1@troodieapp.com'
GROUP BY cp.id, cp.open_to_collabs;
```

## File Structure

- `users.json` - Test user accounts
- `restaurants.json` - Test restaurants (claimed/unclaimed)
- `creator_profiles.json` - Creator profile data
- `campaigns.json` - Test campaigns
- `campaign_applications.json` - Campaign applications
- `deliverables.json` - Deliverable submissions
- `posts.json` - Test posts for analytics/discovery

## Updating Data

When IDs change or new test data is added:
1. Update the relevant JSON file
2. Update `last_updated` timestamp
3. Add notes about what changed
4. Update the testing guide if needed

