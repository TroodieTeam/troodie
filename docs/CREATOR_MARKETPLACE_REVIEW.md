# Creator Marketplace Feature Review & Testing Guide

**Date:** December 2024
**Purpose:** Comprehensive review of creator marketplace flows, breaking points, improvements, and testing scripts

---

## Table of Contents
1. [Feature Overview](#1-feature-overview)
2. [User Flow Analysis](#2-user-flow-analysis)
3. [Breaking Points Analysis](#3-breaking-points-analysis)
4. [Ease of Use Audit](#4-ease-of-use-audit)
5. [Improvement Recommendations](#5-improvement-recommendations)
6. [Onboarding Queries by User Segment](#6-onboarding-queries-by-user-segment)
7. [Cleanup Scripts](#7-cleanup-scripts)

---

## 1. Feature Overview

### Account Type Progression
```
Consumer (default)
    ↓
Creator Application (submit → pending → approved/rejected)
    ↓
Creator (can apply to campaigns, earn money)
    ↓
Business Owner (claim restaurant)
```

### Key Tables
| Table | Purpose |
|-------|---------|
| `users` | Core user data with `account_type`, `is_creator` |
| `creator_profiles` | Creator-specific profile data |
| `creator_applications` | Application to become creator |
| `creator_portfolio_items` | Creator portfolio images |
| `campaigns` | Restaurant marketing campaigns |
| `campaign_applications` | Creator applications to campaigns |
| `campaign_deliverables` | Submitted content for review |
| `business_profiles` | Business owner profiles |
| `restaurant_claims` | Restaurant ownership claims |

### Core Services
- `creatorApplicationService.ts` - Creator application submission
- `deliverableSubmissionService.ts` - Content submission
- `deliverableReviewService.ts` - Content review/approval
- `platformCampaignService.ts` - Troodie-managed campaigns

---

## 2. User Flow Analysis

### Flow A: Consumer → Creator

**Steps:**
1. Consumer opens More tab
2. Clicks "Become a Creator"
3. **Beta Gate** - Currently requires email to team@troodieapp.com
4. Completes 2-step onboarding:
   - Step 1: Value proposition screen
   - Step 2: Portfolio upload (3-5 images) + bio
5. Account upgraded to creator

**Key Files:**
- `app/creator/onboarding.tsx:12-54`
- `components/creator/CreatorOnboardingV1.tsx:43-394`

---

### Flow B: Creator Applies to Campaign

**Steps:**
1. Creator navigates to Creator Dashboard
2. Views available campaigns
3. Submits application with:
   - Proposed rate
   - Cover letter
   - Proposed deliverables
4. Application enters `pending` status
5. Business owner reviews and accepts/rejects

**Key Files:**
- `app/creator/campaigns.tsx`
- `app/creator/explore-campaigns.tsx`
- `services/creatorApplicationService.ts:50-130`

---

### Flow C: Deliverable Submission & Review

**Steps:**
1. Creator submits deliverable with social media URL
2. URL validated (Instagram, TikTok, YouTube, Facebook, Twitter)
3. Deliverable enters `pending_review` status
4. 72-hour auto-approval timer starts
5. Business owner reviews within 72 hours OR auto-approval triggers
6. Payment processing initiated

**Key Files:**
- `services/deliverableSubmissionService.ts:133-188`
- `services/deliverableReviewService.ts`

---

### Flow D: Restaurant Claim (Business)

**Steps:**
1. Consumer/Creator views unclaimed restaurant
2. Clicks "Claim This Restaurant"
3. Enters business email
4. Domain match → Instant verification OR Email code verification
5. Account upgraded to Business

---

## 3. Breaking Points Analysis

### CRITICAL Breaking Points

#### 3.1 Beta Access Gate Blocks All Creator Onboarding
**Location:** `app/creator/onboarding.tsx:36-47`
**Issue:** Users cannot proceed without manual email approval
**Impact:** Complete blocker for self-service creator onboarding
**Recommendation:** Remove for production OR implement automated approval system

```typescript
// Current flow requires manual intervention
if (!hasAccess) {
  return (
    <BetaAccessGate
      message="Please reach out to team@troodieapp.com to be onboarded."
    />
  );
}
```

---

#### 3.2 Creator Profile Creation Race Condition
**Location:** `components/creator/CreatorOnboardingV1.tsx:152-178`
**Issue:** Profile creation after account upgrade can fail silently
**Impact:** User becomes creator type but has no creator_profile record
**Recommendation:** Use database transaction or ensure atomic operation

```typescript
// Potential gap between upgrade and profile creation
const upgradeResult = await upgradeAccount('creator', {...});
// If this fails, user is in broken state:
const { error: profileError } = await supabase
  .from('creator_profiles')
  .insert({...});
```

---

#### 3.3 Portfolio Images Not Actually Uploaded
**Location:** `components/creator/CreatorOnboardingV1.tsx:189-198`
**Issue:** Local URIs saved instead of uploaded URLs
**Impact:** Portfolio images won't display on other devices

```typescript
// Current code saves local URI, not cloud URL
await supabase.from('creator_portfolio_items').insert({
  image_url: image.uri, // In production, upload to storage first
});
```

---

#### 3.4 No Validation of Creator Application Requirements
**Location:** `creatorApplicationService.ts` - Requirements defined but...
**Issue:** `CreatorOnboardingV1` doesn't enforce 1000 follower minimum
**Impact:** Users can become creators without meeting requirements

```typescript
// Requirements defined but not enforced in V1 onboarding
export const CREATOR_REQUIREMENTS = {
  min_followers: 1000,        // Not checked in V1
  min_content_samples: 3,     // Partially enforced (3 images)
  required_platforms: 1,      // Not checked in V1
};
```

---

### HIGH Priority Breaking Points

#### 3.5 Campaign Application Missing creator_id Lookup
**Location:** `services/campaignApplicationService.ts` (implied)
**Issue:** RLS policy requires `creator_profiles.id`, not `user.id`
**Impact:** Applications may fail silently

---

#### 3.6 Deliverable URL Validation Too Strict
**Location:** `deliverableSubmissionService.ts:66-112`
**Issue:** Strict URL pattern matching may reject valid URLs
**Impact:** Creators can't submit legitimate content

```typescript
// Instagram example - may miss new URL patterns
if (hostname.includes('instagram.com')) {
  if (urlObj.pathname.includes('/p/') ||
      urlObj.pathname.includes('/reel/') ||
      urlObj.pathname.includes('/stories/')) {
    // Won't match: /share/, /tv/, new formats
  }
}
```

---

#### 3.7 Auto-Approval Function Not Scheduled
**Location:** `20251013_campaign_deliverables_schema.sql:314-335`
**Issue:** `auto_approve_deliverables()` function exists but no cron job
**Impact:** 72-hour auto-approval won't actually trigger

---

#### 3.8 Dashboard Shows Mock Data Only
**Location:** `app/creator/dashboard.tsx:62-96`
**Issue:** No real metrics calculation implemented
**Impact:** Misleading information to creators

```typescript
// Mock metrics - not connected to real data
const mockMetrics = {
  totalViews: 15234,
  totalSaves: 1823,
  engagementRate: 18.5,
  currentMonthEarnings: 275,
};
```

---

### MEDIUM Priority Breaking Points

#### 3.9 Campaign Creation Missing Restaurant Validation
**Location:** `app/(tabs)/business/campaigns/create.tsx:98-118`
**Issue:** No error handling if business_profiles query fails
**Impact:** Campaign creation silently fails

---

#### 3.10 No Stripe Integration
**Issue:** Payment flows reference Stripe but not implemented
**Impact:** Creators can't actually receive payments

---

#### 3.11 Missing Push Notifications for Status Changes
**Issue:** No notifications when:
- Application approved/rejected
- Deliverable approved/rejected
- Payment processed

---

## 4. Ease of Use Audit

### Positive Aspects

| Area | Score | Notes |
|------|-------|-------|
| Creator Onboarding UI | 8/10 | Clean 2-step flow, clear value prop |
| Campaign Browsing | 7/10 | Good filtering, clear cards |
| Deliverable Submission | 7/10 | URL validation with clear errors |
| Business Campaign Creation | 6/10 | Step-by-step wizard |

### Areas Needing Improvement

| Area | Score | Issues |
|------|-------|--------|
| Progress Visibility | 4/10 | No clear status indicators for applications |
| Error Messages | 5/10 | Generic errors, not actionable |
| Help/Documentation | 3/10 | No in-app guidance |
| Offline Support | 2/10 | No offline capabilities |
| Onboarding Flow | 4/10 | Beta gate is confusing |

### User Friction Points

1. **Beta Gate Confusion**: Users don't understand why they need to email
2. **No Progress Tracking**: Can't see where applications are in review queue
3. **Missing Feedback**: No explanation of rejection reasons
4. **Date Picker UX**: Manual date entry required (YYYY-MM-DD)
5. **Image Upload**: No compression/resize feedback

---

## 5. Improvement Recommendations

### Priority 1: Critical Fixes

1. **Remove or Automate Beta Gate**
   - Option A: Remove `BetaAccessGate` component
   - Option B: Implement invite code system
   - Option C: Auto-approve based on activity thresholds

2. **Fix Portfolio Image Upload**
   - Upload to Supabase Storage before saving
   - Add progress indicator during upload
   - Implement image compression

3. **Implement Atomic Account Upgrade**
   - Use database function for upgrade + profile creation
   - Add rollback on failure

4. **Schedule Auto-Approval Cron Job**
   ```sql
   SELECT cron.schedule(
     'auto-approve-deliverables',
     '0 * * * *', -- Every hour
     'SELECT auto_approve_deliverables()'
   );
   ```

### Priority 2: High Value Improvements

5. **Add Real Metrics Calculation**
   - Create `creator_analytics` view
   - Track post engagement metrics
   - Calculate real earnings from completed campaigns

6. **Implement Push Notifications**
   - Application status changes
   - Deliverable review results
   - Payment confirmations

7. **Add In-App Help**
   - Tooltips on complex forms
   - FAQ section
   - Chat support integration

8. **Improve Date Picker**
   - Use native date picker component
   - Add calendar UI for deadline selection

### Priority 3: Nice-to-Have Enhancements

9. **Add Campaign Recommendations**
   - Match creators to campaigns by specialty
   - Show success likelihood score

10. **Implement Draft Saving**
    - Auto-save application drafts
    - Resume incomplete applications

11. **Add Social Proof**
    - Show successful creator testimonials
    - Display earnings potential calculator

12. **Offline Support**
    - Cache campaign listings
    - Queue deliverable submissions

---

## 6. Onboarding Queries by User Segment

### 6.1 Consumer User Onboarding

```sql
-- =============================================
-- CONSUMER USER CREATION
-- Use this to create a test consumer account
-- =============================================

-- Step 1: Create auth user (do this via Supabase Auth API or dashboard)
-- Email: test_consumer_[timestamp]@test.com

-- Step 2: After auth user exists, insert user profile
INSERT INTO users (
  id,
  email,
  username,
  name,
  account_type,
  is_creator,
  is_restaurant,
  created_at
) VALUES (
  -- Replace with actual auth.users id
  'YOUR_AUTH_USER_UUID',
  'test_consumer_new@test.com',
  'testconsumer' || floor(random() * 10000)::text,
  'Test Consumer',
  'consumer',
  false,
  false,
  NOW()
);

-- Step 3: Create default "Quick Saves" board
INSERT INTO boards (
  user_id,
  name,
  description,
  is_private,
  is_default
) VALUES (
  'YOUR_AUTH_USER_UUID',
  'Quick Saves',
  'Your default board for quick saves',
  false,
  true
);

-- Step 4: Add some saves to qualify for creator (optional)
-- This creates activity that would qualify them for creator application
INSERT INTO restaurant_saves (user_id, restaurant_id, personal_rating, notes)
SELECT
  'YOUR_AUTH_USER_UUID',
  id,
  floor(random() * 2 + 4)::int, -- Rating 4-5
  'Test save note'
FROM restaurants
LIMIT 30;

-- Verify consumer creation
SELECT
  u.id,
  u.email,
  u.username,
  u.account_type,
  u.is_creator,
  (SELECT COUNT(*) FROM restaurant_saves WHERE user_id = u.id) as saves_count,
  (SELECT COUNT(*) FROM boards WHERE user_id = u.id) as boards_count
FROM users u
WHERE u.email = 'test_consumer_new@test.com';
```

---

### 6.2 Creator User Onboarding

```sql
-- =============================================
-- CREATOR USER CREATION (Full flow simulation)
-- This simulates the complete creator onboarding
-- =============================================

-- Step 1: Create base user first (as consumer)
INSERT INTO users (
  id,
  email,
  username,
  name,
  account_type,
  is_creator,
  created_at
) VALUES (
  'YOUR_AUTH_USER_UUID',
  'test_creator_new@test.com',
  'testcreator' || floor(random() * 10000)::text,
  'Test Creator',
  'consumer',
  false,
  NOW()
);

-- Step 2: Upgrade user to creator
UPDATE users
SET
  account_type = 'creator',
  is_creator = true,
  account_upgraded_at = NOW()
WHERE id = 'YOUR_AUTH_USER_UUID';

-- Step 3: Create creator profile
INSERT INTO creator_profiles (
  user_id,
  display_name,
  bio,
  location,
  food_specialties,
  specialties,
  verification_status,
  instant_approved,
  portfolio_uploaded,
  followers_count,
  content_count,
  account_status
) VALUES (
  'YOUR_AUTH_USER_UUID',
  'Test Creator Name',
  'Food enthusiast and content creator based in Charlotte. Love discovering hidden gems!',
  'Charlotte, NC',
  ARRAY['Brunch', 'Fine Dining', 'Local Gems'],
  ARRAY['Photography', 'Video'],
  'verified',
  true,
  true,
  5000,
  50,
  'active'
);

-- Step 4: Add portfolio items
INSERT INTO creator_portfolio_items (
  creator_profile_id,
  image_url,
  caption,
  restaurant_name,
  display_order,
  is_featured
)
SELECT
  cp.id,
  'https://example.com/portfolio/' || generate_series || '.jpg',
  'Amazing food at Restaurant ' || generate_series,
  'Restaurant ' || generate_series,
  generate_series,
  generate_series = 1
FROM creator_profiles cp, generate_series(1, 5)
WHERE cp.user_id = 'YOUR_AUTH_USER_UUID';

-- Step 5: Create default board
INSERT INTO boards (user_id, name, is_default)
VALUES ('YOUR_AUTH_USER_UUID', 'Quick Saves', true);

-- Verify creator creation
SELECT
  u.id,
  u.email,
  u.account_type,
  u.is_creator,
  cp.display_name,
  cp.verification_status,
  cp.followers_count,
  (SELECT COUNT(*) FROM creator_portfolio_items WHERE creator_profile_id = cp.id) as portfolio_count
FROM users u
JOIN creator_profiles cp ON cp.user_id = u.id
WHERE u.email = 'test_creator_new@test.com';
```

---

### 6.3 Creator with Campaign Application

```sql
-- =============================================
-- CREATOR WITH ACTIVE CAMPAIGN APPLICATION
-- Adds campaign application to existing creator
-- =============================================

-- Get creator profile ID first
WITH creator_data AS (
  SELECT cp.id as creator_profile_id, u.id as user_id
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email = 'YOUR_CREATOR_EMAIL'
)
-- Create campaign application
INSERT INTO campaign_applications (
  campaign_id,
  creator_id,
  proposed_rate_cents,
  proposed_deliverables,
  cover_letter,
  status,
  applied_at
)
SELECT
  c.id,
  cd.creator_profile_id,
  7500, -- $75.00
  '2 Instagram posts + 1 Reel',
  'I would love to collaborate on this campaign! My audience is highly engaged with local restaurant content.',
  'pending',
  NOW()
FROM campaigns c, creator_data cd
WHERE c.status = 'active'
LIMIT 1;

-- Add an accepted application too
WITH creator_data AS (
  SELECT cp.id as creator_profile_id
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email = 'YOUR_CREATOR_EMAIL'
)
INSERT INTO campaign_applications (
  campaign_id,
  creator_id,
  proposed_rate_cents,
  proposed_deliverables,
  cover_letter,
  status,
  applied_at,
  reviewed_at
)
SELECT
  c.id,
  cd.creator_profile_id,
  5000, -- $50.00
  '1 Instagram post',
  'Excited to work with you!',
  'accepted',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '5 days'
FROM campaigns c, creator_data cd
WHERE c.status = 'active'
OFFSET 1 LIMIT 1;

-- Verify applications
SELECT
  ca.id,
  c.title as campaign_title,
  ca.status,
  ca.proposed_rate_cents / 100.0 as rate_dollars,
  ca.applied_at
FROM campaign_applications ca
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'YOUR_CREATOR_EMAIL';
```

---

### 6.4 Business User Onboarding

```sql
-- =============================================
-- BUSINESS USER CREATION
-- Creates business account with claimed restaurant
-- =============================================

-- Step 1: Create base user
INSERT INTO users (
  id,
  email,
  username,
  name,
  account_type,
  is_restaurant,
  created_at
) VALUES (
  'YOUR_AUTH_USER_UUID',
  'test_business_new@test.com',
  'testbusiness' || floor(random() * 10000)::text,
  'Test Business Owner',
  'business',
  true,
  NOW()
);

-- Step 2: Find or create a restaurant to claim
-- Option A: Use existing unclaimed restaurant
WITH unclaimed_restaurant AS (
  SELECT r.id
  FROM restaurants r
  LEFT JOIN business_profiles bp ON bp.restaurant_id = r.id
  WHERE bp.id IS NULL
  LIMIT 1
)
-- Step 3: Create business profile
INSERT INTO business_profiles (
  user_id,
  restaurant_id,
  role,
  verified,
  verified_at
)
SELECT
  'YOUR_AUTH_USER_UUID',
  ur.id,
  'owner',
  true,
  NOW()
FROM unclaimed_restaurant ur;

-- Step 4: Create restaurant claim record
INSERT INTO restaurant_claims (
  restaurant_id,
  user_id,
  email,
  verification_method,
  status,
  verified_at
)
SELECT
  bp.restaurant_id,
  bp.user_id,
  'test_business_new@test.com',
  'email_code',
  'approved',
  NOW()
FROM business_profiles bp
WHERE bp.user_id = 'YOUR_AUTH_USER_UUID';

-- Step 5: Create default board
INSERT INTO boards (user_id, name, is_default)
VALUES ('YOUR_AUTH_USER_UUID', 'Quick Saves', true);

-- Verify business creation
SELECT
  u.id,
  u.email,
  u.account_type,
  u.is_restaurant,
  bp.role,
  bp.verified,
  r.name as restaurant_name
FROM users u
JOIN business_profiles bp ON bp.user_id = u.id
JOIN restaurants r ON r.id = bp.restaurant_id
WHERE u.email = 'test_business_new@test.com';
```

---

### 6.5 Business with Active Campaign

```sql
-- =============================================
-- ADD CAMPAIGN TO BUSINESS ACCOUNT
-- Creates active campaign for business owner
-- =============================================

-- Get business info
WITH business_data AS (
  SELECT u.id as user_id, bp.restaurant_id
  FROM users u
  JOIN business_profiles bp ON bp.user_id = u.id
  WHERE u.email = 'YOUR_BUSINESS_EMAIL'
)
-- Create active campaign
INSERT INTO campaigns (
  restaurant_id,
  owner_id,
  creator_id,
  name,
  title,
  description,
  requirements,
  status,
  budget_cents,
  budget_total,
  start_date,
  end_date,
  max_creators,
  campaign_source
)
SELECT
  bd.restaurant_id,
  bd.user_id,
  bd.user_id,
  'Summer Menu Promotion',
  'Summer Menu Promotion',
  'Showcase our new summer menu items with creative food content!',
  ARRAY['Post within 7 days', 'Tag @restaurant', 'Use #SummerEats'],
  'active',
  50000, -- $500 budget
  50000,
  NOW(),
  NOW() + INTERVAL '30 days',
  5,
  'restaurant'
FROM business_data bd;

-- Add campaign applications from creators
INSERT INTO campaign_applications (
  campaign_id,
  creator_id,
  proposed_rate_cents,
  proposed_deliverables,
  cover_letter,
  status,
  applied_at
)
SELECT
  c.id,
  cp.id,
  (4500 + floor(random() * 3000))::int, -- $45-75
  '1-2 Instagram posts',
  'Would love to collaborate on this campaign!',
  CASE
    WHEN random() < 0.3 THEN 'accepted'
    WHEN random() < 0.5 THEN 'rejected'
    ELSE 'pending'
  END,
  NOW() - (random() * INTERVAL '14 days')
FROM campaigns c
JOIN business_profiles bp ON bp.restaurant_id = c.restaurant_id
JOIN users bu ON bp.user_id = bu.id
CROSS JOIN creator_profiles cp
WHERE bu.email = 'YOUR_BUSINESS_EMAIL'
  AND c.title = 'Summer Menu Promotion'
LIMIT 5;

-- Verify campaign with applications
SELECT
  c.title,
  c.status,
  c.budget_cents / 100.0 as budget_dollars,
  COUNT(ca.id) as total_applications,
  COUNT(ca.id) FILTER (WHERE ca.status = 'pending') as pending,
  COUNT(ca.id) FILTER (WHERE ca.status = 'accepted') as accepted
FROM campaigns c
JOIN business_profiles bp ON bp.restaurant_id = c.restaurant_id
JOIN users u ON bp.user_id = u.id
LEFT JOIN campaign_applications ca ON ca.campaign_id = c.id
WHERE u.email = 'YOUR_BUSINESS_EMAIL'
GROUP BY c.id, c.title, c.status, c.budget_cents;
```

---

### 6.6 Complete Test Scenario Setup

```sql
-- =============================================
-- FULL TEST SCENARIO
-- Creates all user types with relationships
-- Run as transaction for easy rollback
-- =============================================

BEGIN;

-- Generate unique suffix for this test run
DO $$
DECLARE
  test_suffix TEXT := to_char(NOW(), 'MMDD_HH24MI');
  consumer_id UUID := uuid_generate_v4();
  creator_id UUID := uuid_generate_v4();
  business_id UUID := uuid_generate_v4();
  restaurant_id UUID;
  campaign_id UUID;
  creator_profile_id UUID;
BEGIN

  -- Create test restaurant first
  INSERT INTO restaurants (id, name, address, city, state, cuisine_type)
  VALUES (
    uuid_generate_v4(),
    'Test Restaurant ' || test_suffix,
    '123 Test St',
    'Charlotte',
    'NC',
    ARRAY['American', 'Casual']
  )
  RETURNING id INTO restaurant_id;

  -- Consumer account
  INSERT INTO users (id, email, username, name, account_type, is_creator)
  VALUES (
    consumer_id,
    'test_consumer_' || test_suffix || '@test.com',
    'consumer_' || test_suffix,
    'Test Consumer ' || test_suffix,
    'consumer',
    false
  );

  INSERT INTO boards (user_id, name, is_default)
  VALUES (consumer_id, 'Quick Saves', true);

  -- Creator account
  INSERT INTO users (id, email, username, name, account_type, is_creator, account_upgraded_at)
  VALUES (
    creator_id,
    'test_creator_' || test_suffix || '@test.com',
    'creator_' || test_suffix,
    'Test Creator ' || test_suffix,
    'creator',
    true,
    NOW()
  );

  INSERT INTO creator_profiles (
    user_id, display_name, bio, location, verification_status, followers_count
  )
  VALUES (
    creator_id,
    'Creator ' || test_suffix,
    'Test creator bio',
    'Charlotte, NC',
    'verified',
    5000
  )
  RETURNING id INTO creator_profile_id;

  INSERT INTO boards (user_id, name, is_default)
  VALUES (creator_id, 'Quick Saves', true);

  -- Business account
  INSERT INTO users (id, email, username, name, account_type, is_restaurant)
  VALUES (
    business_id,
    'test_business_' || test_suffix || '@test.com',
    'business_' || test_suffix,
    'Test Business ' || test_suffix,
    'business',
    true
  );

  INSERT INTO business_profiles (user_id, restaurant_id, role, verified, verified_at)
  VALUES (business_id, restaurant_id, 'owner', true, NOW());

  INSERT INTO boards (user_id, name, is_default)
  VALUES (business_id, 'Quick Saves', true);

  -- Campaign from business
  INSERT INTO campaigns (
    id, restaurant_id, owner_id, title, description, status,
    budget_cents, start_date, end_date, max_creators, campaign_source
  )
  VALUES (
    uuid_generate_v4(),
    restaurant_id,
    business_id,
    'Test Campaign ' || test_suffix,
    'Test campaign description',
    'active',
    25000,
    NOW(),
    NOW() + INTERVAL '30 days',
    3,
    'restaurant'
  )
  RETURNING id INTO campaign_id;

  -- Creator applies to campaign
  INSERT INTO campaign_applications (
    campaign_id, creator_id, proposed_rate_cents, status, applied_at
  )
  VALUES (
    campaign_id,
    creator_profile_id,
    5000,
    'pending',
    NOW()
  );

  -- Output created entities
  RAISE NOTICE 'Test data created with suffix: %', test_suffix;
  RAISE NOTICE 'Consumer: test_consumer_%@test.com', test_suffix;
  RAISE NOTICE 'Creator: test_creator_%@test.com', test_suffix;
  RAISE NOTICE 'Business: test_business_%@test.com', test_suffix;
  RAISE NOTICE 'Restaurant ID: %', restaurant_id;
  RAISE NOTICE 'Campaign ID: %', campaign_id;

END $$;

COMMIT;
```

---

## 7. Cleanup Scripts

### 7.1 Cleanup by Email Pattern

```sql
-- =============================================
-- CLEANUP BY EMAIL PATTERN
-- Use this to remove all test accounts matching a pattern
-- =============================================

-- Preview what will be deleted
SELECT
  u.id,
  u.email,
  u.account_type,
  u.created_at,
  CASE
    WHEN cp.id IS NOT NULL THEN 'Has creator profile'
    WHEN bp.id IS NOT NULL THEN 'Has business profile'
    ELSE 'No profiles'
  END as profile_status
FROM users u
LEFT JOIN creator_profiles cp ON cp.user_id = u.id
LEFT JOIN business_profiles bp ON bp.user_id = u.id
WHERE u.email LIKE '%@test.com'
   OR u.email LIKE '%@bypass.com'
ORDER BY u.created_at DESC;

-- Actual cleanup (uncomment to run)
/*
BEGIN;

-- Delete in correct order due to foreign keys

-- 1. Delete campaign deliverables
DELETE FROM campaign_deliverables
WHERE creator_id IN (
  SELECT cp.id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email LIKE '%@test.com'
);

-- 2. Delete campaign applications
DELETE FROM campaign_applications
WHERE creator_id IN (
  SELECT cp.id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email LIKE '%@test.com'
);

-- 3. Delete campaigns owned by test business accounts
DELETE FROM campaigns
WHERE owner_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
);

-- 4. Delete portfolio items
DELETE FROM creator_portfolio_items
WHERE creator_profile_id IN (
  SELECT cp.id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email LIKE '%@test.com'
);

-- 5. Delete creator profiles
DELETE FROM creator_profiles
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
);

-- 6. Delete business profiles
DELETE FROM business_profiles
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
);

-- 7. Delete restaurant claims
DELETE FROM restaurant_claims
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
);

-- 8. Delete creator applications
DELETE FROM creator_applications
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
);

-- 9. Delete boards
DELETE FROM boards
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
);

-- 10. Delete restaurant saves
DELETE FROM restaurant_saves
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
);

-- 11. Delete test restaurants (be careful with this!)
DELETE FROM restaurants
WHERE name LIKE 'Test Restaurant %';

-- 12. Finally delete users
DELETE FROM users
WHERE email LIKE '%@test.com';

-- Verify cleanup
SELECT COUNT(*) as remaining_test_users
FROM users
WHERE email LIKE '%@test.com';

COMMIT;
*/
```

---

### 7.2 Cleanup by Date Range

```sql
-- =============================================
-- CLEANUP BY DATE RANGE
-- Remove test data created within a time period
-- =============================================

-- Preview
SELECT
  u.id,
  u.email,
  u.account_type,
  u.created_at
FROM users u
WHERE u.created_at >= '2024-12-01'
  AND u.created_at < '2025-01-01'
  AND (u.email LIKE '%test%' OR u.email LIKE '%@bypass.com')
ORDER BY u.created_at DESC;

-- Cleanup (uncomment to run)
/*
BEGIN;

-- Store IDs to delete
CREATE TEMP TABLE users_to_delete AS
SELECT id FROM users
WHERE created_at >= '2024-12-01'
  AND created_at < '2025-01-01'
  AND (email LIKE '%test%' OR email LIKE '%@bypass.com');

-- Delete related records...
-- (Same sequence as 7.1)

DROP TABLE users_to_delete;

COMMIT;
*/
```

---

### 7.3 Cleanup Specific User

```sql
-- =============================================
-- CLEANUP SPECIFIC USER
-- Complete removal of a single test user
-- =============================================

-- Replace with actual email
DO $$
DECLARE
  target_email TEXT := 'test_user@test.com';
  target_user_id UUID;
  target_creator_profile_id UUID;
BEGIN

  -- Get user ID
  SELECT id INTO target_user_id FROM users WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User not found: %', target_email;
    RETURN;
  END IF;

  -- Get creator profile if exists
  SELECT id INTO target_creator_profile_id
  FROM creator_profiles WHERE user_id = target_user_id;

  -- Delete in order
  IF target_creator_profile_id IS NOT NULL THEN
    DELETE FROM campaign_deliverables WHERE creator_id = target_creator_profile_id;
    DELETE FROM campaign_applications WHERE creator_id = target_creator_profile_id;
    DELETE FROM creator_portfolio_items WHERE creator_profile_id = target_creator_profile_id;
    DELETE FROM creator_profiles WHERE id = target_creator_profile_id;
  END IF;

  DELETE FROM business_profiles WHERE user_id = target_user_id;
  DELETE FROM restaurant_claims WHERE user_id = target_user_id;
  DELETE FROM creator_applications WHERE user_id = target_user_id;
  DELETE FROM boards WHERE user_id = target_user_id;
  DELETE FROM restaurant_saves WHERE user_id = target_user_id;
  DELETE FROM users WHERE id = target_user_id;

  RAISE NOTICE 'Deleted user: %', target_email;

END $$;
```

---

### 7.4 Reset User to Consumer

```sql
-- =============================================
-- RESET USER TO CONSUMER STATE
-- Downgrade creator/business back to consumer
-- =============================================

DO $$
DECLARE
  target_email TEXT := 'user_to_reset@test.com';
  target_user_id UUID;
BEGIN

  SELECT id INTO target_user_id FROM users WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User not found: %', target_email;
    RETURN;
  END IF;

  -- Reset user flags
  UPDATE users
  SET
    account_type = 'consumer',
    is_creator = false,
    is_restaurant = false,
    account_upgraded_at = NULL
  WHERE id = target_user_id;

  -- Delete creator profile if exists
  DELETE FROM creator_portfolio_items
  WHERE creator_profile_id IN (
    SELECT id FROM creator_profiles WHERE user_id = target_user_id
  );
  DELETE FROM creator_profiles WHERE user_id = target_user_id;

  -- Delete business profile if exists
  DELETE FROM business_profiles WHERE user_id = target_user_id;

  -- Delete restaurant claims if exists
  DELETE FROM restaurant_claims WHERE user_id = target_user_id;

  RAISE NOTICE 'Reset user to consumer: %', target_email;

END $$;
```

---

### 7.5 Complete Production Cleanup Script

```sql
-- =============================================
-- PRODUCTION CLEANUP SCRIPT
-- Run this BEFORE production deployment to clean ALL test data
-- =============================================

-- !!! WARNING: This deletes ALL test data !!!
-- Review carefully before running

BEGIN;

-- Create audit log of what we're deleting
CREATE TEMP TABLE cleanup_audit AS
SELECT
  'users' as table_name,
  COUNT(*) as records_to_delete
FROM users
WHERE email LIKE '%@test.com'
   OR email LIKE '%@bypass.com'
   OR email LIKE '%test%'

UNION ALL

SELECT
  'creator_profiles',
  COUNT(*)
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email LIKE '%@test.com'
   OR u.email LIKE '%@bypass.com'

UNION ALL

SELECT
  'campaigns',
  COUNT(*)
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE u.email LIKE '%@test.com'
   OR u.email LIKE '%@bypass.com';

-- Show what will be deleted
SELECT * FROM cleanup_audit;

-- !! Uncomment below to actually delete !!
/*

-- Delete in dependency order
DELETE FROM deliverable_disputes WHERE deliverable_id IN (
  SELECT cd.id FROM campaign_deliverables cd
  JOIN creator_profiles cp ON cd.creator_id = cp.id
  JOIN users u ON cp.user_id = u.id
  WHERE u.email LIKE '%@test.com' OR u.email LIKE '%@bypass.com'
);

DELETE FROM campaign_deliverables WHERE creator_id IN (
  SELECT cp.id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email LIKE '%@test.com' OR u.email LIKE '%@bypass.com'
);

DELETE FROM campaign_applications WHERE creator_id IN (
  SELECT cp.id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email LIKE '%@test.com' OR u.email LIKE '%@bypass.com'
);

DELETE FROM campaigns WHERE owner_id IN (
  SELECT id FROM users
  WHERE email LIKE '%@test.com' OR email LIKE '%@bypass.com'
);

DELETE FROM creator_portfolio_items WHERE creator_profile_id IN (
  SELECT cp.id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email LIKE '%@test.com' OR u.email LIKE '%@bypass.com'
);

DELETE FROM creator_profiles WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE '%@test.com' OR email LIKE '%@bypass.com'
);

DELETE FROM business_profiles WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE '%@test.com' OR email LIKE '%@bypass.com'
);

DELETE FROM restaurant_claims WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE '%@test.com' OR email LIKE '%@bypass.com'
);

DELETE FROM creator_applications WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE '%@test.com' OR email LIKE '%@bypass.com'
);

DELETE FROM boards WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE '%@test.com' OR email LIKE '%@bypass.com'
);

DELETE FROM restaurant_saves WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE '%@test.com' OR email LIKE '%@bypass.com'
);

DELETE FROM restaurants WHERE name LIKE 'Test Restaurant%';

DELETE FROM users
WHERE email LIKE '%@test.com'
   OR email LIKE '%@bypass.com';

*/

-- Verify (should show zeros after cleanup)
SELECT
  (SELECT COUNT(*) FROM users WHERE email LIKE '%@test.com') as test_users,
  (SELECT COUNT(*) FROM users WHERE email LIKE '%@bypass.com') as bypass_users,
  (SELECT COUNT(*) FROM restaurants WHERE name LIKE 'Test Restaurant%') as test_restaurants;

COMMIT;
```

---

## Summary

### Key Findings

1. **Beta Gate is a blocker** - Remove or automate for production
2. **Portfolio images not uploaded** - Critical fix needed
3. **Mock data only** - Real metrics need implementation
4. **Auto-approval not scheduled** - Add cron job
5. **No payment integration** - Stripe Connect needed

### Priority Actions

| Priority | Action | Effort |
|----------|--------|--------|
| P0 | Remove/automate Beta Gate | Low |
| P0 | Fix portfolio image upload | Medium |
| P1 | Implement auto-approval cron | Low |
| P1 | Add push notifications | Medium |
| P2 | Real metrics calculation | High |
| P2 | Stripe Connect integration | High |

### Test Accounts (Bypass OTP: 000000)

| Email | Type | Purpose |
|-------|------|---------|
| consumer1@bypass.com | Consumer | Basic consumer testing |
| consumer2@bypass.com | Consumer | Qualified for creator |
| creator1@bypass.com | Creator | Full creator testing |
| creator2@bypass.com | Creator | Campaign testing |
| business1@bypass.com | Business | Campaign management |
| business2@bypass.com | Business | Restaurant claiming |
| multirole@bypass.com | Multi | Creator + Business |
