# Creator Marketplace Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Creator Marketplace feature from development to production. It includes migration ordering, rollback procedures, and testing checklists.

**Last Updated:** December 5, 2025
**Feature:** Creator Marketplace (CM-1 through CM-15)
**Status:** Ready for Production

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Migration Execution Order](#2-migration-execution-order)
3. [Test User Isolation Setup](#3-test-user-isolation-setup)
4. [Production Test Data Setup](#4-production-test-data-setup)
5. [Post-Deployment Verification](#5-post-deployment-verification)
6. [Rollback Procedures](#6-rollback-procedures)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Pre-Deployment Checklist

### Environment Requirements

- [ ] Supabase Production project access
- [ ] Database admin permissions
- [ ] Environment variables configured:
  - `EXPO_PUBLIC_SUPABASE_URL` (production URL)
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` (production key)
  - `EXPO_PUBLIC_TEST_AUTH_PASSWORD` = `BypassPassword123`
  - `EXPO_PUBLIC_TEST_EMAIL_DOMAINS` = `@bypass.com,@troodie.test`

### Pre-Flight Checks

```bash
# 1. Verify you're on the correct branch
git branch --show-current
# Should be: main or feature/creator-marketplace-onboarding

# 2. Pull latest changes
git pull origin main

# 3. Check for pending migrations
ls -la supabase/migrations/ | grep -E "2025012[2-9]|20250205"
```

### Database Backup

**CRITICAL:** Create a backup before running migrations.

```sql
-- In Supabase SQL Editor (Production)
-- Create a restore point (for Supabase Pro plans)
SELECT pg_export_snapshot();

-- Note the timestamp
SELECT NOW();
```

---

## 2. Migration Execution Order

### Phase 1: Core Creator Tables (Already Deployed)

These migrations should already be in production. Verify they exist:

```sql
-- Check if creator tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN (
  'creator_profiles',
  'creator_portfolio_items',
  'campaigns',
  'campaign_applications',
  'campaign_deliverables',
  'business_profiles'
);
```

If missing, run in this order:
1. `20250113_create_creator_tables.sql`
2. `20250113_fix_creator_profiles_rls.sql`
3. `20250911000002_add_creator_onboarding_tables.sql`
4. `20250913_creator_marketplace_business.sql`
5. `20250913_creator_marketplace_business_fixed.sql`

### Phase 2: Campaign & Deliverables System

```sql
-- Run these migrations in order:
```

| Order | Migration File | Purpose | Risk |
|-------|---------------|---------|------|
| 1 | `20251013_campaign_deliverables_schema.sql` | Deliverable tracking | Low |
| 2 | `20251013_campaign_deliverables_schema_fixed.sql` | Fixes | Low |
| 3 | `20251013_troodie_managed_campaigns_schema.sql` | Platform campaigns | Low |
| 4 | `20251016_enhanced_deliverables_system.sql` | Enhanced workflow | Low |
| 5 | `20250116_add_pending_state_system.sql` | Review workflow | Low |
| 6 | `20250116_fix_campaign_deliverables_rls.sql` | RLS fixes | Low |
| 7 | `20251020_fix_campaign_applications_update_policy.sql` | Policy fixes | Low |

### Phase 3: Creator Discovery (CM-9)

```sql
-- Run these migrations in order:
```

| Order | Migration File | Purpose | Risk |
|-------|---------------|---------|------|
| 1 | `20250122_creator_profiles_discovery.sql` | Discovery features | Medium |
| 2 | `20250122_fix_get_creators_type_mismatch.sql` | Type fix | Low |
| 3 | `20250122_fix_get_creators_account_type.sql` | Security fix | **High** |
| 4 | `20250122_cleanup_creator_profiles_columns.sql` | Schema cleanup | Low |
| 5 | `20250122_add_creator_ratings.sql` | Rating system | Low |

### Phase 4: Additional Features

| Order | Migration File | Purpose | Risk |
|-------|---------------|---------|------|
| 1 | `20250122_add_draft_status_to_campaigns.sql` | Draft campaigns | Low |
| 2 | `20250122_campaign_invitations.sql` | Invitation system | Low |
| 3 | `20250122_restaurant_analytics.sql` | Analytics | Low |
| 4 | `20250122_restaurant_editable_fields.sql` | Editable fields | Low |
| 5 | `20250122_add_portfolio_video_support.sql` | Video support | Low |
| 6 | `20250122_update_portfolio_function_for_videos.sql` | Video functions | Low |
| 7 | `20250122_schedule_auto_approval_cron.sql` | Auto-approval | Low |

### Phase 5: Test User Isolation (NEW - CRITICAL)

```sql
-- Run this LAST - after all other migrations
```

| Order | Migration File | Purpose | Risk |
|-------|---------------|---------|------|
| 1 | `20250205_production_test_user_isolation.sql` | Test isolation | **High** |

---

## 3. Test User Isolation Setup

### What It Does

The test user isolation system ensures:
- Users with `@bypass.com` or `@troodie.test` emails are marked as test accounts
- Test users can see each other but are hidden from production users
- Test restaurants and campaigns are automatically flagged
- Production users never see test data in browse, search, or feeds

### How It Works

```
Production User Queries:
├── Browse Creators → get_creators() filters out is_test_account = true
├── View Campaigns → production_campaigns view excludes test campaigns
├── Search Restaurants → production_restaurants view excludes test restaurants
└── Activity Feed → Test user posts excluded

Test User Queries:
├── Browse Creators → See all creators (test + production)
├── View Campaigns → See all campaigns (for testing)
├── Search Restaurants → See all restaurants
└── Activity Feed → See all posts
```

### Verify Isolation

After running the migration, verify:

```sql
-- Check test users are marked
SELECT email, is_test_account
FROM users
WHERE email LIKE '%@bypass.com' OR email LIKE '%@troodie.test';

-- Should show: is_test_account = true for all

-- Test get_creators() as production user (simulate by setting test flag)
-- This should return only non-test creators
SELECT * FROM get_creators() LIMIT 5;
```

---

## 4. Production Test Data Setup

### Purpose

Create test accounts in production for:
- Internal QA testing
- App Store review accounts
- Demo purposes
- Bug reproduction

### Setup Instructions

1. **Ensure isolation migration is deployed first**:
   ```sql
   -- Verify the function exists
   SELECT proname FROM pg_proc WHERE proname = 'is_test_email';
   ```

2. **Run the production test users setup**:
   ```sql
   -- In Supabase SQL Editor (Production)
   -- Copy contents from: data/test-data/prod/01-production-test-users-setup.sql
   ```

3. **Verify accounts created**:
   ```sql
   SELECT email, account_type, is_test_account
   FROM users
   WHERE email LIKE 'prod-%@bypass.com';
   ```

### Production Test Accounts

| Email | Type | Password/OTP |
|-------|------|--------------|
| `prod-consumer1@bypass.com` | Consumer | OTP: 000000 |
| `prod-consumer2@bypass.com` | Consumer | OTP: 000000 |
| `prod-creator1@bypass.com` | Creator (Available) | OTP: 000000 |
| `prod-creator2@bypass.com` | Creator (Available) | OTP: 000000 |
| `prod-creator3@bypass.com` | Creator (Busy) | OTP: 000000 |
| `prod-business1@bypass.com` | Business | OTP: 000000 |
| `prod-business2@bypass.com` | Business | OTP: 000000 |

---

## 5. Post-Deployment Verification

### Quick Smoke Test

```sql
-- 1. Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'creator_profiles',
  'campaigns',
  'campaign_applications',
  'campaign_deliverables',
  'business_profiles'
);

-- 2. Verify functions exist
SELECT proname FROM pg_proc
WHERE proname IN (
  'get_creators',
  'is_test_email',
  'is_test_user',
  'current_user_is_test',
  'mark_test_campaigns',
  'mark_test_restaurants'
);

-- 3. Verify views exist
SELECT viewname FROM pg_views
WHERE viewname IN (
  'creator_sample_posts',
  'production_users',
  'production_campaigns',
  'production_restaurants'
);

-- 4. Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN (
  'creator_profiles',
  'campaigns',
  'campaign_applications'
);
```

### Functional Test Checklist

#### As Production User (real email)
- [ ] Cannot see test creators in Browse Creators
- [ ] Cannot see test campaigns in Explore
- [ ] Cannot see test restaurants in search
- [ ] Normal functionality works as expected

#### As Test User (prod-xxx@bypass.com)
- [ ] Can log in with OTP code 000000
- [ ] Can see other test creators
- [ ] Can see test campaigns
- [ ] Can create test content (isolated from production)
- [ ] Can complete full creator marketplace flow

---

## 6. Rollback Procedures

### Quick Rollback: Test User Isolation Only

If the isolation migration causes issues:

```sql
-- Remove test account flag (temporary fix)
ALTER TABLE users DROP COLUMN IF EXISTS is_test_account;

-- Restore original get_creators function
-- (Copy from 20250122_fix_get_creators_account_type.sql)

-- Drop isolation views
DROP VIEW IF EXISTS production_users;
DROP VIEW IF EXISTS production_campaigns;
DROP VIEW IF EXISTS production_restaurants;

-- Drop helper functions
DROP FUNCTION IF EXISTS is_test_email;
DROP FUNCTION IF EXISTS is_test_user;
DROP FUNCTION IF EXISTS current_user_is_test;
```

### Full Rollback: Creator Marketplace

If major issues require full rollback (DANGEROUS):

```sql
-- ⚠️ WARNING: This will delete ALL creator marketplace data!

-- 1. Drop tables in reverse dependency order
DROP TABLE IF EXISTS campaign_deliverables CASCADE;
DROP TABLE IF EXISTS campaign_applications CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS creator_portfolio_items CASCADE;
DROP TABLE IF EXISTS creator_profiles CASCADE;
DROP TABLE IF EXISTS business_profiles CASCADE;
DROP TABLE IF EXISTS restaurant_claims CASCADE;
DROP TABLE IF EXISTS creator_applications CASCADE;

-- 2. Remove added columns from existing tables
ALTER TABLE users DROP COLUMN IF EXISTS is_test_account;
ALTER TABLE restaurants DROP COLUMN IF EXISTS is_test_restaurant;

-- 3. Drop functions
DROP FUNCTION IF EXISTS get_creators;
DROP FUNCTION IF EXISTS update_creator_metrics;
-- ... (list all created functions)

-- 4. Restore from backup if available
```

---

## 7. Troubleshooting

### Issue: "column is_test_account does not exist"

**Cause:** Migration not run or failed partway through.

**Fix:**
```sql
-- Re-run the column addition
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN GENERATED ALWAYS AS (
  is_test_email(email)
) STORED;
```

### Issue: "function is_test_email does not exist"

**Cause:** Function creation failed or was dropped.

**Fix:**
```sql
-- Re-create the function
CREATE OR REPLACE FUNCTION is_test_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email IS NOT NULL AND (
    LOWER(email) LIKE '%@bypass.com' OR
    LOWER(email) LIKE '%@troodie.test'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Issue: Test users visible to production users

**Cause:** `get_creators()` not updated or views not created.

**Fix:**
1. Verify `get_creators()` includes the test user filter
2. Verify `production_users` view exists
3. Re-run the isolation migration

### Issue: Production users not seeing any creators

**Cause:** Too aggressive filtering or data issue.

**Fix:**
```sql
-- Check if there are any non-test creators
SELECT COUNT(*) FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.is_test_account IS NOT TRUE
AND cp.open_to_collabs = true;

-- If count is 0, you have no real creator accounts yet
-- This is expected in a fresh production environment
```

### Issue: Bypass login not working (OTP 000000 rejected)

**Cause:** Auth user password not set or domain not recognized.

**Fix:**
```sql
-- Re-set the password for bypass accounts
UPDATE auth.users
SET encrypted_password = crypt('BypassPassword123', gen_salt('bf'))
WHERE email LIKE '%@bypass.com';
```

---

## Appendix A: Migration File Locations

All migration files are located in:
```
/supabase/migrations/
```

Key files:
- Creator Discovery: `20250122_creator_profiles_discovery.sql`
- Account Type Filter: `20250122_fix_get_creators_account_type.sql`
- Test Isolation: `20250205_production_test_user_isolation.sql`

Test data files:
```
/data/test-data/
├── dev/                    # Development test data
│   ├── 02-create-users.sql
│   ├── 04-create-creator-profiles.sql
│   ├── 09-create-campaigns.sql
│   └── ...
└── prod/                   # Production test data
    └── 01-production-test-users-setup.sql
```

---

## Appendix B: Environment Variable Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `EXPO_PUBLIC_TEST_AUTH_PASSWORD` | Password for test accounts | `BypassPassword123` |
| `EXPO_PUBLIC_TEST_EMAIL_DOMAINS` | Domains to bypass OTP | `@bypass.com,@troodie.test` |

---

## Appendix C: Contact & Support

For deployment issues:
- Check `docs/CREATOR_MARKETPLACE_E2E_TESTING_GUIDE.md` for testing procedures
- Review `.tasks/creator-marketplace-audit-findings.md` for known issues
- Contact: @kouame (admin)

---

**Document Version:** 1.0
**Last Migration Applied:** 20250205_production_test_user_isolation.sql
