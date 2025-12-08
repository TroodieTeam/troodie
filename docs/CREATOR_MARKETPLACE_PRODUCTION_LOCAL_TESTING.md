# Creator Marketplace - Production Local Testing Guide

**Purpose:** Test Creator Marketplace features in production environment using local app instance  
**Date:** January 2025  
**Status:** Ready for Production Testing

---

## Overview

This guide walks you through:
1. Setting up your local environment to connect to production Supabase
2. Running all migrations on production database
3. Setting up production test accounts
4. Testing all Creator Marketplace features end-to-end

**⚠️ IMPORTANT:** All test accounts use `@bypass.com` domain and are automatically isolated from production users.

---

## Prerequisites

### 1. Environment Setup

Ensure your local environment is configured to connect to **PRODUCTION** Supabase:

```bash
# Verify you're pointing to production
echo $EXPO_PUBLIC_SUPABASE_URL
# Should be: https://[your-prod-project].supabase.co

# Verify test email domains are configured
echo $EXPO_PUBLIC_TEST_EMAIL_DOMAINS
# Should include: @bypass.com,@troodie.test

# Verify bypass password is set
echo $EXPO_PUBLIC_TEST_AUTH_PASSWORD
# Should be: BypassPassword123
```

### 2. Required Access

- [ ] Supabase Production project admin access
- [ ] SQL Editor access in production dashboard
- [ ] Ability to run migrations
- [ ] Local app can connect to production (network/VPN if needed)

---

## Step 1: Run All Migrations

### ⚠️ CRITICAL: Backup Production First

**MANDATORY:** Create a backup before running any migrations!

```bash
# Option 1: Supabase Dashboard (Recommended)
# 1. Go to: clear
# 2. Click "Create Backup"
# 3. Wait for backup to complete

# Option 2: Point-in-Time Recovery (if available on your plan)
# Check Supabase Dashboard → Database → Backups

# Option 3: Manual pg_dump (if you have direct database access)
pg_dump -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Automated Method (Recommended)

**Using the automated script (includes backup verification):**

```bash
# Run the migration automation script
# It will verify backup before proceeding
npm run prod:migrate:cm -- --project-ref YOUR_PROJECT_REF

# Or directly:
node scripts/apply-creator-marketplace-migrations.js --project-ref YOUR_PROJECT_REF

# Dry-run to see what would be applied (no backup check):
node scripts/apply-creator-marketplace-migrations.js --dry-run
```

The script will:
- ✅ **MANDATORY:** Verify backup was created before proceeding
- ✅ Verify all migration files exist
- ✅ Check migrations for safety (no DROP/DELETE operations)
- ✅ Link to your production project
- ✅ Apply migrations in correct order
- ✅ Provide verification steps
- ✅ **GUARANTEE:** No existing data will be deleted

**Using Supabase CLI directly:**

```bash
# 1. Install Supabase CLI (if not already installed)
brew install supabase/tap/supabase

# 2. Login to Supabase
supabase login

# 3. Link to production project
supabase link --project-ref YOUR_PROJECT_REF

# 4. Apply all migrations automatically
supabase db push --linked
```

**⚠️ IMPORTANT:** Even with CLI, create a backup first!

### Manual Method (Alternative)

If you prefer manual control or CLI isn't available:

1. **Open Supabase SQL Editor (Production)**
   - Go to https://supabase.com/dashboard
   - Select your **PRODUCTION** project
   - Navigate to **SQL Editor**

2. **Run Each Migration**
   - Open migration file from `supabase/migrations/`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **Run**
   - Verify no errors

3. **Migration Order**

Follow the exact order in `docs/CREATOR_MARKETPLACE_MIGRATION_STEPS.md`:

**Quick Reference:**
1. Core Creator Tables (if not already deployed)
2. Campaign & Deliverables System
3. Creator Discovery (CM-9)
4. Additional Features
5. Atomic Creator Upgrade
6. **Test User Isolation (CRITICAL - Run LAST)**

### Verify Critical Migrations

```sql
-- After Phase 3 (Creator Discovery)
SELECT proname FROM pg_proc WHERE proname = 'get_creators';
-- Should return 1 row

-- After Phase 6 (Test Isolation)
SELECT proname FROM pg_proc
WHERE proname IN ('is_test_email', 'is_test_user', 'current_user_is_test');
-- Should return 3 rows

-- Verify test account column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'is_test_account';
-- Should return 1 row
```

---

## Step 2: Set Up Production Test Users

### Automated Method (Recommended)

**Using the setup script:**

```bash
node scripts/setup-production-test-users.js
```

The script will:
- ✅ Verify SQL file exists
- ✅ Provide instructions for execution
- ✅ Show verification queries

**Or use Supabase CLI directly:**

```bash
# If you have psql access
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f data/test-data/prod/01-production-test-users-setup.sql
```

### Manual Method (Alternative)

1. Open `data/test-data/prod/01-production-test-users-setup.sql`
2. Copy entire contents
3. Paste into Supabase SQL Editor (Production)
4. Click **Run**
5. Verify output shows accounts created

### Verify Test Accounts Created

```sql
-- Check test users were created
SELECT 
  email, 
  account_type, 
  is_test_account,
  created_at
FROM users
WHERE email LIKE 'prod-%@bypass.com'
ORDER BY account_type, email;
```

**Expected Output:**
- 2 Consumer accounts: `prod-consumer1@bypass.com`, `prod-consumer2@bypass.com`
- 3 Creator accounts: `prod-creator1@bypass.com`, `prod-creator2@bypass.com`, `prod-creator3@bypass.com`
- 2 Business accounts: `prod-business1@bypass.com`, `prod-business2@bypass.com`
- All should have `is_test_account = true`

### Verify Creator Profiles

```sql
-- Check creator profiles
SELECT 
  cp.display_name,
  cp.availability_status,
  cp.open_to_collabs,
  u.email,
  u.is_test_account
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email LIKE 'prod-%@bypass.com';
```

**Expected:**
- `prod-creator1`: Available, open to collabs
- `prod-creator2`: Available, open to collabs
- `prod-creator3`: Busy, open to collabs

---

## Step 3: Test User Isolation Verification

### Database-Level Checks

```sql
-- 1. Verify test users are isolated
SELECT 
  COUNT(*) FILTER (WHERE is_test_account = true) as test_users,
  COUNT(*) FILTER (WHERE is_test_account IS NOT TRUE) as prod_users
FROM users;

-- 2. Verify get_creators() excludes test users (as production user)
-- This simulates what a production user would see
SELECT COUNT(*) FROM get_creators();
-- Should NOT include prod-creator1, prod-creator2, prod-creator3

-- 3. Verify test campaigns are flagged
SELECT COUNT(*) FROM campaigns WHERE is_test_campaign = true;
-- Should be 0 initially (no test campaigns created yet)
```

### App-Level Checks

**As Production User (use a real non-test account):**
- [ ] Browse Creators: No test creators visible
- [ ] Explore Campaigns: No test campaigns visible
- [ ] User Search: Test users don't appear

**As Test User (prod-consumer1@bypass.com):**
- [ ] Can see other test creators in Browse Creators
- [ ] Can see test campaigns
- [ ] Can interact with test content

---

## Step 4: Feature Testing Checklist

### CM-11: Creator Availability Status

**Test Account:** `prod-creator1@bypass.com`

**Setup:**
```sql
-- Ensure creator profile exists and is available
UPDATE creator_profiles cp
SET availability_status = 'available', open_to_collabs = true
FROM users u
WHERE cp.user_id = u.id AND u.email = 'prod-creator1@bypass.com';
```

**Test Steps:**
1. Log in as `prod-creator1@bypass.com` (OTP: `000000`)
2. Navigate to Creator Profile → Edit
3. Verify availability status selector shows:
   - Available
   - Busy
   - Not Accepting
4. Change status to "Busy"
5. Save and verify status updates
6. **As Business User:** Log in as `prod-business1@bypass.com`
7. Browse Creators → Verify creator shows "Busy" badge
8. Change back to "Available" and verify badge updates

**Expected Result:**
- ✅ Status changes save correctly
- ✅ Badge displays correctly in Browse Creators
- ✅ Status persists after app restart

---

### CM-13: Display Deliverables to Creators

**Test Accounts:** 
- Creator: `prod-creator1@bypass.com`
- Business: `prod-business1@bypass.com`

**Setup:**
```sql
-- Create test campaign with deliverables
DO $$
DECLARE
  v_business_user_id UUID;
  v_restaurant_id UUID;
  v_campaign_id UUID;
  v_creator_profile_id UUID;
  v_application_id UUID;
BEGIN
  -- Get IDs
  SELECT id INTO v_business_user_id FROM users WHERE email = 'prod-business1@bypass.com';
  SELECT id INTO v_creator_profile_id FROM creator_profiles cp
    JOIN users u ON cp.user_id = u.id WHERE u.email = 'prod-creator1@bypass.com';
  
  -- Get or create restaurant
  SELECT r.id INTO v_restaurant_id FROM restaurants r
    JOIN business_profiles bp ON bp.restaurant_id = r.id
    WHERE bp.user_id = v_business_user_id LIMIT 1;
  
  IF v_restaurant_id IS NULL THEN
    -- Create test restaurant
    INSERT INTO restaurants (name, address, city, state)
    VALUES ('Prod Test Restaurant', '123 Test St', 'Charlotte', 'NC')
    RETURNING id INTO v_restaurant_id;
    
    INSERT INTO business_profiles (user_id, restaurant_id, business_name)
    VALUES (v_business_user_id, v_restaurant_id, 'Prod Test Restaurant');
  END IF;
  
  -- Create campaign with deliverables
  INSERT INTO campaigns (
    restaurant_id, owner_id, title, description, status,
    budget_cents, end_date, deliverable_requirements
  )
  VALUES (
    v_restaurant_id, v_business_user_id,
    'CM-13 Test: Deliverables Display',
    'Test campaign for deliverables display',
    'active',
    100000,
    NOW() + INTERVAL '30 days',
    '{
      "deliverables": [
        {"index": 1, "type": "Instagram Post", "quantity": 1, "description": "1 Instagram post"},
        {"index": 2, "type": "Instagram Reel", "quantity": 1, "description": "1 Instagram reel"}
      ]
    }'::jsonb
  )
  RETURNING id INTO v_campaign_id;
  
  -- Create accepted application
  INSERT INTO campaign_applications (
    campaign_id, creator_id, status, proposed_rate_cents
  )
  VALUES (
    v_campaign_id, v_creator_profile_id, 'accepted', 100000
  )
  RETURNING id INTO v_application_id;
  
  RAISE NOTICE 'Created campaign % with application %', v_campaign_id, v_application_id;
END $$;
```

**Test Steps:**
1. Log in as `prod-creator1@bypass.com`
2. Navigate to Creator → My Campaigns → Active
3. Find "CM-13 Test: Deliverables Display"
4. Tap campaign card
5. **Verify Deliverables Section Shows:**
   - [ ] "Expected Deliverables" header
   - [ ] Deliverable 1: Instagram Post (1 required)
   - [ ] Deliverable 2: Instagram Reel (1 required)
   - [ ] Progress indicator: "0 of 2 deliverables submitted"
   - [ ] Progress bar at 0%
6. Tap "Submit Deliverables"
7. **Verify Submit Screen Shows:**
   - [ ] All expected deliverables listed
   - [ ] Can submit deliverables
   - [ ] Progress updates correctly

**Expected Result:**
- ✅ Deliverables display correctly in campaign details
- ✅ Progress tracking works
- ✅ Submit flow shows expected deliverables

---

### CM-16: Creator Rating System

**Test Accounts:**
- Business: `prod-business1@bypass.com`
- Creator: `prod-creator1@bypass.com`

**Setup:**
```sql
-- Create test campaign and ensure all deliverables are approved
DO $$
DECLARE
  v_business_user_id UUID;
  v_creator_profile_id UUID;
  v_campaign_id UUID;
  v_application_id UUID;
  v_restaurant_id UUID;
  v_deliverable_id UUID;
BEGIN
  -- Get IDs
  SELECT id INTO v_business_user_id FROM users WHERE email = 'prod-business1@bypass.com';
  SELECT id INTO v_creator_profile_id FROM creator_profiles cp
    JOIN users u ON cp.user_id = u.id WHERE u.email = 'prod-creator1@bypass.com';
  
  SELECT r.id INTO v_restaurant_id FROM restaurants r
    JOIN business_profiles bp ON bp.restaurant_id = r.id
    WHERE bp.user_id = v_business_user_id LIMIT 1;
  
  -- Create test campaign for rating
  INSERT INTO campaigns (
    restaurant_id, owner_id, title, description, status,
    budget_cents, end_date
  )
  VALUES (
    v_restaurant_id, v_business_user_id,
    'CM-16 Test: Rating Flow',
    'Test campaign for rating system',
    'active',
    100000,
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO v_campaign_id;
  
  -- Create accepted application
  INSERT INTO campaign_applications (
    campaign_id, creator_id, status, proposed_rate_cents
  )
  VALUES (
    v_campaign_id, v_creator_profile_id, 'accepted', 100000
  )
  RETURNING id INTO v_application_id;
  
  -- Create approved deliverable (required for rating)
  INSERT INTO campaign_deliverables (
    campaign_application_id, creator_id, restaurant_id, campaign_id,
    content_type, content_url, platform_post_url, caption,
    social_platform, status, submitted_at, reviewed_at, reviewer_id
  )
  VALUES (
    v_application_id, v_creator_profile_id, v_restaurant_id, v_campaign_id,
    'post', 'https://example.com/deliverable.jpg', 'https://instagram.com/p/test',
    'Test deliverable', 'instagram', 'approved',
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours', v_business_user_id
  )
  RETURNING id INTO v_deliverable_id;
  
  -- Clear any existing rating
  UPDATE campaign_applications
  SET rating = NULL, rating_comment = NULL, rated_at = NULL
  WHERE id = v_application_id;
  
  RAISE NOTICE 'Created campaign % with application % and approved deliverable %', 
    v_campaign_id, v_application_id, v_deliverable_id;
END $$;
```

**Test Steps:**
1. Log in as `prod-business1@bypass.com`
2. Navigate to Business → Campaigns
3. Find "CM-16 Test: Rating Flow"
4. Navigate to Applications tab
5. **Verify:**
   - [ ] Application shows status "accepted"
   - [ ] "Rate Creator" button is visible (all deliverables approved)
6. Tap "Rate Creator"
7. **Verify Rating Modal:**
   - [ ] Star rating selector (1-5 stars)
   - [ ] Optional feedback text input
   - [ ] Submit button
8. Select 5 stars
9. Enter feedback: "Excellent work! Very professional."
10. Tap "Submit Rating"
11. **Verify:**
    - [ ] Success message appears
    - [ ] Modal closes
    - [ ] Application shows "Rated 5/5" with feedback
    - [ ] Rating persists after app restart

**Expected Result:**
- ✅ Rating modal displays correctly
- ✅ Rating saves successfully
- ✅ Rating displays in application details
- ✅ Rating appears in creator profile (if viewing as business)

**Database Verification:**
```sql
-- Verify rating was saved
SELECT 
  ca.id,
  ca.rating,
  ca.rating_comment,
  ca.rated_at,
  cp.display_name as creator_name
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator1@bypass.com'
AND ca.rating IS NOT NULL
ORDER BY ca.rated_at DESC
LIMIT 1;
-- Should show rating = 5.0, rating_comment, and rated_at timestamp
```

---

## Step 5: End-to-End Flow Testing

### Complete Creator Marketplace Flow

**Test Accounts:**
- Business: `prod-business1@bypass.com`
- Creator: `prod-creator1@bypass.com`

**Flow:**
1. **Business Creates Campaign**
   - Log in as `prod-business1@bypass.com`
   - Create campaign with deliverables
   - Verify campaign appears in list

2. **Creator Applies**
   - Log in as `prod-creator1@bypass.com`
   - Browse campaigns
   - Apply to campaign
   - Verify application submitted

3. **Business Accepts Application**
   - Log in as `prod-business1@bypass.com`
   - View applications
   - Accept application
   - Verify status updates

4. **Creator Submits Deliverables**
   - Log in as `prod-creator1@bypass.com`
   - View campaign details
   - Submit deliverables
   - Verify progress updates

5. **Business Approves Deliverables**
   - Log in as `prod-business1@bypass.com`
   - View deliverables tab
   - Approve all deliverables
   - Verify status updates

6. **Business Rates Creator**
   - Log in as `prod-business1@bypass.com`
   - Rate creator (CM-16)
   - Verify rating saved

---

## Step 6: Cleanup & Reset

### Reset Test Data (Optional)

If you need to reset test scenarios:

```sql
-- Clear ratings
UPDATE campaign_applications ca
SET rating = NULL, rating_comment = NULL, rated_at = NULL
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE ca.creator_id = cp.id
AND u.email LIKE 'prod-%@bypass.com';

-- Reset deliverable statuses
UPDATE campaign_deliverables cd
SET status = 'pending_review', reviewed_at = NULL
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE cd.campaign_application_id = ca.id
AND u.email LIKE 'prod-%@bypass.com';

-- Reset application statuses (optional - be careful)
-- UPDATE campaign_applications ca
-- SET status = 'pending'
-- FROM creator_profiles cp
-- JOIN users u ON cp.user_id = u.id
-- WHERE ca.creator_id = cp.id
-- AND u.email LIKE 'prod-%@bypass.com';
```

---

## Troubleshooting

### Issue: Cannot log in with test accounts

**Solution:**
```sql
-- Verify bypass password is set
UPDATE auth.users
SET encrypted_password = crypt('BypassPassword123', gen_salt('bf'))
WHERE email LIKE '%@bypass.com';
```

### Issue: Test users visible to production users

**Solution:**
```sql
-- Verify isolation migration ran
SELECT proname FROM pg_proc WHERE proname = 'is_test_email';
-- Should return 1 row

-- Re-run test user marking
SELECT mark_test_campaigns();
SELECT mark_test_restaurants();
```

### Issue: Migrations fail

**Solution:**
- Check migration order matches `CREATOR_MARKETPLACE_MIGRATION_STEPS.md`
- Verify dependencies (tables/functions) exist
- Check for conflicts with existing schema

---

## Quick Reference

### Test Account Credentials

| Email | Type | OTP | Purpose |
|-------|------|-----|---------|
| `prod-consumer1@bypass.com` | Consumer | `000000` | Consumer flow testing |
| `prod-creator1@bypass.com` | Creator | `000000` | Creator flow testing |
| `prod-creator2@bypass.com` | Creator | `000000` | Multi-creator testing |
| `prod-creator3@bypass.com` | Creator | `000000` | Busy status testing |
| `prod-business1@bypass.com` | Business | `000000` | Business flow testing |
| `prod-business2@bypass.com` | Business | `000000` | Multi-business testing |

### Verification Queries

```sql
-- Check test users
SELECT email, account_type, is_test_account FROM users
WHERE email LIKE 'prod-%@bypass.com';

-- Check creator profiles
SELECT cp.display_name, cp.availability_status, u.email
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email LIKE 'prod-%@bypass.com';

-- Check test isolation
SELECT 
  (SELECT COUNT(*) FROM users WHERE is_test_account = true) as test_users,
  (SELECT COUNT(*) FROM campaigns WHERE is_test_campaign = true) as test_campaigns;
```

---

## Sign-Off Checklist

Before marking as production-ready:

- [ ] All migrations applied successfully
- [ ] Test users created and isolated
- [ ] CM-11 (Availability Status) tested and working
- [ ] CM-13 (Deliverables Display) tested and working
- [ ] CM-16 (Rating System) tested and working
- [ ] End-to-end flow tested successfully
- [ ] Test users not visible to production users
- [ ] No errors in production logs
- [ ] Performance acceptable (< 2s load times)

**Tester:** ___________________  
**Date:** ___________________  
**Status:** ☐ Ready for Production ☐ Issues Found

---

## Related Documentation

- Migration Steps: `docs/CREATOR_MARKETPLACE_MIGRATION_STEPS.md`
- Production Deployment: `docs/CREATOR_MARKETPLACE_PRODUCTION_DEPLOYMENT.md`
- Testing Checklist: `docs/CREATOR_MARKETPLACE_PRODUCTION_TESTING_CHECKLIST.md`
- E2E Testing Guide: `docs/CREATOR_MARKETPLACE_E2E_TESTING_GUIDE.md`
